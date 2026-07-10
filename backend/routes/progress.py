from fastapi import APIRouter, HTTPException, Depends
from typing import List
from routes import db, get_current_user
from models import User, Progress, CheerMessage, CheerCreate
from utils import generate_id, get_today_date, get_level_info, check_trophies, STREAK_MILESTONES, is_vacation_day, compute_complete_dates, streaks_from_dates

router = APIRouter(tags=["progress"])

@router.get("/progress/{child_id}")
async def get_progress(child_id: str, current_user: User = Depends(get_current_user)):
    child = await db.children.find_one({"id": child_id})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not current_user.family_id or child["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if "_id" in child:
        del child["_id"]
    progress = await db.progress.find_one({"child_id": child_id})
    if not progress:
        progress = Progress(child_id=child_id).dict()
        await db.progress.insert_one(progress)
    level_info = get_level_info(progress.get("points", 0))
    # Unified streak: consecutive days where all applicable tasks were completed
    # (vacation tasks on vacation days, daily tasks otherwise).
    family = await db.families.find_one({"id": child["family_id"]}) or {}
    all_tasks = await db.tasks.find({"family_id": child["family_id"], "active": True}).to_list(200)
    daily_ids = {t["id"] for t in all_tasks if t.get("modes", {}).get("daily", True)}
    vacation_ids = {t["id"] for t in all_tasks if t.get("modes", {}).get("vacation", False)}
    complete_dates = compute_complete_dates(progress.get("completions", {}), family, daily_ids, vacation_ids)
    current_streak = streaks_from_dates(complete_dates)["current_streak"]
    trophies = check_trophies({**progress, "streak": current_streak})
    rewards = await db.rewards.find({"family_id": child["family_id"]}).sort("pts", 1).to_list(100)
    rewards_status = []
    for reward in rewards:
        if "_id" in reward:
            del reward["_id"]
        rewards_status.append({**reward, "unlocked": progress.get("points", 0) >= reward["pts"], "progress": min(100, (progress.get("points", 0) / reward["pts"]) * 100)})
    today = get_today_date()
    today_completions = progress.get("completions", {}).get(today, [])
    return {"child": child, "points": progress.get("points", 0), "total_tasks": progress.get("total_tasks", 0), "streak": current_streak, "perfect_days": progress.get("perfect_days", 0), "level": level_info, "trophies": trophies, "rewards": rewards_status, "today_tasks_count": len(today_completions), "today_completions": today_completions}

@router.get("/progress/{child_id}/calendar")
async def get_calendar(child_id: str, current_user: User = Depends(get_current_user)):
    child = await db.children.find_one({"id": child_id})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not current_user.family_id or child["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    progress = await db.progress.find_one({"child_id": child_id})
    if not progress:
        progress = Progress(child_id=child_id).dict()
    completions = progress.get("completions", {})

    family = await db.families.find_one({"id": child["family_id"]}) or {}
    tasks = await db.tasks.find({"family_id": child["family_id"], "active": True}).to_list(200)
    daily_ids = {t["id"] for t in tasks if t.get("modes", {}).get("daily", True)}
    vacation_ids = {t["id"] for t in tasks if t.get("modes", {}).get("vacation", False)}
    daily_total = len(daily_ids)
    vacation_total = len(vacation_ids)

    complete_dates = compute_complete_dates(completions, family, daily_ids, vacation_ids)
    stats = streaks_from_dates(complete_dates)

    days = {}
    for d, ids in completions.items():
        vac = is_vacation_day(d, family)
        applicable = vacation_ids if vac else daily_ids
        total = len(applicable)
        done = len(set(ids) & applicable)
        if total > 0 and done >= total:
            status = "complete"
        elif done > 0:
            status = "partial"
        else:
            status = "none"
        days[d] = {"completed": done, "total": total, "status": status, "vacation": vac}

    longest = stats["longest_streak"]
    earned = [m["days"] for m in STREAK_MILESTONES if longest >= m["days"]]
    stored = progress.get("streak_milestones", [])
    if set(earned) - set(stored):
        await db.progress.update_one({"child_id": child_id}, {"$set": {"streak_milestones": earned}}, upsert=True)

    milestones = [{**m, "earned": longest >= m["days"]} for m in STREAK_MILESTONES]

    return {
        "child_id": child_id,
        "child_name": child.get("name"),
        "days": days,
        "current_streak": stats["current_streak"],
        "longest_streak": longest,
        "complete_days": stats["complete_days"],
        "daily_task_total": daily_total,
        "vacation_task_total": vacation_total,
        "vacation": {
            "active": bool(family.get("vacation_mode")),
            "start": family.get("vacation_start_date"),
            "end": family.get("vacation_end_date"),
        },
        "milestones": milestones,
    }



@router.post("/cheers", response_model=CheerMessage)
async def send_cheer(cheer_data: CheerCreate, current_user: User = Depends(get_current_user)):
    child = await db.children.find_one({"id": cheer_data.child_id})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not current_user.family_id or child["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    cheer_id = generate_id()
    cheer = CheerMessage(id=cheer_id, **cheer_data.dict())
    await db.cheers.insert_one(cheer.dict())
    return cheer

@router.get("/cheers/{child_id}", response_model=List[CheerMessage])
async def get_cheers(child_id: str, current_user: User = Depends(get_current_user)):
    child = await db.children.find_one({"id": child_id})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not current_user.family_id or child["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    cheers = await db.cheers.find({"child_id": child_id}).sort("created_at", -1).limit(20).to_list(20)
    return [CheerMessage(**cheer) for cheer in cheers]
