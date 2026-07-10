import secrets
import string
from datetime import datetime

def generate_id(length: int = 7) -> str:
    """Generate a random alphanumeric ID"""
    return ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(length))

def generate_family_code() -> str:
    """Generate a 6-character family invite code"""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))

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

# ---- Streak / Calendar gamification ----
STREAK_MILESTONES = [
    {"days": 7,   "name": "Week Streak!",         "icon": "🥉", "reward": "🍕 Pizza night of your choice"},
    {"days": 14,  "name": "Two-Week Hero!",       "icon": "🥈", "reward": "🎮 1 hour of extra screen time"},
    {"days": 30,  "name": "Monthly Master!",      "icon": "🥇", "reward": "🎁 A special toy or book"},
    {"days": 60,  "name": "Diamond Discipline!",  "icon": "💎", "reward": "🎢 A fun day out"},
    {"days": 100, "name": "Legendary 100!",       "icon": "👑", "reward": "🏆 Grand prize — parent's choice"},
]


def is_vacation_day(date_str: str, family: dict) -> bool:
    """Whether a given YYYY-MM-DD date falls in the family's vacation period."""
    if not family or not family.get("vacation_mode"):
        return False
    start = family.get("vacation_start_date")
    end = family.get("vacation_end_date")
    if start and end:
        return start <= date_str <= end
    # Vacation mode on but no explicit dates -> treat every day as vacation.
    return True


def compute_complete_dates(completions: dict, family: dict, daily_ids: set, vacation_ids: set) -> set:
    """A day is complete when ALL applicable tasks were done that day
    (vacation tasks on vacation days, daily tasks otherwise)."""
    complete = set()
    for d, ids in completions.items():
        applicable = vacation_ids if is_vacation_day(d, family) else daily_ids
        if applicable and len(set(ids) & applicable) >= len(applicable):
            complete.add(d)
    return complete


def streaks_from_dates(complete_dates: set) -> dict:
    """Compute current + longest streak from a set of 'complete' YYYY-MM-DD dates."""
    from datetime import timedelta
    today = datetime.utcnow().date()

    def has(day_date) -> bool:
        return day_date.isoformat() in complete_dates

    current = 0
    cursor = today
    if not has(cursor):
        cursor = today - timedelta(days=1)
    while has(cursor):
        current += 1
        cursor -= timedelta(days=1)

    longest = 0
    if complete_dates:
        ds = sorted(datetime.fromisoformat(x).date() for x in complete_dates)
        run = 1
        longest = 1
        for i in range(1, len(ds)):
            if (ds[i] - ds[i - 1]).days == 1:
                run += 1
            else:
                run = 1
            if run > longest:
                longest = run

    return {"current_streak": current, "longest_streak": longest, "complete_days": len(complete_dates)}


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
