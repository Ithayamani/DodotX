import asyncio
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from routes import db, get_current_user
from models import User, Task, TaskCreate, TaskUpdate, TaskCompletion, Progress
from utils import generate_id, get_today_date, check_vacation_mode
from datetime import datetime

router = APIRouter(prefix="/tasks", tags=["tasks"])

# Serializes read-modify-write toggles per child within this worker process, so two
# rapid taps on the same child's tasks can't race and clobber each other's point updates.
_toggle_locks: dict = defaultdict(asyncio.Lock)

@router.post("", response_model=Task)
async def create_task(task_data: TaskCreate, current_user: User = Depends(get_current_user)):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    task_id = generate_id()
    task = Task(id=task_id, family_id=current_user.family_id, **task_data.dict())
    await db.tasks.insert_one(task.dict())
    return task

@router.get("", response_model=List[Task])
async def get_tasks(current_user: User = Depends(get_current_user)):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    tasks = await db.tasks.find({"family_id": current_user.family_id}).to_list(100)
    return [Task(**task) for task in tasks]

@router.put("/{task_id}", response_model=Task)
async def update_task(task_id: str, task_data: TaskUpdate, current_user: User = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    update_data = {k: v for k, v in task_data.dict().items() if v is not None}
    if update_data:
        await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    updated_task = await db.tasks.find_one({"id": task_id})
    return Task(**updated_task)

@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user: User = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.tasks.delete_one({"id": task_id})
    return {"message": "Task deleted successfully"}

@router.post("/{task_id}/toggle")
async def toggle_task(task_id: str, child_id: str, current_user: User = Depends(get_current_user)):
    child = await db.children.find_one({"id": child_id})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not current_user.family_id or child["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["family_id"] != child["family_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    async with _toggle_locks[child_id]:
        progress = await db.progress.find_one({"child_id": child_id})
        if not progress:
            progress = Progress(child_id=child_id).dict()
            await db.progress.insert_one(progress)
        today = get_today_date()
        completions = progress.get("completions", {})
        today_tasks = completions.get(today, [])
        if task_id in today_tasks:
            today_tasks.remove(task_id)
            points = progress.get("points", 0) - task["pts"]
            total_tasks = progress.get("total_tasks", 0) - 1
        else:
            today_tasks.append(task_id)
            points = progress.get("points", 0) + task["pts"]
            total_tasks = progress.get("total_tasks", 0) + 1
        completions[today] = today_tasks
        last_date = progress.get("last_date")
        streak = progress.get("streak", 0)
        if today_tasks:
            if last_date:
                from datetime import datetime as dt
                last_dt = dt.strptime(last_date, "%Y-%m-%d")
                today_dt = dt.strptime(today, "%Y-%m-%d")
                days_diff = (today_dt - last_dt).days
                if days_diff == 1:
                    streak += 1
                elif days_diff > 1:
                    streak = 1
            else:
                streak = 1
            last_date = today
        family = await db.families.find_one({"id": child["family_id"]})
        vacation_mode = check_vacation_mode(family)
        all_tasks = await db.tasks.find({"family_id": child["family_id"], "active": True}).to_list(100)
        active_tasks = []
        for t in all_tasks:
            modes = t.get("modes", {})
            if vacation_mode and modes.get("vacation", False):
                active_tasks.append(t)
            elif not vacation_mode and modes.get("daily", True):
                active_tasks.append(t)
        perfect_days = progress.get("perfect_days", 0)
        if len(today_tasks) == len(active_tasks) and len(active_tasks) > 0:
            perfect_days += 1
        await db.progress.update_one({"child_id": child_id}, {"$set": {"points": max(0, points), "total_tasks": max(0, total_tasks), "streak": streak, "last_date": last_date, "perfect_days": perfect_days, "completions": completions, "updated_at": datetime.utcnow()}})
        updated_progress = await db.progress.find_one({"child_id": child_id})
        return {"success": True, "points": updated_progress["points"], "completed": task_id in today_tasks}
