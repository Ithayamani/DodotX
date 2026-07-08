from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
import logging

# Configure logging FIRST
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("dodotx")

# Load env first
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import routers
from routes.auth import router as auth_router
from routes.family import router as family_router
from routes.children import router as children_router
from routes.tasks import router as tasks_router
from routes.rewards import router as rewards_router
from routes.progress import router as progress_router
from routes.ai import router as ai_router
from routes.visitor import router as visitor_router

# Create the main app
app = FastAPI(title="DodotX API", docs_url=None, redoc_url=None)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers under /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(family_router, prefix="/api")
app.include_router(children_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(rewards_router, prefix="/api")
app.include_router(progress_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(visitor_router, prefix="/api")

# Serve static screenshots for App Store submission
try:
    app.mount("/api/static", StaticFiles(directory=str(ROOT_DIR / "static")), name="static")
except Exception:
    logger.warning("Static files directory not found, skipping mount")

# Root routes
@app.get("/api/")
async def root():
    return {"message": "DodotX API", "version": "2.0.0"}

@app.get("/api/health")
async def health_check():
    from routes import db
    try:
        await db.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {"status": "healthy", "database": db_status}


# =======================================
# INLINE DEMO SEED (No subprocess needed)
# =======================================
async def seed_demo_accounts_inline():
    """Seed demo accounts directly using the existing DB connection and bcrypt."""
    import bcrypt
    import random
    import string
    from datetime import datetime
    from routes import db

    def gen_id(length=7):
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

    def hash_pw(plain):
        return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    PARENT_EMAIL = "review_parent@dodotx.com"
    PARENT_PASSWORD = "Review123!"
    TEST_EMAIL = "parent@test.com"
    TEST_PASSWORD = "Parent123!"
    FAMILY_PIN = "1234"

    # --- REVIEW FAMILY ---
    review_user = await db.users.find_one({"email": PARENT_EMAIL})
    if review_user:
        # User exists — verify password works
        try:
            pw_ok = bcrypt.checkpw(PARENT_PASSWORD.encode('utf-8'), review_user["hashed_password"].encode('utf-8'))
            if pw_ok:
                logger.info(f"Demo account {PARENT_EMAIL} exists and password VERIFIED OK")
                # Also verify test account
                test_user = await db.users.find_one({"email": TEST_EMAIL})
                if test_user:
                    test_ok = bcrypt.checkpw(TEST_PASSWORD.encode('utf-8'), test_user["hashed_password"].encode('utf-8'))
                    logger.info(f"Test account {TEST_EMAIL} password verified: {test_ok}")
                return
            else:
                logger.warning(f"Demo account {PARENT_EMAIL} exists but password FAILED — re-seeding!")
        except Exception as e:
            logger.error(f"Password verification error: {e} — re-seeding!")
    else:
        logger.info("Demo accounts not found. Seeding fresh...")

    # Clear and re-seed everything
    logger.info("Clearing all collections for fresh seed...")
    for col in ["users", "families", "children", "tasks", "rewards", "progress", "task_completions", "cheers"]:
        await db[col].delete_many({})

    # --- REVIEW FAMILY ---
    family_id = gen_id()
    user_id = gen_id()
    hashed_pw = hash_pw(PARENT_PASSWORD)

    # Verify immediately after hashing
    verify_check = bcrypt.checkpw(PARENT_PASSWORD.encode('utf-8'), hashed_pw.encode('utf-8'))
    logger.info(f"Password hash verification immediately after creation: {verify_check}")

    await db.families.insert_one({
        "id": family_id, "name": "Demo Family", "code": "REVIEW",
        "code_generated_at": None, "pin": hash_pw(FAMILY_PIN),
        "theme": "gaming", "custom_theme": None,
        "vacation_mode": False, "vacation_start_date": None, "vacation_end_date": None,
        "parent_id": user_id, "parent_profile_picture": None,
        "created_at": datetime.utcnow(),
    })

    await db.users.insert_one({
        "id": user_id, "email": PARENT_EMAIL, "name": "Demo Parent",
        "hashed_password": hashed_pw,
        "family_id": family_id, "role": "parent", "created_at": datetime.utcnow(),
    })
    logger.info(f"Review parent created: {PARENT_EMAIL}")

    # Verify by reading back from DB
    saved_user = await db.users.find_one({"email": PARENT_EMAIL})
    if saved_user:
        db_verify = bcrypt.checkpw(PARENT_PASSWORD.encode('utf-8'), saved_user["hashed_password"].encode('utf-8'))
        logger.info(f"DB read-back password verification: {db_verify}")
    else:
        logger.error("CRITICAL: User was inserted but cannot be found!")

    children_data = [
        {"name": "Emma", "age": 8, "avatar": "🦊", "pts": 245, "tasks": 35, "streak": 5, "days": 12},
        {"name": "Liam", "age": 6, "avatar": "🐼", "pts": 180, "tasks": 20, "streak": 3, "days": 7},
    ]
    for c in children_data:
        cid = gen_id()
        await db.children.insert_one({
            "id": cid, "name": c["name"], "age": c["age"], "avatar": c["avatar"],
            "profile_picture": None, "family_id": family_id, "created_at": datetime.utcnow(),
        })
        await db.progress.insert_one({
            "child_id": cid, "points": c["pts"], "total_tasks": c["tasks"],
            "streak": c["streak"], "last_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "perfect_days": c["days"], "completions": {}, "redeemed_rewards": [],
            "updated_at": datetime.utcnow(),
        })
    logger.info("Review children created: Emma, Liam")

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
        await db.tasks.insert_one({
            "id": gen_id(), "family_id": family_id, "title": t["title"],
            "icon": t["icon"], "pts": t["pts"], "cat": t["cat"],
            "modes": t["modes"], "active": True, "created_at": datetime.utcnow(),
        })
    logger.info(f"{len(tasks)} review tasks created")

    rewards = [
        {"name": "Extra Screen Time (30 min)", "icon": "📱", "pts": 50, "desc": "30 minutes of extra screen time"},
        {"name": "Choose Dinner Menu", "icon": "🍕", "pts": 75, "desc": "Pick what's for dinner tonight"},
        {"name": "Movie Night", "icon": "🎬", "pts": 100, "desc": "Choose a family movie to watch"},
        {"name": "New Book", "icon": "📖", "pts": 120, "desc": "Pick a new book from the store"},
        {"name": "Trip to Park", "icon": "🎢", "pts": 150, "desc": "Fun day at the park"},
        {"name": "Sleepover with Friend", "icon": "🏠", "pts": 200, "desc": "Invite a friend for a sleepover"},
    ]
    for r in rewards:
        await db.rewards.insert_one({
            "id": gen_id(), "family_id": family_id, "name": r["name"],
            "icon": r["icon"], "pts": r["pts"], "desc": r["desc"],
            "created_at": datetime.utcnow(),
        })
    logger.info(f"{len(rewards)} review rewards created")

    # --- TEST FAMILY ---
    test_family_id = gen_id()
    test_user_id = gen_id()
    test_hashed_pw = hash_pw(TEST_PASSWORD)

    await db.families.insert_one({
        "id": test_family_id, "name": "Test Family", "code": "TEST01",
        "code_generated_at": None, "pin": hash_pw(FAMILY_PIN),
        "theme": "football", "custom_theme": None,
        "vacation_mode": False, "vacation_start_date": None, "vacation_end_date": None,
        "parent_id": test_user_id, "parent_profile_picture": None,
        "created_at": datetime.utcnow(),
    })

    await db.users.insert_one({
        "id": test_user_id, "email": TEST_EMAIL, "name": "Test Parent",
        "hashed_password": test_hashed_pw,
        "family_id": test_family_id, "role": "parent", "created_at": datetime.utcnow(),
    })

    test_child_id = gen_id()
    await db.children.insert_one({
        "id": test_child_id, "name": "Alex", "age": 8, "avatar": "👦",
        "profile_picture": None, "family_id": test_family_id, "created_at": datetime.utcnow(),
    })
    await db.progress.insert_one({
        "child_id": test_child_id, "points": 0, "total_tasks": 0,
        "streak": 0, "last_date": None, "perfect_days": 0,
        "completions": {}, "redeemed_rewards": [], "updated_at": datetime.utcnow(),
    })

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
            "id": gen_id(), "family_id": test_family_id, "title": t["title"],
            "icon": t["icon"], "pts": t["pts"], "cat": t["cat"],
            "modes": {"daily": True, "vacation": False}, "active": True,
            "created_at": datetime.utcnow(),
        })

    default_rewards = [
        {"name": "Pizza Night!", "icon": "🍕", "pts": 50, "desc": "Family pizza night"},
        {"name": "Extra Screen Time", "icon": "🎮", "pts": 30, "desc": "30 min extra screen time"},
        {"name": "Movie Night", "icon": "🎬", "pts": 75, "desc": "Pick a movie to watch"},
        {"name": "Shopping Trip", "icon": "🛍️", "pts": 100, "desc": "Trip to your favorite store"},
        {"name": "Grand Surprise", "icon": "🎁", "pts": 200, "desc": "A special surprise reward"},
    ]
    for r in default_rewards:
        await db.rewards.insert_one({
            "id": gen_id(), "family_id": test_family_id, "name": r["name"],
            "icon": r["icon"], "pts": r["pts"], "desc": r["desc"],
            "created_at": datetime.utcnow(),
        })

    logger.info(f"Test parent created: {TEST_EMAIL}")
    logger.info("=== DEMO SEED COMPLETE ===")


