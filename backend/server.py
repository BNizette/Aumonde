from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import os
import logging
import uuid
import json
import io
from pathlib import Path
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ['JWT_SECRET_KEY']  # No fallback - must be set in .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

app = FastAPI(title="AMSA Safety Management System")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# CONSTANTS
# ============================================================================

class UserRole:
    OWNER = "Owner"
    MASTER = "Master"
    CREW = "Crew"
    DESIGNATED = "Designated Person"
    INSPECTOR = "Inspector"

class AccessLevel:
    VIEW = "View"
    EDIT = "Edit"
    FULL = "Full"

class AccountStatus:
    ACTIVE = "Active"
    DISABLED = "Disabled"
    SUSPENDED = "Suspended"

# ============================================================================
# MODELS
# ============================================================================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    full_name: str
    role: str = UserRole.CREW
    access_level: str = AccessLevel.EDIT
    account_status: str = AccountStatus.ACTIVE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None
    last_active: Optional[datetime] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = UserRole.CREW
    access_level: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    access_level: str = AccessLevel.EDIT  # Default for backward compatibility
    account_status: str = AccountStatus.ACTIVE  # Default for backward compatibility
    created_at: datetime
    last_login: Optional[datetime] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    access_level: Optional[str] = None
    account_status: Optional[str] = None

class PasswordReset(BaseModel):
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime

class ActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    action: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_id: str
    admin_name: str
    action: str
    target_type: str
    target_id: str
    target_name: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============================================================================
# AUTH HELPERS
# ============================================================================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, expire

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        session = await db.sessions.find_one({"token": token, "user_id": user_id})
        if not session:
            raise HTTPException(status_code=401, detail="Session expired or invalid")
        
        await db.sessions.update_one(
            {"token": token},
            {"$set": {"last_active": datetime.now(timezone.utc)}}
        )
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"last_active": datetime.now(timezone.utc)}}
        )
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if user.get("account_status") != AccountStatus.ACTIVE:
            raise HTTPException(status_code=403, detail="Account is disabled or suspended")
        
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def require_access_level(required_level: str):
    async def check_access(current_user: dict = Depends(get_current_user)):
        user_level = current_user.get("access_level", AccessLevel.VIEW)
        
        if required_level == AccessLevel.FULL and user_level != AccessLevel.FULL:
            raise HTTPException(status_code=403, detail="Full access required")
        
        if required_level == AccessLevel.EDIT and user_level == AccessLevel.VIEW:
            raise HTTPException(status_code=403, detail="Edit access required")
        
        return current_user
    return check_access

async def log_activity(user_id: str, user_email: str, action: str, ip: Optional[str] = None, user_agent: Optional[str] = None):
    activity = ActivityLog(
        user_id=user_id,
        user_email=user_email,
        action=action,
        ip_address=ip,
        user_agent=user_agent
    )
    await db.activity_logs.insert_one(activity.model_dump())

async def log_audit(admin_id: str, admin_name: str, action: str, target_type: str, target_id: str, target_name: str, details: Optional[dict] = None):
    audit = AuditLog(
        admin_id=admin_id,
        admin_name=admin_name,
        action=action,
        target_type=target_type,
        target_id=target_id,
        target_name=target_name,
        details=details
    )
    await db.audit_logs.insert_one(audit.model_dump())

# ============================================================================
# AUTH ENDPOINTS
# ============================================================================

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    access_level = user_data.access_level
    if not access_level:
        if user_data.role == UserRole.OWNER:
            access_level = AccessLevel.FULL
        elif user_data.role in [UserRole.MASTER, UserRole.CREW]:
            access_level = AccessLevel.EDIT
        else:
            access_level = AccessLevel.VIEW
    
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        access_level=access_level
    )
    
    await db.users.insert_one(user.model_dump())
    return UserResponse(**user.model_dump())

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin, user_agent: Optional[str] = Header(None), x_forwarded_for: Optional[str] = Header(None)):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if user.get("account_status") != AccountStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Account is disabled or suspended")
    
    access_token, expires_at = create_access_token(data={"sub": user["id"]})
    
    session = Session(
        user_id=user["id"],
        token=access_token,
        ip_address=x_forwarded_for,
        user_agent=user_agent,
        expires_at=expires_at
    )
    await db.sessions.insert_one(session.model_dump())
    
    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": now, "last_active": now}}
    )
    
    await log_activity(user["id"], user["email"], "login", x_forwarded_for, user_agent)
    
    user_response = UserResponse(**user)
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.post("/auth/logout")
async def logout(current_user: dict = Depends(get_current_user), credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    await db.sessions.delete_one({"token": token})
    await log_activity(current_user["id"], current_user["email"], "logout")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ============================================================================
# USER MANAGEMENT
# ============================================================================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, update_data: UserUpdate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if update_dict:
        await db.users.update_one({"id": user_id}, {"$set": update_dict})
        
        await log_audit(
            current_user["id"],
            current_user["full_name"],
            "update",
            "user",
            user_id,
            user["full_name"],
            update_dict
        )
        
        if "account_status" in update_dict and update_dict["account_status"] != AccountStatus.ACTIVE:
            await db.sessions.delete_many({"user_id": user_id})
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return UserResponse(**updated_user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.delete_one({"id": user_id})
    await db.sessions.delete_many({"user_id": user_id})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "delete",
        "user",
        user_id,
        user["full_name"]
    )
    
    return {"message": "User deleted successfully"}

@api_router.post("/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, password_data: PasswordReset, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_hash = hash_password(password_data.new_password)
    await db.users.update_one({"id": user_id}, {"$set": {"password_hash": new_hash}})
    await db.sessions.delete_many({"user_id": user_id})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "password_reset",
        "user",
        user_id,
        user["full_name"]
    )
    
    return {"message": "Password reset successfully"}

@api_router.get("/users/{user_id}/activity")
async def get_user_activity(user_id: str, current_user: dict = Depends(get_current_user)):
    activities = await db.activity_logs.find({"user_id": user_id}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return activities

@api_router.get("/activity-logs")
async def get_activity_logs(current_user: dict = Depends(get_current_user)):
    logs = await db.activity_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(500)
    return logs

@api_router.get("/audit-logs")
async def get_audit_logs(current_user: dict = Depends(get_current_user)):
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(500)
    return logs

@api_router.get("/sessions")
async def get_sessions(current_user: dict = Depends(get_current_user)):
    sessions = await db.sessions.find({}, {"_id": 0}).sort("last_active", -1).to_list(500)
    
    # Batch query optimization: Fetch all users at once
    user_ids = list(set(session["user_id"] for session in sessions if session.get("user_id")))
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "email": 1, "full_name": 1}).to_list(len(user_ids))
    user_map = {user["id"]: user for user in users}
    
    for session in sessions:
        user = user_map.get(session.get("user_id"))
        if user:
            session["user_email"] = user.get("email")
            session["user_name"] = user.get("full_name")
    
    return sessions

