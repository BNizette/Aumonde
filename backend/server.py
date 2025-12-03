from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 1440))

# Security
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============ MODELS ============

class UserRole:
    OWNER = "owner"
    MASTER = "master"
    CREW = "crew"
    DESIGNATED_PERSON = "designated_person"
    INSPECTOR = "inspector"

class VesselClass:
    CLASS_1 = "class_1"
    CLASS_2 = "class_2"
    CLASS_3 = "class_3"
    CLASS_4 = "class_4"

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str
    organization: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    organization: Optional[str] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str
    organization: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Vessel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    vessel_class: str
    registration_number: str
    length: float
    owner_id: str
    sms_type: str  # "standard" or "simplified"
    eligible_simplified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VesselCreate(BaseModel):
    name: str
    vessel_class: str
    registration_number: str
    length: float
    sms_type: str = "standard"

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vessel_id: str
    title: str
    document_type: str  # "policy", "procedure", "manual", "certificate"
    content: Optional[str] = None
    file_data: Optional[str] = None  # Base64 encoded
    version: str = "1.0"
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DocumentCreate(BaseModel):
    vessel_id: str
    title: str
    document_type: str
    content: Optional[str] = None
    file_data: Optional[str] = None
    version: str = "1.0"

class RiskAssessment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vessel_id: str
    hazard: str
    risk_level: str  # "low", "medium", "high", "critical"
    likelihood: int  # 1-5
    consequence: int  # 1-5
    control_measures: List[str]
    residual_risk: str
    assessment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    assessed_by: str
    status: str = "active"  # "active", "reviewed", "closed"

class RiskAssessmentCreate(BaseModel):
    vessel_id: str
    hazard: str
    likelihood: int
    consequence: int
    control_measures: List[str]

