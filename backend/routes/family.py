from fastapi import APIRouter, HTTPException, Depends
from routes import db, get_current_user, FAMILY_CODE_EXPIRY_MINUTES
from models import User, Family, FamilyCreate, FamilyUpdate, FamilyCodeVerify, ChildInvite, Child, Task, Reward, Progress
from auth import get_pin_hash, verify_pin
from utils import generate_id, generate_family_code, DEFAULT_TASKS, DEFAULT_REWARDS
from datetime import datetime, timedelta

router = APIRouter(prefix="/family", tags=["family"])

def ensure_utc_timestamps(family_dict: dict) -> dict:
    for key in ['code_generated_at', 'created_at']:
        if key in family_dict and family_dict[key] is not None:
            val = family_dict[key]
            if isinstance(val, datetime):
                family_dict[key] = val.isoformat() + "Z"
            elif isinstance(val, str) and not val.endswith('Z') and '+' not in val:
                family_dict[key] = val + "Z"
    return family_dict

@router.post("", response_model=Family)
async def create_family(family_data: FamilyCreate, current_user: User = Depends(get_current_user)):
    if current_user.family_id:
        raise HTTPException(status_code=400, detail="User already has a family")
    family_id = generate_id()
    family_code = generate_family_code()
    hashed_pin = get_pin_hash(family_data.pin)
    family = Family(id=family_id, name=family_data.name, code=family_code, code_generated_at=datetime.utcnow(), pin=hashed_pin, theme=family_data.theme, parent_id=current_user.id)
    await db.families.insert_one(family.dict())
    await db.users.update_one({"id": current_user.id}, {"$set": {"family_id": family_id}})
    for task_data in DEFAULT_TASKS:
        task = Task(id=generate_id(), family_id=family_id, **task_data)
        await db.tasks.insert_one(task.dict())
    for reward_data in DEFAULT_REWARDS:
        reward = Reward(id=generate_id(), family_id=family_id, **reward_data)
        await db.rewards.insert_one(reward.dict())
    return family

@router.get("", response_model=Family)
async def get_family(current_user: User = Depends(get_current_user)):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    family = await db.families.find_one({"id": current_user.family_id})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    family = ensure_utc_timestamps(family)
    return Family(**family)

@router.put("", response_model=Family)
async def update_family(family_data: FamilyUpdate, current_user: User = Depends(get_current_user)):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    family = await db.families.find_one({"id": current_user.family_id})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    update_data = family_data.dict(exclude_unset=True)
    if "pin" in update_data and update_data["pin"] is not None:
        update_data["pin"] = get_pin_hash(update_data["pin"])
    if update_data:
        await db.families.update_one({"id": current_user.family_id}, {"$set": update_data})
    updated_family = await db.families.find_one({"id": current_user.family_id})
    updated_family = ensure_utc_timestamps(updated_family)
    return Family(**updated_family)

@router.post("/verify-pin")
async def verify_family_pin(pin: str, current_user: User = Depends(get_current_user)):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    family = await db.families.find_one({"id": current_user.family_id})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    if not verify_pin(pin, family["pin"]):
        raise HTTPException(status_code=401, detail="Incorrect PIN")
    return {"success": True}

@router.post("/verify-code", response_model=dict)
async def verify_family_code(code_data: FamilyCodeVerify):
    family = await db.families.find_one({"code": code_data.code.upper()})
    if not family:
        raise HTTPException(status_code=404, detail="Invalid family code")
    code_generated_at = family.get("code_generated_at")
    if code_generated_at:
        if isinstance(code_generated_at, str):
            code_generated_at = datetime.fromisoformat(code_generated_at)
        expiry_time = code_generated_at + timedelta(minutes=FAMILY_CODE_EXPIRY_MINUTES)
        if datetime.utcnow() > expiry_time:
            raise HTTPException(status_code=410, detail="Family code has expired. Ask the parent to generate a new one.")
    return {"family_id": family["id"], "family_name": family["name"], "theme": family["theme"]}

@router.post("/join-child")
async def join_child(invite_data: ChildInvite):
    family = await db.families.find_one({"code": invite_data.family_code.upper()})
    if not family:
        raise HTTPException(status_code=404, detail="Invalid family code")
    code_generated_at = family.get("code_generated_at")
    if code_generated_at:
        if isinstance(code_generated_at, str):
            code_generated_at = datetime.fromisoformat(code_generated_at)
        expiry_time = code_generated_at + timedelta(minutes=FAMILY_CODE_EXPIRY_MINUTES)
        if datetime.utcnow() > expiry_time:
            raise HTTPException(status_code=410, detail="Family code has expired. Ask the parent to generate a new one.")
    child_id = generate_id()
    child = Child(id=child_id, name=invite_data.child_name, avatar="\ud83d\udc66", family_id=family["id"])
    await db.children.insert_one(child.dict())
    progress = Progress(child_id=child_id)
    await db.progress.insert_one(progress.dict())
    return {"child_id": child_id, "family_id": family["id"], "message": f"{invite_data.child_name} joined the family!"}

@router.post("/regenerate-code", response_model=dict)
async def regenerate_family_code_endpoint(current_user: User = Depends(get_current_user)):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    family = await db.families.find_one({"id": current_user.family_id})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    new_code = generate_family_code()
    now = datetime.utcnow()
    await db.families.update_one({"id": current_user.family_id}, {"$set": {"code": new_code, "code_generated_at": now}})
    return {"code": new_code, "generated_at": now.isoformat() + "Z", "expires_at": (now + timedelta(minutes=FAMILY_CODE_EXPIRY_MINUTES)).isoformat() + "Z"}
