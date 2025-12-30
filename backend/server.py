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

# Configure MongoDB client with appropriate settings for both local and Atlas connections
# Atlas connections (mongodb+srv://) require SSL and longer timeouts
if 'mongodb+srv://' in mongo_url or 'mongodb.net' in mongo_url:
    # MongoDB Atlas connection - needs SSL and longer timeouts
    client = AsyncIOMotorClient(
        mongo_url,
        serverSelectionTimeoutMS=30000,  # 30 seconds for server selection
        connectTimeoutMS=30000,           # 30 seconds for initial connection
        socketTimeoutMS=30000,            # 30 seconds for socket operations
        tls=True,
        tlsAllowInvalidCertificates=False,
        retryWrites=True,
        w='majority'
    )
else:
    # Local MongoDB connection
    client = AsyncIOMotorClient(mongo_url)

db = client[os.environ['DB_NAME']]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ['JWT_SECRET_KEY']  # No fallback - must be set in .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

app = FastAPI(title="AMSA Safety Management System")
api_router = APIRouter(prefix="/api")

# Health check endpoints for Kubernetes (both with and without /api prefix)
@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes liveness/readiness probes"""
    return {"status": "healthy", "service": "amsa-safety-management"}

@api_router.get("/health")
async def api_health_check():
    """Health check endpoint under /api prefix"""
    return {"status": "healthy", "service": "amsa-safety-management"}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Startup event to seed default admin user if no users exist
@app.on_event("startup")
async def seed_default_admin():
    """Create a default admin user if no users exist in the database.
    This ensures the first deployment has a user to log in with.
    """
    try:
        # Check if any users exist
        user_count = await db.users.count_documents({})
        
        if user_count == 0:
            logger.info("No users found in database. Creating default admin user...")
            
            # Create default admin user
            default_admin = {
                "id": str(uuid.uuid4()),
                "email": "admin@test.com",
                "password_hash": pwd_context.hash("Admin123!"),
                "full_name": "Admin User",
                "role": UserRole.OWNER,
                "access_level": AccessLevel.FULL,
                "account_status": AccountStatus.ACTIVE,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            await db.users.insert_one(default_admin)
            logger.info(f"Default admin user created: admin@test.com")
            logger.info("IMPORTANT: Please change the default password after first login!")
        else:
            logger.info(f"Database has {user_count} existing user(s). Skipping admin seed.")
            
    except Exception as e:
        logger.error(f"Error during admin seed: {str(e)}")
        # Don't raise - allow app to start even if seeding fails

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
    unique_identifier_number: Optional[str] = None
    vessel_type: Optional[str] = None
    operational_status: Optional[str] = None  # Operational, Under Maintenance, Out of Service, etc.
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
    crew_requirements: Optional[List[dict]] = None  # List of {quantity, title}
    
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
    engine1_model: Optional[str] = None
    engine1_serial: Optional[str] = None
    engine2_model: Optional[str] = None
    engine2_serial: Optional[str] = None
    propeller_type: Optional[str] = None
    propeller_material: Optional[str] = None
    fuel_type: Optional[str] = None
    fuel_capacity: Optional[float] = None
    # Auxiliary Engine
    aux_type: Optional[str] = None
    aux_power: Optional[str] = None
    aux_fuel: Optional[str] = None
    aux_serial: Optional[str] = None
    inside_equipment: Optional[str] = None
    outside_equipment: Optional[str] = None
    water_capacity: Optional[float] = None
    max_passengers_berthed: Optional[int] = None
    max_passengers_unberthed: Optional[int] = None
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
    unique_identifier_number: Optional[str] = None
    vessel_type: Optional[str] = None
    operational_status: Optional[str] = None
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
    crew_requirements: Optional[List[dict]] = None
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
    engine1_model: Optional[str] = None
    engine1_serial: Optional[str] = None
    engine2_model: Optional[str] = None
    engine2_serial: Optional[str] = None
    propeller_type: Optional[str] = None
    propeller_material: Optional[str] = None
    fuel_type: Optional[str] = None
    fuel_capacity: Optional[float] = None
    # Auxiliary Engine
    aux_type: Optional[str] = None
    aux_power: Optional[str] = None
    aux_fuel: Optional[str] = None
    aux_serial: Optional[str] = None
    inside_equipment: Optional[str] = None
    outside_equipment: Optional[str] = None
    water_capacity: Optional[float] = None
    max_passengers_berthed: Optional[int] = None
    max_passengers_unberthed: Optional[int] = None
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
    
    # Tab 3: Training Record (legacy - keep for backwards compatibility)
    briefings_observed: Optional[List[TrainingItem]] = []
    briefings_delivered: Optional[List[TrainingItem]] = []
    practical_experience: Optional[List[TrainingItem]] = []
    
    # Tab 3: Training Record (per vessel - new structure)
    training_by_vessel: Optional[dict] = {}  # { vessel_id: { vessel_name, records: [...], authorising_staff, date_signed_off, vessel_owner, date_signed_owner } }
    
    # Tab 4: Sign-off (legacy - keeping for backwards compatibility)
    owner_name: Optional[str] = None
    owner_signature: Optional[str] = None
    owner_date: Optional[str] = None
    staff_signature: Optional[str] = None
    staff_date: Optional[str] = None
    
    # Tab 5: Photo
    crew_photo_url: Optional[str] = None
    
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
    training_by_vessel: Optional[dict] = {}
    owner_name: Optional[str] = None
    owner_signature: Optional[str] = None
    owner_date: Optional[str] = None
    staff_signature: Optional[str] = None
    staff_date: Optional[str] = None
    crew_photo_url: Optional[str] = None

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

@api_router.get("/crew/{crew_id}/trips")
async def get_crew_trips(crew_id: str, current_user: dict = Depends(require_access_level(AccessLevel.VIEW))):
    """Get all trip allocations for a specific crew member"""
    # First verify the crew member exists
    crew = await db.crew.find_one({"id": crew_id}, {"_id": 0})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew member not found")
    
    # Get all allocations for this crew member
    allocations = await db.allocated_crew.find({"crew_id": crew_id}, {"_id": 0}).to_list(1000)
    
    # Enrich with trip and vessel information
    enriched_allocations = []
    for allocation in allocations:
        trip = await db.trips.find_one({"id": allocation.get("trip_id")}, {"_id": 0})
        if trip:
            vessel = await db.vessels.find_one({"id": trip.get("vessel_id")}, {"_id": 0})
            enriched_allocations.append({
                **allocation,
                "trip_name": trip.get("trip_name"),
                "vessel_name": vessel.get("vessel_name") if vessel else None,
                "start_date": trip.get("planned_depart_datetime") or trip.get("depart_datetime"),
                "end_date": trip.get("planned_arrival_datetime") or trip.get("arrival_datetime"),
            })
    
    return enriched_allocations

@api_router.get("/crew/{crew_id}/shifts")
async def get_crew_shifts(crew_id: str, current_user: dict = Depends(require_access_level(AccessLevel.VIEW))):
    """Get all shift logs for a specific crew member"""
    # First verify the crew member exists
    crew = await db.crew.find_one({"id": crew_id}, {"_id": 0})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew member not found")
    
    # Get all trip logs (shifts) for this crew member
    shifts = await db.trip_logs.find({"crew_id": crew_id}, {"_id": 0}).to_list(1000)
    
    # Enrich with vessel information
    enriched_shifts = []
    for shift in shifts:
        vessel_name = None
        
        # Try to get vessel from trip
        if shift.get("trip_id"):
            trip = await db.trips.find_one({"id": shift.get("trip_id")}, {"_id": 0})
            if trip and trip.get("vessel_id"):
                vessel = await db.vessels.find_one({"id": trip.get("vessel_id")}, {"_id": 0})
                vessel_name = vessel.get("vessel_name") if vessel else None
        
        # Or directly from vessel_id if manual entry
        if not vessel_name and shift.get("vessel_id"):
            vessel = await db.vessels.find_one({"id": shift.get("vessel_id")}, {"_id": 0})
            vessel_name = vessel.get("vessel_name") if vessel else None
        
        enriched_shifts.append({
            **shift,
            "vessel_name": vessel_name,
            "crew_name": crew.get("staff_name")
        })
    
    return enriched_shifts

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
# PASSENGER MODELS
# ============================================================================

class Passenger(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Tab 1: Details
    name: str
    passenger_type: str = "Primary"  # Primary or Guest
    relationship_to_primary: Optional[str] = None  # Only for Guest type
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    
    # Tab 2: Medical and Dietary
    allergies: Optional[str] = None
    dislikes: Optional[str] = None
    dietary_restrictions: Optional[str] = None
    medications: Optional[str] = None
    medical_conditions: Optional[str] = None
    special_equipment: Optional[str] = None  # cpap, baby items etc
    
    # Tab 3: Preference and Provisioning
    dietary_preference: Optional[str] = None
    beverage_preference: Optional[str] = None
    alcohol_allowed: Optional[bool] = True
    dining_styles: Optional[List[str]] = []  # casual, buffet, family, formal
    
    # Tab 4: Entertainment & Activity Planning
    music_genre: Optional[str] = None
    movie_preferences: Optional[str] = None
    internet_requirement: Optional[str] = None
    desired_experiences: Optional[str] = None  # theme night, water activities etc
    special_requests: Optional[str] = None  # occasions, wellness etc
    privacy_level: Optional[str] = None  # formal or social crew interaction
    
    # Tab 5: Photo
    photo_url: Optional[str] = None
    
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class PassengerCreate(BaseModel):
    name: str
    passenger_type: str = "Primary"
    relationship_to_primary: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    allergies: Optional[str] = None
    dislikes: Optional[str] = None
    dietary_restrictions: Optional[str] = None
    medications: Optional[str] = None
    medical_conditions: Optional[str] = None
    special_equipment: Optional[str] = None
    dietary_preference: Optional[str] = None
    beverage_preference: Optional[str] = None
    alcohol_allowed: Optional[bool] = True
    dining_styles: Optional[List[str]] = []
    music_genre: Optional[str] = None
    movie_preferences: Optional[str] = None
    internet_requirement: Optional[str] = None
    desired_experiences: Optional[str] = None
    special_requests: Optional[str] = None
    privacy_level: Optional[str] = None
    photo_url: Optional[str] = None

# ============================================================================
# PASSENGER ENDPOINTS
# ============================================================================

@api_router.post("/passengers")
async def create_passenger(passenger_data: PassengerCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    passenger = Passenger(**passenger_data.model_dump(), created_by=current_user["id"])
    await db.passengers.insert_one(passenger.model_dump())
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "create",
        "passenger",
        passenger.id,
        passenger.name
    )
    
    return passenger

@api_router.get("/passengers")
async def get_passengers(current_user: dict = Depends(require_access_level(AccessLevel.VIEW))):
    passengers = await db.passengers.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return passengers

@api_router.get("/passengers/{passenger_id}")
async def get_passenger(passenger_id: str, current_user: dict = Depends(require_access_level(AccessLevel.VIEW))):
    passenger = await db.passengers.find_one({"id": passenger_id}, {"_id": 0})
    if not passenger:
        raise HTTPException(status_code=404, detail="Passenger not found")
    return passenger

@api_router.put("/passengers/{passenger_id}")
async def update_passenger(passenger_id: str, passenger_data: PassengerCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    existing = await db.passengers.find_one({"id": passenger_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Passenger not found")
    
    update_data = passenger_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.passengers.update_one({"id": passenger_id}, {"$set": update_data})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "update",
        "passenger",
        passenger_id,
        passenger_data.name
    )
    
    updated = await db.passengers.find_one({"id": passenger_id}, {"_id": 0})
    return updated

@api_router.delete("/passengers/{passenger_id}")
async def delete_passenger(passenger_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    passenger = await db.passengers.find_one({"id": passenger_id}, {"_id": 0})
    if not passenger:
        raise HTTPException(status_code=404, detail="Passenger not found")
    
    await db.passengers.delete_one({"id": passenger_id})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "delete",
        "passenger",
        passenger_id,
        passenger["name"]
    )
    
    return {"message": "Passenger deleted successfully"}

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
    trip_id: Optional[str] = None  # Optional - can log without a trip
    vessel_id: Optional[str] = None  # Optional - vessel selection
    vessel_name: Optional[str] = None  # Denormalized for display
    crew_id: str
    crew_name: str
    shift_start_datetime: datetime
    shift_start_utc_offset: Optional[str] = None  # UTC offset e.g., +10:00
    shift_stop_datetime: Optional[datetime] = None
    shift_stop_utc_offset: Optional[str] = None  # UTC offset e.g., +10:00
    task_performed: Optional[str] = None
    location_start: Optional[str] = None
    location_end: Optional[str] = None
    gps_location_start: Optional[str] = None
    gps_location_end: Optional[str] = None
    total_hours: Optional[float] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TripLogCreate(BaseModel):
    trip_id: Optional[str] = None  # Optional - can log without a trip
    vessel_id: Optional[str] = None  # Optional - vessel selection
    vessel_name: Optional[str] = None  # Denormalized for display
    crew_id: str
    crew_name: str
    shift_start_datetime: datetime
    shift_start_utc_offset: Optional[str] = None  # UTC offset e.g., +10:00
    shift_stop_datetime: Optional[datetime] = None
    shift_stop_utc_offset: Optional[str] = None  # UTC offset e.g., +10:00
    task_performed: Optional[str] = None
    location_start: Optional[str] = None
    location_end: Optional[str] = None
    gps_location_start: Optional[str] = None
    gps_location_end: Optional[str] = None

class RunningLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trip_id: Optional[str] = None  # Optional - can log without a trip
    vessel_id: str  # Compulsory - must have a vessel
    vessel_name: str  # Denormalized for display
    crew_id: str
    crew_name: str
    log_datetime: datetime
    utc_offset: Optional[str] = None  # UTC offset e.g., +10:00
    category: Optional[str] = None  # Radio, Conditions, Safety, Vessel Operation
    activity: str
    activity_details: Optional[str] = None
    gps_location: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RunningLogCreate(BaseModel):
    trip_id: Optional[str] = None  # Optional - can log without a trip
    vessel_id: str  # Compulsory - must have a vessel
    vessel_name: str  # Denormalized for display
    crew_id: str
    crew_name: str
    log_datetime: datetime
    utc_offset: Optional[str] = None  # UTC offset e.g., +10:00
    category: Optional[str] = None  # Radio, Conditions, Safety, Vessel Operation
    activity: str
    activity_details: Optional[str] = None
    gps_location: Optional[str] = None

class EngineRunningLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trip_id: Optional[str] = None  # Optional - can log without a trip
    vessel_id: str  # Compulsory - must have a vessel
    vessel_name: str  # Denormalized for display
    log_datetime: datetime
    utc_offset: Optional[str] = None  # UTC offset e.g., +10:00
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
    trip_id: Optional[str] = None  # Optional - can log without a trip
    vessel_id: str  # Compulsory - must have a vessel
    vessel_name: str  # Denormalized for display
    log_datetime: datetime
    utc_offset: Optional[str] = None  # UTC offset e.g., +10:00
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
# EXPENDITURE (APA) MODEL
# ============================================================================

class Expenditure(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trip_id: str
    expense_date: datetime
    description: str
    amount: float  # Positive or negative
    receipt_url: Optional[str] = None  # PDF receipt URL
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenditureCreate(BaseModel):
    trip_id: str
    expense_date: datetime
    description: str
    amount: float
    receipt_url: Optional[str] = None

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
async def get_trip_logs(trip_id: Optional[str] = None, vessel_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if trip_id:
        query["trip_id"] = trip_id
    if vessel_id:
        query["vessel_id"] = vessel_id
    
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
async def get_running_logs(trip_id: Optional[str] = None, vessel_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if trip_id:
        query["trip_id"] = trip_id
    elif vessel_id:
        # Get logs for this vessel from two sources:
        # 1. Logs from trips associated with this vessel
        # 2. Manual logs directly associated with this vessel (vessel_id set, trip_id is None)
        trips = await db.trips.find({"vessel_id": vessel_id}, {"_id": 0, "id": 1}).to_list(1000)
        trip_ids = [t["id"] for t in trips]
        
        # Build OR query to include both trip-based and manual logs
        or_conditions = []
        
        # Include logs from trips for this vessel
        if trip_ids:
            or_conditions.append({"trip_id": {"$in": trip_ids}})
        
        # Include manual logs directly associated with this vessel
        or_conditions.append({"vessel_id": vessel_id, "trip_id": None})
        
        if or_conditions:
            query["$or"] = or_conditions
        else:
            # No trips and no manual logs - return empty
            return []
    
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
async def get_engine_running_logs(trip_id: Optional[str] = None, vessel_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if trip_id:
        query["trip_id"] = trip_id
    elif vessel_id:
        # Get all trips for this vessel, then filter logs
        trips = await db.trips.find({"vessel_id": vessel_id}, {"_id": 0, "id": 1}).to_list(1000)
        trip_ids = [t["id"] for t in trips]
        if trip_ids:
            query["trip_id"] = {"$in": trip_ids}
        else:
            return []  # No trips for this vessel
    
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
# EXPENDITURE (APA) ENDPOINTS
# ============================================================================

@api_router.post("/expenditures")
async def create_expenditure(expenditure_data: ExpenditureCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    expenditure = Expenditure(**expenditure_data.model_dump(), created_by=current_user["id"])
    await db.expenditures.insert_one(expenditure.model_dump())
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "create",
        "expenditures",
        expenditure.id,
        f"Created expenditure: {expenditure_data.description} - ${expenditure_data.amount}"
    )
    
    return expenditure

@api_router.get("/expenditures")
async def get_expenditures(trip_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if trip_id:
        query["trip_id"] = trip_id
    
    expenditures = await db.expenditures.find(query, {"_id": 0}).sort("expense_date", -1).to_list(1000)
    return expenditures

@api_router.get("/expenditures/{expenditure_id}")
async def get_expenditure(expenditure_id: str, current_user: dict = Depends(get_current_user)):
    expenditure = await db.expenditures.find_one({"id": expenditure_id}, {"_id": 0})
    if not expenditure:
        raise HTTPException(status_code=404, detail="Expenditure not found")
    return expenditure

@api_router.put("/expenditures/{expenditure_id}")
async def update_expenditure(expenditure_id: str, expenditure_data: ExpenditureCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    expenditure = await db.expenditures.find_one({"id": expenditure_id}, {"_id": 0})
    if not expenditure:
        raise HTTPException(status_code=404, detail="Expenditure not found")
    
    await db.expenditures.update_one({"id": expenditure_id}, {"$set": expenditure_data.model_dump()})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "update",
        "expenditures",
        expenditure_id,
        f"Updated expenditure: {expenditure_data.description}"
    )
    
    return {"message": "Expenditure updated successfully"}

@api_router.delete("/expenditures/{expenditure_id}")
async def delete_expenditure(expenditure_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    expenditure = await db.expenditures.find_one({"id": expenditure_id}, {"_id": 0})
    if not expenditure:
        raise HTTPException(status_code=404, detail="Expenditure not found")
    
    await db.expenditures.delete_one({"id": expenditure_id})
    
    await log_audit(
        current_user["id"],
        current_user["full_name"],
        "delete",
        "expenditures",
        expenditure_id,
        f"Deleted expenditure: {expenditure.get('description')}"
    )
    
    return {"message": "Expenditure deleted successfully"}

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
    next_risk_date: Optional[datetime] = None
    risk_frequency_quantity: Optional[int] = None
    risk_frequency_duration: Optional[str] = None  # Daily, Monthly, Quarterly, Annually, Bi-Annually
    completion_notes: Optional[str] = None

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
    next_risk_date: Optional[str] = None
    risk_frequency_quantity: Optional[int] = None
    risk_frequency_duration: Optional[str] = None
    completion_notes: Optional[str] = None

@api_router.post("/risk-assessments")
async def create_risk_assessment(risk_data: RiskAssessmentCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    # Convert review_date string to datetime if provided
    review_date = None
    if risk_data.review_date:
        try:
            review_date = datetime.fromisoformat(risk_data.review_date.replace('Z', '+00:00'))
        except:
            pass
    
    # Convert next_risk_date string to datetime if provided
    next_risk_date = None
    if risk_data.next_risk_date:
        try:
            next_risk_date = datetime.fromisoformat(risk_data.next_risk_date.replace('Z', '+00:00'))
        except:
            pass
    
    risk_dict = risk_data.model_dump()
    risk_dict['review_date'] = review_date
    risk_dict['next_risk_date'] = next_risk_date
    
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
    
    # Convert next_risk_date string to datetime if provided
    next_risk_date = None
    if risk_data.next_risk_date:
        try:
            next_risk_date = datetime.fromisoformat(risk_data.next_risk_date.replace('Z', '+00:00'))
        except:
            pass
    
    risk_dict = risk_data.model_dump()
    risk_dict['review_date'] = review_date
    risk_dict['next_risk_date'] = next_risk_date
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
    quote_pdf_url: Optional[str] = None  # PDF attachment for quote
    crew_sign_off_id: Optional[str] = None  # Crew member who signed off
    crew_sign_off_name: Optional[str] = None
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
    quote_pdf_url: Optional[str] = None
    crew_sign_off_id: Optional[str] = None
    crew_sign_off_name: Optional[str] = None

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
    incident_type: List[str]  # Changed to list for multiselect
    severity: str  # Minor, Moderate, Serious, Critical
    title: str
    description: str
    incident_date: datetime
    utc_offset: Optional[str] = None  # UTC offset e.g., +10:00
    location: str
    trip_from: Optional[str] = None
    trip_to: Optional[str] = None
    gps_location: Optional[str] = None
    pilot_on_board: bool = False
    cargo_on_board: bool = False
    activity: List[str] = []  # Multiselect activity field
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    injuries: bool = False
    injury_details: Optional[str] = None
    witnesses: Optional[str] = None
    immediate_actions: Optional[str] = None
    investigation_status: str = "Reported"  # Reported, Under Investigation, Completed, Closed
    root_cause: Optional[str] = None
    risk_creator: Optional[str] = None  # What created the risk
    corrective_actions: Optional[str] = None
    preventive_actions: Optional[str] = None
    responsible_person: Optional[str] = None
    target_completion_date: Optional[datetime] = None
    actual_completion_date: Optional[datetime] = None
    date_closed: Optional[datetime] = None  # Investigation fields
    date_risk_assessment_performed: Optional[datetime] = None
    date_amsa_notified: Optional[datetime] = None
    linked_trip_id: Optional[str] = None  # Link to existing trip
    linked_trip_name: Optional[str] = None
    reported_by: str
    reported_by_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IncidentCreate(BaseModel):
    incident_type: List[str]  # Changed to list for multiselect
    severity: str
    title: str
    description: str
    incident_date: str
    utc_offset: Optional[str] = None  # UTC offset e.g., +10:00
    location: str
    trip_from: Optional[str] = None
    trip_to: Optional[str] = None
    gps_location: Optional[str] = None
    pilot_on_board: bool = False
    cargo_on_board: bool = False
    activity: List[str] = []  # Multiselect activity field
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    injuries: bool = False
    injury_details: Optional[str] = None
    witnesses: Optional[str] = None
    immediate_actions: Optional[str] = None
    investigation_status: str = "Reported"
    root_cause: Optional[str] = None
    risk_creator: Optional[str] = None
    corrective_actions: Optional[str] = None
    preventive_actions: Optional[str] = None
    responsible_person: Optional[str] = None
    target_completion_date: Optional[str] = None
    date_closed: Optional[str] = None
    date_risk_assessment_performed: Optional[str] = None
    date_amsa_notified: Optional[str] = None
    linked_trip_id: Optional[str] = None
    linked_trip_name: Optional[str] = None

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
    
    # Parse new investigation date fields
    date_closed = None
    if incident_data.date_closed:
        try:
            date_closed = datetime.fromisoformat(incident_data.date_closed.replace('Z', '+00:00'))
        except:
            pass
    
    date_risk_assessment = None
    if incident_data.date_risk_assessment_performed:
        try:
            date_risk_assessment = datetime.fromisoformat(incident_data.date_risk_assessment_performed.replace('Z', '+00:00'))
        except:
            pass
    
    date_amsa = None
    if incident_data.date_amsa_notified:
        try:
            date_amsa = datetime.fromisoformat(incident_data.date_amsa_notified.replace('Z', '+00:00'))
        except:
            pass
    
    incident_dict = incident_data.model_dump()
    incident_dict['incident_number'] = incident_number
    incident_dict['incident_date'] = incident_date
    incident_dict['target_completion_date'] = target_date
    incident_dict['date_closed'] = date_closed
    incident_dict['date_risk_assessment_performed'] = date_risk_assessment
    incident_dict['date_amsa_notified'] = date_amsa
    
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
    
    # Parse new investigation date fields
    date_closed = None
    if incident_data.date_closed:
        try:
            date_closed = datetime.fromisoformat(incident_data.date_closed.replace('Z', '+00:00'))
        except:
            pass
    
    date_risk_assessment = None
    if incident_data.date_risk_assessment_performed:
        try:
            date_risk_assessment = datetime.fromisoformat(incident_data.date_risk_assessment_performed.replace('Z', '+00:00'))
        except:
            pass
    
    date_amsa = None
    if incident_data.date_amsa_notified:
        try:
            date_amsa = datetime.fromisoformat(incident_data.date_amsa_notified.replace('Z', '+00:00'))
        except:
            pass
    
    update_dict = incident_data.model_dump()
    update_dict['incident_date'] = incident_date
    update_dict['target_completion_date'] = target_date
    update_dict['date_closed'] = date_closed
    update_dict['date_risk_assessment_performed'] = date_risk_assessment
    update_dict['date_amsa_notified'] = date_amsa
    update_dict['updated_at'] = datetime.now(timezone.utc)
    
    await db.incidents.update_one({"id": incident_id}, {"$set": update_dict})
    await log_audit(current_user["id"], current_user["full_name"], "update", "incident", incident_id, "Updated incident")
    
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
    purpose: Optional[str] = None
    procedure_steps: str
    vessel_ids: Optional[List[str]] = None
    vessel_names: Optional[List[str]] = None
    equipment_required: Optional[str] = None
    muster_station: Optional[str] = None
    key_contacts: Optional[str] = None
    masters_guidance_notes: Optional[str] = None
    reference_documents: Optional[str] = None
    authorised_by: Optional[str] = None
    date_authorised: Optional[str] = None
    vessel_id: Optional[str] = None
    last_reviewed: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmergencyProcedureCreate(BaseModel):
    emergency_type: str
    title: str
    purpose: Optional[str] = None
    procedure_steps: str
    vessel_ids: Optional[List[str]] = None
    vessel_names: Optional[List[str]] = None
    equipment_required: Optional[str] = None
    muster_station: Optional[str] = None
    key_contacts: Optional[str] = None
    masters_guidance_notes: Optional[str] = None
    reference_documents: Optional[str] = None
    authorised_by: Optional[str] = None
    date_authorised: Optional[str] = None
    vessel_id: Optional[str] = None

class EmergencyDrill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    drill_type: str
    drill_date: datetime
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    linked_trip_id: Optional[str] = None  # Link to trip
    linked_trip_name: Optional[str] = None
    crew_participants: Optional[List[str]] = None  # List of crew member names
    participants: Optional[str] = None  # Other/non-crew participants
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
    linked_trip_id: Optional[str] = None
    linked_trip_name: Optional[str] = None
    crew_participants: Optional[List[str]] = None
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
    # Also delete associated training records
    await db.training_records.delete_many({"procedure_id": procedure_id})
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
    # Also delete associated drill records
    await db.drill_records.delete_many({"drill_id": drill_id})
    return {"status": "success"}

# Drill Records Model and Endpoints
class DrillRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    drill_id: str
    record_date: datetime
    crew_members: List[str]  # List of crew member names
    status: str  # "Pass" or "Fail"
    authorized_by: str  # Crew member name who authorized
    authorized_by_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DrillRecordCreate(BaseModel):
    drill_id: str
    record_date: str
    crew_members: List[str]
    status: str
    authorized_by: str
    authorized_by_id: Optional[str] = None
    notes: Optional[str] = None

@api_router.post("/emergency/drill-records")
async def create_drill_record(record_data: DrillRecordCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    record_date = datetime.fromisoformat(record_data.record_date.replace('Z', '+00:00'))
    record_dict = record_data.model_dump()
    record_dict['record_date'] = record_date
    
    record = DrillRecord(**record_dict)
    await db.drill_records.insert_one(record.model_dump())
    return record

@api_router.get("/emergency/drill-records/{drill_id}")
async def get_drill_records(drill_id: str, current_user: dict = Depends(get_current_user)):
    records = await db.drill_records.find({"drill_id": drill_id}, {"_id": 0}).sort("record_date", -1).to_list(1000)
    return records

@api_router.put("/emergency/drill-records/{record_id}")
async def update_drill_record(record_id: str, record_data: dict, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    if 'record_date' in record_data and record_data['record_date']:
        record_data['record_date'] = datetime.fromisoformat(record_data['record_date'].replace('Z', '+00:00'))
    
    await db.drill_records.update_one({"id": record_id}, {"$set": record_data})
    return {"status": "success"}

@api_router.delete("/emergency/drill-records/{record_id}")
async def delete_drill_record(record_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    await db.drill_records.delete_one({"id": record_id})
    return {"status": "success"}

# Training Records Model and Endpoints
class TrainingRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    procedure_id: str
    training_date: datetime
    crew_members: List[str]  # List of crew member names
    status: str  # "Pass" or "Fail"
    authorized_by: str  # Crew member name who authorized
    authorized_by_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TrainingRecordCreate(BaseModel):
    procedure_id: str
    training_date: str
    crew_members: List[str]
    status: str
    authorized_by: str
    authorized_by_id: Optional[str] = None
    notes: Optional[str] = None

@api_router.post("/emergency/training-records")
async def create_training_record(record_data: TrainingRecordCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    training_date = datetime.fromisoformat(record_data.training_date.replace('Z', '+00:00'))
    record_dict = record_data.model_dump()
    record_dict['training_date'] = training_date
    
    record = TrainingRecord(**record_dict)
    await db.training_records.insert_one(record.model_dump())
    return record

@api_router.get("/emergency/training-records/{procedure_id}")
async def get_training_records(procedure_id: str, current_user: dict = Depends(get_current_user)):
    records = await db.training_records.find({"procedure_id": procedure_id}, {"_id": 0}).sort("training_date", -1).to_list(1000)
    return records

@api_router.put("/emergency/training-records/{record_id}")
async def update_training_record(record_id: str, record_data: dict, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    if 'training_date' in record_data and record_data['training_date']:
        record_data['training_date'] = datetime.fromisoformat(record_data['training_date'].replace('Z', '+00:00'))
    
    await db.training_records.update_one({"id": record_id}, {"$set": record_data})
    return {"status": "success"}

@api_router.delete("/emergency/training-records/{record_id}")
async def delete_training_record(record_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    await db.training_records.delete_one({"id": record_id})
    return {"status": "success"}

# Get crew member's drill and training records
@api_router.get("/crew/{crew_name}/drill-records")
async def get_crew_drill_records(crew_name: str, current_user: dict = Depends(get_current_user)):
    # Find all drill records where crew member participated
    records = await db.drill_records.find(
        {"crew_members": crew_name}, 
        {"_id": 0}
    ).sort("record_date", -1).to_list(1000)
    
    # Enrich with drill information
    for record in records:
        drill = await db.emergency_drills.find_one({"id": record["drill_id"]}, {"_id": 0})
        if drill:
            record["drill_type"] = drill.get("drill_type", "Unknown")
            record["drill_date"] = drill.get("drill_date")
    
    return records

@api_router.get("/crew/{crew_name}/training-records")
async def get_crew_training_records(crew_name: str, current_user: dict = Depends(get_current_user)):
    # Find all training records where crew member participated
    records = await db.training_records.find(
        {"crew_members": crew_name}, 
        {"_id": 0}
    ).sort("training_date", -1).to_list(1000)
    
    # Enrich with procedure information
    for record in records:
        procedure = await db.emergency_procedures.find_one({"id": record["procedure_id"]}, {"_id": 0})
        if procedure:
            record["procedure_title"] = procedure.get("title", "Unknown")
            record["emergency_type"] = procedure.get("emergency_type", "Unknown")
    
    return records

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
    pdf_url: Optional[str] = None  # Direct PDF file URL
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
    pdf_url: Optional[str] = None
    notes: Optional[str] = None

class ComplianceRequirement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    requirement_name: str
    category: str  # Safety, Environmental, Operational, Administrative
    description: str
    regulatory_reference: Optional[str] = None
    linked_document_id: Optional[str] = None
    linked_document_name: Optional[str] = None
    vessel_ids: Optional[List[str]] = None
    vessel_names: Optional[List[str]] = None
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
    linked_document_id: Optional[str] = None
    linked_document_name: Optional[str] = None
    vessel_ids: Optional[List[str]] = None
    vessel_names: Optional[List[str]] = None
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
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    try:
        # Get API key from environment
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            return {
                "message": "AI Assistant is not configured. Please add EMERGENT_LLM_KEY to environment.",
                "suggestions": [],
                "conversation_id": str(uuid.uuid4()),
                "requires_setup": True
            }
        
        # Create a unique session ID for this user
        session_id = f"safety-assistant-{current_user['id']}"
        
        # System message for the safety assistant
        system_message = """You are an AI Safety Assistant for a maritime vessel management system. 
