from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from models import (
    User, UserSignup, UserLogin, Token,
    Family, FamilyCreate, FamilyUpdate, FamilyCodeVerify,
    Child, ChildCreate, ChildUpdate, ChildInvite,
    Task, TaskCreate, TaskUpdate, TaskCompletion,
    Reward, RewardCreate, RewardUpdate,
    Progress, CheerMessage, CheerCreate,
    AITaskSuggestion, AITaskResponse, TaskMode
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    decode_access_token, get_pin_hash, verify_pin
)
from utils import (
    generate_id, generate_family_code, get_today_date,
    get_level_info, check_trophies, DEFAULT_TASKS, DEFAULT_REWARDS,
    check_vacation_mode
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="KidQuest API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ============ DEPENDENCY: Get Current User ============
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get the current authenticated user from JWT token"""
    token = credentials.credentials
    token_data = decode_access_token(token)
    
    if token_data is None or token_data.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": token_data.user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user)

# ============ AUTHENTICATION ROUTES ============

@api_router.post("/auth/signup", response_model=Token)
async def signup(user_data: UserSignup):
    """Register a new parent user and create their family"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = generate_id()
    hashed_password = get_password_hash(user_data.password)
    
    user = User(
        id=user_id,
        email=user_data.email,
        hashed_password=hashed_password,
        name=user_data.name,
        role="parent"
    )
    
    await db.users.insert_one(user.dict())
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    
    return Token(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "family_id": user.family_id
        }
    )

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login with email and password"""
    user = await db.users.find_one({"email": credentials.email})
    
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    user_obj = User(**user)
    access_token = create_access_token(data={"sub": user_obj.id})
    
    return Token(
        access_token=access_token,
        user={
            "id": user_obj.id,
            "email": user_obj.email,
            "name": user_obj.name,
            "role": user_obj.role,
            "family_id": user_obj.family_id
        }
    )

@api_router.get("/auth/me", response_model=dict)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "family_id": current_user.family_id
    }

# ============ FAMILY ROUTES ============

@api_router.post("/family", response_model=Family)
async def create_family(family_data: FamilyCreate, current_user: User = Depends(get_current_user)):
    """Create a new family (called during onboarding)"""
    if current_user.family_id:
        raise HTTPException(status_code=400, detail="User already has a family")
    
    family_id = generate_id()
    family_code = generate_family_code()
    hashed_pin = get_pin_hash(family_data.pin)
    
    family = Family(
        id=family_id,
        name=family_data.name,
        code=family_code,
        pin=hashed_pin,
        theme=family_data.theme,
        parent_id=current_user.id
    )
    
    await db.families.insert_one(family.dict())
    
    # Update user with family_id
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"family_id": family_id}}
    )
    
    # Create default tasks
    for task_data in DEFAULT_TASKS:
        task = Task(
            id=generate_id(),
            family_id=family_id,
            **task_data
        )
        await db.tasks.insert_one(task.dict())
    
    # Create default rewards
    for reward_data in DEFAULT_REWARDS:
        reward = Reward(
            id=generate_id(),
            family_id=family_id,
            **reward_data
        )
        await db.rewards.insert_one(reward.dict())
    
    return family

@api_router.get("/family", response_model=Family)
async def get_family(current_user: User = Depends(get_current_user)):
    """Get current user's family"""
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    
    family = await db.families.find_one({"id": current_user.family_id})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    return Family(**family)

@api_router.put("/family", response_model=Family)
async def update_family(family_data: FamilyUpdate, current_user: User = Depends(get_current_user)):
    """Update family settings"""
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    
    family = await db.families.find_one({"id": current_user.family_id})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    update_data = {k: v for k, v in family_data.dict().items() if v is not None}
    
    # Hash PIN if provided
    if "pin" in update_data:
        update_data["pin"] = get_pin_hash(update_data["pin"])
    
    if update_data:
        await db.families.update_one(
            {"id": current_user.family_id},
            {"$set": update_data}
        )
    
    updated_family = await db.families.find_one({"id": current_user.family_id})
    return Family(**updated_family)

@api_router.post("/family/verify-pin")
async def verify_family_pin(pin: str, current_user: User = Depends(get_current_user)):
    """Verify parent PIN"""
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    
    family = await db.families.find_one({"id": current_user.family_id})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    if not verify_pin(pin, family["pin"]):
        raise HTTPException(status_code=401, detail="Incorrect PIN")
    
    return {"success": True}

