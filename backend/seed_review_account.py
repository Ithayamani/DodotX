"""
Seed script to create Apple Review demo accounts with full data.
Run: python3 seed_review_account.py
"""
import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os, random, string

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "kidquest_db")

# Demo credentials
PARENT_EMAIL = "review_parent@dodotx.com"
PARENT_PASSWORD = "Review123!"
PARENT_NAME = "Demo Parent"
FAMILY_PIN = "1234"

# Test parent credentials
TEST_PARENT_EMAIL = "parent@test.com"
TEST_PARENT_PASSWORD = "Parent123!"
TEST_PARENT_NAME = "Test Parent"

def gen_id(length=7):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def hash_pw(plain):
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Clean up everything for a fresh start
    await db.users.delete_many({})
    await db.families.delete_many({})
    await db.children.delete_many({})
    await db.tasks.delete_many({})
    await db.rewards.delete_many({})
    await db.progress.delete_many({})
    await db.task_completions.delete_many({})
    await db.cheers.delete_many({})
    
    # =============================
    # REVIEW FAMILY (Apple Reviewer)
    # =============================
    family_id = gen_id()
    user_id = gen_id()
    family_code = "REVIEW"
    
    family = {
        "id": family_id,
        "name": "Demo Family",
        "code": family_code,
        "code_generated_at": None,
        "pin": hash_pw(FAMILY_PIN),
        "theme": "gaming",
        "custom_theme": None,
        "vacation_mode": False,
        "vacation_start_date": None,
        "vacation_end_date": None,
        "parent_id": user_id,
        "parent_profile_picture": None,
        "created_at": datetime.utcnow(),
    }
    await db.families.insert_one(family)
    print(f"✅ Review Family created: {family_id} (code: {family_code})")
    
    user = {
        "id": user_id,
        "email": PARENT_EMAIL,
        "name": PARENT_NAME,
        "hashed_password": hash_pw(PARENT_PASSWORD),
        "family_id": family_id,
        "role": "parent",
        "created_at": datetime.utcnow(),
    }
    await db.users.insert_one(user)
    print(f"✅ Review Parent created: {PARENT_EMAIL} / {PARENT_PASSWORD}")
    
    children_data = [
        {"name": "Emma", "age": 8, "avatar": "🦊"},
        {"name": "Liam", "age": 6, "avatar": "🐼"},
    ]
    
    child_ids = []
    for c in children_data:
        cid = gen_id()
        child_ids.append(cid)
        child = {
            "id": cid,
            "name": c["name"],
            "age": c["age"],
            "avatar": c["avatar"],
            "profile_picture": None,
            "family_id": family_id,
            "created_at": datetime.utcnow(),
        }
        await db.children.insert_one(child)
        
        # Create progress for each child
        progress = {
            "child_id": cid,
            "points": 245 if c["name"] == "Emma" else 180,
            "total_tasks": 35 if c["name"] == "Emma" else 20,
            "streak": 5 if c["name"] == "Emma" else 3,
            "last_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "perfect_days": 12 if c["name"] == "Emma" else 7,
            "completions": {},
            "redeemed_rewards": [],
            "updated_at": datetime.utcnow(),
        }
        await db.progress.insert_one(progress)
        print(f"✅ Child created: {c['name']} (age {c['age']})")
    
    # Tasks with correct TaskMode format
    tasks = [
        {"title": "Brush Teeth", "icon": "🪥", "pts": 10, "cat": "health", "modes": {"daily": True, "vacation": True}},
        {"title": "Make Bed", "icon": "🛏️", "pts": 10, "cat": "chores", "modes": {"daily": True, "vacation": False}},
        {"title": "Read for 20 mins", "icon": "📚", "pts": 15, "cat": "learning", "modes": {"daily": True, "vacation": True}},
        {"title": "Homework", "icon": "✏️", "pts": 20, "cat": "learning", "modes": {"daily": True, "vacation": False}},
        {"title": "Tidy Room", "icon": "🧹", "pts": 15, "cat": "chores", "modes": {"daily": True, "vacation": False}},
        {"title": "Practice Piano", "icon": "🎹", "pts": 20, "cat": "learning", "modes": {"daily": False, "vacation": False}},
        {"title": "Walk the Dog", "icon": "🐕", "pts": 15, "cat": "active", "modes": {"daily": True, "vacation": True}},
        {"title": "Drink Water", "icon": "💧", "pts": 5, "cat": "health", "modes": {"daily": True, "vacation": True}},
        {"title": "Help Cook Dinner", "icon": "🍳", "pts": 20, "cat": "chores", "modes": {"daily": False, "vacation": False}},
        {"title": "Outdoor Play", "icon": "⚽", "pts": 15, "cat": "active", "modes": {"daily": True, "vacation": True}},
        {"title": "Swimming", "icon": "🏊", "pts": 20, "cat": "active", "modes": {"daily": False, "vacation": True}},
        {"title": "Art Project", "icon": "🎨", "pts": 15, "cat": "learning", "modes": {"daily": False, "vacation": True}},
    ]
    
    for t in tasks:
        task = {
            "id": gen_id(),
            "family_id": family_id,
            "title": t["title"],
            "icon": t["icon"],
            "pts": t["pts"],
            "cat": t["cat"],
            "modes": t["modes"],
            "active": True,
            "created_at": datetime.utcnow(),
        }
        await db.tasks.insert_one(task)
    print(f"✅ {len(tasks)} tasks created")
    
    # Rewards with correct field names (name, pts, desc)
    rewards = [
        {"name": "Extra Screen Time (30 min)", "icon": "📱", "pts": 50, "desc": "30 minutes of extra screen time"},
        {"name": "Choose Dinner Menu", "icon": "🍕", "pts": 75, "desc": "Pick what's for dinner tonight"},
        {"name": "Movie Night", "icon": "🎬", "pts": 100, "desc": "Choose a family movie to watch"},
        {"name": "New Book", "icon": "📖", "pts": 120, "desc": "Pick a new book from the store"},
        {"name": "Trip to Park", "icon": "🎢", "pts": 150, "desc": "Fun day at the park"},
        {"name": "Sleepover with Friend", "icon": "🏠", "pts": 200, "desc": "Invite a friend for a sleepover"},
    ]
    
    for r in rewards:
        reward = {
            "id": gen_id(),
            "family_id": family_id,
            "name": r["name"],
            "icon": r["icon"],
            "pts": r["pts"],
            "desc": r["desc"],
            "created_at": datetime.utcnow(),
        }
        await db.rewards.insert_one(reward)
    print(f"✅ {len(rewards)} rewards created")
    
    # =============================
    # TEST FAMILY (For testing)
    # =============================
    test_family_id = gen_id()
    test_user_id = gen_id()
    test_family_code = "TEST01"
    
    test_family = {
        "id": test_family_id,
        "name": "Test Family",
        "code": test_family_code,
        "code_generated_at": None,
        "pin": hash_pw(FAMILY_PIN),
        "theme": "football",
        "custom_theme": None,
        "vacation_mode": False,
        "vacation_start_date": None,
        "vacation_end_date": None,
        "parent_id": test_user_id,
        "parent_profile_picture": None,
        "created_at": datetime.utcnow(),
    }
    await db.families.insert_one(test_family)
    
    test_user = {
        "id": test_user_id,
        "email": TEST_PARENT_EMAIL,
        "name": TEST_PARENT_NAME,
        "hashed_password": hash_pw(TEST_PARENT_PASSWORD),
        "family_id": test_family_id,
        "role": "parent",
        "created_at": datetime.utcnow(),
    }
    await db.users.insert_one(test_user)
    print(f"✅ Test Parent created: {TEST_PARENT_EMAIL} / {TEST_PARENT_PASSWORD}")
    
    # Create test children
    test_child_id = gen_id()
    test_child = {
        "id": test_child_id,
        "name": "Alex",
        "age": 8,
        "avatar": "👦",
        "profile_picture": None,
        "family_id": test_family_id,
        "created_at": datetime.utcnow(),
    }
    await db.children.insert_one(test_child)
    await db.progress.insert_one({
        "child_id": test_child_id,
        "points": 0,
        "total_tasks": 0,
        "streak": 0,
        "last_date": None,
        "perfect_days": 0,
        "completions": {},
        "redeemed_rewards": [],
        "updated_at": datetime.utcnow(),
    })
    print(f"✅ Test Child created: Alex (age 8)")
    
    # Default tasks for test family
    default_tasks = [
        {"title": "Morning Routine", "icon": "🌅", "pts": 10, "cat": "health"},
        {"title": "Read for 20 mins", "icon": "📖", "pts": 15, "cat": "learning"},
        {"title": "Physical Activity", "icon": "⚡", "pts": 15, "cat": "active"},
        {"title": "Help with Chores", "icon": "🧹", "pts": 10, "cat": "chores"},
        {"title": "No Screens Before 10AM", "icon": "📵", "pts": 10, "cat": "health"},
        {"title": "Creative Project", "icon": "🎨", "pts": 15, "cat": "creative"},
        {"title": "Outdoor Adventure", "icon": "🌳", "pts": 20, "cat": "active"},
        {"title": "Healthy Meal", "icon": "🥗", "pts": 10, "cat": "health"},
    ]
    for t in default_tasks:
        await db.tasks.insert_one({
            "id": gen_id(),
            "family_id": test_family_id,
            "title": t["title"],
            "icon": t["icon"],
            "pts": t["pts"],
            "cat": t["cat"],
            "modes": {"daily": True, "vacation": False},
            "active": True,
            "created_at": datetime.utcnow(),
        })
    
    # Default rewards for test family
    default_rewards = [
        {"name": "Pizza Night!", "icon": "🍕", "pts": 50, "desc": "Family pizza night"},
        {"name": "Extra Screen Time", "icon": "🎮", "pts": 30, "desc": "30 min extra screen time"},
        {"name": "Movie Night", "icon": "🎬", "pts": 75, "desc": "Pick a movie to watch"},
        {"name": "Shopping Trip", "icon": "🛍️", "pts": 100, "desc": "Trip to your favorite store"},
        {"name": "Grand Surprise", "icon": "🎁", "pts": 200, "desc": "A special surprise reward"},
    ]
    for r in default_rewards:
        await db.rewards.insert_one({
            "id": gen_id(),
            "family_id": test_family_id,
            "name": r["name"],
            "icon": r["icon"],
            "pts": r["pts"],
            "desc": r["desc"],
            "created_at": datetime.utcnow(),
        })
    
    print(f"\n{'='*50}")
    print(f"DEMO ACCOUNTS READY")
    print(f"{'='*50}")
    print(f"\n--- APPLE REVIEWER ACCOUNT ---")
    print(f"Parent Email:    {PARENT_EMAIL}")
    print(f"Parent Password: {PARENT_PASSWORD}")
    print(f"Family PIN:      {FAMILY_PIN}")
    print(f"Family Code:     {family_code}")
    print(f"Children:        Emma (8yr), Liam (6yr)")
    print(f"\n--- TEST ACCOUNT ---")
    print(f"Parent Email:    {TEST_PARENT_EMAIL}")
    print(f"Parent Password: {TEST_PARENT_PASSWORD}")
    print(f"Family PIN:      {FAMILY_PIN}")
    print(f"Family Code:     {test_family_code}")
    print(f"Children:        Alex (8yr)")
    print(f"{'='*50}")
    
    client.close()

asyncio.run(seed())