Your role is to help users with:
- Safety recommendations and best practices
- Compliance guidance (AMSA regulations, maritime law)
- Risk assessment advice
- Incident analysis and prevention
- Maintenance scheduling recommendations
- Emergency procedure guidance
- Crew training requirements
- Certificate and documentation requirements

Be helpful, professional, and safety-focused. Provide actionable advice.
If you don't know something specific, recommend consulting official AMSA guidelines or a qualified maritime safety officer."""

        # Initialize chat with OpenAI GPT-4o
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        # Create user message
        user_message = UserMessage(text=query.message)
        
        # Get response from AI
        response_text = await chat.send_message(user_message)
        
        # Log the interaction
        await db.ai_chat_history.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "user_name": current_user["full_name"],
            "message": query.message,
            "response": response_text,
            "context_type": query.context_type,
            "created_at": datetime.now(timezone.utc)
        })
        
        return {
            "message": response_text,
            "suggestions": [],
            "conversation_id": session_id,
            "requires_setup": False
        }
        
    except Exception as e:
        logger.error(f"AI Chat error: {str(e)}")
        return {
            "message": f"I apologize, but I encountered an error processing your request. Please try again. Error: {str(e)}",
            "suggestions": [],
            "conversation_id": str(uuid.uuid4()),
            "requires_setup": False
        }

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
import asyncio

