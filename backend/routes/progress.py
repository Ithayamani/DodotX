from fastapi import APIRouter, HTTPException, Depends
from typing import List
from routes import db, get_current_user
from models import User, Progress, CheerMessage, CheerCreate
from utils import generate_id, get_today_date, get_level_info, check_trophies

router = APIRouter(tags=["progress"])

@router.get("/progress/{child_id}")
async def get_progress(child_id: str, current_user: User = Depends(get_current_user)):
    child = await db.children.find_one({"id": child_id})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if "_id" in child:
        del child["_id"]
    progress = await db.progress.find_one({"child_id": child_id})
    if not progress:
        progress = Progress(child_id=child_id).dict()
        await db.progress.insert_one(progress)
    level_info = get_level_info(progress.get("points", 0))
    trophies = check_trophies(progress)
    rewards = await db.rewards.find({"family_id": child["family_id"]}).sort("pts", 1).to_list(100)
    rewards_status = []
    for reward in rewards:
        if "_id" in reward:
            del reward["_id"]
        rewards_status.append({**reward, "unlocked": progress.get("points", 0) >= reward["pts"], "progress": min(100, (progress.get("points", 0) / reward["pts"]) * 100)})
    today = get_today_date()
    today_completions = progress.get("completions", {}).get(today, [])
    return {"child": child, "points": progress.get("points", 0), "total_tasks": progress.get("total_tasks", 0), "streak": progress.get("streak", 0), "perfect_days": progress.get("perfect_days", 0), "level": level_info, "trophies": trophies, "rewards": rewards_status, "today_tasks_count": len(today_completions), "today_completions": today_completions}

@router.post("/cheers", response_model=CheerMessage)
async def send_cheer(cheer_data: CheerCreate):
    child = await db.children.find_one({"id": cheer_data.child_id})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    cheer_id = generate_id()
    cheer = CheerMessage(id=cheer_id, **cheer_data.dict())
    await db.cheers.insert_one(cheer.dict())
    return cheer

@router.get("/cheers/{child_id}", response_model=List[CheerMessage])
async def get_cheers(child_id: str):
    cheers = await db.cheers.find({"child_id": child_id}).sort("created_at", -1).limit(20).to_list(20)
    return [CheerMessage(**cheer) for cheer in cheers]