class CrewMember(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vessel_id: str
    full_name: str
    position: str
    qualifications: List[str]
    license_number: Optional[str] = None
    license_expiry: Optional[datetime] = None
    medical_expiry: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CrewMemberCreate(BaseModel):
    vessel_id: str
    full_name: str
    position: str
    qualifications: List[str]
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    medical_expiry: Optional[str] = None

class FatigueLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    crew_id: str
    vessel_id: str
    date: datetime
    hours_worked: float
    rest_hours: float
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FatigueLogCreate(BaseModel):
    crew_id: str
    vessel_id: str
    date: str
    hours_worked: float
    rest_hours: float
    notes: Optional[str] = None

class MaintenanceSchedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vessel_id: str
    equipment: str
    maintenance_type: str  # "routine", "inspection", "repair"
    frequency: str  # "daily", "weekly", "monthly", "quarterly", "annual"
    last_completed: Optional[datetime] = None
    next_due: datetime
    status: str = "scheduled"  # "scheduled", "overdue", "completed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MaintenanceScheduleCreate(BaseModel):
    vessel_id: str
    equipment: str
    maintenance_type: str
    frequency: str
    next_due: str

class MaintenanceLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    schedule_id: str
    vessel_id: str
    completed_date: datetime
    performed_by: str
    findings: str
    action_taken: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MaintenanceLogCreate(BaseModel):
    schedule_id: str
    vessel_id: str
    completed_date: str
    performed_by: str
    findings: str
    action_taken: str

class Incident(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vessel_id: str
    incident_type: str  # "accident", "near_miss", "pollution", "equipment_failure"
    severity: str  # "minor", "moderate", "serious", "critical"
    date: datetime
    location: str
    description: str
    persons_involved: List[str]
    immediate_action: str
    investigation_status: str = "reported"  # "reported", "investigating", "closed"
    corrective_actions: Optional[List[str]] = None
    reported_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IncidentCreate(BaseModel):
    vessel_id: str
    incident_type: str
    severity: str
    date: str
    location: str
    description: str
    persons_involved: List[str]
    immediate_action: str

class EmergencyProcedure(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vessel_id: str
    procedure_type: str  # "fire", "abandon_ship", "man_overboard", "loss_propulsion", "oil_spill"
    steps: List[str]
    emergency_contacts: List[Dict[str, str]]
    last_drill: Optional[datetime] = None
    next_drill: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmergencyProcedureCreate(BaseModel):
    vessel_id: str
    procedure_type: str
    steps: List[str]
    emergency_contacts: List[Dict[str, str]]
    last_drill: Optional[str] = None
    next_drill: Optional[str] = None

class ComplianceChecklist(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vessel_id: str
    checklist_type: str  # "mo504_class1-3", "mo504_class4"
    items: List[Dict[str, Any]]  # [{"item": "...", "compliant": bool, "notes": "..."}]
    assessment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    assessed_by: str
    overall_status: str  # "compliant", "non_compliant", "partial"

class ComplianceChecklistCreate(BaseModel):
    vessel_id: str
    checklist_type: str
    items: List[Dict[str, Any]]

class AIRequest(BaseModel):
    vessel_id: str
    request_type: str  # "risk_assessment", "compliance_check", "document_analysis"
    context: Dict[str, Any]

class AIResponse(BaseModel):
    result: str
    suggestions: Optional[List[str]] = None

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ CONFIG ROUTES ============

@api_router.get("/config")
async def get_config():
    return {
        "organization_name": os.environ.get('ORGANIZATION_NAME', 'AMSA')
    }

# ============ AUTH ROUTES ============

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user_data.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_obj = User(**{k: v for k, v in user_dict.items() if k != 'password'})
    
    doc = user_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['password'] = user_dict['password']
    
    await db.users.insert_one(doc)
    
    token = create_access_token({"sub": user_obj.id})
    return {"user": user_obj, "token": token}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user.pop('password')
    user.pop('_id', None)
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    token = create_access_token({"sub": user['id']})
    return {"user": User(**user), "token": token}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/password-reset-request")
async def request_password_reset(request: PasswordResetRequest):
    """Request password reset - generates a token"""
    user = await db.users.find_one({"email": request.email})
    if not user:
        # Don't reveal if user exists or not
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Generate reset token (valid for 1 hour)
    reset_token = create_access_token({
        "sub": user['id'],
        "type": "password_reset",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    })
    
    # In production, you would send this via email
    # For now, we'll return it in the response
    return {
        "message": "Password reset token generated",
        "token": reset_token,
        "note": "In production, this would be sent via email"
    }

@api_router.post("/auth/password-reset")
async def reset_password(reset: PasswordReset):
    """Reset password using token"""
    try:
        payload = jwt.decode(reset.token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid token type")
        
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update password
        hashed = hash_password(reset.new_password)
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"password": hashed}}
        )
        
        return {"message": "Password reset successfully"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Reset token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Invalid token")

@api_router.post("/auth/change-password")
async def change_password(password_change: PasswordChange, current_user: User = Depends(get_current_user)):
    """Change password for authenticated user"""
    user = await db.users.find_one({"id": current_user.id})
    if not user or not verify_password(password_change.old_password, user['password']):
        raise HTTPException(status_code=400, detail="Invalid current password")
    
    # Update password
    hashed = hash_password(password_change.new_password)
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"password": hashed}}
    )
    
    return {"message": "Password changed successfully"}

@api_router.put("/auth/profile")
async def update_profile(update: UserUpdate, current_user: User = Depends(get_current_user)):
    """Update user profile"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    if isinstance(updated_user.get('created_at'), str):
        updated_user['created_at'] = datetime.fromisoformat(updated_user['created_at'])
    return User(**updated_user)

# ============ ADMIN ROUTES ============

@api_router.get("/admin/users")
async def get_all_users(current_user: User = Depends(get_current_user)):
    """Get all users - Admin only"""
    if current_user.role not in [UserRole.OWNER, UserRole.INSPECTOR]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    for u in users:
        if isinstance(u.get('created_at'), str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
    return users

@api_router.put("/admin/users/{user_id}")
async def update_user(user_id: str, update: UserUpdate, current_user: User = Depends(get_current_user)):
    """Update user details - Admin only"""
    if current_user.role not in [UserRole.OWNER, UserRole.INSPECTOR]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if isinstance(updated_user.get('created_at'), str):
        updated_user['created_at'] = datetime.fromisoformat(updated_user['created_at'])
    return User(**updated_user)

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Delete user - Admin only"""
    if current_user.role not in [UserRole.OWNER, UserRole.INSPECTOR]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

@api_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_password(user_id: str, new_password: str, current_user: User = Depends(get_current_user)):
    """Reset user password - Admin only"""
    if current_user.role not in [UserRole.OWNER, UserRole.INSPECTOR]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    hashed = hash_password(new_password)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": hashed}}
    )
    
    return {"message": "Password reset successfully"}