# Create backups directory
BACKUPS_DIR = Path("/app/backend/backups")
BACKUPS_DIR.mkdir(exist_ok=True)

# Initialize scheduler
backup_scheduler = BackgroundScheduler()
backup_scheduler.start()

# Helper function to run async jobs in sync context
def run_async_backup_job(schedule_id: str):
    """Wrapper to run async scheduled_backup_job in a sync context"""
    import pymongo
    from pymongo import MongoClient
    
    try:
        # Create a fresh sync MongoDB connection for the scheduler thread
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        
        # Configure connection for Atlas if needed
        if 'mongodb+srv://' in mongo_url or 'mongodb.net' in mongo_url:
            sync_client = MongoClient(
                mongo_url,
                serverSelectionTimeoutMS=30000,
                connectTimeoutMS=30000,
                socketTimeoutMS=30000,
                tls=True,
                tlsAllowInvalidCertificates=False
            )
        else:
            sync_client = MongoClient(mongo_url)
        
        sync_db = sync_client[db_name]
        
        # Get schedule
        schedule = sync_db.backup_schedules.find_one({"id": schedule_id})
        if not schedule or not schedule.get("enabled"):
            sync_client.close()
            return
        
        # Create backup data
        backup_data = {
            "backup_date": datetime.now(timezone.utc).isoformat(),
            "backup_version": "1.0",
            "backup_type": "scheduled",
            "created_by": "System (Scheduled)",
            "collections": {}
        }
        
        collections_to_backup = [
            "users", "vessels", "crew", "trips", "incidents", "drills",
            "maintenance", "documents", "compliance_certificates", "help_texts",
            "inductions", "sms_revisions", "audit_logs", "activity_logs",
            "passengers", "expenditures", "allocated_crew", "trip_logs",
            "running_logs", "engine_running_logs", "compliance_requirements"
        ]
        
        record_count = 0
        collections_backed_up = []
        
        for collection_name in collections_to_backup:
            try:
                documents = list(sync_db[collection_name].find({}, {"_id": 0}))
                if documents:
                    backup_data["collections"][collection_name] = documents
                    record_count += len(documents)
                    collections_backed_up.append(collection_name)
            except Exception as col_err:
                logger.warning(f"Error backing up collection {collection_name}: {str(col_err)}")
        
        # Create backup file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"amsa_backup_scheduled_{timestamp}.json"
        
        backup_dir = Path(__file__).parent / "backups"
        backup_dir.mkdir(exist_ok=True)
        file_path = backup_dir / filename
        
        # Write backup file
        import json
        with open(file_path, "w") as f:
            json.dump(backup_data, f, indent=2, default=str)
        
        file_size = file_path.stat().st_size
        
        # Create backup history record
        backup_history = {
            "id": str(uuid.uuid4()),
            "filename": filename,
            "file_path": str(file_path),
            "file_size": file_size,
            "backup_type": "scheduled",
            "schedule_id": schedule_id,
            "created_by": schedule.get("created_by"),
            "created_by_name": "System (Scheduled)",
            "created_at": datetime.now(timezone.utc),
            "record_count": record_count,
            "collections_backed_up": collections_backed_up
        }
        
        sync_db.backup_history.insert_one(backup_history)
        
        # Update last run time
        sync_db.backup_schedules.update_one(
            {"id": schedule_id},
            {"$set": {"last_run": datetime.now(timezone.utc)}}
        )
        
        # Cleanup old backups
        retention_days = schedule.get("retention_days", 30)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
        old_backups = list(sync_db.backup_history.find({
            "created_at": {"$lt": cutoff_date},
            "backup_type": "scheduled"
        }))
        
        for old_backup in old_backups:
            try:
                old_file = Path(old_backup.get("file_path", ""))
                if old_file.exists():
                    old_file.unlink()
                sync_db.backup_history.delete_one({"id": old_backup["id"]})
            except Exception as del_err:
                logger.warning(f"Error deleting old backup: {str(del_err)}")
        
        sync_client.close()
        logger.info(f"Scheduled backup completed successfully: {filename}")
        
    except Exception as e:
        logger.error(f"Error running scheduled backup job: {str(e)}")
        import traceback
        traceback.print_exc()

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

