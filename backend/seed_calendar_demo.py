"""Seed sample completion history for the demo child Emma to test the calendar view."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "kidquest_db")


async def run():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    family = await db.families.find_one({"code": "REVIEW"})
    emma = await db.children.find_one({"family_id": family["id"], "name": "Emma"})
    liam = await db.children.find_one({"family_id": family["id"], "name": "Liam"})

    tasks = await db.tasks.find({"family_id": family["id"], "active": True}).to_list(200)
    daily_ids = [t["id"] for t in tasks if t.get("modes", {}).get("daily", True)]
    print(f"daily task count: {len(daily_ids)}")

    today = datetime.utcnow().date()

    # Emma: 8 complete days in a row (ending today) -> unlocks 7-day milestone
    emma_comp = {}
    for i in range(0, 8):
        d = (today - timedelta(days=i)).isoformat()
        emma_comp[d] = list(daily_ids)
    # add a couple partial days before the streak
    for i in range(9, 12):
        d = (today - timedelta(days=i)).isoformat()
        emma_comp[d] = daily_ids[:2]
    await db.progress.update_one({"child_id": emma["id"]}, {"$set": {"completions": emma_comp, "streak_milestones": []}})
    print(f"Emma completions set for {len(emma_comp)} days")

    # Liam: 3 complete days, then a miss, then 2 complete (broken streak)
    liam_comp = {}
    for i in [0, 1]:
        liam_comp[(today - timedelta(days=i)).isoformat()] = list(daily_ids)
    # gap at i=2
    for i in [3, 4, 5]:
        liam_comp[(today - timedelta(days=i)).isoformat()] = list(daily_ids)
    liam_comp[(today - timedelta(days=6)).isoformat()] = daily_ids[:1]
    await db.progress.update_one({"child_id": liam["id"]}, {"$set": {"completions": liam_comp, "streak_milestones": []}})
    print(f"Liam completions set for {len(liam_comp)} days")

    client.close()


asyncio.run(run())