@api_router.delete("/sessions/{session_id}")
async def force_logout(session_id: str, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.sessions.delete_one({"id": session_id})
    return {"message": "Session terminated successfully"}

# ============================================================================
# DASHBOARD
# ============================================================================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    total_vessels = await db.vessels.count_documents({})
    total_crew = await db.crew.count_documents({})
    total_documents = await db.documents.count_documents({})
    total_trips = await db.trips.count_documents({})
    
    # Active trips (trips with arrival date in the future or null)
    now = datetime.now(timezone.utc)
    active_trips = await db.trips.count_documents({
        "$or": [
            {"arrival_datetime": None},
            {"arrival_datetime": {"$gt": now}}
        ]
    })
    
    # Maintenance count
    total_maintenance = await db.maintenance.count_documents({})
    pending_maintenance = await db.maintenance.count_documents({"status": "Scheduled"})
    
    # Risk assessments
    total_risks = await db.risk_assessments.count_documents({})
    critical_risks = await db.risk_assessments.count_documents({"risk_level": "Critical"})
    
    # Incidents
    total_incidents = await db.incidents.count_documents({})
    
    # Emergency contacts and procedures
    emergency_contacts = await db.emergency_contacts.count_documents({})
    emergency_procedures = await db.emergency_procedures.count_documents({})
    
    # Compliance
    total_certificates = await db.compliance_certificates.count_documents({})
    expiring_soon = await db.compliance_certificates.count_documents({
        "expiry_date": {"$lt": datetime.now(timezone.utc) + timedelta(days=30)}
    })
    
    return {
        "trips": total_trips,
        "active_trips": active_trips,
        "maintenance": total_maintenance,
        "pending_maintenance": pending_maintenance,
        "vessels": total_vessels,
        "crew_members": total_crew,
        "documents": total_documents,
        "incidents": total_incidents,
        "risks": total_risks,
        "critical_risks": critical_risks,
        "emergency_contacts": emergency_contacts,
        "emergency_procedures": emergency_procedures,
        "certificates": total_certificates,
        "expiring_certificates": expiring_soon
    }

# ============================================================================
# VESSEL MODELS
# ============================================================================

class Vessel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Basic Details
    vessel_name: str
    registration_number: Optional[str] = None
    vessel_type: Optional[str] = None
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None
    boat_phone: Optional[str] = None
    flag: Optional[str] = None
    port_of_registry: Optional[str] = None
    imo_number: Optional[str] = None
    mmsi_number: Optional[str] = None
    call_sign: Optional[str] = None
    ais_class: Optional[str] = None  # A or B
    home_port: Optional[str] = None
    
    # Specifications
    length_overall: Optional[float] = None
    length_at_waterline: Optional[float] = None
    beam: Optional[float] = None
    draft: Optional[float] = None
    air_draft: Optional[float] = None
    ce_category: Optional[str] = None
    gross_tonnage: Optional[float] = None
    construction_material: Optional[str] = None
    year_built: Optional[int] = None
    builder: Optional[str] = None
    number_of_engines: Optional[int] = None
    engine_type: Optional[str] = None
    engine_power: Optional[str] = None
    propeller_type: Optional[str] = None
    propeller_material: Optional[str] = None
    fuel_type: Optional[str] = None
    fuel_capacity: Optional[float] = None
    inside_equipment: Optional[str] = None
    outside_equipment: Optional[str] = None
    water_capacity: Optional[float] = None
    max_passengers: Optional[int] = None
    max_crew: Optional[int] = None
    
    # Equipment
    navigation_equipment: Optional[str] = None
    communication_equipment: Optional[str] = None
    safety_equipment: Optional[str] = None
    
    # Safety Equipment
    life_rafts: Optional[int] = None
    life_jackets: Optional[int] = None
    epirb: Optional[bool] = False
    fire_extinguishers: Optional[int] = None
    flares: Optional[int] = None
    
    # Photo
    vessel_photo_url: Optional[str] = None
    
    # Certificates - Statutory
    cert_survey_issue: Optional[str] = None
    cert_survey_expiry: Optional[str] = None
    cert_operation_issue: Optional[str] = None
    cert_operation_expiry: Optional[str] = None
    cert_loadline_issue: Optional[str] = None
    cert_loadline_expiry: Optional[str] = None
    
    # Operational Documentation
    stability_book_date: Optional[str] = None
    stability_book_expiry: Optional[str] = None
    safety_mgmt_date: Optional[str] = None
    safety_mgmt_expiry: Optional[str] = None
    
    # Third Party Certificates
    cert_classification_issue: Optional[str] = None
    cert_classification_expiry: Optional[str] = None
    cert_lifting_gear_issue: Optional[str] = None
    cert_lifting_gear_expiry: Optional[str] = None
    cert_life_raft_issue: Optional[str] = None
    cert_life_raft_expiry: Optional[str] = None
    cert_epirb_issue: Optional[str] = None
    cert_epirb_expiry: Optional[str] = None
    cert_fire_extinguisher_issue: Optional[str] = None
    cert_fire_extinguisher_expiry: Optional[str] = None
    cert_lifejacket_issue: Optional[str] = None
    cert_lifejacket_expiry: Optional[str] = None
    cert_gas_issue: Optional[str] = None
    cert_gas_expiry: Optional[str] = None
    cert_electrical_issue: Optional[str] = None
    cert_electrical_expiry: Optional[str] = None
    cert_compass_issue: Optional[str] = None
    cert_compass_expiry: Optional[str] = None
    cert_eiapp_issue: Optional[str] = None
    cert_eiapp_expiry: Optional[str] = None
    cert_other_issue: Optional[str] = None
    cert_other_expiry: Optional[str] = None
    
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class VesselCreate(BaseModel):
    vessel_name: str
    registration_number: Optional[str] = None
    vessel_type: Optional[str] = None
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None
    boat_phone: Optional[str] = None
    flag: Optional[str] = None
    port_of_registry: Optional[str] = None
    imo_number: Optional[str] = None
    mmsi_number: Optional[str] = None
    call_sign: Optional[str] = None
    ais_class: Optional[str] = None
    home_port: Optional[str] = None
    length_overall: Optional[float] = None
    length_at_waterline: Optional[float] = None
    beam: Optional[float] = None
    draft: Optional[float] = None
    air_draft: Optional[float] = None
    ce_category: Optional[str] = None
    gross_tonnage: Optional[float] = None
    construction_material: Optional[str] = None
    year_built: Optional[int] = None
    builder: Optional[str] = None
    number_of_engines: Optional[int] = None
    engine_type: Optional[str] = None
    engine_power: Optional[str] = None
    propeller_type: Optional[str] = None
    propeller_material: Optional[str] = None
    fuel_type: Optional[str] = None
    fuel_capacity: Optional[float] = None
    inside_equipment: Optional[str] = None
    outside_equipment: Optional[str] = None
    water_capacity: Optional[float] = None
    max_passengers: Optional[int] = None
    max_crew: Optional[int] = None
    navigation_equipment: Optional[str] = None
    communication_equipment: Optional[str] = None
    safety_equipment: Optional[str] = None
    life_rafts: Optional[int] = None
    life_jackets: Optional[int] = None
    epirb: Optional[bool] = False
    fire_extinguishers: Optional[int] = None
    flares: Optional[int] = None
    vessel_photo_url: Optional[str] = None
    cert_survey_issue: Optional[str] = None
    cert_survey_expiry: Optional[str] = None
    cert_operation_issue: Optional[str] = None
    cert_operation_expiry: Optional[str] = None
    cert_loadline_issue: Optional[str] = None
    cert_loadline_expiry: Optional[str] = None
    stability_book_date: Optional[str] = None
    stability_book_expiry: Optional[str] = None
    safety_mgmt_date: Optional[str] = None
    safety_mgmt_expiry: Optional[str] = None
    cert_classification_issue: Optional[str] = None
    cert_classification_expiry: Optional[str] = None
    cert_lifting_gear_issue: Optional[str] = None
    cert_lifting_gear_expiry: Optional[str] = None
    cert_life_raft_issue: Optional[str] = None
    cert_life_raft_expiry: Optional[str] = None
    cert_epirb_issue: Optional[str] = None
    cert_epirb_expiry: Optional[str] = None
    cert_fire_extinguisher_issue: Optional[str] = None
    cert_fire_extinguisher_expiry: Optional[str] = None
    cert_lifejacket_issue: Optional[str] = None
    cert_lifejacket_expiry: Optional[str] = None
    cert_gas_issue: Optional[str] = None
    cert_gas_expiry: Optional[str] = None
    cert_electrical_issue: Optional[str] = None
    cert_electrical_expiry: Optional[str] = None
    cert_compass_issue: Optional[str] = None
    cert_compass_expiry: Optional[str] = None
    cert_eiapp_issue: Optional[str] = None
    cert_eiapp_expiry: Optional[str] = None
    cert_other_issue: Optional[str] = None
    cert_other_expiry: Optional[str] = None

# ============================================================================
# VESSEL ENDPOINTS
# ============================================================================

@api_router.post("/vessels")
async def create_vessel(vessel_data: VesselCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    vessel = Vessel(**vessel_data.model_dump(), created_by=current_user["id"])
    await db.vessels.insert_one(vessel.model_dump())
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "create",
        "vessel",
        vessel.id,
        vessel.vessel_name
    )
    
    return vessel

@api_router.get("/vessels")
async def get_vessels(current_user: dict = Depends(get_current_user)):
    vessels = await db.vessels.find({}, {"_id": 0}).sort("vessel_name", 1).to_list(1000)
    return vessels

@api_router.get("/vessels/{vessel_id}")
async def get_vessel(vessel_id: str, current_user: dict = Depends(get_current_user)):
    vessel = await db.vessels.find_one({"id": vessel_id}, {"_id": 0})
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return vessel

@api_router.post("/vessels/check-duplicate")
async def check_vessel_duplicate(vessel_data: dict, current_user: dict = Depends(get_current_user)):
    """Check for duplicate vessels by registration number or vessel name"""
    duplicates = []
    vessel_id = vessel_data.get("id")
    
    # Check registration number
    if vessel_data.get("registration_number"):
        query = {"registration_number": vessel_data["registration_number"]}
        if vessel_id:
            query["id"] = {"$ne": vessel_id}
        existing = await db.vessels.find_one(query, {"_id": 0})
        if existing:
            duplicates.append({
                "field": "registration_number",
                "value": vessel_data["registration_number"],
                "existing_record": {
                    "id": existing["id"],
                    "name": existing["vessel_name"],
                    "type": existing.get("vessel_type", "N/A")
                }
            })
    
    # Check vessel name
    if vessel_data.get("vessel_name"):
        query = {"vessel_name": vessel_data["vessel_name"]}
        if vessel_id:
            query["id"] = {"$ne": vessel_id}
        existing = await db.vessels.find_one(query, {"_id": 0})
        if existing:
            duplicates.append({
                "field": "vessel_name",
                "value": vessel_data["vessel_name"],
                "existing_record": {
                    "id": existing["id"],
                    "name": existing["vessel_name"],
                    "registration": existing.get("registration_number", "N/A")
                }
            })
    
    return {
        "has_duplicates": len(duplicates) > 0,
        "duplicates": duplicates
    }

@api_router.put("/vessels/{vessel_id}")
async def update_vessel(vessel_id: str, vessel_data: VesselCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    vessel = await db.vessels.find_one({"id": vessel_id}, {"_id": 0})
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    
    update_dict = vessel_data.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    await db.vessels.update_one({"id": vessel_id}, {"$set": update_dict})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "update",
        "vessel",
        vessel_id,
        vessel["vessel_name"]
    )
    
    updated = await db.vessels.find_one({"id": vessel_id}, {"_id": 0})
    return updated

@api_router.delete("/vessels/{vessel_id}")
async def delete_vessel(vessel_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    vessel = await db.vessels.find_one({"id": vessel_id}, {"_id": 0})
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    
    await db.vessels.delete_one({"id": vessel_id})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "delete",
        "vessel",
        vessel_id,
        vessel["vessel_name"]
    )
    
    return {"message": "Vessel deleted successfully"}

# ============================================================================
# CREW MODELS
# ============================================================================

class QualificationItem(BaseModel):
    name: str
    date: Optional[str] = None

class TrainingItem(BaseModel):
    number: Optional[int] = None
    date: Optional[str] = None
    supervisor: Optional[str] = None

class Crew(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Tab 1: Crew Details
    staff_name: str
    email: Optional[str] = None
    address: Optional[str] = None
    telephone: Optional[str] = None
    mobile: Optional[str] = None
    contact_details: Optional[str] = None
    next_of_kin: Optional[str] = None
    kin_contact: Optional[str] = None
    date_commenced: Optional[str] = None
    date_joined_vessel: Optional[str] = None
    date_left_vessel: Optional[str] = None
    default_position: Optional[str] = None
    role: Optional[str] = "Crew"  # Crew, Host, Both
    
    # Tab 2: Qualifications
    qualifications: Optional[List[QualificationItem]] = []
    qualifications_comment: Optional[str] = None
    experience: Optional[str] = None
    cv_url: Optional[str] = None
    master_class5_proof: Optional[bool] = False
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    medical_cert_expiry: Optional[str] = None
    
    # Tab 3: Training Record
    briefings_observed: Optional[List[TrainingItem]] = []
    briefings_delivered: Optional[List[TrainingItem]] = []
    practical_experience: Optional[List[TrainingItem]] = []
    
    # Tab 4: Sign-off
    owner_name: Optional[str] = None
    owner_signature: Optional[str] = None
    owner_date: Optional[str] = None
    staff_signature: Optional[str] = None
    staff_date: Optional[str] = None
    
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class CrewCreate(BaseModel):
    staff_name: str
    email: Optional[str] = None
    address: Optional[str] = None
    telephone: Optional[str] = None
    mobile: Optional[str] = None
    contact_details: Optional[str] = None
    next_of_kin: Optional[str] = None
    kin_contact: Optional[str] = None
    date_commenced: Optional[str] = None
    date_joined_vessel: Optional[str] = None
    date_left_vessel: Optional[str] = None
    default_position: Optional[str] = None
    role: Optional[str] = "Crew"
    qualifications: Optional[List[QualificationItem]] = []
    qualifications_comment: Optional[str] = None
    experience: Optional[str] = None
    cv_url: Optional[str] = None
    master_class5_proof: Optional[bool] = False
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    medical_cert_expiry: Optional[str] = None
    briefings_observed: Optional[List[TrainingItem]] = []
    briefings_delivered: Optional[List[TrainingItem]] = []
    practical_experience: Optional[List[TrainingItem]] = []
    owner_name: Optional[str] = None
    owner_signature: Optional[str] = None
    owner_date: Optional[str] = None
    staff_signature: Optional[str] = None
    staff_date: Optional[str] = None

# ============================================================================
# CREW ENDPOINTS
# ============================================================================

@api_router.post("/crew")
async def create_crew(crew_data: CrewCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    crew = Crew(**crew_data.model_dump(), created_by=current_user["id"])
    await db.crew.insert_one(crew.model_dump())
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "create",
        "crew",
        crew.id,
        crew.staff_name
    )
    
    return crew

@api_router.get("/crew")
async def get_crew(current_user: dict = Depends(get_current_user)):
    crew_list = await db.crew.find({}, {"_id": 0}).sort("staff_name", 1).to_list(1000)
    
    # Handle old qualification format (string to object array)
    for member in crew_list:
        if member.get("qualifications") and isinstance(member["qualifications"], str):
            member["qualifications"] = [{"name": member["qualifications"], "date": None}]
    
    return crew_list

@api_router.get("/crew/{crew_id}")
async def get_crew_member(crew_id: str, current_user: dict = Depends(get_current_user)):
    crew = await db.crew.find_one({"id": crew_id}, {"_id": 0})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew member not found")
    
    # Handle old qualification format
    if crew.get("qualifications") and isinstance(crew["qualifications"], str):
        crew["qualifications"] = [{"name": crew["qualifications"], "date": None}]
    
    return crew

@api_router.post("/crew/check-duplicate")
async def check_crew_duplicate(crew_data: dict, current_user: dict = Depends(get_current_user)):
    """Check for duplicate crew members by email, phone, or name"""
    duplicates = []
    crew_id = crew_data.get("id")
    
    # Check email
    if crew_data.get("email"):
        query = {"email": crew_data["email"]}
        if crew_id:
            query["id"] = {"$ne": crew_id}
        existing = await db.crew.find_one(query, {"_id": 0})
        if existing:
            duplicates.append({
                "field": "email",
                "value": crew_data["email"],
                "existing_record": {
                    "id": existing["id"],
                    "name": existing["staff_name"],
                    "position": existing.get("position", "N/A")
                }
            })
    
    # Check phone
    if crew_data.get("phone"):
        query = {"phone": crew_data["phone"]}
        if crew_id:
            query["id"] = {"$ne": crew_id}
        existing = await db.crew.find_one(query, {"_id": 0})
        if existing:
            duplicates.append({
                "field": "phone",
                "value": crew_data["phone"],
                "existing_record": {
                    "id": existing["id"],
                    "name": existing["staff_name"],
                    "position": existing.get("position", "N/A")
                }
            })
    
    # Check similar name (exact match only)
    if crew_data.get("staff_name"):
        query = {"staff_name": crew_data["staff_name"]}
        if crew_id:
            query["id"] = {"$ne": crew_id}
        existing = await db.crew.find_one(query, {"_id": 0})
        if existing:
            duplicates.append({
                "field": "name",
                "value": crew_data["staff_name"],
                "existing_record": {
                    "id": existing["id"],
                    "name": existing["staff_name"],
                    "position": existing.get("position", "N/A")
                }
            })
    
    return {
        "has_duplicates": len(duplicates) > 0,
        "duplicates": duplicates
    }

@api_router.put("/crew/{crew_id}")
async def update_crew(crew_id: str, crew_data: CrewCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    crew = await db.crew.find_one({"id": crew_id}, {"_id": 0})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew member not found")
    
    update_dict = crew_data.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    await db.crew.update_one({"id": crew_id}, {"$set": update_dict})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "update",
        "crew",
        crew_id,
        crew["staff_name"]
    )
    
    updated = await db.crew.find_one({"id": crew_id}, {"_id": 0})
    return updated

@api_router.delete("/crew/{crew_id}")
async def delete_crew(crew_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    crew = await db.crew.find_one({"id": crew_id}, {"_id": 0})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew member not found")
    
    await db.crew.delete_one({"id": crew_id})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "delete",
        "crew",
        crew_id,
        crew["staff_name"]
    )
    
    return {"message": "Crew member deleted successfully"}

# ============================================================================
# DOCUMENT MODELS
# ============================================================================

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_name: str
    category: str  # Vessel, Crew, Safety, Compliance, Other
    file_url: str
    file_type: Optional[str] = None
    description: Optional[str] = None
    vessel_id: Optional[str] = None  # None = global document, vessel_id = vessel-specific
    uploaded_by: str
    upload_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class DocumentCreate(BaseModel):
    document_name: str
    category: str
    file_url: str
    file_type: Optional[str] = None
    description: Optional[str] = None
    vessel_id: Optional[str] = None

# ============================================================================
# TRIP MODELS
# ============================================================================

class Trip(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trip_name: str
    vessel_id: str
    trip_type: Optional[str] = None
    operating_area: Optional[str] = None
    depart_datetime: Optional[datetime] = None  # Keep for backward compatibility
    arrival_datetime: Optional[datetime] = None  # Keep for backward compatibility
    planned_depart_datetime: Optional[datetime] = None
    planned_arrival_datetime: Optional[datetime] = None
    actual_depart_datetime: Optional[datetime] = None
    actual_arrival_datetime: Optional[datetime] = None
    depart_location: Optional[str] = None
    arrival_location: Optional[str] = None
    number_of_passengers: Optional[int] = 0
    number_of_crew: Optional[int] = 0
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class TripCreate(BaseModel):
    trip_name: str
    vessel_id: str
    trip_type: Optional[str] = None
    operating_area: Optional[str] = None
    planned_depart_datetime: datetime
    planned_arrival_datetime: Optional[datetime] = None
    actual_depart_datetime: Optional[datetime] = None
    actual_arrival_datetime: Optional[datetime] = None
    depart_location: Optional[str] = None
    arrival_location: Optional[str] = None
    number_of_passengers: Optional[int] = 0
    number_of_crew: Optional[int] = 0

class TripLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trip_id: str
    crew_id: str
    crew_name: str
    shift_start_datetime: datetime
    shift_stop_datetime: Optional[datetime] = None
    task_performed: Optional[str] = None
    total_hours: Optional[float] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TripLogCreate(BaseModel):
    trip_id: str
    crew_id: str
    crew_name: str
    shift_start_datetime: datetime
    shift_stop_datetime: Optional[datetime] = None
    task_performed: Optional[str] = None

class RunningLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trip_id: str
    crew_id: str
    crew_name: str
    log_datetime: datetime
    activity: str
    activity_details: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RunningLogCreate(BaseModel):
    trip_id: str
    crew_id: str
    crew_name: str
    log_datetime: datetime
    activity: str
    activity_details: Optional[str] = None

class EngineRunningLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trip_id: str
    log_datetime: datetime
    # Engine One
    engine1_rpm: Optional[float] = None
    engine1_water_temp: Optional[float] = None
    engine1_oil_temp: Optional[float] = None
    engine1_oil_pressure: Optional[float] = None
    engine1_gearbox_temp: Optional[float] = None
    engine1_gearbox_pressure: Optional[float] = None
    engine1_pyrometers: Optional[float] = None
    engine1_battery_volts: Optional[float] = None
    engine1_aux_volts: Optional[float] = None
    engine1_fuel_level: Optional[float] = None
    engine1_engine_hrs_start: Optional[float] = None
    engine1_engine_hrs_end: Optional[float] = None
    # Engine Two
    engine2_rpm: Optional[float] = None
    engine2_water_temp: Optional[float] = None
    engine2_oil_temp: Optional[float] = None
    engine2_oil_pressure: Optional[float] = None
    engine2_gearbox_temp: Optional[float] = None
    engine2_gearbox_pressure: Optional[float] = None
    engine2_pyrometers: Optional[float] = None
    engine2_battery_volts: Optional[float] = None
    engine2_aux_volts: Optional[float] = None
    engine2_fuel_level: Optional[float] = None
    engine2_engine_hrs_start: Optional[float] = None
    engine2_engine_hrs_end: Optional[float] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EngineRunningLogCreate(BaseModel):
    trip_id: str
    log_datetime: datetime
    # Engine One
    engine1_rpm: Optional[float] = None
    engine1_water_temp: Optional[float] = None
    engine1_oil_temp: Optional[float] = None
    engine1_oil_pressure: Optional[float] = None
    engine1_gearbox_temp: Optional[float] = None
    engine1_gearbox_pressure: Optional[float] = None
    engine1_pyrometers: Optional[float] = None
    engine1_battery_volts: Optional[float] = None
    engine1_aux_volts: Optional[float] = None
    engine1_fuel_level: Optional[float] = None
    engine1_engine_hrs_start: Optional[float] = None
    engine1_engine_hrs_end: Optional[float] = None
    # Engine Two
    engine2_rpm: Optional[float] = None
    engine2_water_temp: Optional[float] = None
    engine2_oil_temp: Optional[float] = None
    engine2_oil_pressure: Optional[float] = None
    engine2_gearbox_temp: Optional[float] = None
    engine2_gearbox_pressure: Optional[float] = None
    engine2_pyrometers: Optional[float] = None
    engine2_battery_volts: Optional[float] = None
    engine2_aux_volts: Optional[float] = None
    engine2_fuel_level: Optional[float] = None
    engine2_engine_hrs_start: Optional[float] = None
    engine2_engine_hrs_end: Optional[float] = None

# ============================================================================
# DOCUMENT ENDPOINTS
# ============================================================================

@api_router.post("/documents")
async def create_document(doc_data: DocumentCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    document = Document(**doc_data.model_dump(), uploaded_by=current_user["id"])
    await db.documents.insert_one(document.model_dump())
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "create",
        "document",
        document.id,
        document.document_name
    )
    
    return document

@api_router.get("/documents")
async def get_documents(vessel_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get documents. If vessel_id is provided, filter by vessel. If 'global', show only global documents."""
    query = {}
    if vessel_id:
        if vessel_id == "global":
            query["vessel_id"] = None
        else:
            query["vessel_id"] = vessel_id
    
    documents = await db.documents.find(query, {"_id": 0}).sort("upload_date", -1).to_list(1000)
    
    # Batch query optimization: Fetch all vessels at once
    vessel_ids = list(set(doc["vessel_id"] for doc in documents if doc.get("vessel_id")))
    if vessel_ids:
        vessels = await db.vessels.find({"id": {"$in": vessel_ids}}, {"_id": 0, "id": 1, "vessel_name": 1}).to_list(len(vessel_ids))
        vessel_map = {vessel["id"]: vessel for vessel in vessels}
        
        for doc in documents:
            if doc.get("vessel_id"):
                vessel = vessel_map.get(doc["vessel_id"])
                if vessel:
                    doc["vessel_name"] = vessel.get("vessel_name")
    
    return documents

@api_router.get("/documents/{doc_id}")
async def get_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    document = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document

@api_router.put("/documents/{doc_id}")
async def update_document(doc_id: str, doc_data: DocumentCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    document = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    update_dict = doc_data.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    await db.documents.update_one({"id": doc_id}, {"$set": update_dict})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "update",
        "document",
        doc_id,
        document["document_name"]
    )
    
    updated = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    return updated

@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    document = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await db.documents.delete_one({"id": doc_id})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "delete",
        "document",
        doc_id,
        document["document_name"]
    )
    
    return {"message": "Document deleted successfully"}

@api_router.post("/documents/upload")
async def upload_document_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_access_level(AccessLevel.EDIT))
):
    """Upload a file and return the file URL"""
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = Path("/app/backend/uploads")
        upload_dir.mkdir(exist_ok=True)
        
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = upload_dir / unique_filename
        
        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return file URL
        file_url = f"/api/uploads/{unique_filename}"
        
        return {
            "file_url": file_url,
            "filename": file.filename,
            "file_type": file.content_type,
            "size": file_path.stat().st_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

# ============================================================================
# TRIP ENDPOINTS
# ============================================================================

@api_router.post("/trips")
async def create_trip(trip_data: TripCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    trip = Trip(**trip_data.model_dump(), created_by=current_user["id"])
    await db.trips.insert_one(trip.model_dump())
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "create",
        "trips",
        trip.id,
        f"Created trip: {trip.trip_name}"
    )
    
    return trip

@api_router.get("/trips")
async def get_trips(vessel_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if vessel_id:
        query["vessel_id"] = vessel_id
    
    trips = await db.trips.find(query, {"_id": 0}).sort([("planned_depart_datetime", -1), ("depart_datetime", -1)]).to_list(1000)
    
    # Batch query optimization: Fetch all vessels at once
    vessel_ids = list(set(trip["vessel_id"] for trip in trips if trip.get("vessel_id")))
    if vessel_ids:
        vessels = await db.vessels.find({"id": {"$in": vessel_ids}}, {"_id": 0, "id": 1, "vessel_name": 1}).to_list(len(vessel_ids))
        vessel_map = {vessel["id"]: vessel for vessel in vessels}
        
        for trip in trips:
            if trip.get("vessel_id"):
                vessel = vessel_map.get(trip["vessel_id"])
                if vessel:
                    trip["vessel_name"] = vessel.get("vessel_name")
    
    return trips

@api_router.get("/trips/{trip_id}")
async def get_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Enrich with vessel name
    if trip.get("vessel_id"):
        vessel = await db.vessels.find_one({"id": trip["vessel_id"]}, {"_id": 0, "vessel_name": 1})
        if vessel:
            trip["vessel_name"] = vessel.get("vessel_name")
    
    return trip

@api_router.post("/trips/check-duplicate")
async def check_trip_duplicate(trip_data: dict, current_user: dict = Depends(get_current_user)):
    """Check for duplicate trips by name or overlapping dates on same vessel"""
    duplicates = []
    trip_id = trip_data.get("id")
    
    # Check trip name
    if trip_data.get("trip_name"):
        query = {"trip_name": trip_data["trip_name"]}
        if trip_id:
            query["id"] = {"$ne": trip_id}
        existing = await db.trips.find_one(query, {"_id": 0})
        if existing:
            duplicates.append({
                "field": "trip_name",
                "value": trip_data["trip_name"],
                "existing_record": {
                    "id": existing["id"],
                    "name": existing["trip_name"],
                    "depart": existing.get("depart_datetime", "N/A")
                }
            })
    
    # Check overlapping dates on same vessel
    if trip_data.get("vessel_id") and trip_data.get("depart_datetime") and trip_data.get("return_datetime"):
        query = {
            "vessel_id": trip_data["vessel_id"],
            "$or": [
                {
                    "depart_datetime": {"$lte": trip_data["return_datetime"]},
                    "return_datetime": {"$gte": trip_data["depart_datetime"]}
                }
            ]
        }
        if trip_id:
            query["id"] = {"$ne": trip_id}
        existing = await db.trips.find_one(query, {"_id": 0})
        if existing:
            duplicates.append({
                "field": "date_overlap",
                "value": f"{trip_data['depart_datetime']} to {trip_data['return_datetime']}",
                "existing_record": {
                    "id": existing["id"],
                    "name": existing["trip_name"],
                    "depart": existing.get("depart_datetime", "N/A"),
                    "return": existing.get("return_datetime", "N/A")
                }
            })
    
    return {
        "has_duplicates": len(duplicates) > 0,
        "duplicates": duplicates
    }

@api_router.put("/trips/{trip_id}")
async def update_trip(trip_id: str, trip_data: TripCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    update_dict = trip_data.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    await db.trips.update_one({"id": trip_id}, {"$set": update_dict})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "update",
        "trips",
        trip_id,
        f"Updated trip: {trip_data.trip_name}"
    )
    
    return {"message": "Trip updated successfully"}

@api_router.delete("/trips/{trip_id}")
async def delete_trip(trip_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Delete associated logs
    await db.trip_logs.delete_many({"trip_id": trip_id})
    
    await db.trips.delete_one({"id": trip_id})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "delete",
        "trips",
        trip_id,
        f"Deleted trip: {trip.get('trip_name')}"
    )
    
    return {"message": "Trip deleted successfully"}

# ============================================================================
# TRIP LOG ENDPOINTS
# ============================================================================

@api_router.post("/trip-logs")
async def create_trip_log(log_data: TripLogCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    # Calculate total hours only if stop time is provided
    total_hours = None
    if log_data.shift_stop_datetime:
        time_diff = log_data.shift_stop_datetime - log_data.shift_start_datetime
        total_hours = round(time_diff.total_seconds() / 3600, 2)
    
    trip_log = TripLog(
        **log_data.model_dump(),
        total_hours=total_hours,
        created_by=current_user["id"]
    )
    await db.trip_logs.insert_one(trip_log.model_dump())
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "create",
        "trip_logs",
        trip_log.id,
        f"Created trip log for {log_data.crew_name}"
    )
    
    return trip_log

@api_router.get("/trip-logs")
async def get_trip_logs(trip_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if trip_id:
        query["trip_id"] = trip_id
    
    logs = await db.trip_logs.find(query, {"_id": 0}).sort("shift_start_datetime", 1).to_list(1000)
    return logs

@api_router.get("/trip-logs/{log_id}")
async def get_trip_log(log_id: str, current_user: dict = Depends(get_current_user)):
    log = await db.trip_logs.find_one({"id": log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Trip log not found")
    return log

@api_router.put("/trip-logs/{log_id}")
async def update_trip_log(log_id: str, log_data: TripLogCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    log = await db.trip_logs.find_one({"id": log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Trip log not found")
    
    # Recalculate total hours only if stop time is provided
    total_hours = None
    if log_data.shift_stop_datetime:
        time_diff = log_data.shift_stop_datetime - log_data.shift_start_datetime
        total_hours = round(time_diff.total_seconds() / 3600, 2)
    
    update_dict = log_data.model_dump()
    update_dict["total_hours"] = total_hours
    
    await db.trip_logs.update_one({"id": log_id}, {"$set": update_dict})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "update",
        "trip_logs",
        log_id,
        f"Updated trip log for {log_data.crew_name}"
    )
    
    return {"message": "Trip log updated successfully"}

@api_router.delete("/trip-logs/{log_id}")
async def delete_trip_log(log_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    log = await db.trip_logs.find_one({"id": log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Trip log not found")
    
    await db.trip_logs.delete_one({"id": log_id})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "delete",
        "trip_logs",
        log_id,
        f"Deleted trip log for {log.get('crew_name')}"
    )
    
    return {"message": "Trip log deleted successfully"}

# ============================================================================
# RUNNING LOG ENDPOINTS
# ============================================================================

@api_router.post("/running-logs")
async def create_running_log(log_data: RunningLogCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    running_log = RunningLog(**log_data.model_dump(), created_by=current_user["id"])
    await db.running_logs.insert_one(running_log.model_dump())
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "create",
        "running_logs",
        running_log.id,
        f"Created running log: {log_data.activity}"
    )
    
    return running_log

@api_router.get("/running-logs")
async def get_running_logs(trip_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if trip_id:
        query["trip_id"] = trip_id
    
    logs = await db.running_logs.find(query, {"_id": 0}).sort("log_datetime", -1).to_list(1000)
    return logs

@api_router.get("/running-logs/{log_id}")
async def get_running_log(log_id: str, current_user: dict = Depends(get_current_user)):
    log = await db.running_logs.find_one({"id": log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Running log not found")
    return log

@api_router.put("/running-logs/{log_id}")
async def update_running_log(log_id: str, log_data: RunningLogCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    log = await db.running_logs.find_one({"id": log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Running log not found")
    
    await db.running_logs.update_one({"id": log_id}, {"$set": log_data.model_dump()})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "update",
        "running_logs",
        log_id,
        f"Updated running log: {log_data.activity}"
    )
    
    return {"message": "Running log updated successfully"}

@api_router.delete("/running-logs/{log_id}")
async def delete_running_log(log_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    log = await db.running_logs.find_one({"id": log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Running log not found")
    
    await db.running_logs.delete_one({"id": log_id})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "delete",
        "running_logs",
        log_id,
        f"Deleted running log: {log.get('activity')}"
    )
    
    return {"message": "Running log deleted successfully"}

# ============================================================================
# ENGINE RUNNING LOG ENDPOINTS
# ============================================================================

@api_router.post("/engine-running-logs")
async def create_engine_running_log(log_data: EngineRunningLogCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    engine_log = EngineRunningLog(**log_data.model_dump(), created_by=current_user["id"])
    await db.engine_running_logs.insert_one(engine_log.model_dump())
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "create",
        "engine_running_logs",
        engine_log.id,
        "Created engine running log"
    )
    
    return engine_log

@api_router.get("/engine-running-logs")
async def get_engine_running_logs(trip_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if trip_id:
        query["trip_id"] = trip_id
    
    logs = await db.engine_running_logs.find(query, {"_id": 0}).sort("log_datetime", -1).to_list(1000)
    return logs

@api_router.get("/engine-running-logs/{log_id}")
async def get_engine_running_log(log_id: str, current_user: dict = Depends(get_current_user)):
    log = await db.engine_running_logs.find_one({"id": log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Engine running log not found")
    return log

@api_router.put("/engine-running-logs/{log_id}")
async def update_engine_running_log(log_id: str, log_data: EngineRunningLogCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    log = await db.engine_running_logs.find_one({"id": log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Engine running log not found")
    
    await db.engine_running_logs.update_one({"id": log_id}, {"$set": log_data.model_dump()})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "update",
        "engine_running_logs",
        log_id,
        "Updated engine running log"
    )
    
    return {"message": "Engine running log updated successfully"}

@api_router.delete("/engine-running-logs/{log_id}")
async def delete_engine_running_log(log_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    log = await db.engine_running_logs.find_one({"id": log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Engine running log not found")
    
    await db.engine_running_logs.delete_one({"id": log_id})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "delete",
        "engine_running_logs",
        log_id,
        "Deleted engine running log"
    )
    
    return {"message": "Engine running log deleted successfully"}

# ============================================================================
# ALLOCATED CREW ENDPOINTS
# ============================================================================

class AllocatedCrew(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trip_id: str
    crew_id: str
    crew_name: str
    position: str
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AllocatedCrewCreate(BaseModel):
    trip_id: str
    crew_id: str
    crew_name: str
    position: str

@api_router.post("/allocated-crew")
async def create_allocated_crew(crew_data: AllocatedCrewCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    allocated_crew = AllocatedCrew(**crew_data.model_dump(), created_by=current_user["id"])
    await db.allocated_crew.insert_one(allocated_crew.model_dump())
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "create",
        "allocated_crew",
        allocated_crew.id,
        f"Allocated crew {crew_data.crew_name} to trip"
    )
    
    return allocated_crew

@api_router.get("/allocated-crew")
async def get_allocated_crew(trip_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if trip_id:
        query["trip_id"] = trip_id
    
    crew = await db.allocated_crew.find(query, {"_id": 0}).sort("crew_name", 1).to_list(1000)
    return crew

@api_router.get("/allocated-crew/{crew_allocation_id}")
async def get_allocated_crew_member(crew_allocation_id: str, current_user: dict = Depends(get_current_user)):
    crew = await db.allocated_crew.find_one({"id": crew_allocation_id}, {"_id": 0})
    if not crew:
        raise HTTPException(status_code=404, detail="Allocated crew not found")
    return crew

@api_router.put("/allocated-crew/{crew_allocation_id}")
async def update_allocated_crew(crew_allocation_id: str, crew_data: AllocatedCrewCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    crew = await db.allocated_crew.find_one({"id": crew_allocation_id}, {"_id": 0})
    if not crew:
        raise HTTPException(status_code=404, detail="Allocated crew not found")
    
    await db.allocated_crew.update_one({"id": crew_allocation_id}, {"$set": crew_data.model_dump()})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "update",
        "allocated_crew",
        crew_allocation_id,
        f"Updated allocated crew {crew_data.crew_name}"
    )
    
    return {"message": "Allocated crew updated successfully"}

@api_router.delete("/allocated-crew/{crew_allocation_id}")
async def delete_allocated_crew(crew_allocation_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    crew = await db.allocated_crew.find_one({"id": crew_allocation_id}, {"_id": 0})
    if not crew:
        raise HTTPException(status_code=404, detail="Allocated crew not found")
    
    await db.allocated_crew.delete_one({"id": crew_allocation_id})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "delete",
        "allocated_crew",
        crew_allocation_id,
        f"Removed allocated crew {crew['crew_name']}"
    )
    
    return {"message": "Allocated crew removed successfully"}

# ============================================================================
# RISK ASSESSMENT ENDPOINTS
# ============================================================================

class RiskAssessment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    activity_task: str
    location: Optional[str] = None
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    hazard: str
    risk_description: Optional[str] = None
    likelihood: str  # 1-5
    consequence: str  # 1-5
    risk_level: str  # Critical, High, Medium, Low, Very Low
    risk_rating: str  # Calculated value
    control_measures: Optional[str] = None
    residual_likelihood: Optional[str] = None
    residual_consequence: Optional[str] = None
    residual_risk_level: Optional[str] = None
    residual_risk_rating: Optional[str] = None
    responsible_person: Optional[str] = None
    review_date: Optional[datetime] = None
    status: str = "Active"  # Active, Under Review, Archived
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class RiskAssessmentCreate(BaseModel):
    activity_task: str
    location: Optional[str] = None
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    hazard: str
    risk_description: Optional[str] = None
    likelihood: str
    consequence: str
    risk_level: str
    risk_rating: str
    control_measures: Optional[str] = None
    residual_likelihood: Optional[str] = None
    residual_consequence: Optional[str] = None
    residual_risk_level: Optional[str] = None
    residual_risk_rating: Optional[str] = None
    responsible_person: Optional[str] = None
    review_date: Optional[str] = None
    status: str = "Active"
    notes: Optional[str] = None

@api_router.post("/risk-assessments")
async def create_risk_assessment(risk_data: RiskAssessmentCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    # Convert review_date string to datetime if provided
    review_date = None
    if risk_data.review_date:
        try:
            review_date = datetime.fromisoformat(risk_data.review_date.replace('Z', '+00:00'))
        except:
            pass
    
    risk_dict = risk_data.model_dump()
    risk_dict['review_date'] = review_date
    
    risk_assessment = RiskAssessment(
        **risk_dict,
        created_by=current_user["id"],
        created_by_name=current_user["full_name"]
    )
    
    await db.risk_assessments.insert_one(risk_assessment.model_dump())
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "create",
        "risk_assessment",
        risk_assessment.id,
        f"Created risk assessment: {risk_data.activity_task}"
    )
    
    return risk_assessment

@api_router.get("/risk-assessments")
async def get_risk_assessments(
    vessel_id: Optional[str] = None,
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if vessel_id:
        query["vessel_id"] = vessel_id
    if status:
        query["status"] = status
    if risk_level:
        query["risk_level"] = risk_level
    
    risk_assessments = await db.risk_assessments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return risk_assessments

@api_router.get("/risk-assessments/{risk_id}")
async def get_risk_assessment(risk_id: str, current_user: dict = Depends(get_current_user)):
    risk = await db.risk_assessments.find_one({"id": risk_id}, {"_id": 0})
    if not risk:
        raise HTTPException(status_code=404, detail="Risk assessment not found")
    return risk

@api_router.put("/risk-assessments/{risk_id}")
async def update_risk_assessment(risk_id: str, risk_data: RiskAssessmentCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    risk = await db.risk_assessments.find_one({"id": risk_id}, {"_id": 0})
    if not risk:
        raise HTTPException(status_code=404, detail="Risk assessment not found")
    
    # Convert review_date string to datetime if provided
    review_date = None
    if risk_data.review_date:
        try:
            review_date = datetime.fromisoformat(risk_data.review_date.replace('Z', '+00:00'))
        except:
            pass
    
    risk_dict = risk_data.model_dump()
    risk_dict['review_date'] = review_date
    risk_dict['updated_at'] = datetime.now(timezone.utc)
    
    await db.risk_assessments.update_one({"id": risk_id}, {"$set": risk_dict})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "update",
        "risk_assessment",
        risk_id,
        f"Updated risk assessment: {risk_data.activity_task}"
    )
    
    return {"message": "Risk assessment updated successfully"}

@api_router.delete("/risk-assessments/{risk_id}")
async def delete_risk_assessment(risk_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    risk = await db.risk_assessments.find_one({"id": risk_id}, {"_id": 0})
    if not risk:
        raise HTTPException(status_code=404, detail="Risk assessment not found")
    
    await db.risk_assessments.delete_one({"id": risk_id})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "delete",
        "risk_assessment",
        risk_id,
        f"Deleted risk assessment: {risk['activity_task']}"
    )
    
    return {"message": "Risk assessment deleted successfully"}

# ============================================================================
# MAINTENANCE ENDPOINTS
# ============================================================================

class Maintenance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    maintenance_type: str  # Scheduled, Unscheduled, Emergency, Preventive, Corrective
    equipment_system: str
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    status: str = "Scheduled"  # Scheduled, In Progress, Completed, Overdue, Cancelled
    priority: str = "Medium"  # Low, Medium, High, Critical
    responsible_person: Optional[str] = None
    cost: Optional[float] = None
    parts_used: Optional[str] = None
    labor_hours: Optional[float] = None
    completion_notes: Optional[str] = None
    next_service_date: Optional[datetime] = None
    service_frequency: Optional[str] = None
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class MaintenanceCreate(BaseModel):
    title: str
    maintenance_type: str
    equipment_system: str
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[str] = None
    completed_date: Optional[str] = None
    status: str = "Scheduled"
    priority: str = "Medium"
    responsible_person: Optional[str] = None
    cost: Optional[float] = None
    parts_used: Optional[str] = None
    labor_hours: Optional[float] = None
    completion_notes: Optional[str] = None
    next_service_date: Optional[str] = None
    service_frequency: Optional[str] = None
    notes: Optional[str] = None

@api_router.post("/maintenance")
async def create_maintenance(maintenance_data: MaintenanceCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    # Convert date strings to datetime
    scheduled_date = None
    if maintenance_data.scheduled_date:
        try:
            scheduled_date = datetime.fromisoformat(maintenance_data.scheduled_date.replace('Z', '+00:00'))
        except:
            pass
    
    completed_date = None
    if maintenance_data.completed_date:
        try:
            completed_date = datetime.fromisoformat(maintenance_data.completed_date.replace('Z', '+00:00'))
        except:
            pass
    
    next_service_date = None
    if maintenance_data.next_service_date:
        try:
            next_service_date = datetime.fromisoformat(maintenance_data.next_service_date.replace('Z', '+00:00'))
        except:
            pass
    
    maintenance_dict = maintenance_data.model_dump()
    maintenance_dict['scheduled_date'] = scheduled_date
    maintenance_dict['completed_date'] = completed_date
    maintenance_dict['next_service_date'] = next_service_date
    
    maintenance = Maintenance(
        **maintenance_dict,
        created_by=current_user["id"],
        created_by_name=current_user["full_name"]
    )
    
    await db.maintenance.insert_one(maintenance.model_dump())
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "create",
        "maintenance",
        maintenance.id,
        f"Created maintenance record: {maintenance_data.title}"
    )
    
    return maintenance

@api_router.get("/maintenance")
async def get_maintenance(
    vessel_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if vessel_id:
        query["vessel_id"] = vessel_id
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    
    maintenance_records = await db.maintenance.find(query, {"_id": 0}).sort("scheduled_date", -1).to_list(1000)
    return maintenance_records

@api_router.get("/maintenance/{maintenance_id}")
async def get_maintenance_record(maintenance_id: str, current_user: dict = Depends(get_current_user)):
    maintenance = await db.maintenance.find_one({"id": maintenance_id}, {"_id": 0})
    if not maintenance:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    return maintenance

@api_router.put("/maintenance/{maintenance_id}")
async def update_maintenance(maintenance_id: str, maintenance_data: MaintenanceCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    maintenance = await db.maintenance.find_one({"id": maintenance_id}, {"_id": 0})
    if not maintenance:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    
    # Convert date strings to datetime
    scheduled_date = None
    if maintenance_data.scheduled_date:
        try:
            scheduled_date = datetime.fromisoformat(maintenance_data.scheduled_date.replace('Z', '+00:00'))
        except:
            pass
    
    completed_date = None
    if maintenance_data.completed_date:
        try:
            completed_date = datetime.fromisoformat(maintenance_data.completed_date.replace('Z', '+00:00'))
        except:
            pass
    
    next_service_date = None
    if maintenance_data.next_service_date:
        try:
            next_service_date = datetime.fromisoformat(maintenance_data.next_service_date.replace('Z', '+00:00'))
        except:
            pass
    
    maintenance_dict = maintenance_data.model_dump()
    maintenance_dict['scheduled_date'] = scheduled_date
    maintenance_dict['completed_date'] = completed_date
    maintenance_dict['next_service_date'] = next_service_date
    maintenance_dict['updated_at'] = datetime.now(timezone.utc)
    
    await db.maintenance.update_one({"id": maintenance_id}, {"$set": maintenance_dict})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "update",
        "maintenance",
        maintenance_id,
        f"Updated maintenance record: {maintenance_data.title}"
    )
    
    return {"message": "Maintenance record updated successfully"}

@api_router.delete("/maintenance/{maintenance_id}")
async def delete_maintenance(maintenance_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    maintenance = await db.maintenance.find_one({"id": maintenance_id}, {"_id": 0})
    if not maintenance:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    
    await db.maintenance.delete_one({"id": maintenance_id})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "delete",
        "maintenance",
        maintenance_id,
        f"Deleted maintenance record: {maintenance['title']}"
    )
    
    return {"message": "Maintenance record deleted successfully"}

# ============================================================================
# INCIDENTS MODULE (PHASE 2)
# ============================================================================

class Incident(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    incident_number: str
    incident_type: str  # Injury, Near Miss, Equipment Failure, Environmental, Security, Other
    severity: str  # Minor, Moderate, Serious, Critical
    title: str
    description: str
    incident_date: datetime
    location: str
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    injuries: bool = False
    injury_details: Optional[str] = None
    witnesses: Optional[str] = None
    immediate_actions: Optional[str] = None
    investigation_status: str = "Reported"  # Reported, Under Investigation, Completed, Closed
    root_cause: Optional[str] = None
    corrective_actions: Optional[str] = None
    preventive_actions: Optional[str] = None
    responsible_person: Optional[str] = None
    target_completion_date: Optional[datetime] = None
    actual_completion_date: Optional[datetime] = None
    reported_by: str
    reported_by_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IncidentCreate(BaseModel):
    incident_type: str
    severity: str
    title: str
    description: str
    incident_date: str
    location: str
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    injuries: bool = False
    injury_details: Optional[str] = None
    witnesses: Optional[str] = None
    immediate_actions: Optional[str] = None
    investigation_status: str = "Reported"
    root_cause: Optional[str] = None
    corrective_actions: Optional[str] = None
    preventive_actions: Optional[str] = None
    responsible_person: Optional[str] = None
    target_completion_date: Optional[str] = None

@api_router.post("/incidents")
async def create_incident(incident_data: IncidentCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    # Generate incident number
    count = await db.incidents.count_documents({})
    incident_number = f"INC-{datetime.now().year}-{str(count + 1).zfill(4)}"
    
    # Parse dates
    incident_date = datetime.fromisoformat(incident_data.incident_date.replace('Z', '+00:00'))
    target_date = None
    if incident_data.target_completion_date:
        try:
            target_date = datetime.fromisoformat(incident_data.target_completion_date.replace('Z', '+00:00'))
        except:
            pass
    
    incident_dict = incident_data.model_dump()
    incident_dict['incident_number'] = incident_number
    incident_dict['incident_date'] = incident_date
    incident_dict['target_completion_date'] = target_date
    
    incident = Incident(
        **incident_dict,
        reported_by=current_user["id"],
        reported_by_name=current_user["full_name"]
    )
    
    await db.incidents.insert_one(incident.model_dump())
    await log_audit(current_user["id"], current_user["full_name"], "create", "incident", incident.id, f"Reported incident: {incident_data.title}")
    
    return incident

@api_router.get("/incidents")
async def get_incidents(
    incident_type: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    vessel_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if incident_type:
        query["incident_type"] = incident_type
    if severity:
        query["severity"] = severity
    if status:
        query["investigation_status"] = status
    if vessel_id:
        query["vessel_id"] = vessel_id
    
    incidents = await db.incidents.find(query, {"_id": 0}).sort("incident_date", -1).to_list(1000)
    return incidents

@api_router.get("/incidents/{incident_id}")
async def get_incident(incident_id: str, current_user: dict = Depends(get_current_user)):
    incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@api_router.put("/incidents/{incident_id}")
async def update_incident(incident_id: str, incident_data: IncidentCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    existing = await db.incidents.find_one({"id": incident_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    incident_date = datetime.fromisoformat(incident_data.incident_date.replace('Z', '+00:00'))
    target_date = None
    if incident_data.target_completion_date:
        try:
            target_date = datetime.fromisoformat(incident_data.target_completion_date.replace('Z', '+00:00'))
        except:
            pass
    
    update_dict = incident_data.model_dump()
    update_dict['incident_date'] = incident_date
    update_dict['target_completion_date'] = target_date
    update_dict['updated_at'] = datetime.now(timezone.utc)
    
    await db.incidents.update_one({"id": incident_id}, {"$set": update_dict})
    await log_audit(current_user["id"], current_user["full_name"], "update", "incident", incident_id, f"Updated incident")
    
    return await db.incidents.find_one({"id": incident_id}, {"_id": 0})

@api_router.delete("/incidents/{incident_id}")
async def delete_incident(incident_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    incident = await db.incidents.find_one({"id": incident_id})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    await db.incidents.delete_one({"id": incident_id})
    await log_audit(current_user["id"], current_user["full_name"], "delete", "incident", incident_id, "Deleted incident")
    
    return {"message": "Incident deleted successfully"}

# ============================================================================
# EMERGENCY RESPONSE MODULE (PHASE 2)
# ============================================================================

class EmergencyContact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contact_type: str  # Crew, Shore, Authority, Medical, Supplier
    name: str
    organization: Optional[str] = None
    role: Optional[str] = None
    phone_primary: str
    phone_secondary: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    available_24_7: bool = False
    notes: Optional[str] = None
    vessel_id: Optional[str] = None
    priority: int = 1  # 1-5, 1 being highest priority
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmergencyContactCreate(BaseModel):
    contact_type: str
    name: str
    organization: Optional[str] = None
    role: Optional[str] = None
    phone_primary: str
    phone_secondary: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    available_24_7: bool = False
    notes: Optional[str] = None
    vessel_id: Optional[str] = None
    priority: int = 1

class EmergencyProcedure(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    emergency_type: str  # Fire, Medical, Man Overboard, Grounding, Collision, Flooding, etc.
    title: str
    procedure_steps: str
    equipment_required: Optional[str] = None
    muster_station: Optional[str] = None
    key_contacts: Optional[str] = None
    vessel_id: Optional[str] = None
    last_reviewed: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmergencyProcedureCreate(BaseModel):
    emergency_type: str
    title: str
    procedure_steps: str
    equipment_required: Optional[str] = None
    muster_station: Optional[str] = None
    key_contacts: Optional[str] = None
    vessel_id: Optional[str] = None

class EmergencyDrill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    drill_type: str
    drill_date: datetime
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    participants: Optional[str] = None
    duration_minutes: Optional[int] = None
    observations: Optional[str] = None
    areas_for_improvement: Optional[str] = None
    conducted_by: str
    conducted_by_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmergencyDrillCreate(BaseModel):
    drill_type: str
    drill_date: str
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    participants: Optional[str] = None
    duration_minutes: Optional[int] = None
    observations: Optional[str] = None
    areas_for_improvement: Optional[str] = None

# Emergency Contacts Endpoints
@api_router.post("/emergency/contacts")
async def create_emergency_contact(contact_data: EmergencyContactCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    contact = EmergencyContact(**contact_data.model_dump())
    await db.emergency_contacts.insert_one(contact.model_dump())
    await log_audit(current_user["id"], current_user["full_name"], "create", "emergency_contact", contact.id, f"Created emergency contact: {contact_data.name}")
    return contact

@api_router.get("/emergency/contacts")
async def get_emergency_contacts(contact_type: Optional[str] = None, vessel_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if contact_type:
        query["contact_type"] = contact_type
    if vessel_id:
        query["vessel_id"] = vessel_id
    contacts = await db.emergency_contacts.find(query, {"_id": 0}).sort("priority", 1).to_list(1000)
    return contacts

@api_router.put("/emergency/contacts/{contact_id}")
async def update_emergency_contact(contact_id: str, contact_data: EmergencyContactCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    await db.emergency_contacts.update_one({"id": contact_id}, {"$set": contact_data.model_dump()})
    return await db.emergency_contacts.find_one({"id": contact_id}, {"_id": 0})

@api_router.delete("/emergency/contacts/{contact_id}")
async def delete_emergency_contact(contact_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    await db.emergency_contacts.delete_one({"id": contact_id})
    return {"message": "Emergency contact deleted"}

# Emergency Procedures Endpoints
@api_router.post("/emergency/procedures")
async def create_emergency_procedure(procedure_data: EmergencyProcedureCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    procedure = EmergencyProcedure(**procedure_data.model_dump())
    await db.emergency_procedures.insert_one(procedure.model_dump())
    return procedure

@api_router.get("/emergency/procedures")
async def get_emergency_procedures(emergency_type: Optional[str] = None, vessel_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if emergency_type:
        query["emergency_type"] = emergency_type
    if vessel_id:
        query["vessel_id"] = vessel_id
    procedures = await db.emergency_procedures.find(query, {"_id": 0}).to_list(1000)
    return procedures

@api_router.put("/emergency/procedures/{procedure_id}")
async def update_emergency_procedure(procedure_id: str, procedure_data: EmergencyProcedureCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    update_dict = procedure_data.model_dump()
    update_dict['last_reviewed'] = datetime.now(timezone.utc)
    await db.emergency_procedures.update_one({"id": procedure_id}, {"$set": update_dict})
    return await db.emergency_procedures.find_one({"id": procedure_id}, {"_id": 0})

@api_router.delete("/emergency/procedures/{procedure_id}")
async def delete_emergency_procedure(procedure_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    await db.emergency_procedures.delete_one({"id": procedure_id})
    return {"message": "Emergency procedure deleted"}

# Emergency Drills Endpoints
@api_router.post("/emergency/drills")
async def create_emergency_drill(drill_data: EmergencyDrillCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    drill_date = datetime.fromisoformat(drill_data.drill_date.replace('Z', '+00:00'))
    drill_dict = drill_data.model_dump()
    drill_dict['drill_date'] = drill_date
    
    drill = EmergencyDrill(**drill_dict, conducted_by=current_user["id"], conducted_by_name=current_user["full_name"])
    await db.emergency_drills.insert_one(drill.model_dump())
    return drill

@api_router.get("/emergency/drills")
async def get_emergency_drills(vessel_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if vessel_id:
        query["vessel_id"] = vessel_id
    drills = await db.emergency_drills.find(query, {"_id": 0}).sort("drill_date", -1).to_list(1000)
    return drills

@api_router.put("/emergency/drills/{drill_id}")
async def update_emergency_drill(drill_id: str, drill_data: dict, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    if 'drill_date' in drill_data and drill_data['drill_date']:
        drill_data['drill_date'] = datetime.fromisoformat(drill_data['drill_date'].replace('Z', '+00:00'))
    
    drill_data['updated_at'] = datetime.now(timezone.utc)
    await db.emergency_drills.update_one({"id": drill_id}, {"$set": drill_data})
    return {"status": "success"}

@api_router.delete("/emergency/drills/{drill_id}")
async def delete_emergency_drill(drill_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    await db.emergency_drills.delete_one({"id": drill_id})
    return {"status": "success"}

# ============================================================================
# COMPLIANCE MODULE (PHASE 2)
# ============================================================================

class ComplianceCertificate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    certificate_type: str  # Vessel Certificate, Crew Certificate, Company Certificate
    certificate_name: str
    certificate_number: Optional[str] = None
    issuing_authority: str
    issue_date: datetime
    expiry_date: datetime
    status: str  # Valid, Expiring Soon, Expired, Suspended
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    crew_id: Optional[str] = None
    crew_name: Optional[str] = None
    renewal_notification_sent: bool = False
    document_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ComplianceCertificateCreate(BaseModel):
    certificate_type: str
    certificate_name: str
    certificate_number: Optional[str] = None
    issuing_authority: str
    issue_date: str
    expiry_date: str
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    crew_id: Optional[str] = None
    crew_name: Optional[str] = None
    document_id: Optional[str] = None
    notes: Optional[str] = None

class ComplianceRequirement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    requirement_name: str
    category: str  # Safety, Environmental, Operational, Administrative
    description: str
    regulatory_reference: Optional[str] = None
    compliance_status: str  # Compliant, Non-Compliant, Partial, Under Review
    last_audit_date: Optional[datetime] = None
    next_audit_date: Optional[datetime] = None
    responsible_person: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ComplianceRequirementCreate(BaseModel):
    requirement_name: str
    category: str
    description: str
    regulatory_reference: Optional[str] = None
    compliance_status: str = "Under Review"
    last_audit_date: Optional[str] = None
    next_audit_date: Optional[str] = None
    responsible_person: Optional[str] = None
    notes: Optional[str] = None

# Compliance Certificates Endpoints
@api_router.post("/compliance/certificates")
async def create_compliance_certificate(cert_data: ComplianceCertificateCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    issue_date = datetime.fromisoformat(cert_data.issue_date.replace('Z', '+00:00'))
    expiry_date = datetime.fromisoformat(cert_data.expiry_date.replace('Z', '+00:00'))
    
    # Ensure dates are timezone-aware
    if issue_date.tzinfo is None:
        issue_date = issue_date.replace(tzinfo=timezone.utc)
    if expiry_date.tzinfo is None:
        expiry_date = expiry_date.replace(tzinfo=timezone.utc)
    
    # Determine status based on expiry date
    now = datetime.now(timezone.utc)
    days_until_expiry = (expiry_date - now).days
    if days_until_expiry < 0:
        status = "Expired"
    elif days_until_expiry <= 30:
        status = "Expiring Soon"
    else:
        status = "Valid"
    
    cert_dict = cert_data.model_dump()
    cert_dict['issue_date'] = issue_date
    cert_dict['expiry_date'] = expiry_date
    cert_dict['status'] = status
    
    certificate = ComplianceCertificate(**cert_dict)
    await db.compliance_certificates.insert_one(certificate.model_dump())
    await log_audit(current_user["id"], current_user["full_name"], "create", "compliance_certificate", certificate.id, f"Added certificate: {cert_data.certificate_name}")
    return certificate

@api_router.get("/compliance/certificates")
async def get_compliance_certificates(
    certificate_type: Optional[str] = None,
    status: Optional[str] = None,
    vessel_id: Optional[str] = None,
    crew_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if certificate_type:
        query["certificate_type"] = certificate_type
    if status:
        query["status"] = status
    if vessel_id:
        query["vessel_id"] = vessel_id
    if crew_id:
        query["crew_id"] = crew_id
    
    certificates = await db.compliance_certificates.find(query, {"_id": 0}).sort("expiry_date", 1).to_list(1000)
    return certificates

@api_router.put("/compliance/certificates/{cert_id}")
async def update_compliance_certificate(cert_id: str, cert_data: ComplianceCertificateCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    issue_date = datetime.fromisoformat(cert_data.issue_date.replace('Z', '+00:00'))
    expiry_date = datetime.fromisoformat(cert_data.expiry_date.replace('Z', '+00:00'))
    
    # Ensure dates are timezone-aware
    if issue_date.tzinfo is None:
        issue_date = issue_date.replace(tzinfo=timezone.utc)
    if expiry_date.tzinfo is None:
        expiry_date = expiry_date.replace(tzinfo=timezone.utc)
    
    now = datetime.now(timezone.utc)
    days_until_expiry = (expiry_date - now).days
    if days_until_expiry < 0:
        status = "Expired"
    elif days_until_expiry <= 30:
        status = "Expiring Soon"
    else:
        status = "Valid"
    
    cert_dict = cert_data.model_dump()
    cert_dict['issue_date'] = issue_date
    cert_dict['expiry_date'] = expiry_date
    cert_dict['status'] = status
    
    await db.compliance_certificates.update_one({"id": cert_id}, {"$set": cert_dict})
    return await db.compliance_certificates.find_one({"id": cert_id}, {"_id": 0})

@api_router.delete("/compliance/certificates/{cert_id}")
async def delete_compliance_certificate(cert_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    await db.compliance_certificates.delete_one({"id": cert_id})
    return {"message": "Certificate deleted"}

# Compliance Requirements Endpoints
@api_router.post("/compliance/requirements")
async def create_compliance_requirement(req_data: ComplianceRequirementCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    last_audit = None
    next_audit = None
    if req_data.last_audit_date:
        try:
            last_audit = datetime.fromisoformat(req_data.last_audit_date.replace('Z', '+00:00'))
        except:
            pass
    if req_data.next_audit_date:
        try:
            next_audit = datetime.fromisoformat(req_data.next_audit_date.replace('Z', '+00:00'))
        except:
            pass
    
    req_dict = req_data.model_dump()
    req_dict['last_audit_date'] = last_audit
    req_dict['next_audit_date'] = next_audit
    
    requirement = ComplianceRequirement(**req_dict)
    await db.compliance_requirements.insert_one(requirement.model_dump())
    return requirement

@api_router.get("/compliance/requirements")
async def get_compliance_requirements(category: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if category:
        query["category"] = category
    if status:
        query["compliance_status"] = status
    requirements = await db.compliance_requirements.find(query, {"_id": 0}).to_list(1000)
    return requirements

@api_router.put("/compliance/requirements/{req_id}")
async def update_compliance_requirement(req_id: str, req_data: ComplianceRequirementCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    last_audit = None
    next_audit = None
    if req_data.last_audit_date:
        try:
            last_audit = datetime.fromisoformat(req_data.last_audit_date.replace('Z', '+00:00'))
        except:
            pass
    if req_data.next_audit_date:
        try:
            next_audit = datetime.fromisoformat(req_data.next_audit_date.replace('Z', '+00:00'))
        except:
            pass
    
    req_dict = req_data.model_dump()
    req_dict['last_audit_date'] = last_audit
    req_dict['next_audit_date'] = next_audit
    
    await db.compliance_requirements.update_one({"id": req_id}, {"$set": req_dict})
    return await db.compliance_requirements.find_one({"id": req_id}, {"_id": 0})

@api_router.delete("/compliance/requirements/{req_id}")
async def delete_compliance_requirement(req_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    await db.compliance_requirements.delete_one({"id": req_id})
    return {"message": "Requirement deleted"}

# ============================================================================
# AI ASSISTANT MODULE (PHASE 2)
# ============================================================================

class AIConversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    conversation_history: List[Dict[str, str]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIQuery(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    context_type: Optional[str] = None  # safety, maintenance, compliance, risk, incident

@api_router.post("/ai/chat")
async def ai_chat(query: AIQuery, current_user: dict = Depends(get_current_user)):
    """AI-powered safety assistant - provides recommendations and answers"""
    
    # For now, return a structured response indicating AI integration needed
    # This will be updated with actual AI integration
    
    response = {
        "message": "AI Assistant is being configured. This feature will provide:\n\n"
                  "• Safety recommendations based on your vessel operations\n"
                  "• Risk assessment analysis\n"
                  "• Compliance guidance\n"
                  "• Predictive maintenance suggestions\n"
                  "• Incident pattern analysis\n\n"
                  "Integration with AI services (OpenAI/Anthropic) coming soon.",
        "suggestions": [
            "Review expiring certificates",
            "Check overdue maintenance items",
            "Update risk assessments",
            "Schedule emergency drills"
        ],
        "conversation_id": str(uuid.uuid4()),
        "requires_setup": True
    }
    
    return response

@api_router.get("/ai/suggestions")
async def get_ai_suggestions(current_user: dict = Depends(get_current_user)):
    """Get AI-generated suggestions based on current system data"""
    
    # Gather system data for context
    total_vessels = await db.vessels.count_documents({})
    total_incidents = await db.incidents.count_documents({})
    overdue_maintenance = await db.maintenance.count_documents({"status": "Overdue"})
    
    # Get expiring certificates (within 30 days)
    now = datetime.now(timezone.utc)
    thirty_days_later = now + timedelta(days=30)
    expiring_certs = await db.compliance_certificates.count_documents({
        "expiry_date": {"$lte": thirty_days_later, "$gte": now}
    })
    
    suggestions = []
    
    if expiring_certs > 0:
        suggestions.append({
            "priority": "high",
            "category": "Compliance",
            "message": f"{expiring_certs} certificate(s) expiring within 30 days",
            "action": "Review and renew certificates",
            "link": "/compliance"
        })
    
    if overdue_maintenance > 0:
        suggestions.append({
            "priority": "high",
            "category": "Maintenance",
            "message": f"{overdue_maintenance} overdue maintenance task(s)",
            "action": "Complete overdue maintenance",
            "link": "/maintenance"
        })
    
    if total_incidents > 0:
        recent_incidents = await db.incidents.count_documents({
            "created_at": {"$gte": now - timedelta(days=30)}
        })
        if recent_incidents > 2:
            suggestions.append({
                "priority": "medium",
                "category": "Safety",
                "message": f"{recent_incidents} incidents reported in the last 30 days",
                "action": "Review incident patterns and implement preventive measures",
                "link": "/incidents"
            })
    
    # Check for vessels without recent risk assessments
    vessels_without_risks = await db.vessels.count_documents({})
    risk_count = await db.risk_assessments.count_documents({})
    if vessels_without_risks > risk_count:
        suggestions.append({
            "priority": "medium",
            "category": "Risk Management",
            "message": "Some vessels may need risk assessments",
            "action": "Conduct risk assessments for all vessels",
            "link": "/risk-assessment"
        })
    
    if not suggestions:
        suggestions.append({
            "priority": "low",
            "category": "General",
            "message": "All systems operational",
            "action": "Continue monitoring and maintaining compliance",
            "link": "/dashboard"
        })
    
    return {
        "suggestions": suggestions,
        "summary": {
            "total_vessels": total_vessels,
            "total_incidents": total_incidents,
            "overdue_maintenance": overdue_maintenance,
            "expiring_certificates": expiring_certs
        }
    }

# ============================================================================
# BACKUP & RESTORE ENDPOINTS
# ============================================================================

@api_router.get("/backup/export")
async def export_database(current_user: dict = Depends(get_current_user)):
    """Export all database collections as JSON backup"""
    if current_user.get("access_level") != AccessLevel.FULL:
        raise HTTPException(status_code=403, detail="Only users with Full access can export backups")
    
    try:
        backup_data = {
            "backup_date": datetime.now(timezone.utc).isoformat(),
            "backup_version": "1.0",
            "collections": {}
        }
        
        # Export all collections
        collections = ["users", "vessels", "crew", "trips", "allocated_crew", 
                      "trip_logs", "running_logs", "engine_running_logs",
                      "documents", "risk_assessments", "maintenance", 
                      "incidents", "emergency_contacts", "emergency_procedures", "emergency_drills",
                      "compliance_certificates", "compliance_requirements",
                      "activity_logs", "audit_logs", "sessions"]
        
        for collection_name in collections:
            collection = db[collection_name]
            documents = await collection.find({}, {"_id": 0}).to_list(None)
            backup_data["collections"][collection_name] = documents
        
        # Convert to JSON
        json_str = json.dumps(backup_data, indent=2, default=str)
        
        # Create filename with timestamp
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"amsa_backup_{timestamp}.json"
        
        # Return as downloadable file
        return StreamingResponse(
            io.BytesIO(json_str.encode()),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Backup export error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating backup: {str(e)}")

@api_router.post("/backup/import")
async def import_database(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Import database from JSON backup file"""
    if current_user.get("access_level") != AccessLevel.FULL:
        raise HTTPException(status_code=403, detail="Only users with Full access can import backups")
    
    try:
        # Read and parse JSON file
        content = await file.read()
        backup_data = json.loads(content.decode())
        
        if "collections" not in backup_data:
            raise HTTPException(status_code=400, detail="Invalid backup file format")
        
        restored_counts = {}
        
        # Restore each collection
        for collection_name, documents in backup_data["collections"].items():
            if documents:
                collection = db[collection_name]
                # Clear existing data (optional - be careful!)
                # await collection.delete_many({})
                
                # Insert backup data
                if documents:
                    await collection.insert_many(documents)
                    restored_counts[collection_name] = len(documents)
        
        # Log audit trail
        await log_audit(
            admin_id=current_user.get("id"),
            admin_name=current_user.get("full_name", "Unknown"),
            action="database_restore",
            target_type="system",
            target_id="backup_restore",
            target_name=f"Backup from {backup_data.get('backup_date', 'unknown date')}",
            details={"restored_collections": restored_counts}
        )
        
        return {
            "message": "Database restored successfully",
            "backup_date": backup_data.get("backup_date"),
            "collections_restored": restored_counts
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        logger.error(f"Backup import error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error restoring backup: {str(e)}")

@api_router.get("/backup/info")
async def get_backup_info(current_user: dict = Depends(get_current_user)):
    """Get database statistics for backup info"""
    if current_user.get("access_level") != AccessLevel.FULL:
        raise HTTPException(status_code=403, detail="Only users with Full access can view backup info")
    
    try:
        collections = ["users", "vessels", "crew", "trips", "documents", 
                      "risk_assessments", "maintenance", "activity_logs", "audit_logs"]
        
        stats = {}
        total_records = 0
        
        for collection_name in collections:
            count = await db[collection_name].count_documents({})
            stats[collection_name] = count
            total_records += count
        
        return {
            "total_records": total_records,
            "collections": stats,
            "database_name": os.environ['DB_NAME'],
            "last_checked": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Backup info error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting backup info: {str(e)}")


# ============================================================================
# BACKUP SCHEDULING & MANAGEMENT
# ============================================================================

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

# Create backups directory
BACKUPS_DIR = Path("/app/backend/backups")
BACKUPS_DIR.mkdir(exist_ok=True)

# Initialize scheduler
backup_scheduler = BackgroundScheduler()
backup_scheduler.start()

class BackupSchedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    frequency: str  # daily, weekly, monthly, custom
    cron_expression: Optional[str] = None  # For custom schedules
    enabled: bool = True
    retention_days: int = 30  # How long to keep backups
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BackupScheduleCreate(BaseModel):
    name: str
    frequency: str
    cron_expression: Optional[str] = None
    retention_days: int = 30

class BackupHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    file_path: str
    file_size: int
    backup_type: str  # manual, scheduled
    schedule_id: Optional[str] = None
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    record_count: int = 0
    collections_backed_up: List[str] = []

async def create_backup_file(user_id: str = None, user_name: str = None, backup_type: str = "manual", schedule_id: str = None):
    """Create a backup file and save to disk"""
    try:
        backup_data = {
            "backup_date": datetime.now(timezone.utc).isoformat(),
            "backup_version": "1.0",
            "backup_type": backup_type,
            "created_by": user_name,
            "collections": {}
        }
        
        # Export all collections
        collections = ["users", "vessels", "crew", "trips", "allocated_crew", 
                      "trip_logs", "running_logs", "engine_running_logs",
                      "documents", "risk_assessments", "maintenance", 
                      "incidents", "emergency_contacts", "emergency_procedures", "emergency_drills",
                      "compliance_certificates", "compliance_requirements",
                      "activity_logs", "audit_logs", "sessions"]
        
        total_records = 0
        backed_up_collections = []
        
        for collection_name in collections:
            collection = db[collection_name]
            documents = await collection.find({}, {"_id": 0}).to_list(None)
            backup_data["collections"][collection_name] = documents
            if documents:
                total_records += len(documents)
                backed_up_collections.append(collection_name)
        
        # Convert to JSON
        json_str = json.dumps(backup_data, indent=2, default=str)
        
        # Create filename with timestamp
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"amsa_backup_{backup_type}_{timestamp}.json"
        file_path = BACKUPS_DIR / filename
        
        # Write to file
        with open(file_path, 'w') as f:
            f.write(json_str)
        
        file_size = file_path.stat().st_size
        
        # Save to backup history
        backup_history = BackupHistory(
            filename=filename,
            file_path=str(file_path),
            file_size=file_size,
            backup_type=backup_type,
            schedule_id=schedule_id,
            created_by=user_id,
            created_by_name=user_name,
            record_count=total_records,
            collections_backed_up=backed_up_collections
        )
        
        await db.backup_history.insert_one(backup_history.model_dump())
        
        logger.info(f"Backup created: {filename} ({file_size} bytes, {total_records} records)")
        
        return backup_history
        
    except Exception as e:
        logger.error(f"Error creating backup file: {str(e)}")
        raise

async def cleanup_old_backups(retention_days: int = 30):
    """Delete backups older than retention period"""
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
        
        # Find old backups
        old_backups = await db.backup_history.find({
            "created_at": {"$lt": cutoff_date}
        }, {"_id": 0}).to_list(1000)
        
        deleted_count = 0
        for backup in old_backups:
            # Delete file
            file_path = Path(backup["file_path"])
            if file_path.exists():
                file_path.unlink()
                deleted_count += 1
            
            # Delete from history
            await db.backup_history.delete_one({"id": backup["id"]})
        
        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old backups (older than {retention_days} days)")
        
        return deleted_count
        
    except Exception as e:
        logger.error(f"Error cleaning up old backups: {str(e)}")
        return 0

def get_cron_expression(frequency: str, custom_cron: str = None):
    """Convert frequency to cron expression"""
    if frequency == "custom" and custom_cron:
        return custom_cron
    elif frequency == "daily":
        return "0 2 * * *"  # 2 AM daily
    elif frequency == "weekly":
        return "0 2 * * 0"  # 2 AM Sunday
    elif frequency == "monthly":
        return "0 2 1 * *"  # 2 AM on 1st of month
    else:
        return "0 2 * * *"  # Default to daily

async def scheduled_backup_job(schedule_id: str):
    """Background job to create scheduled backups"""
    try:
        schedule = await db.backup_schedules.find_one({"id": schedule_id}, {"_id": 0})
        if not schedule or not schedule.get("enabled"):
            return
        
        # Create backup
        await create_backup_file(
            user_id=schedule.get("created_by"),
            user_name="System (Scheduled)",
            backup_type="scheduled",
            schedule_id=schedule_id
        )
        
        # Update last run time
        now = datetime.now(timezone.utc)
        await db.backup_schedules.update_one(
            {"id": schedule_id},
            {"$set": {"last_run": now}}
        )
        
        # Cleanup old backups
        await cleanup_old_backups(schedule.get("retention_days", 30))
        
    except Exception as e:
        logger.error(f"Scheduled backup job error: {str(e)}")

@api_router.post("/backup/create-now")
async def create_backup_now(current_user: dict = Depends(get_current_user)):
    """Create an immediate backup and save to server"""
    if current_user.get("access_level") != AccessLevel.FULL:
        raise HTTPException(status_code=403, detail="Only users with Full access can create backups")
    
    try:
        backup_history = await create_backup_file(
            user_id=current_user["id"],
            user_name=current_user["full_name"],
            backup_type="manual"
        )
        
        await log_audit(
            current_user["id"],
            current_user["full_name"],
            "create_backup",
            "backup",
            backup_history.id,
            backup_history.filename
        )
        
        return {
            "message": "Backup created successfully",
            "backup": {
                "id": backup_history.id,
                "filename": backup_history.filename,
                "file_size": backup_history.file_size,
                "record_count": backup_history.record_count,
                "created_at": backup_history.created_at.isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Create backup now error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating backup: {str(e)}")

@api_router.get("/backup/history")
async def get_backup_history(current_user: dict = Depends(get_current_user)):
    """Get list of all backups"""
    if current_user.get("access_level") != AccessLevel.FULL:
        raise HTTPException(status_code=403, detail="Only users with Full access can view backup history")
    
    try:
        backups = await db.backup_history.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
        return backups
    except Exception as e:
        logger.error(f"Get backup history error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting backup history: {str(e)}")

@api_router.get("/backup/download/{backup_id}")
async def download_backup(backup_id: str, current_user: dict = Depends(get_current_user)):
    """Download a specific backup file"""
    if current_user.get("access_level") != AccessLevel.FULL:
        raise HTTPException(status_code=403, detail="Only users with Full access can download backups")
    
    try:
        backup = await db.backup_history.find_one({"id": backup_id}, {"_id": 0})
        if not backup:
            raise HTTPException(status_code=404, detail="Backup not found")
        
        file_path = Path(backup["file_path"])
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Backup file not found on server")
        
        # Read file and return
        with open(file_path, 'r') as f:
            content = f.read()
        
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename={backup["filename"]}'}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download backup error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error downloading backup: {str(e)}")

@api_router.delete("/backup/{backup_id}")
async def delete_backup(backup_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a backup"""
    if current_user.get("access_level") != AccessLevel.FULL:
        raise HTTPException(status_code=403, detail="Only users with Full access can delete backups")
    
    try:
        backup = await db.backup_history.find_one({"id": backup_id}, {"_id": 0})
        if not backup:
            raise HTTPException(status_code=404, detail="Backup not found")
        
        # Delete file
        file_path = Path(backup["file_path"])
        if file_path.exists():
            file_path.unlink()
        
        # Delete from history
        await db.backup_history.delete_one({"id": backup_id})
        
        await log_audit(
            current_user["id"],
            current_user["full_name"],
            "delete_backup",
            "backup",
            backup_id,
            backup["filename"]
        )
        
        return {"message": "Backup deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete backup error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting backup: {str(e)}")

@api_router.post("/backup/schedules")
async def create_backup_schedule(
    schedule_data: BackupScheduleCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new backup schedule"""
    if current_user.get("access_level") != AccessLevel.FULL:
        raise HTTPException(status_code=403, detail="Only users with Full access can create backup schedules")
    
    try:
        # Get cron expression
        cron_expr = get_cron_expression(schedule_data.frequency, schedule_data.cron_expression)
        
        # Create schedule data dict
        schedule_dict = schedule_data.model_dump()
        schedule_dict["cron_expression"] = cron_expr
        schedule_dict["created_by"] = current_user["id"]
        
        schedule = BackupSchedule(**schedule_dict)
        
        # Add to database
        await db.backup_schedules.insert_one(schedule.model_dump())
        
        # Add to scheduler
        backup_scheduler.add_job(
            scheduled_backup_job,
            CronTrigger.from_crontab(cron_expr),
            args=[schedule.id],
            id=schedule.id,
            replace_existing=True
        )
        
        # Calculate next run
        next_run = backup_scheduler.get_job(schedule.id).next_run_time
        await db.backup_schedules.update_one(
            {"id": schedule.id},
            {"$set": {"next_run": next_run}}
        )
        
        await log_audit(
            current_user["id"],
            current_user["full_name"],
            "create_backup_schedule",
            "backup_schedule",
            schedule.id,
            schedule.name
        )
        
        return schedule
    except Exception as e:
        logger.error(f"Create backup schedule error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating backup schedule: {str(e)}")

@api_router.get("/backup/schedules")
async def get_backup_schedules(current_user: dict = Depends(get_current_user)):
    """Get all backup schedules"""
    if current_user.get("access_level") != AccessLevel.FULL:
        raise HTTPException(status_code=403, detail="Only users with Full access can view backup schedules")
    
    try:
        schedules = await db.backup_schedules.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
        
        # Update next run times from scheduler
        for schedule in schedules:
            job = backup_scheduler.get_job(schedule["id"])
            if job:
                schedule["next_run"] = job.next_run_time.isoformat() if job.next_run_time else None
        
        return schedules
    except Exception as e:
        logger.error(f"Get backup schedules error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting backup schedules: {str(e)}")

@api_router.put("/backup/schedules/{schedule_id}")
async def update_backup_schedule(
    schedule_id: str,
    enabled: bool,
    current_user: dict = Depends(get_current_user)
):
    """Enable or disable a backup schedule"""
    if current_user.get("access_level") != AccessLevel.FULL:
        raise HTTPException(status_code=403, detail="Only users with Full access can update backup schedules")
    
    try:
        schedule = await db.backup_schedules.find_one({"id": schedule_id}, {"_id": 0})
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        # Update database
        await db.backup_schedules.update_one(
            {"id": schedule_id},
            {"$set": {"enabled": enabled}}
        )
        
        # Update scheduler
        if enabled:
            backup_scheduler.resume_job(schedule_id)
        else:
            backup_scheduler.pause_job(schedule_id)
        
        await log_audit(
            current_user["id"],
            current_user["full_name"],
            "update_backup_schedule",
            "backup_schedule",
            schedule_id,
            f"{schedule['name']} - {'enabled' if enabled else 'disabled'}"
        )
        
        return {"message": f"Schedule {'enabled' if enabled else 'disabled'} successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update backup schedule error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating backup schedule: {str(e)}")

@api_router.delete("/backup/schedules/{schedule_id}")
async def delete_backup_schedule(schedule_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a backup schedule"""
    if current_user.get("access_level") != AccessLevel.FULL:
        raise HTTPException(status_code=403, detail="Only users with Full access can delete backup schedules")
    
    try:
        schedule = await db.backup_schedules.find_one({"id": schedule_id}, {"_id": 0})
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        # Remove from scheduler
        backup_scheduler.remove_job(schedule_id)
        
        # Delete from database
        await db.backup_schedules.delete_one({"id": schedule_id})
        
        await log_audit(
            current_user["id"],
            current_user["full_name"],
            "delete_backup_schedule",
            "backup_schedule",
            schedule_id,
            schedule["name"]
        )
        
        return {"message": "Schedule deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete backup schedule error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting backup schedule: {str(e)}")

# Load existing schedules on startup
@app.on_event("startup")
async def load_backup_schedules():
    """Load backup schedules from database on startup"""
    try:
        schedules = await db.backup_schedules.find({"enabled": True}, {"_id": 0}).to_list(1000)
        for schedule in schedules:
            try:
                backup_scheduler.add_job(
                    scheduled_backup_job,
                    CronTrigger.from_crontab(schedule["cron_expression"]),
                    args=[schedule["id"]],
                    id=schedule["id"],
                    replace_existing=True
                )
                logger.info(f"Loaded backup schedule: {schedule['name']}")
            except Exception as e:
                logger.error(f"Error loading schedule {schedule['name']}: {str(e)}")
    except Exception as e:
        logger.error(f"Error loading backup schedules: {str(e)}")


# ============================================================================
# PLACEHOLDER ENDPOINTS FOR FUTURE PHASES
# ============================================================================

# Include router
app.include_router(api_router)

# Create uploads directory if it doesn't exist
uploads_dir = Path("/app/backend/uploads")
uploads_dir.mkdir(exist_ok=True)

# Serve uploaded files
app.mount("/api/uploads", StaticFiles(directory="/app/backend/uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
