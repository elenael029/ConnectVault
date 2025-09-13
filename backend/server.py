from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import requests
import aiofiles
import shutil
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24  # 30 days

security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="ConnectVault CRM API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Settings Management
SETTINGS_FILE = ROOT_DIR / "settings.json"

# Default settings
DEFAULT_SETTINGS = {
    "branding": {
        "app_name": "ConnectVault",
        "logo_path": ""
    },
    "quick_access_links": {
        "chatgpt": "https://chatgpt.com/",
        "instagram": "https://instagram.com/",
        "tiktok": "https://tiktok.com/",
        "youtube": "https://youtube.com/",
        "facebook": "https://facebook.com/",
        "pinterest": "https://pinterest.com/"
    },
    "email_integration": {
        "mailerlite_api_key": "",
        "default_group_id": ""
    }
}

def load_settings():
    """Load settings from file or return defaults"""
    try:
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, 'r') as f:
                settings = json.load(f)
                # Merge with defaults to ensure all keys exist
                for key in DEFAULT_SETTINGS:
                    if key not in settings:
                        settings[key] = DEFAULT_SETTINGS[key]
                    elif isinstance(DEFAULT_SETTINGS[key], dict):
                        for subkey in DEFAULT_SETTINGS[key]:
                            if subkey not in settings[key]:
                                settings[key][subkey] = DEFAULT_SETTINGS[key][subkey]
                return settings
        else:
            return DEFAULT_SETTINGS.copy()
    except Exception as e:
        logging.error(f"Error loading settings: {e}")
        return DEFAULT_SETTINGS.copy()

def save_settings(settings):
    """Save settings to file"""
    try:
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings, f, indent=2)
        return True
    except Exception as e:
        logging.error(f"Error saving settings: {e}")
        return False

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    username: str
    email: EmailStr
    role: str = "user"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserCreate(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    password: str
    role: str = "user"

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email_or_username: str

class PasswordReset(BaseModel):
    token: str
    new_password: str
    confirm_password: str

class Contact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    email: str
    platform: str
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactCreate(BaseModel):
    name: str
    email: str
    platform: str
    notes: str = ""

class PromoLink(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    promo_name: str
    promo_link: str
    tracking_link: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PromoLinkCreate(BaseModel):
    promo_name: str
    promo_link: str

class Commission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    program_name: str
    amount: float
    status: str = "pending"  # pending, paid, unpaid
    expected_date: Optional[datetime] = None
    paid_date: Optional[datetime] = None
    promo_link_id: Optional[str] = None
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommissionCreate(BaseModel):
    program_name: str
    amount: float
    status: str = "pending"
    expected_date: Optional[datetime] = None
    paid_date: Optional[datetime] = None
    promo_link_id: Optional[str] = None
    notes: str = ""

class CommissionUpdate(BaseModel):
    program_name: Optional[str] = None
    amount: Optional[float] = None
    status: Optional[str] = None
    expected_date: Optional[datetime] = None
    paid_date: Optional[datetime] = None
    promo_link_id: Optional[str] = None
    notes: Optional[str] = None

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    contact_id: Optional[str] = None
    title: str
    description: str = ""
    status: str = "pending"  # pending, in_progress, done
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaskCreate(BaseModel):
    contact_id: Optional[str] = None
    title: str
    description: str = ""
    status: str = "pending"
    due_date: Optional[datetime] = None

class EmailSubscriber(BaseModel):
    name: str
    email: EmailStr
    group_id: Optional[str] = None

class SettingsUpdate(BaseModel):
    branding: Optional[Dict[str, Any]] = None
    quick_access_links: Optional[Dict[str, str]] = None
    email_integration: Optional[Dict[str, str]] = None

class FileRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    category: str = "General"
    size_bytes: int
    mime_type: str
    storage_path: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FileUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"username": token_data.username})
    if user is None:
        raise credentials_exception
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# Authentication endpoints
@api_router.post("/auth/register", response_model=dict)
async def register_user(user: UserCreate):
    # Check if username or email already exists
    existing_user = await db.users.find_one({
        "$or": [{"username": user.username}, {"email": user.email}]
    })
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username or email already exists"
        )
    
    # Hash password and create user
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict.pop("password")
    user_dict["role"] = user_dict["role"].lower()
    
    user_obj = User(**user_dict)
    user_data = user_obj.dict()
    user_data["password_hash"] = hashed_password
    
    await db.users.insert_one(user_data)
    return {"message": "Account created successfully. Please log in"}

