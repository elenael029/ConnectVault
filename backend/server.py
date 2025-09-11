from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
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

class Offer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    offer_name: str
    promo_link: str
    tracking_link: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OfferCreate(BaseModel):
    offer_name: str
    promo_link: str

class Commission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    offer_id: str
    customer_name: str
    customer_email: str
    commission_amount: float
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    paid: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommissionCreate(BaseModel):
    offer_id: str
    customer_name: str
    customer_email: str
    commission_amount: float
    paid: bool = False

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
    
    active_offers = await db.offers.count_documents({"user_id": current_user.id})
    
    # Commission summary
    total_commissions = await db.commissions.aggregate([
        {"$match": {"user_id": current_user.id}},
        {"$group": {
            "_id": None,
            "total_paid": {"$sum": {"$cond": [{"$eq": ["$paid", True]}, "$commission_amount", 0]}},
            "total_unpaid": {"$sum": {"$cond": [{"$eq": ["$paid", False]}, "$commission_amount", 0]}}
        }}
    ]).to_list(1)
    
    commission_summary = total_commissions[0] if total_commissions else {"total_paid": 0, "total_unpaid": 0}
    
    return {
        "total_contacts": total_contacts,
        "tasks_due_today": tasks_due_today,
        "active_offers": active_offers,
        "commission_summary": commission_summary
    }

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