# ============ VESSEL ROUTES ============

@api_router.post("/vessels", response_model=Vessel)
async def create_vessel(vessel_data: VesselCreate, current_user: User = Depends(get_current_user)):
    vessel_dict = vessel_data.model_dump()
    vessel_dict['owner_id'] = current_user.id
    
    # Check simplified SMS eligibility
    if vessel_dict['length'] < 7.5 and vessel_dict['vessel_class'] in ['class_2', 'class_3', 'class_4']:
        vessel_dict['eligible_simplified'] = True
    
    vessel_obj = Vessel(**vessel_dict)
    doc = vessel_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.vessels.insert_one(doc)
    return vessel_obj

@api_router.get("/vessels", response_model=List[Vessel])
async def get_vessels(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role != UserRole.INSPECTOR:
        query['owner_id'] = current_user.id
    
    vessels = await db.vessels.find(query, {"_id": 0}).to_list(1000)
    for v in vessels:
        if isinstance(v.get('created_at'), str):
            v['created_at'] = datetime.fromisoformat(v['created_at'])
    return vessels

@api_router.get("/vessels/{vessel_id}", response_model=Vessel)
async def get_vessel(vessel_id: str, current_user: User = Depends(get_current_user)):
    vessel = await db.vessels.find_one({"id": vessel_id}, {"_id": 0})
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    if isinstance(vessel.get('created_at'), str):
        vessel['created_at'] = datetime.fromisoformat(vessel['created_at'])
    return Vessel(**vessel)

# ============ DOCUMENT ROUTES ============

@api_router.post("/documents", response_model=Document)
async def create_document(doc_data: DocumentCreate, current_user: User = Depends(get_current_user)):
    doc_dict = doc_data.model_dump()
    doc_dict['created_by'] = current_user.id
    
    doc_obj = Document(**doc_dict)
    doc = doc_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.documents.insert_one(doc)
    return doc_obj

@api_router.get("/documents/vessel/{vessel_id}", response_model=List[Document])
async def get_vessel_documents(vessel_id: str, current_user: User = Depends(get_current_user)):
    docs = await db.documents.find({"vessel_id": vessel_id}, {"_id": 0}).to_list(1000)
    for d in docs:
        if isinstance(d.get('created_at'), str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
    return docs

# ============ RISK ASSESSMENT ROUTES ============

@api_router.post("/risk-assessments", response_model=RiskAssessment)
async def create_risk_assessment(risk_data: RiskAssessmentCreate, current_user: User = Depends(get_current_user)):
    risk_dict = risk_data.model_dump()
    risk_dict['assessed_by'] = current_user.id
    
    # Calculate risk level
    score = risk_dict['likelihood'] * risk_dict['consequence']
    if score <= 4:
        risk_level = "low"
        residual = "low"
    elif score <= 9:
        risk_level = "medium"
        residual = "medium"
    elif score <= 16:
        risk_level = "high"
        residual = "high"
    else:
        risk_level = "critical"
        residual = "critical"
    
    risk_dict['risk_level'] = risk_level
    risk_dict['residual_risk'] = residual
    
    risk_obj = RiskAssessment(**risk_dict)
    doc = risk_obj.model_dump()
    doc['assessment_date'] = doc['assessment_date'].isoformat()
    
    await db.risk_assessments.insert_one(doc)
    return risk_obj

@api_router.get("/risk-assessments/vessel/{vessel_id}", response_model=List[RiskAssessment])
async def get_vessel_risk_assessments(vessel_id: str, current_user: User = Depends(get_current_user)):
    risks = await db.risk_assessments.find({"vessel_id": vessel_id}, {"_id": 0}).to_list(1000)
    for r in risks:
        if isinstance(r.get('assessment_date'), str):
            r['assessment_date'] = datetime.fromisoformat(r['assessment_date'])
    return risks

# ============ CREW ROUTES ============

@api_router.post("/crew", response_model=CrewMember)
async def create_crew_member(crew_data: CrewMemberCreate, current_user: User = Depends(get_current_user)):
    crew_dict = crew_data.model_dump()
    
    # Convert date strings to datetime
    if crew_dict.get('license_expiry'):
        crew_dict['license_expiry'] = datetime.fromisoformat(crew_dict['license_expiry'])
    if crew_dict.get('medical_expiry'):
        crew_dict['medical_expiry'] = datetime.fromisoformat(crew_dict['medical_expiry'])
    
    crew_obj = CrewMember(**crew_dict)
    doc = crew_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('license_expiry'):
        doc['license_expiry'] = doc['license_expiry'].isoformat()
    if doc.get('medical_expiry'):
        doc['medical_expiry'] = doc['medical_expiry'].isoformat()
    
    await db.crew.insert_one(doc)
    return crew_obj

@api_router.get("/crew/vessel/{vessel_id}", response_model=List[CrewMember])
async def get_vessel_crew(vessel_id: str, current_user: User = Depends(get_current_user)):
    crew = await db.crew.find({"vessel_id": vessel_id}, {"_id": 0}).to_list(1000)
    for c in crew:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
        if isinstance(c.get('license_expiry'), str):
            c['license_expiry'] = datetime.fromisoformat(c['license_expiry'])
        if isinstance(c.get('medical_expiry'), str):
            c['medical_expiry'] = datetime.fromisoformat(c['medical_expiry'])
    return crew

# ============ FATIGUE LOG ROUTES ============

@api_router.post("/fatigue-logs", response_model=FatigueLog)
async def create_fatigue_log(log_data: FatigueLogCreate, current_user: User = Depends(get_current_user)):
    log_dict = log_data.model_dump()
    log_dict['date'] = datetime.fromisoformat(log_dict['date'])
    
    log_obj = FatigueLog(**log_dict)
    doc = log_obj.model_dump()
    doc['date'] = doc['date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.fatigue_logs.insert_one(doc)
    return log_obj

@api_router.get("/fatigue-logs/vessel/{vessel_id}", response_model=List[FatigueLog])
async def get_vessel_fatigue_logs(vessel_id: str, current_user: User = Depends(get_current_user)):
    logs = await db.fatigue_logs.find({"vessel_id": vessel_id}, {"_id": 0}).to_list(1000)
    for log in logs:
        if isinstance(log.get('date'), str):
            log['date'] = datetime.fromisoformat(log['date'])
        if isinstance(log.get('created_at'), str):
            log['created_at'] = datetime.fromisoformat(log['created_at'])
    return logs

# ============ MAINTENANCE ROUTES ============

@api_router.post("/maintenance-schedules", response_model=MaintenanceSchedule)
async def create_maintenance_schedule(schedule_data: MaintenanceScheduleCreate, current_user: User = Depends(get_current_user)):
    schedule_dict = schedule_data.model_dump()
    schedule_dict['next_due'] = datetime.fromisoformat(schedule_dict['next_due'])
    
    schedule_obj = MaintenanceSchedule(**schedule_dict)
    doc = schedule_obj.model_dump()
    doc['next_due'] = doc['next_due'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('last_completed'):
        doc['last_completed'] = doc['last_completed'].isoformat()
    
    await db.maintenance_schedules.insert_one(doc)
    return schedule_obj

@api_router.get("/maintenance-schedules/vessel/{vessel_id}", response_model=List[MaintenanceSchedule])
async def get_vessel_maintenance_schedules(vessel_id: str, current_user: User = Depends(get_current_user)):
    schedules = await db.maintenance_schedules.find({"vessel_id": vessel_id}, {"_id": 0}).to_list(1000)
    for s in schedules:
        if isinstance(s.get('next_due'), str):
            s['next_due'] = datetime.fromisoformat(s['next_due'])
        if isinstance(s.get('last_completed'), str):
            s['last_completed'] = datetime.fromisoformat(s['last_completed'])
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    return schedules

@api_router.post("/maintenance-logs", response_model=MaintenanceLog)
async def create_maintenance_log(log_data: MaintenanceLogCreate, current_user: User = Depends(get_current_user)):
    log_dict = log_data.model_dump()
    log_dict['completed_date'] = datetime.fromisoformat(log_dict['completed_date'])
    
    log_obj = MaintenanceLog(**log_dict)
    doc = log_obj.model_dump()
    doc['completed_date'] = doc['completed_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.maintenance_logs.insert_one(doc)
    
    # Update schedule
    await db.maintenance_schedules.update_one(
        {"id": log_dict['schedule_id']},
        {"$set": {"last_completed": doc['completed_date'], "status": "completed"}}
    )
    
    return log_obj

@api_router.get("/maintenance-logs/vessel/{vessel_id}", response_model=List[MaintenanceLog])
async def get_vessel_maintenance_logs(vessel_id: str, current_user: User = Depends(get_current_user)):
    logs = await db.maintenance_logs.find({"vessel_id": vessel_id}, {"_id": 0}).to_list(1000)
    for log in logs:
        if isinstance(log.get('completed_date'), str):
            log['completed_date'] = datetime.fromisoformat(log['completed_date'])
        if isinstance(log.get('created_at'), str):
            log['created_at'] = datetime.fromisoformat(log['created_at'])
    return logs

# ============ INCIDENT ROUTES ============

@api_router.post("/incidents", response_model=Incident)
async def create_incident(incident_data: IncidentCreate, current_user: User = Depends(get_current_user)):
    incident_dict = incident_data.model_dump()
    incident_dict['date'] = datetime.fromisoformat(incident_dict['date'])
    incident_dict['reported_by'] = current_user.id
    
    incident_obj = Incident(**incident_dict)
    doc = incident_obj.model_dump()
    doc['date'] = doc['date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.incidents.insert_one(doc)
    return incident_obj

@api_router.get("/incidents/vessel/{vessel_id}", response_model=List[Incident])
async def get_vessel_incidents(vessel_id: str, current_user: User = Depends(get_current_user)):
    incidents = await db.incidents.find({"vessel_id": vessel_id}, {"_id": 0}).to_list(1000)
    for inc in incidents:
        if isinstance(inc.get('date'), str):
            inc['date'] = datetime.fromisoformat(inc['date'])
        if isinstance(inc.get('created_at'), str):
            inc['created_at'] = datetime.fromisoformat(inc['created_at'])
    return incidents

# ============ EMERGENCY PROCEDURE ROUTES ============

@api_router.post("/emergency-procedures", response_model=EmergencyProcedure)
async def create_emergency_procedure(proc_data: EmergencyProcedureCreate, current_user: User = Depends(get_current_user)):
    proc_dict = proc_data.model_dump()
    
    if proc_dict.get('last_drill'):
        proc_dict['last_drill'] = datetime.fromisoformat(proc_dict['last_drill'])
    if proc_dict.get('next_drill'):
        proc_dict['next_drill'] = datetime.fromisoformat(proc_dict['next_drill'])
    
    proc_obj = EmergencyProcedure(**proc_dict)
    doc = proc_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('last_drill'):
        doc['last_drill'] = doc['last_drill'].isoformat()
    if doc.get('next_drill'):
        doc['next_drill'] = doc['next_drill'].isoformat()
    
    await db.emergency_procedures.insert_one(doc)
    return proc_obj

@api_router.get("/emergency-procedures/vessel/{vessel_id}", response_model=List[EmergencyProcedure])
async def get_vessel_emergency_procedures(vessel_id: str, current_user: User = Depends(get_current_user)):
    procs = await db.emergency_procedures.find({"vessel_id": vessel_id}, {"_id": 0}).to_list(1000)
    for p in procs:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
        if isinstance(p.get('last_drill'), str):
            p['last_drill'] = datetime.fromisoformat(p['last_drill'])
        if isinstance(p.get('next_drill'), str):
            p['next_drill'] = datetime.fromisoformat(p['next_drill'])
    return procs

# ============ COMPLIANCE ROUTES ============

@api_router.post("/compliance-checklists", response_model=ComplianceChecklist)
async def create_compliance_checklist(checklist_data: ComplianceChecklistCreate, current_user: User = Depends(get_current_user)):
    checklist_dict = checklist_data.model_dump()
    checklist_dict['assessed_by'] = current_user.id
    
    # Calculate overall status
    compliant_count = sum(1 for item in checklist_dict['items'] if item.get('compliant', False))
    total = len(checklist_dict['items'])
    
    if compliant_count == total:
        overall = "compliant"
    elif compliant_count == 0:
        overall = "non_compliant"
    else:
        overall = "partial"
    
    checklist_dict['overall_status'] = overall
    
    checklist_obj = ComplianceChecklist(**checklist_dict)
    doc = checklist_obj.model_dump()
    doc['assessment_date'] = doc['assessment_date'].isoformat()
    
    await db.compliance_checklists.insert_one(doc)
    return checklist_obj

@api_router.get("/compliance-checklists/vessel/{vessel_id}", response_model=List[ComplianceChecklist])
async def get_vessel_compliance_checklists(vessel_id: str, current_user: User = Depends(get_current_user)):
    checklists = await db.compliance_checklists.find({"vessel_id": vessel_id}, {"_id": 0}).to_list(1000)
    for c in checklists:
        if isinstance(c.get('assessment_date'), str):
            c['assessment_date'] = datetime.fromisoformat(c['assessment_date'])
    return checklists

# ============ AI ASSISTANT ROUTES ============

@api_router.post("/ai/assist", response_model=AIResponse)
async def ai_assist(request: AIRequest, current_user: User = Depends(get_current_user)):
    try:
        chat = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=f"amsa_{request.vessel_id}_{current_user.id}",
            system_message="You are an AMSA Safety Management System expert assistant. Help with risk assessments, compliance checks, and document analysis for Australian maritime safety."
        )
        chat.with_model("gemini", "gemini-2.5-flash")
        
        if request.request_type == "risk_assessment":
            prompt = f"""Analyze this maritime operation and generate a comprehensive risk assessment:

Operation Details: {request.context.get('operation_details', 'Not provided')}
Vessel Class: {request.context.get('vessel_class', 'Not specified')}
Operating Area: {request.context.get('operating_area', 'Not specified')}

Provide:
1. Key hazards to consider
2. Risk ratings (likelihood and consequence)
3. Recommended control measures
4. AMSA compliance considerations"""
        
        elif request.request_type == "compliance_check":
            prompt = f"""Review the following SMS documentation for AMSA Marine Order 504 compliance:

Vessel Class: {request.context.get('vessel_class', 'Not specified')}
SMS Type: {request.context.get('sms_type', 'standard')}
Documents: {request.context.get('documents', 'Not provided')}

Check compliance with:
1. Fatigue management requirements
2. Drug and alcohol policy
3. Operational and emergency procedures
4. Vessel stability risk assessment
5. Crew qualifications and training

Provide specific recommendations for non-compliant areas."""
        
        elif request.request_type == "document_analysis":
            prompt = f"""Analyze this SMS document:

Document Type: {request.context.get('document_type', 'Not specified')}
Content: {request.context.get('content', 'Not provided')}

Provide:
1. Key findings and strengths
2. Areas needing improvement
3. AMSA compliance gaps
4. Recommendations for enhancement"""
        
        else:
            raise HTTPException(status_code=400, detail="Invalid request type")
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        # Extract suggestions (simple parsing)
        suggestions = []
        if "Recommendations:" in response:
            rec_section = response.split("Recommendations:")[1]
            suggestions = [line.strip() for line in rec_section.split('\n') if line.strip() and (line.strip().startswith('-') or line.strip().startswith('•'))]
        
        return AIResponse(result=response, suggestions=suggestions[:5] if suggestions else None)
    
    except Exception as e:
        logging.error(f"AI assist error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")

# ============ DASHBOARD/ANALYTICS ROUTES ============

@api_router.get("/dashboard/stats/{vessel_id}")
async def get_dashboard_stats(vessel_id: str, current_user: User = Depends(get_current_user)):
    # Get various statistics
    total_crew = await db.crew.count_documents({"vessel_id": vessel_id})
    active_risks = await db.risk_assessments.count_documents({"vessel_id": vessel_id, "status": "active"})
    open_incidents = await db.incidents.count_documents({"vessel_id": vessel_id, "investigation_status": {"$ne": "closed"}})
    overdue_maintenance = await db.maintenance_schedules.count_documents({"vessel_id": vessel_id, "status": "overdue"})
    
    # Recent activity
    recent_incidents = await db.incidents.find({"vessel_id": vessel_id}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_maintenance = await db.maintenance_logs.find({"vessel_id": vessel_id}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_crew": total_crew,
        "active_risks": active_risks,
        "open_incidents": open_incidents,
        "overdue_maintenance": overdue_maintenance,
        "recent_incidents": recent_incidents,
        "recent_maintenance": recent_maintenance
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()