@api_router.post("/auth/login", response_model=Token)
async def login_user(user_credentials: UserLogin):
    # Find user by username
    user = await db.users.find_one({"username": user_credentials.username})
    if not user or not verify_password(user_credentials.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    # Find user by email or username
    user = await db.users.find_one({
        "$or": [{"email": request.email_or_username}, {"username": request.email_or_username}]
    })
    if not user:
        # Don't reveal if user exists or not
        return {"message": "If the account exists, a reset link has been generated"}
    
    # Generate reset token (valid for 30 minutes)
    reset_token = secrets.token_urlsafe(32)
    expire_time = datetime.now(timezone.utc) + timedelta(minutes=30)
    
    # Store reset token in database
    await db.password_resets.insert_one({
        "user_id": user["id"],
        "token": reset_token,
        "expires_at": expire_time,
        "used": False
    })
    
    # In a real app, you'd send an email here
    # For testing, we'll return the reset link
    reset_link = f"/reset-password?token={reset_token}"
    return {
        "message": "Reset link generated",
        "reset_link": reset_link  # Remove this in production
    }

@api_router.post("/auth/reset-password")
async def reset_password(reset_data: PasswordReset):
    if reset_data.new_password != reset_data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # Find valid reset token
    reset_record = await db.password_resets.find_one({
        "token": reset_data.token,
        "used": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Update user password
    new_password_hash = get_password_hash(reset_data.new_password)
    await db.users.update_one(
        {"id": reset_record["user_id"]},
        {"$set": {"password_hash": new_password_hash}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"_id": reset_record["_id"]},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}

# Dashboard endpoints
@api_router.get("/dashboard/summary")
async def get_dashboard_summary(current_user: User = Depends(get_current_user)):
    # Get summary data
    total_contacts = await db.contacts.count_documents({"user_id": current_user.id})
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    tasks_due_today = await db.tasks.count_documents({
        "user_id": current_user.id,
        "due_date": {"$gte": today, "$lt": tomorrow},
        "status": {"$ne": "done"}
    })
    
    active_promo_links = await db.promo_links.count_documents({"user_id": current_user.id})
    
    # Commission summary
    total_commissions = await db.commissions.aggregate([
        {"$match": {"user_id": current_user.id}},
        {"$group": {
            "_id": None,
            "total_paid": {"$sum": {"$cond": [{"$eq": ["$status", "paid"]}, "$amount", 0]}},
            "total_unpaid": {"$sum": {"$cond": [{"$eq": ["$status", "unpaid"]}, "$amount", 0]}},
            "total_pending": {"$sum": {"$cond": [{"$eq": ["$status", "pending"]}, "$amount", 0]}}
        }}
    ]).to_list(1)
    
    commission_summary = total_commissions[0] if total_commissions else {"total_paid": 0, "total_unpaid": 0, "total_pending": 0}
    
    return {
        "total_contacts": total_contacts,
        "tasks_due_today": tasks_due_today,
        "active_promo_links": active_promo_links,
        "commission_summary": commission_summary
    }

# Settings endpoints
@api_router.get("/settings")
async def get_settings():
    """Get application settings (public data only)"""
    settings = load_settings()
    # Remove sensitive data
    public_settings = {
        "branding": settings["branding"],
        "quick_access_links": settings["quick_access_links"]
    }
    return public_settings

@api_router.get("/settings/admin")
async def get_admin_settings(current_user: User = Depends(get_admin_user)):
    """Get all settings for admin users"""
    settings = load_settings()
    # Don't expose the actual API key, just whether it's set
    settings["email_integration"]["mailerlite_api_key"] = bool(settings["email_integration"]["mailerlite_api_key"])
    return settings

@api_router.put("/settings")
async def update_settings(settings_update: SettingsUpdate, current_user: User = Depends(get_admin_user)):
    """Update application settings (admin only)"""
    current_settings = load_settings()
    
    if settings_update.branding:
        current_settings["branding"].update(settings_update.branding)
    
    if settings_update.quick_access_links:
        current_settings["quick_access_links"].update(settings_update.quick_access_links)
    
    if settings_update.email_integration:
        current_settings["email_integration"].update(settings_update.email_integration)
    
    if save_settings(current_settings):
        return {"message": "Settings updated successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save settings")

# Email integration endpoints (Brevo)
class TestEmail(BaseModel):
    to: EmailStr
    subject: str
    text: str

class EmailApiKey(BaseModel):
    apiKey: str

@api_router.get("/email/status")
async def get_email_status():
    """Get email service configuration status"""
    settings = load_settings()
    api_key = settings.get("email_integration", {}).get("brevo_api_key", "")
    
    return {
        "provider": "brevo",
        "configured": bool(api_key)
    }

@api_router.post("/email/key")
async def save_email_key(email_key: EmailApiKey, current_user: User = Depends(get_current_user)):
    """Save Brevo API key (admin only for security)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    settings = load_settings()
    if "email_integration" not in settings:
        settings["email_integration"] = {}
    
    # In production, encrypt this key
    settings["email_integration"]["brevo_api_key"] = email_key.apiKey
    
    if save_settings(settings):
        return {"message": "Email API key saved successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save API key")

@api_router.post("/email/test")
async def send_test_email(test_email: TestEmail, current_user: User = Depends(get_current_user)):
    """Send test email via Brevo"""
    settings = load_settings()
    api_key = settings.get("email_integration", {}).get("brevo_api_key", "")
    
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="Brevo API key not configured. Please configure it in Settings first."
        )
    
    # Prepare Brevo API request
    headers = {
        "api-key": api_key,
        "Content-Type": "application/json"
    }
    
    payload = {
        "sender": {
            "name": "ConnectVault CRM",
            "email": "noreply@connectvault.com"
        },
        "to": [
            {
                "email": test_email.to,
                "name": "Test Recipient"
            }
        ],
        "subject": test_email.subject,
        "textContent": test_email.text
    }
    
    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            return {"message": "Test email sent successfully", "to": test_email.to}
        elif response.status_code == 400:
            error_data = response.json()
            raise HTTPException(
                status_code=400,
                detail=f"Invalid request: {error_data.get('message', 'Check your API key and email details')}"
            )
        elif response.status_code == 401:
            raise HTTPException(
                status_code=400,
                detail="Invalid API key. Please check your Brevo API key in Settings."
            )
        else:
            logging.error(f"Brevo API error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=400,
                detail="Failed to send email. Please check your API key and try again."
            )
    
    except requests.exceptions.RequestException as e:
        logging.error(f"Brevo API request failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Email service temporarily unavailable. Please try again later."
        )

@api_router.post("/email/subscribe")
async def subscribe_email(subscriber: EmailSubscriber, current_user: User = Depends(get_current_user)):
    """Add subscriber to MailerLite (legacy endpoint)"""
    settings = load_settings()
    api_key = settings["email_integration"]["mailerlite_api_key"]
    
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="MailerLite API key not configured. Please contact admin."
        )
    
    # Use provided group_id or default
    group_id = subscriber.group_id or settings["email_integration"]["default_group_id"]
    
    # Prepare MailerLite API request
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "email": subscriber.email,
        "fields": {
            "name": subscriber.name
        }
    }
    
    if group_id:
        payload["groups"] = [group_id]
    
    try:
        response = requests.post(
            "https://connect.mailerlite.com/api/subscribers",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            return {"message": "Subscriber added successfully", "email": subscriber.email}
        elif response.status_code == 422:
            # Subscriber already exists
            return {"message": "Subscriber already exists", "email": subscriber.email}
        else:
            logging.error(f"MailerLite API error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=400,
                detail="Failed to add subscriber. Please check your information and try again."
            )
    
    except requests.exceptions.RequestException as e:
        logging.error(f"MailerLite API request failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Email service temporarily unavailable. Please try again later."
        )

# Commission endpoints
@api_router.get("/commissions", response_model=List[Commission])
async def get_commissions(current_user: User = Depends(get_current_user)):
    """Get all commissions for current user"""
    commissions = await db.commissions.find({"user_id": current_user.id}).to_list(length=None)
    return [Commission(**commission) for commission in commissions]

@api_router.post("/commissions", response_model=Commission)
async def create_commission(commission_data: CommissionCreate, current_user: User = Depends(get_current_user)):
    """Create a new commission"""
    commission = Commission(**commission_data.dict(), user_id=current_user.id)
    commission_dict = commission.dict()
    await db.commissions.insert_one(commission_dict)
    return commission

@api_router.get("/commissions/{commission_id}", response_model=Commission)
async def get_commission(commission_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific commission"""
    commission = await db.commissions.find_one({"id": commission_id, "user_id": current_user.id})
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    return Commission(**commission)

@api_router.put("/commissions/{commission_id}", response_model=Commission)
async def update_commission(commission_id: str, commission_update: CommissionUpdate, current_user: User = Depends(get_current_user)):
    """Update a commission"""
    # Check if commission exists and belongs to user
    existing = await db.commissions.find_one({"id": commission_id, "user_id": current_user.id})
    if not existing:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    # Update only provided fields
    update_data = {k: v for k, v in commission_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.commissions.update_one(
        {"id": commission_id, "user_id": current_user.id},
        {"$set": update_data}
    )
    
    # Return updated commission
    updated = await db.commissions.find_one({"id": commission_id, "user_id": current_user.id})
    return Commission(**updated)

@api_router.delete("/commissions/{commission_id}")
async def delete_commission(commission_id: str, current_user: User = Depends(get_current_user)):
    """Delete a commission"""
    result = await db.commissions.delete_one({"id": commission_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commission not found")
    return {"message": "Commission deleted successfully"}

@api_router.get("/commissions/export/csv")
async def export_commissions_csv(current_user: User = Depends(get_current_user)):
    """Export commissions as CSV"""
    commissions = await db.commissions.find({"user_id": current_user.id}).to_list(length=None)
    
    # Convert to CSV format
    csv_data = "Program Name,Amount,Status,Expected Date,Paid Date,Notes,Created At\n"
    for commission in commissions:
        csv_data += f"{commission.get('program_name', '')},{commission.get('amount', 0)},{commission.get('status', '')},{commission.get('expected_date', '') or ''},{commission.get('paid_date', '') or ''},{commission.get('notes', '').replace(',', ';')},{commission.get('created_at', '')}\n"
    
    return {"csv_data": csv_data}

# File management endpoints
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

@api_router.post("/files", response_model=FileRecord)
async def upload_file(
    file: UploadFile = File(...),
    category: str = "General",
    current_user: User = Depends(get_current_user)
):
    """Upload a PDF file"""
    # Validate file type (PDF, DOCX, TXT)
    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # DOCX
        "text/plain"  # TXT
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOCX, and TXT files are allowed"
        )
    
    # Check file size (10MB max)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(
            status_code=400,
            detail="File size must be less than 10MB"
        )
    
    # Sanitize filename
    safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._-").strip()
    if not safe_filename:
        safe_filename = f"file_{int(datetime.now(timezone.utc).timestamp())}.pdf"
    
    # Create unique filename
    file_id = str(uuid.uuid4())
    storage_filename = f"{file_id}_{safe_filename}"
    storage_path = UPLOAD_DIR / storage_filename
    
    # Save file
    async with aiofiles.open(storage_path, 'wb') as f:
        await f.write(file_content)
    
    # Create file record
    file_record = FileRecord(
        user_id=current_user.id,
        name=file.filename,
        category=category,
        size_bytes=len(file_content),
        mime_type=file.content_type,
        storage_path=str(storage_path)
    )
    
    # Save to database
    await db.files.insert_one(file_record.dict())
    
    return file_record

@api_router.get("/files", response_model=List[FileRecord])
async def get_files(
    search: Optional[str] = None,
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """Get files for current user with search and filter"""
    query = {"user_id": current_user.id}
    
    # Add search filter
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    # Add category filter
    if category:
        query["category"] = category
    
    # Calculate skip for pagination
    skip = (page - 1) * limit
    
    # Get files
    files = await db.files.find(query).skip(skip).limit(limit).sort("created_at", -1).to_list(length=None)
    
    return [FileRecord(**file) for file in files]

@api_router.get("/files/{file_id}/download")
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Download a file"""
    # Find file record
    file_record = await db.files.find_one({"id": file_id, "user_id": current_user.id})
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if file exists on disk
    storage_path = Path(file_record["storage_path"])
    if not storage_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=storage_path,
        filename=file_record["name"],
        media_type=file_record["mime_type"]
    )

@api_router.patch("/files/{file_id}", response_model=FileRecord)
async def update_file(
    file_id: str,
    update_data: FileUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update file metadata (rename, change category)"""
    # Check if file exists and belongs to user
    existing = await db.files.find_one({"id": file_id, "user_id": current_user.id})
    if not existing:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Update only provided fields
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    await db.files.update_one(
        {"id": file_id, "user_id": current_user.id},
        {"$set": update_dict}
    )
    
    # Return updated file
    updated = await db.files.find_one({"id": file_id, "user_id": current_user.id})
    return FileRecord(**updated)

@api_router.delete("/files/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a file"""
    # Find file record
    file_record = await db.files.find_one({"id": file_id, "user_id": current_user.id})
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete file from disk
    storage_path = Path(file_record["storage_path"])
    if storage_path.exists():
        storage_path.unlink()
    
    # Delete from database
    result = await db.files.delete_one({"id": file_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {"message": "File deleted successfully"}

@api_router.get("/files/categories")
async def get_file_categories(current_user: User = Depends(get_current_user)):
    """Get all categories used by user"""
    categories = await db.files.distinct("category", {"user_id": current_user.id})
    return {"categories": categories}

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "ok"}

# Test endpoint
@api_router.get("/")
async def root():
    return {"message": "ConnectVault CRM API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()