async def _async_scheduled_backup_job(schedule_id: str):
    """Background job to create scheduled backups (async implementation)"""
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
        
        # Add to scheduler (use sync wrapper for async job)
        backup_scheduler.add_job(
            run_async_backup_job,
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
                    run_async_backup_job,
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
# SETTINGS MANAGEMENT
# ============================================================================

class SettingOption(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    value: str
    is_active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Setting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    module: str  # e.g., "crew", "vessel", "document"
    category: str  # e.g., "positions", "roles", "vessel_types"
    label: str  # Human-readable label
    options: List[SettingOption] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SettingOptionCreate(BaseModel):
    value: str
    is_active: bool = True
    order: int = 0

class SettingUpdate(BaseModel):
    label: Optional[str] = None
    options: Optional[List[SettingOptionCreate]] = None

@api_router.get("/settings")
async def get_all_settings(current_user: dict = Depends(get_current_user)):
    """Get all system settings"""
    try:
        settings = await db.settings.find({}, {"_id": 0}).to_list(1000)
        return settings
    except Exception as e:
        logger.error(f"Error fetching settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching settings")

@api_router.get("/settings/{module}")
async def get_module_settings(module: str, current_user: dict = Depends(get_current_user)):
    """Get settings for a specific module"""
    try:
        settings = await db.settings.find({"module": module}, {"_id": 0}).to_list(1000)
        return settings
    except Exception as e:
        logger.error(f"Error fetching module settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching module settings")

@api_router.get("/settings/{module}/{category}")
async def get_setting(module: str, category: str, current_user: dict = Depends(get_current_user)):
    """Get a specific setting"""
    try:
        setting = await db.settings.find_one(
            {"module": module, "category": category}, 
            {"_id": 0}
        )
        
        if not setting:
            # Return default empty setting structure
            return {
                "module": module,
                "category": category,
                "label": category.replace("_", " ").title(),
                "options": []
            }
        
        return setting
    except Exception as e:
        logger.error(f"Error fetching setting: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching setting")

@api_router.put("/settings/{module}/{category}")
async def update_setting(
    module: str, 
    category: str, 
    setting_update: SettingUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update or create a setting"""
    if current_user.get("access_level") != AccessLevel.FULL:
        raise HTTPException(status_code=403, detail="Only users with Full access can update settings")
    
    try:
        existing = await db.settings.find_one(
            {"module": module, "category": category},
            {"_id": 0}
        )
        
        if existing:
            # Update existing setting
            update_data = {"updated_at": datetime.now(timezone.utc)}
            
            if setting_update.label:
                update_data["label"] = setting_update.label
            
            if setting_update.options is not None:
                # Convert options to dict format
                options = []
                for idx, opt in enumerate(setting_update.options):
                    options.append({
                        "id": str(uuid.uuid4()),
                        "value": opt.value,
                        "is_active": opt.is_active,
                        "order": opt.order if opt.order > 0 else idx,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
                update_data["options"] = options
            
            await db.settings.update_one(
                {"module": module, "category": category},
                {"$set": update_data}
            )
        else:
            # Create new setting
            options = []
            if setting_update.options:
                for idx, opt in enumerate(setting_update.options):
                    options.append({
                        "id": str(uuid.uuid4()),
                        "value": opt.value,
                        "is_active": opt.is_active,
                        "order": opt.order if opt.order > 0 else idx,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
            
            new_setting = {
                "id": str(uuid.uuid4()),
                "module": module,
                "category": category,
                "label": setting_update.label or category.replace("_", " ").title(),
                "options": options,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.settings.insert_one(new_setting)
        
        await log_audit(
            current_user["id"],
            current_user["full_name"],
            "update_setting",
            "settings",
            f"{module}.{category}",
            f"Updated {module} {category}"
        )
        
        # Fetch and return updated setting
        updated = await db.settings.find_one(
            {"module": module, "category": category},
            {"_id": 0}
        )
        return updated
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating setting: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating setting: {str(e)}")

@api_router.delete("/settings/{module}/{category}/option/{option_id}")
async def delete_setting_option(
    module: str,
    category: str,
    option_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a specific option from a setting"""
    if current_user.get("access_level") != AccessLevel.FULL:
        raise HTTPException(status_code=403, detail="Only users with Full access can delete setting options")
    
    try:
        setting = await db.settings.find_one(
            {"module": module, "category": category},
            {"_id": 0}
        )
        
        if not setting:
            raise HTTPException(status_code=404, detail="Setting not found")
        
        # Remove the option
        updated_options = [opt for opt in setting.get("options", []) if opt.get("id") != option_id]
        
        await db.settings.update_one(
            {"module": module, "category": category},
            {"$set": {
                "options": updated_options,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        await log_audit(
            current_user["id"],
            current_user["full_name"],
            "delete_setting_option",
            "settings",
            f"{module}.{category}",
            f"Deleted option {option_id}"
        )
        
        return {"message": "Option deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting setting option: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting setting option: {str(e)}")

@api_router.post("/settings/{module}/{category}/populate")
async def populate_setting_from_existing(
    module: str,
    category: str,
    current_user: dict = Depends(get_current_user)
):
    """Populate settings from existing records in the database"""
    if current_user.get("access_level") != AccessLevel.FULL:
        raise HTTPException(status_code=403, detail="Only users with Full access can populate settings")
    
    try:
        unique_values = []
        
        # Crew module
        if module == "crew" and category == "positions":
            crew = await db.crew.find({}, {"_id": 0, "default_position": 1}).to_list(10000)
            unique_values = list(set([c.get("default_position") for c in crew if c.get("default_position")]))
        
        elif module == "crew" and category == "roles":
            crew = await db.crew.find({}, {"_id": 0, "role": 1}).to_list(10000)
            unique_values = list(set([c.get("role") for c in crew if c.get("role")]))
        
        # Vessel module
        elif module == "vessel" and category == "vessel_types":
            vessels = await db.vessels.find({}, {"_id": 0, "vessel_type": 1}).to_list(10000)
            unique_values = list(set([v.get("vessel_type") for v in vessels if v.get("vessel_type")]))
        
        elif module == "vessel" and category == "operational_status":
            vessels = await db.vessels.find({}, {"_id": 0, "operational_status": 1}).to_list(10000)
            unique_values = list(set([v.get("operational_status") for v in vessels if v.get("operational_status")]))
        
        # Trip module
        elif module == "trip" and category == "trip_types":
            trips = await db.trips.find({}, {"_id": 0, "trip_type": 1}).to_list(10000)
            unique_values = list(set([t.get("trip_type") for t in trips if t.get("trip_type")]))
        
        # Document module
        elif module == "document" and category == "categories":
            documents = await db.documents.find({}, {"_id": 0, "category": 1}).to_list(10000)
            unique_values = list(set([doc.get("category") for doc in documents if doc.get("category")]))
        
        # Incident module
        elif module == "incident" and category == "incident_types":
            incidents = await db.incidents.find({}, {"_id": 0, "incident_type": 1}).to_list(10000)
            unique_values = list(set([inc.get("incident_type") for inc in incidents if inc.get("incident_type")]))
        
        elif module == "incident" and category == "severities":
            incidents = await db.incidents.find({}, {"_id": 0, "severity": 1}).to_list(10000)
            unique_values = list(set([inc.get("severity") for inc in incidents if inc.get("severity")]))
        
        # Emergency module
        elif module == "emergency" and category == "contact_types":
            contacts = await db.emergency_contacts.find({}, {"_id": 0, "contact_type": 1}).to_list(10000)
            unique_values = list(set([c.get("contact_type") for c in contacts if c.get("contact_type")]))
        
        elif module == "emergency" and category == "emergency_types":
            procedures = await db.emergency_procedures.find({}, {"_id": 0, "emergency_type": 1}).to_list(10000)
            unique_values = list(set([p.get("emergency_type") for p in procedures if p.get("emergency_type")]))
        
        elif module == "emergency" and category == "drill_types":
            drills = await db.emergency_drills.find({}, {"_id": 0, "drill_type": 1}).to_list(10000)
            unique_values = list(set([d.get("drill_type") for d in drills if d.get("drill_type")]))
        
        # Passenger module
        elif module == "passenger" and category == "passenger_types":
            # Get from trip_passengers status and passengers passenger_type
            trip_passengers = await db.trip_passengers.find({}, {"_id": 0, "status": 1}).to_list(10000)
            passengers = await db.passengers.find({}, {"_id": 0, "passenger_type": 1}).to_list(10000)
            
            statuses = [tp.get("status") for tp in trip_passengers if tp.get("status")]
            types = [p.get("passenger_type") for p in passengers if p.get("passenger_type")]
            
            unique_values = list(set(statuses + types))
        
        else:
            # If no matching category, return empty
            unique_values = []
        
        if not unique_values:
            return {"message": "No existing values found to populate", "count": 0}
        
        # Sort values
        unique_values.sort()
        
        # Get existing setting
        existing = await db.settings.find_one(
            {"module": module, "category": category},
            {"_id": 0}
        )
        
        existing_option_values = []
        if existing and existing.get("options"):
            existing_option_values = [opt.get("value") for opt in existing.get("options", [])]
        
        # Only add new unique values
        new_values = [v for v in unique_values if v not in existing_option_values]
        
        if not new_values:
            return {"message": "All existing values are already in settings", "count": 0}
        
        # Create new options
        new_options = []
        start_order = len(existing_option_values) if existing else 0
        
        for idx, value in enumerate(new_values):
            new_options.append({
                "id": str(uuid.uuid4()),
                "value": value,
                "is_active": True,
                "order": start_order + idx,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        # Update or create setting
        if existing:
            all_options = existing.get("options", []) + new_options
            await db.settings.update_one(
                {"module": module, "category": category},
                {"$set": {
                    "options": all_options,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            new_setting = {
                "id": str(uuid.uuid4()),
                "module": module,
                "category": category,
                "label": category.replace("_", " ").title(),
                "options": new_options,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.settings.insert_one(new_setting)
        
        await log_audit(
            current_user["id"],
            current_user["full_name"],
            "populate_setting",
            "settings",
            f"{module}.{category}",
            f"Populated {len(new_values)} new values from existing records"
        )
        
        return {
            "message": f"Successfully populated {len(new_values)} new values",
            "count": len(new_values),
            "values": new_values
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error populating setting: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error populating setting: {str(e)}")


# ============================================================================
# SMS REVISION MANAGEMENT
# ============================================================================

class SMSRevision(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    revision_date: datetime
    revision_description: str
    crew_member_id: Optional[str] = None
    crew_member_name: Optional[str] = None
    version_number: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SMSRevisionCreate(BaseModel):
    revision_date: str
    revision_description: str
    crew_member_id: Optional[str] = None
    crew_member_name: Optional[str] = None
    version_number: Optional[str] = None

@api_router.get("/sms-revisions")
async def get_sms_revisions(current_user: dict = Depends(require_access_level(AccessLevel.VIEW))):
    revisions = await db.sms_revisions.find({}, {"_id": 0}).sort("revision_date", -1).to_list(1000)
    return revisions

@api_router.post("/sms-revisions")
async def create_sms_revision(revision_data: SMSRevisionCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    revision_date = datetime.fromisoformat(revision_data.revision_date.replace('Z', '+00:00'))
    
    revision = SMSRevision(
        revision_date=revision_date,
        revision_description=revision_data.revision_description,
        crew_member_id=revision_data.crew_member_id,
        crew_member_name=revision_data.crew_member_name,
        version_number=revision_data.version_number,
        created_by=current_user["id"],
        created_by_name=current_user["full_name"]
    )
    
    await db.sms_revisions.insert_one(revision.model_dump())
    await log_audit(current_user["id"], current_user["full_name"], "create", "sms_revision", revision.id, f"Created SMS revision: {revision_data.revision_description[:50]}")
    
    return revision

@api_router.put("/sms-revisions/{revision_id}")
async def update_sms_revision(revision_id: str, revision_data: SMSRevisionCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    existing = await db.sms_revisions.find_one({"id": revision_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="SMS revision not found")
    
    update_data = {
        "revision_date": datetime.fromisoformat(revision_data.revision_date.replace('Z', '+00:00')),
        "revision_description": revision_data.revision_description,
        "crew_member_id": revision_data.crew_member_id,
        "crew_member_name": revision_data.crew_member_name,
        "version_number": revision_data.version_number
    }
    
    await db.sms_revisions.update_one({"id": revision_id}, {"$set": update_data})
    await log_audit(current_user["id"], current_user["full_name"], "update", "sms_revision", revision_id, f"Updated SMS revision: {revision_data.revision_description[:50]}")
    
    updated = await db.sms_revisions.find_one({"id": revision_id}, {"_id": 0})
    return updated

@api_router.delete("/sms-revisions/{revision_id}")
async def delete_sms_revision(revision_id: str, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    result = await db.sms_revisions.delete_one({"id": revision_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="SMS revision not found")
    await log_audit(current_user["id"], current_user["full_name"], "delete", "sms_revision", revision_id, "Deleted SMS revision")
    return {"message": "SMS revision deleted"}

# ============================================================================
# TRIP PASSENGER DETAILS
# ============================================================================

class TripPassenger(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trip_id: str
    passenger_id: Optional[str] = None  # Link to Passenger collection (optional for manual entry)
    name: str
    status: str  # From admin settings: passenger_types (e.g., Primary, Guest, VIP, Charter)
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TripPassengerCreate(BaseModel):
    trip_id: str
    passenger_id: Optional[str] = None
    name: str
    status: str
    comment: Optional[str] = None

@api_router.get("/trip-passengers")
async def get_trip_passengers(trip_id: Optional[str] = None, current_user: dict = Depends(require_access_level(AccessLevel.VIEW))):
    query = {}
    if trip_id:
        query["trip_id"] = trip_id
    passengers = await db.trip_passengers.find(query, {"_id": 0}).to_list(1000)
    return passengers

@api_router.post("/trip-passengers")
async def create_trip_passenger(passenger_data: TripPassengerCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    passenger = TripPassenger(**passenger_data.model_dump())
    await db.trip_passengers.insert_one(passenger.model_dump())
    return passenger

@api_router.put("/trip-passengers/{passenger_id}")
async def update_trip_passenger(passenger_id: str, passenger_data: TripPassengerCreate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    result = await db.trip_passengers.update_one(
        {"id": passenger_id},
        {"$set": passenger_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Passenger not found")
    return await db.trip_passengers.find_one({"id": passenger_id}, {"_id": 0})

@api_router.delete("/trip-passengers/{passenger_id}")
async def delete_trip_passenger(passenger_id: str, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    result = await db.trip_passengers.delete_one({"id": passenger_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Passenger not found")
    return {"message": "Passenger deleted"}

# ============================================================================
# VESSEL SAFETY INDUCTION TRAINING
# ============================================================================

class VesselInductionRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vessel_id: str
    vessel_name: Optional[str] = None
    crew_id: str
    crew_name: str
    completed_tasks: List[str] = []  # List of task names completed
    authorising_staff: Optional[str] = None
    date_signed: Optional[str] = None
    vessel_owner: Optional[str] = None
    date_signed_owner: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VesselInductionRecordUpdate(BaseModel):
    vessel_id: str
    vessel_name: Optional[str] = None
    crew_id: str
    crew_name: str
    completed_tasks: List[str] = []
    authorising_staff: Optional[str] = None
    date_signed: Optional[str] = None
    vessel_owner: Optional[str] = None
    date_signed_owner: Optional[str] = None

@api_router.get("/vessel-induction")
async def get_vessel_induction_records(vessel_id: Optional[str] = None, crew_id: Optional[str] = None, current_user: dict = Depends(require_access_level(AccessLevel.VIEW))):
    query = {}
    if vessel_id:
        query["vessel_id"] = vessel_id
    if crew_id:
        query["crew_id"] = crew_id
    records = await db.vessel_induction.find(query, {"_id": 0}).to_list(1000)
    return records

@api_router.post("/vessel-induction")
async def upsert_vessel_induction(record_data: VesselInductionRecordUpdate, current_user: dict = Depends(require_access_level(AccessLevel.EDIT))):
    # Check if record exists for this vessel/crew combination
    existing = await db.vessel_induction.find_one({
        "vessel_id": record_data.vessel_id,
        "crew_id": record_data.crew_id
    })
    
    if existing:
        # Update existing
        await db.vessel_induction.update_one(
            {"id": existing["id"]},
            {"$set": {
                "vessel_name": record_data.vessel_name,
                "completed_tasks": record_data.completed_tasks,
                "authorising_staff": record_data.authorising_staff,
                "date_signed": record_data.date_signed,
                "vessel_owner": record_data.vessel_owner,
                "date_signed_owner": record_data.date_signed_owner,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        return await db.vessel_induction.find_one({"id": existing["id"]}, {"_id": 0})
    else:
        # Create new
        record = VesselInductionRecord(**record_data.model_dump())
        await db.vessel_induction.insert_one(record.model_dump())
        return record

# ==================== HELP CONTENT API ====================

@api_router.get("/help/{module_key}")
async def get_help_content(module_key: str, current_user: dict = Depends(get_current_user)):
    """Get help content for a specific module"""
    help_doc = await db.help_content.find_one({"module_key": module_key}, {"_id": 0})
    if not help_doc:
        raise HTTPException(status_code=404, detail="Help content not found")
    return help_doc

@api_router.put("/help/{module_key}")
async def update_help_content(module_key: str, help_data: dict, current_user: dict = Depends(get_current_user)):
    """Update help content for a specific module - Admin only"""
    if current_user.get("access_level") != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    help_doc = {
        "module_key": module_key,
        "title": help_data.get("title", ""),
        "content": help_data.get("content", ""),
        "link_url": help_data.get("link_url", ""),
        "link_text": help_data.get("link_text", "Learn more"),
        "updated_by": current_user.get("id"),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.help_content.update_one(
        {"module_key": module_key},
        {"$set": help_doc},
        upsert=True
    )
    return help_doc

# ============================================================================
# EMAIL CONFIGURATION ENDPOINTS
# ============================================================================

class EmailConfig(BaseModel):
    smtp_server: str
    smtp_port: str = "587"
    smtp_username: str
    smtp_password: Optional[str] = None
    from_email: str
    from_name: str = "AMSA Safety Management"
    use_tls: bool = True

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@api_router.get("/email-config")
async def get_email_config(current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    """Get email configuration (without password)"""
    config = await db.email_config.find_one({}, {"_id": 0, "smtp_password": 0})
    return config or {}

@api_router.post("/email-config")
async def save_email_config(config: EmailConfig, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    """Save email configuration"""
    config_data = config.model_dump()
    
    # If password is empty, keep the existing one
    if not config_data.get("smtp_password"):
        existing = await db.email_config.find_one({})
        if existing:
            config_data["smtp_password"] = existing.get("smtp_password", "")
    
    config_data["updated_at"] = datetime.now(timezone.utc)
    config_data["updated_by"] = current_user["id"]
    
    await db.email_config.update_one({}, {"$set": config_data}, upsert=True)
    
    await log_audit(
        current_user["id"], 
        current_user["full_name"], 
        "update", 
        "email_config", 
        "system", 
        "Updated email configuration"
    )
    
    return {"message": "Email configuration saved"}

@api_router.post("/email-config/test")
async def send_test_email(data: dict, current_user: dict = Depends(require_access_level(AccessLevel.FULL))):
    """Send a test email to verify configuration"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    config = await db.email_config.find_one({})
    if not config:
        raise HTTPException(status_code=400, detail="Email configuration not found")
    
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = f"{config.get('from_name', 'AMSA')} <{config['from_email']}>"
        msg['To'] = data['email']
        msg['Subject'] = "AMSA Safety Management - Test Email"
        
        body = """
        This is a test email from AMSA Safety Management System.
        
        If you received this email, your email configuration is working correctly.
        
        Best regards,
        AMSA Safety Management System
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect and send with timeout
        if config.get('use_tls', True):
            server = smtplib.SMTP(config['smtp_server'], int(config['smtp_port']), timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(config['smtp_server'], int(config['smtp_port']), timeout=10)
        
        server.login(config['smtp_username'], config['smtp_password'])
        server.send_message(msg)
        server.quit()
        
        return {"message": "Test email sent successfully"}
        
    except Exception as e:
        logger.error(f"Failed to send test email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    user = await db.users.find_one({"email": request.email.lower()}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a password reset link will be sent"}
    
    # Check if email config exists
    config = await db.email_config.find_one({})
    if not config or not config.get('smtp_server'):
        raise HTTPException(status_code=500, detail="Email service not configured. Please contact administrator.")
    
    # Generate reset token (valid for 1 hour)
    reset_token = str(uuid.uuid4())
    reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.users.update_one(
        {"email": request.email.lower()},
        {"$set": {
            "reset_token": reset_token,
            "reset_token_expires": reset_expires
        }}
    )
    
    try:
        # Create reset email
        msg = MIMEMultipart()
        msg['From'] = f"{config.get('from_name', 'AMSA')} <{config['from_email']}>"
        msg['To'] = request.email
        msg['Subject'] = "AMSA Safety Management - Password Reset Request"
        
        # Get the frontend URL from environment or use default
        frontend_url = os.environ.get('FRONTEND_URL', 'https://nautical-ops-2.preview.emergentagent.com')
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        body = f"""
Hello {user.get('full_name', 'User')},

You requested a password reset for your AMSA Safety Management account.

Click the link below to reset your password:
{reset_link}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email.

Best regards,
AMSA Safety Management System
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect and send with timeout
        if config.get('use_tls', True):
            server = smtplib.SMTP(config['smtp_server'], int(config['smtp_port']), timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(config['smtp_server'], int(config['smtp_port']), timeout=10)
        
        server.login(config['smtp_username'], config['smtp_password'])
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Password reset email sent to {request.email}")
        
    except Exception as e:
        logger.error(f"Failed to send password reset email: {str(e)}")
        logger.info(f"RESET TOKEN (for debugging): {reset_token}")
        # Don't raise exception - still return success to prevent email enumeration
        # The token was created, admin can find it in logs if needed
        return {"message": "If the email exists, a password reset link will be sent", "email_sent": False}
    
    return {"message": "If the email exists, a password reset link will be sent", "email_sent": True}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    user = await db.users.find_one({
        "reset_token": request.token,
        "reset_token_expires": {"$gt": datetime.now(timezone.utc)}
    }, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Update password and clear reset token
    new_password_hash = hash_password(request.new_password)
    
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {"password_hash": new_password_hash},
            "$unset": {"reset_token": "", "reset_token_expires": ""}
        }
    )
    
    logger.info(f"Password reset successful for user {user['email']}")
    
    return {"message": "Password reset successful. You can now login with your new password."}

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