@api_router.post("/family/verify-code", response_model=dict)
async def verify_family_code(code_data: FamilyCodeVerify):
    """Verify a family code (for visitors or children joining)"""
    family = await db.families.find_one({"code": code_data.code.upper()})
    
    if not family:
        raise HTTPException(status_code=404, detail="Invalid family code")
    
    return {
        "family_id": family["id"],
        "family_name": family["name"],
        "theme": family["theme"]
    }

@api_router.post("/family/join-child")
async def join_child(invite_data: ChildInvite):
    """Child joins family using family code (no account needed)"""
    family = await db.families.find_one({"code": invite_data.family_code.upper()})
    
    if not family:
        raise HTTPException(status_code=404, detail="Invalid family code")
    
    # Create child
    child_id = generate_id()
    child = Child(
        id=child_id,
        name=invite_data.child_name,
        avatar="👦",
        family_id=family["id"]
    )
    
    await db.children.insert_one(child.dict())
    
    # Create initial progress
    progress = Progress(child_id=child_id)
    await db.progress.insert_one(progress.dict())
    
    return {
        "child_id": child_id,
        "family_id": family["id"],
        "message": f"{invite_data.child_name} joined the family!"
    }

# ============ CHILDREN ROUTES ============

@api_router.post("/children", response_model=Child)
async def create_child(child_data: ChildCreate, current_user: User = Depends(get_current_user)):
    """Create a new child in the family"""
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    
    child_id = generate_id()
    child = Child(
        id=child_id,
        family_id=current_user.family_id,
        **child_data.dict()
    )
    
    await db.children.insert_one(child.dict())
    
    # Create initial progress
    progress = Progress(child_id=child_id)
    await db.progress.insert_one(progress.dict())
    
    return child

@api_router.get("/children", response_model=List[Child])
async def get_children(current_user: User = Depends(get_current_user)):
    """Get all children in the family"""
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    
    children = await db.children.find({"family_id": current_user.family_id}).to_list(100)
    return [Child(**child) for child in children]

