from fastapi import FastAPI
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
app = FastAPI(title="DoneDash API")

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

# Root routes
@app.get("/api/")
async def root():
    return {"message": "DoneDash API", "version": "2.0.0"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

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