@app.on_event("startup")
async def startup_seed_demo():
    """Auto-seed demo accounts on startup."""
    try:
        await seed_demo_accounts_inline()
    except Exception as e:
        logger.error(f"SEED FAILED: {e}")
        import traceback
        logger.error(traceback.format_exc())


# Manual seed endpoint (for emergency re-seeding)
@app.get("/api/admin/seed")
async def manual_seed():
    """Force re-seed demo accounts. Can be triggered manually if accounts are missing."""
    from routes import db
    # Delete the review user to force re-seed
    await db.users.delete_one({"email": "review_parent@dodotx.com"})
    try:
        await seed_demo_accounts_inline()
        return {"status": "success", "message": "Demo accounts re-seeded successfully"}
    except Exception as e:
        logger.error(f"Manual seed failed: {e}")
        return {"status": "error", "message": str(e)}


# Verify demo account endpoint
@app.get("/api/admin/verify-demo")
async def verify_demo():
    """Check if the demo account exists and password is valid."""
    import bcrypt
    from routes import db
    user = await db.users.find_one({"email": "review_parent@dodotx.com"})
    if not user:
        return {"exists": False, "password_valid": False, "message": "Demo user NOT found in database"}
    try:
        pw_ok = bcrypt.checkpw("Review123!".encode('utf-8'), user["hashed_password"].encode('utf-8'))
        family = await db.families.find_one({"id": user.get("family_id")})
        children_count = await db.children.count_documents({"family_id": user.get("family_id")})
        tasks_count = await db.tasks.count_documents({"family_id": user.get("family_id")})
        return {
            "exists": True,
            "password_valid": pw_ok,
            "user_id": user.get("id"),
            "family_id": user.get("family_id"),
            "family_name": family.get("name") if family else None,
            "family_code": family.get("code") if family else None,
            "children_count": children_count,
            "tasks_count": tasks_count,
        }
    except Exception as e:
        return {"exists": True, "password_valid": False, "error": str(e)}


@app.on_event("shutdown")
async def shutdown_db_client():
    from routes import client
    client.close()
