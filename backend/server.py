from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
import logging

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
app.mount("/api/static", StaticFiles(directory=str(ROOT_DIR / "static")), name="static")

# Root routes
@app.get("/api/")
async def root():
    return {"message": "DodotX API", "version": "2.0.0"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

@app.on_event("startup")
async def startup_seed_demo():
    """Auto-seed demo accounts on startup if they don't exist."""
    from routes import db
    review_user = await db.users.find_one({"email": "review_parent@dodotx.com"})
    if not review_user:
        logger.info("Demo accounts not found. Seeding...")
        import subprocess
        subprocess.run(["python3", str(ROOT_DIR / "seed_review_account.py")], capture_output=True)
        logger.info("Demo accounts seeded successfully.")
    else:
        logger.info("Demo accounts already exist.")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    from routes import client
    client.close()
