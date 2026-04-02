from fastapi import APIRouter, HTTPException
from routes import db, FAMILY_CODE_EXPIRY_MINUTES
from models import Child, Progress
from utils import get_today_date, get_level_info, check_trophies
from datetime import datetime, timedelta

router = APIRouter(prefix="/visitor", tags=["visitor"])

@router.get("/{family_code}")
async def visitor_view(family_code: str):
    """Read-only visitor view of a family's progress using their code"""
    family = await db.families.find_one({"code": family_code.upper()})
    if not family:
        raise HTTPException(status_code=404, detail="Invalid family code")
    
    # Check code expiry
    code_generated_at = family.get("code_generated_at")
    if code_generated_at:
        if isinstance(code_generated_at, str):
            code_generated_at = datetime.fromisoformat(code_generated_at)
        expiry_time = code_generated_at + timedelta(minutes=FAMILY_CODE_EXPIRY_MINUTES)
        if datetime.utcnow() > expiry_time:
            raise HTTPException(status_code=410, detail="Family code has expired.")
    
    # Get children
    children = await db.children.find({"family_id": family["id"]}).to_list(100)
    
    # Get progress for each child
    children_data = []
    for child in children:
        progress = await db.progress.find_one({"child_id": child["id"]})
        if not progress:
            progress = Progress(child_id=child["id"]).dict()
        
        level_info = get_level_info(progress.get("points", 0))
        trophies = check_trophies(progress)
        today = get_today_date()
        today_completions = progress.get("completions", {}).get(today, [])
        
        children_data.append({
            "name": child.get("name"),
            "avatar": child.get("avatar", "\ud83d\udc66"),
            "profile_picture": child.get("profile_picture"),
            "points": progress.get("points", 0),
            "streak": progress.get("streak", 0),
            "perfect_days": progress.get("perfect_days", 0),
            "level": level_info,
            "trophies_count": len([t for t in trophies if t.get("earned")]),
            "tasks_done_today": len(today_completions)
        })
    
    # Get tasks and rewards count
    tasks_count = await db.tasks.count_documents({"family_id": family["id"]})
    rewards_count = await db.rewards.count_documents({"family_id": family["id"]})
    
    return {
        "family_name": family["name"],
        "theme": family.get("theme", "gaming"),
        "vacation_mode": family.get("vacation_mode", False),
        "children": children_data,
        "total_tasks": tasks_count,
        "total_rewards": rewards_count
    }
