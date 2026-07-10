from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum

class TaskCategory(str, Enum):
    LEARNING = "learning"
    ACTIVE = "active"
    CREATIVE = "creative"
    CHORES = "chores"
    HEALTH = "health"
    SOCIAL = "social"

class TaskMode(BaseModel):
    daily: bool = True
    vacation: bool = False

class Task(BaseModel):
    id: str
    title: str
    icon: str
    pts: int = Field(ge=1, le=100)
    cat: TaskCategory
    modes: TaskMode
    active: bool = True
    family_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TaskCreate(BaseModel):
    title: str = Field(min_length=1)
    pts: int = Field(ge=1, le=100)
    cat: TaskCategory
    icon: str = "✓"
    modes: TaskMode = TaskMode()
    active: bool = True

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    icon: Optional[str] = None
    pts: Optional[int] = Field(default=None, ge=1, le=100)
    cat: Optional[TaskCategory] = None
    modes: Optional[TaskMode] = None
    active: Optional[bool] = None

class Reward(BaseModel):
    id: str
    name: str
    icon: str
    pts: int
    desc: str
    family_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RewardCreate(BaseModel):
    name: str
    icon: str = "🎁"
    pts: int = Field(ge=1)
    desc: str = ""

class RewardUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    pts: Optional[int] = None
    desc: Optional[str] = None

class Child(BaseModel):
    id: str
    name: str
    avatar: str  # emoji or base64 image
    age: Optional[int] = None
    profile_picture: Optional[str] = None  # base64 image
    family_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChildCreate(BaseModel):
    name: str
    avatar: str = "👦"
    age: Optional[int] = None
    profile_picture: Optional[str] = None

class ChildUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    age: Optional[int] = None
    profile_picture: Optional[str] = None

class Progress(BaseModel):
    child_id: str
    points: int = 0
    total_tasks: int = 0
    streak: int = 0
    last_date: Optional[str] = None
    perfect_days: int = 0
    completions: Dict[str, List[str]] = {}
    redeemed_rewards: List[str] = []
    streak_milestones: List[int] = []
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TaskCompletion(BaseModel):
    task_id: str
    completed: bool

class Trophy(BaseModel):
    id: str
    name: str
    icon: str
    condition: str
    earned: bool = False
    earned_at: Optional[datetime] = None

class CheerMessage(BaseModel):
    id: str
    child_id: str
    sender_name: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CheerCreate(BaseModel):
    child_id: str
    sender_name: str = "Family Member"
    message: str

class Theme(str, Enum):
    FOOTBALL = "football"
    SPACE = "space"
    OCEAN = "ocean"
    NATURE = "nature"
    GAMING = "gaming"
    ADVENTURE = "adventure"

class CustomTheme(BaseModel):
    name: str
    primary: str
    background: str
    card: str
    text: str
    accent: str

class Family(BaseModel):
    id: str
    name: str
    code: str  # 6-char invite code
    code_generated_at: Optional[datetime] = None  # None = never expires (for demo accounts)
    pin: str  # Hashed 4-digit PIN
    theme: Theme = Theme.FOOTBALL
    custom_theme: Optional[CustomTheme] = None  # AI-generated or user-created
    vacation_mode: bool = False
    vacation_start_date: Optional[str] = None  # YYYY-MM-DD
    vacation_end_date: Optional[str] = None    # YYYY-MM-DD
    parent_id: str
    parent_profile_picture: Optional[str] = None  # base64 image
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FamilyCreate(BaseModel):
    name: str
    pin: str  # 4 digits
    theme: Theme = Theme.GAMING

class FamilyUpdate(BaseModel):
    name: Optional[str] = None
    theme: Optional[Theme] = None
    custom_theme: Optional[CustomTheme] = None
    vacation_mode: Optional[bool] = None
    vacation_start_date: Optional[str] = None
    vacation_end_date: Optional[str] = None
    pin: Optional[str] = None
    parent_profile_picture: Optional[str] = None

class User(BaseModel):
    id: str
    email: EmailStr
    hashed_password: str
    name: str
    role: str = "parent"  # parent, child, visitor
    family_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserSignup(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class TokenData(BaseModel):
    user_id: Optional[str] = None

class FamilyCodeVerify(BaseModel):
    code: str

class ChildInvite(BaseModel):
    family_code: str
    child_name: str

class AITaskSuggestion(BaseModel):
    child_age: int
    interests: List[str] = []
    goals: str = ""
    current_tasks_count: int = 0

class AITaskResponse(BaseModel):
    title: str
    icon: str
    pts: int
    cat: TaskCategory
    modes: TaskMode


class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    email: str
    code: str
    new_password: str

class AIThemeRequest(BaseModel):
    description: str  # User describes the theme they want
