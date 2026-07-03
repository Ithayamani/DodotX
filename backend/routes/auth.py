from fastapi import APIRouter, HTTPException, Depends, Request
from routes import db, get_current_user
from models import User, UserSignup, UserLogin, Token, PasswordResetRequest, PasswordResetConfirm
from auth import get_password_hash, verify_password, create_access_token
from utils import generate_id
from datetime import datetime, timedelta
from collections import defaultdict
import os, logging, random, re, time

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

# Simple in-memory rate limiter for auth endpoints
_rate_limits: dict = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 10     # max attempts per window

def check_rate_limit(ip: str, action: str = "auth"):
    key = f"{ip}:{action}"
    now = time.time()
    # Clean old entries
    _rate_limits[key] = [t for t in _rate_limits[key] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limits[key]) >= RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Too many attempts. Please wait a minute and try again.")
    _rate_limits[key].append(now)

def validate_password(password: str) -> str | None:
    """Returns error message if password is weak, None if valid"""
    if len(password) < 8:
        return "Password must be at least 8 characters"
    if not re.search(r'\d', password):
        return "Password must contain at least 1 number"
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
        return "Password must contain at least 1 special character (!@#$%^&*...)"
    return None

@router.post("/signup", response_model=Token)
async def signup(user_data: UserSignup, request: Request):
    check_rate_limit(request.client.host, "signup")
    pwd_error = validate_password(user_data.password)
    if pwd_error:
        raise HTTPException(status_code=400, detail=pwd_error)
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = generate_id()
    hashed_password = get_password_hash(user_data.password)
    user = User(id=user_id, email=user_data.email, hashed_password=hashed_password, name=user_data.name, role="parent")
    await db.users.insert_one(user.dict())
    access_token = create_access_token(data={"sub": user_id})
    return Token(access_token=access_token, user={"id": user.id, "email": user.email, "name": user.name, "role": user.role, "family_id": user.family_id})

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, request: Request):
    check_rate_limit(request.client.host, "login")
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    user_obj = User(**user)
    access_token = create_access_token(data={"sub": user_obj.id})
    return Token(access_token=access_token, user={"id": user_obj.id, "email": user_obj.email, "name": user_obj.name, "role": user_obj.role, "family_id": user_obj.family_id})

@router.get("/me", response_model=dict)
async def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "name": current_user.name, "role": current_user.role, "family_id": current_user.family_id}

@router.post("/forgot-password")
async def forgot_password(data: PasswordResetRequest, request: Request):
    check_rate_limit(request.client.host, "forgot-password")
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    user = await db.users.find_one({"email": data.email.lower().strip()})
    if not user:
        return {"message": "If an account exists with this email, a reset code has been sent."}
    code = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    await db.password_resets.delete_many({"email": data.email.lower().strip()})
    await db.password_resets.insert_one({"email": data.email.lower().strip(), "code": code, "expires_at": expires_at, "used": False})
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)
    if smtp_host and smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "DodotX - Password Reset Code"
            msg["From"] = smtp_from
            msg["To"] = data.email
            html_body = f'<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;"><h2 style="color:#D4845C;">DodotX Password Reset</h2><p>Your code is:</p><div style="background:#f5f5f5;padding:20px;text-align:center;border-radius:12px;margin:20px 0;"><span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#333;">{code}</span></div><p style="color:#888;font-size:14px;">Expires in 15 minutes.</p></div>'
            msg.attach(MIMEText(html_body, "html"))
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            logging.info(f"Password reset email sent to {data.email}")
        except Exception as e:
            logging.error(f"Failed to send email: {str(e)}")
            logging.info(f"PASSWORD RESET CODE for {data.email}: {code}")
    else:
        logging.info(f"PASSWORD RESET CODE for {data.email}: {code}")
    return {"message": "If an account exists with this email, a reset code has been sent."}

@router.post("/reset-password")
async def reset_password(data: PasswordResetConfirm):
    reset_record = await db.password_resets.find_one({"email": data.email.lower().strip(), "code": data.code, "used": False})
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    expires_at = reset_record["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if datetime.utcnow() > expires_at:
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")
    pwd_error = validate_password(data.new_password)
    if pwd_error:
        raise HTTPException(status_code=400, detail=pwd_error)
    hashed_password = get_password_hash(data.new_password)
    await db.users.update_one({"email": data.email.lower().strip()}, {"$set": {"hashed_password": hashed_password}})
    await db.password_resets.update_one({"_id": reset_record["_id"]}, {"$set": {"used": True}})
    return {"message": "Password has been reset successfully. You can now sign in."}

@router.delete("/delete-account")
async def delete_account(current_user: User = Depends(get_current_user)):
    """Delete user account and all associated family data. Required by Apple App Store guidelines."""
    user_id = current_user.id
    family_id = current_user.family_id
    
    # Delete all family-related data if user has a family
    if family_id:
        # Get all children in the family
        children = await db.children.find({"family_id": family_id}).to_list(100)
        child_ids = [c["id"] for c in children]
        
        # Delete progress records for all children
        for child_id in child_ids:
            await db.progress.delete_many({"child_id": child_id})
            await db.task_completions.delete_many({"child_id": child_id})
            await db.cheers.delete_many({"child_id": child_id})
        
        # Delete family data
        await db.children.delete_many({"family_id": family_id})
        await db.tasks.delete_many({"family_id": family_id})
        await db.rewards.delete_many({"family_id": family_id})
        await db.families.delete_one({"id": family_id})
        
        # Delete child user accounts linked to this family
        await db.users.delete_many({"family_id": family_id, "role": "child"})
    
    # Delete the user's password reset records
    await db.password_resets.delete_many({"email": current_user.email})
    
    # Delete the user account
    await db.users.delete_one({"id": user_id})
    
    logger.info(f"Account deleted: {current_user.email}")
    return {"message": "Your account and all associated data have been permanently deleted."}
