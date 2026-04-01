import random
import string
from datetime import datetime

def generate_id(length: int = 7) -> str:
    """Generate a random alphanumeric ID"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def generate_family_code() -> str:
    """Generate a 6-character family invite code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def get_today_date() -> str:
    """Get today's date in YYYY-MM-DD format"""
    return datetime.utcnow().strftime("%Y-%m-%d")

def check_vacation_mode(family: dict) -> bool:
    """Check if vacation mode should be active based on dates"""
    if not family.get("vacation_mode"):
        return False
    
    # If no dates set, use the toggle value
    start_date = family.get("vacation_start_date")
    end_date = family.get("vacation_end_date")
    
    if not start_date or not end_date:
        return family.get("vacation_mode", False)
    
    # Check if today is within vacation dates
    today = get_today_date()
    return start_date <= today <= end_date

def get_level_info(points: int) -> dict:
    """Get level name and progress based on total points"""
    levels = [
        {"name": "🌱 Beginner", "min": 0, "max": 99},
        {"name": "⚡ Rising Star", "min": 100, "max": 249},
        {"name": "🔥 Hot Streak", "min": 250, "max": 499},
        {"name": "🌟 Quest Master", "min": 500, "max": 999},
        {"name": "💎 Legend", "min": 1000, "max": 1999},
        {"name": "🏆 Champion", "min": 2000, "max": 999999},
    ]
    
    for level in levels:
        if level["min"] <= points <= level["max"]:
            progress = 0
            if level["max"] != 999999:
                progress = ((points - level["min"]) / (level["max"] - level["min"] + 1)) * 100
            else:
                progress = 100
            return {
                "name": level["name"],
                "min": level["min"],
                "max": level["max"],
                "progress": round(progress, 1)
            }
    
    return {"name": "🏆 Champion", "min": 2000, "max": 999999, "progress": 100}

def check_trophies(progress: dict) -> list:
    """Check which trophies have been earned"""
    trophies = [
        {
            "id": "first_quest",
            "name": "First Quest!",
            "icon": "🥉",
            "condition": "Complete 1 task",
            "earned": progress.get("total_tasks", 0) >= 1
        },
        {
            "id": "on_fire",
            "name": "On Fire!",
            "icon": "🔥",
            "condition": "Reach a 3-day streak",
            "earned": progress.get("streak", 0) >= 3
        },
        {
            "id": "week_warrior",
            "name": "Week Warrior",
            "icon": "⚡",
            "condition": "Reach a 7-day streak",
            "earned": progress.get("streak", 0) >= 7
        },
        {
            "id": "century",
            "name": "Century!",
            "icon": "💫",
            "condition": "Earn 100 total points",
            "earned": progress.get("points", 0) >= 100
        },
        {
            "id": "star_player",
            "name": "Star Player",
            "icon": "🌟",
            "condition": "Earn 500 total points",
            "earned": progress.get("points", 0) >= 500
        },
        {
            "id": "diamond",
            "name": "Diamond",
            "icon": "💎",
            "condition": "Earn 1,000 total points",
            "earned": progress.get("points", 0) >= 1000
        },
        {
            "id": "first_reward",
            "name": "First Reward!",
            "icon": "🎁",
            "condition": "Unlock first reward",
            "earned": len(progress.get("redeemed_rewards", [])) >= 1
        },
        {
            "id": "perfect_day",
            "name": "Perfect Day!",
            "icon": "🏆",
            "condition": "Complete all tasks in one day",
            "earned": progress.get("perfect_days", 0) >= 1
        }
    ]
    
    return trophies

DEFAULT_TASKS = [
    {
        "title": "Morning Routine",
        "icon": "🌅",
        "pts": 10,
        "cat": "health",
        "modes": {"daily": True, "vacation": True}
    },
    {
        "title": "Read for 20 mins",
        "icon": "📚",
        "pts": 15,
        "cat": "learning",
        "modes": {"daily": True, "vacation": False}
    },
    {
        "title": "Physical Activity",
        "icon": "⚽",
        "pts": 15,
        "cat": "active",
        "modes": {"daily": True, "vacation": False}
    },
    {
        "title": "Help with Chores",
        "icon": "🧹",
        "pts": 10,
        "cat": "chores",
        "modes": {"daily": True, "vacation": False}
    },
    {
        "title": "No Screens Before 10AM",
        "icon": "📵",
        "pts": 10,
        "cat": "health",
        "modes": {"daily": True, "vacation": False}
    },
    {
        "title": "Creative Project",
        "icon": "🎨",
        "pts": 15,
        "cat": "creative",
        "modes": {"daily": False, "vacation": True}
    },
    {
        "title": "Outdoor Adventure",
        "icon": "🌳",
        "pts": 20,
        "cat": "active",
        "modes": {"daily": False, "vacation": True}
    },
    {
        "title": "Healthy Meal",
        "icon": "🥗",
        "pts": 10,
        "cat": "health",
        "modes": {"daily": True, "vacation": True}
    }
]

DEFAULT_REWARDS = [
    {
        "name": "Pizza Night!",
        "icon": "🍕",
        "pts": 50,
        "desc": "Pick the toppings!"
    },
    {
        "name": "Extra Screen Time",
        "icon": "🎮",
        "pts": 80,
        "desc": "30 mins bonus gaming!"
    },
    {
        "name": "Movie Night",
        "icon": "🎬",
        "pts": 120,
        "desc": "You pick the movie!"
    },
    {
        "name": "Shopping Trip",
        "icon": "🛍️",
        "pts": 200,
        "desc": "Choose a small treat"
    },
    {
        "name": "Grand Surprise",
        "icon": "🏆",
        "pts": 400,
        "desc": "Epic reward - parent's choice!"
    }
]