@api_router.get("/children/{child_id}", response_model=Child)
async def get_child(child_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific child"""
    child = await db.children.find_one({"id": child_id})
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    if current_user.family_id and child["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return Child(**child)

@api_router.put("/children/{child_id}", response_model=Child)
async def update_child(child_id: str, child_data: ChildUpdate, current_user: User = Depends(get_current_user)):
    """Update child information"""
    child = await db.children.find_one({"id": child_id})
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    if child["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in child_data.dict().items() if v is not None}
    
    if update_data:
        await db.children.update_one({"id": child_id}, {"$set": update_data})
    
    updated_child = await db.children.find_one({"id": child_id})
    return Child(**updated_child)

@api_router.delete("/children/{child_id}")
async def delete_child(child_id: str, current_user: User = Depends(get_current_user)):
    """Delete a child (and their progress)"""
    child = await db.children.find_one({"id": child_id})
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    if child["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Delete child and progress
    await db.children.delete_one({"id": child_id})
    await db.progress.delete_one({"child_id": child_id})
    await db.cheers.delete_many({"child_id": child_id})
    
    return {"message": "Child deleted successfully"}

# ============ TASK ROUTES ============

@api_router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate, current_user: User = Depends(get_current_user)):
    """Create a new task"""
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    
    task_id = generate_id()
    task = Task(
        id=task_id,
        family_id=current_user.family_id,
        **task_data.dict()
    )
    
    await db.tasks.insert_one(task.dict())
    return task

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(current_user: User = Depends(get_current_user)):
    """Get all tasks for the family"""
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    
    tasks = await db.tasks.find({"family_id": current_user.family_id}).to_list(100)
    return [Task(**task) for task in tasks]

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_data: TaskUpdate, current_user: User = Depends(get_current_user)):
    """Update a task"""
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

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: User = Depends(get_current_user)):
    """Delete a task"""
    task = await db.tasks.find_one({"id": task_id})
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.tasks.delete_one({"id": task_id})
    return {"message": "Task deleted successfully"}

@api_router.post("/tasks/{task_id}/toggle")
async def toggle_task(task_id: str, child_id: str, current_user: User = Depends(get_current_user)):
    """Toggle task completion for a child"""
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    child = await db.children.find_one({"id": child_id})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    progress = await db.progress.find_one({"child_id": child_id})
    if not progress:
        progress = Progress(child_id=child_id).dict()
        await db.progress.insert_one(progress)
    
    today = get_today_date()
    completions = progress.get("completions", {})
    today_tasks = completions.get(today, [])
    
    # Toggle completion
    if task_id in today_tasks:
        # Uncomplete task
        today_tasks.remove(task_id)
        points = progress.get("points", 0) - task["pts"]
        total_tasks = progress.get("total_tasks", 0) - 1
    else:
        # Complete task
        today_tasks.append(task_id)
        points = progress.get("points", 0) + task["pts"]
        total_tasks = progress.get("total_tasks", 0) + 1
    
    completions[today] = today_tasks
    
    # Update streak
    last_date = progress.get("last_date")
    streak = progress.get("streak", 0)
    
    if today_tasks:  # If there are tasks completed today
        if last_date:
            # Calculate days difference
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
    
    # Check for perfect day
    family = await db.families.find_one({"id": child["family_id"]})
    vacation_mode = family.get("vacation_mode", False)
    
    # Get active tasks for current mode
    all_tasks = await db.tasks.find({
        "family_id": child["family_id"],
        "active": True
    }).to_list(100)
    
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
    
    # Update progress
    await db.progress.update_one(
        {"child_id": child_id},
        {"$set": {
            "points": max(0, points),
            "total_tasks": max(0, total_tasks),
            "streak": streak,
            "last_date": last_date,
            "perfect_days": perfect_days,
            "completions": completions,
            "updated_at": datetime.utcnow()
        }}
    )
    
    updated_progress = await db.progress.find_one({"child_id": child_id})
    
    return {
        "success": True,
        "points": updated_progress["points"],
        "completed": task_id in today_tasks
    }

# ============ REWARD ROUTES ============

@api_router.post("/rewards", response_model=Reward)
async def create_reward(reward_data: RewardCreate, current_user: User = Depends(get_current_user)):
    """Create a new reward"""
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    
    reward_id = generate_id()
    reward = Reward(
        id=reward_id,
        family_id=current_user.family_id,
        **reward_data.dict()
    )
    
    await db.rewards.insert_one(reward.dict())
    return reward

@api_router.get("/rewards", response_model=List[Reward])
async def get_rewards(current_user: User = Depends(get_current_user)):
    """Get all rewards for the family"""
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    
    rewards = await db.rewards.find({"family_id": current_user.family_id}).sort("pts", 1).to_list(100)
    return [Reward(**reward) for reward in rewards]

@api_router.put("/rewards/{reward_id}", response_model=Reward)
async def update_reward(reward_id: str, reward_data: RewardUpdate, current_user: User = Depends(get_current_user)):
    """Update a reward"""
    reward = await db.rewards.find_one({"id": reward_id})
    
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    
    if reward["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in reward_data.dict().items() if v is not None}
    
    if update_data:
        await db.rewards.update_one({"id": reward_id}, {"$set": update_data})
    
    updated_reward = await db.rewards.find_one({"id": reward_id})
    return Reward(**updated_reward)

@api_router.delete("/rewards/{reward_id}")
async def delete_reward(reward_id: str, current_user: User = Depends(get_current_user)):
    """Delete a reward"""
    reward = await db.rewards.find_one({"id": reward_id})
    
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    
    if reward["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.rewards.delete_one({"id": reward_id})
    return {"message": "Reward deleted successfully"}

# ============ PROGRESS ROUTES ============

@api_router.get("/progress/{child_id}")
async def get_progress(child_id: str, current_user: User = Depends(get_current_user)):
    """Get progress for a specific child"""
    child = await db.children.find_one({"id": child_id})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Remove MongoDB _id field
    if "_id" in child:
        del child["_id"]
    
    progress = await db.progress.find_one({"child_id": child_id})
    if not progress:
        progress = Progress(child_id=child_id).dict()
        await db.progress.insert_one(progress)
    
    # Get level info
    level_info = get_level_info(progress.get("points", 0))
    
    # Get trophies
    trophies = check_trophies(progress)
    
    # Get rewards status
    rewards = await db.rewards.find({"family_id": child["family_id"]}).sort("pts", 1).to_list(100)
    rewards_status = []
    for reward in rewards:
        # Remove MongoDB _id
        if "_id" in reward:
            del reward["_id"]
        rewards_status.append({
            **reward,
            "unlocked": progress.get("points", 0) >= reward["pts"],
            "progress": min(100, (progress.get("points", 0) / reward["pts"]) * 100)
        })
    
    # Get today's tasks
    today = get_today_date()
    today_completions = progress.get("completions", {}).get(today, [])
    
    return {
        "child": child,
        "points": progress.get("points", 0),
        "total_tasks": progress.get("total_tasks", 0),
        "streak": progress.get("streak", 0),
        "perfect_days": progress.get("perfect_days", 0),
        "level": level_info,
        "trophies": trophies,
        "rewards": rewards_status,
        "today_tasks_count": len(today_completions),
        "today_completions": today_completions
    }

# ============ CHEERS ROUTES ============

@api_router.post("/cheers", response_model=CheerMessage)
async def send_cheer(cheer_data: CheerCreate):
    """Send a cheer message to a child"""
    child = await db.children.find_one({"id": cheer_data.child_id})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    cheer_id = generate_id()
    cheer = CheerMessage(
        id=cheer_id,
        **cheer_data.dict()
    )
    
    await db.cheers.insert_one(cheer.dict())
    return cheer

@api_router.get("/cheers/{child_id}", response_model=List[CheerMessage])
async def get_cheers(child_id: str):
    """Get cheer messages for a child"""
    cheers = await db.cheers.find({"child_id": child_id}).sort("created_at", -1).limit(20).to_list(20)
    return [CheerMessage(**cheer) for cheer in cheers]

# ============ AI ROUTES ============

@api_router.post("/ai/suggest-tasks", response_model=List[AITaskResponse])
async def ai_suggest_tasks(suggestion_data: AITaskSuggestion, current_user: User = Depends(get_current_user)):
    """Get AI-powered task suggestions"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    # Prepare prompt
    interests_text = ", ".join(suggestion_data.interests) if suggestion_data.interests else "general activities"
    
    prompt = f"""You are a family task assistant. Generate {5 if suggestion_data.current_tasks_count < 10 else 3} age-appropriate daily tasks for a {suggestion_data.child_age}-year-old child.

Interests: {interests_text}
Goals: {suggestion_data.goals or "Build positive daily habits"}

For each task, provide:
1. A short, clear title (3-5 words)
2. An appropriate emoji icon
3. Points value (5-20 based on difficulty)
4. Category (learning, active, creative, chores, health, or social)
5. Whether it's suitable for daily routine and/or vacation mode

Return ONLY a valid JSON array with no additional text, in this exact format:
[
  {{
    "title": "Practice piano for 15 mins",
    "icon": "🎹",
    "pts": 15,
    "cat": "creative",
    "modes": {{"daily": true, "vacation": false}}
  }}
]

Make tasks fun, achievable, and motivating for the child's age."""

    try:
        # Initialize LLM Chat
        api_key = os.getenv("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"task_suggestion_{current_user.id}",
            system_message="You are a helpful family task assistant. Always return valid JSON arrays."
        ).with_model("openai", "gpt-5.2")
        
        # Send message
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse response
        import json
        # Clean response (remove markdown code blocks if present)
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        clean_response = clean_response.strip()
        
        suggestions = json.loads(clean_response)
        
        return [AITaskResponse(**task) for task in suggestions]
    
    except Exception as e:
        logging.error(f"AI suggestion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")


@api_router.post("/ai/generate-theme")
async def ai_generate_theme(request_data: models.AIThemeRequest, current_user: User = Depends(get_current_user)):
    """Generate a custom theme using AI based on user description"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    prompt = f"""You are a UI/UX color palette generator. Create a beautiful, cohesive color scheme for a family task management app.

User's theme description: "{request_data.description}"

Generate a color palette with these requirements:
1. Dark background (like #0f1419 or similar dark color)
2. Card color slightly lighter than background
3. Primary color that pops but isn't too bright
4. Accent color complementary to primary
5. All colors should work well together and be pleasant for kids and parents

Return ONLY a valid JSON object with no additional text:
{{
  "name": "descriptive theme name",
  "primary": "#hex_color",
  "background": "#hex_color",
  "card": "#hex_color",
  "text": "#ffffff",
  "accent": "#hex_color"
}}

Make it professional, modern, and suitable for a gamified family app."""

    try:
        # Initialize LLM Chat
        api_key = os.getenv("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"theme_gen_{current_user.id}",
            system_message="You are a professional UI/UX color palette designer. Always return valid JSON."
        ).with_model("openai", "gpt-5.2")
        
        # Send message
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse response
        import json
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        clean_response = clean_response.strip()
        
        theme_data = json.loads(clean_response)
        
        return models.CustomTheme(**theme_data)
    
    except Exception as e:
        logging.error(f"AI theme generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate theme: {str(e)}")

# ============ ROOT ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "KidQuest API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
