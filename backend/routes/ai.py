from fastapi import APIRouter, HTTPException, Depends
from typing import List
from routes import db, get_current_user
from models import User, Task, TaskMode, AITaskSuggestion, AITaskResponse, AIThemeRequest, CustomTheme
from utils import generate_id
import os, logging, json

router = APIRouter(prefix="/ai", tags=["ai"])

def clean_llm_json(response: str) -> str:
    clean = response.strip()
    if clean.startswith("```"):
        clean = clean.split("```")[1]
        if clean.startswith("json"):
            clean = clean[4:]
    return clean.strip()

@router.post("/suggest-tasks", response_model=List[AITaskResponse])
async def ai_suggest_tasks(suggestion_data: AITaskSuggestion, current_user: User = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    interests_text = ", ".join(suggestion_data.interests) if suggestion_data.interests else "general activities"
    prompt = f"""Generate {5 if suggestion_data.current_tasks_count < 10 else 3} age-appropriate daily tasks for a {suggestion_data.child_age}-year-old child.\nInterests: {interests_text}\nGoals: {suggestion_data.goals or 'Build positive daily habits'}\nIMPORTANT: "cat" must be EXACTLY one of: learning, active, creative, chores, health, social\nReturn ONLY valid JSON array: [{{"title":"...","icon":"emoji","pts":10,"cat":"learning","modes":{{"daily":true,"vacation":false}}}}]"""
    try:
        api_key = os.getenv("EMERGENT_LLM_KEY")
        chat = LlmChat(api_key=api_key, session_id=f"task_{current_user.id}", system_message="Return valid JSON arrays only.").with_model("openai", "gpt-5.2")
        response = await chat.send_message(UserMessage(text=prompt))
        suggestions = json.loads(clean_llm_json(response))
        valid_cats = {"learning", "active", "creative", "chores", "health", "social"}
        for s in suggestions:
            if s.get("cat") not in valid_cats:
                s["cat"] = "chores"
        return [AITaskResponse(**task) for task in suggestions]
    except Exception as e:
        logging.error(f"AI suggestion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")

@router.post("/generate-theme")
async def ai_generate_theme(request_data: AIThemeRequest, current_user: User = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    prompt = f'Create a color palette for a family task app. Theme: "{request_data.description}". Return ONLY valid JSON: {{"name":"...","primary":"#hex","background":"#hex","card":"#hex","text":"#ffffff","accent":"#hex"}}'
    try:
        api_key = os.getenv("EMERGENT_LLM_KEY")
        chat = LlmChat(api_key=api_key, session_id=f"theme_{current_user.id}", system_message="Return valid JSON only.").with_model("openai", "gpt-5.2")
        response = await chat.send_message(UserMessage(text=prompt))
        return CustomTheme(**json.loads(clean_llm_json(response)))
    except Exception as e:
        logging.error(f"AI theme error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate theme: {str(e)}")

@router.post("/auto-routines")
async def ai_auto_generate_routines(current_user: User = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    children = await db.children.find({"family_id": current_user.family_id}).to_list(100)
    if not children:
        raise HTTPException(status_code=404, detail="No children found.")
    existing_tasks = await db.tasks.find({"family_id": current_user.family_id}).to_list(100)
    existing_titles = [t["title"] for t in existing_tasks]

    # Factor in each child's age; gracefully handle missing ages.
    child_desc = []
    known_ages = []
    for c in children:
        age = c.get("age")
        if age:
            known_ages.append(age)
            child_desc.append(f"{c.get('name')} (age {age})")
        else:
            child_desc.append(f"{c.get('name')} (age unknown)")
    if known_ages:
        age_line = f"Tailor the difficulty, wording and point values to these ages: {', '.join(str(a) for a in known_ages)}. Younger kids get simpler tasks and lower points; older kids get more responsibility and higher points."
    else:
        age_line = "Ages are unknown — create a fun, cool and motivating mix of routines that works well for kids roughly 5-12, with playful titles and a good variety."

    prompt = f"""Create 8 daily routines for: {', '.join(child_desc)}.
{age_line}
Existing routines (DON'T duplicate): {', '.join(existing_titles[:20]) or 'None'}.
Cover a mix across: morning, learning, active, creative, chores, health.
STRICT RULES: "cat" MUST be EXACTLY one of: learning, active, creative, chores, health, social. "pts" MUST be an integer between 1 and 100. "icon" MUST be a single emoji.
Return ONLY a valid JSON array: [{{"title":"...","icon":"emoji","pts":10,"cat":"health","modes":{{"daily":true,"vacation":false}}}}]"""
    try:
        api_key = os.getenv("EMERGENT_LLM_KEY")
        chat = LlmChat(api_key=api_key, session_id=f"routine_{current_user.id}", system_message="Return valid JSON arrays only.").with_model("openai", "gpt-5.2")
        response = await chat.send_message(UserMessage(text=prompt))
        routines = json.loads(clean_llm_json(response))
        if not isinstance(routines, list):
            raise ValueError("AI response was not a list")
        valid_cats = {"learning", "active", "creative", "chores", "health", "social"}
        saved = []
        for td in routines:
            if not isinstance(td, dict):
                continue
            title = str(td.get("title") or "").strip()
            if not title:
                continue
            cat = td.get("cat")
            if cat not in valid_cats:
                cat = "chores"
            try:
                pts = int(td.get("pts", 10))
            except (ValueError, TypeError):
                pts = 10
            pts = max(1, min(100, pts))
            modes_raw = td.get("modes") if isinstance(td.get("modes"), dict) else {}
            task = Task(
                id=generate_id(), title=title, icon=str(td.get("icon") or "\ud83d\udccb"),
                pts=pts, cat=cat,
                modes=TaskMode(daily=bool(modes_raw.get("daily", True)), vacation=bool(modes_raw.get("vacation", False))),
                family_id=current_user.family_id,
            )
            await db.tasks.insert_one(task.dict())
            saved.append(task.dict())
        if not saved:
            raise HTTPException(status_code=502, detail="The AI didn't return any valid routines. Please try again.")
        return {"message": f"Generated {len(saved)} routines!", "tasks": saved}
    except HTTPException:
        raise
    except json.JSONDecodeError:
        logging.error("AI routine error: invalid JSON from LLM")
        raise HTTPException(status_code=502, detail="The AI response couldn't be read. Please try again.")
    except Exception as e:
        logging.error(f"AI routine error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate routines. Please try again.")

@router.post("/adjust-difficulty")
async def ai_adjust_difficulty(current_user: User = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    children = await db.children.find({"family_id": current_user.family_id}).to_list(100)
    tasks = await db.tasks.find({"family_id": current_user.family_id}).to_list(100)
    behavior = []
    for c in children:
        p = await db.progress.find_one({"child_id": c["id"]})
        ct = p.get("completed_today", []) if p else []
        behavior.append({"name": c.get("name"), "age": c.get("age", "?"), "completed": len(ct), "total": len(tasks), "rate": round(len(ct)/max(len(tasks),1)*100), "points": p.get("points",0) if p else 0, "streak": p.get("streak",0) if p else 0})
    prompt = f"""Analyze and suggest adjustments. Data: {json.dumps(behavior)}. Tasks: {json.dumps([{"title": t.get("title",""), "pts": t.get("pts",10)} for t in tasks[:15]])}. Return ONLY JSON: {{"analysis":"...","suggestions":[{{"action":"add|modify|remove","title":"...","icon":"emoji","pts":10,"reason":"..."}}]}}"""
    try:
        api_key = os.getenv("EMERGENT_LLM_KEY")
        chat = LlmChat(api_key=api_key, session_id=f"diff_{current_user.id}", system_message="Return valid JSON.").with_model("openai", "gpt-5.2")
        response = await chat.send_message(UserMessage(text=prompt))
        return json.loads(clean_llm_json(response))
    except Exception as e:
        logging.error(f"AI difficulty error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")

@router.post("/suggest-rewards")
async def ai_suggest_rewards(current_user: User = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    children = await db.children.find({"family_id": current_user.family_id}).to_list(100)
    existing = await db.rewards.find({"family_id": current_user.family_id}).to_list(100)
    child_info = [{"name": c.get("name"), "age": c.get("age", "?")} for c in children]
    prompt = f"""Suggest 5 rewards for: {json.dumps(child_info)}. Existing: {', '.join([r.get('name','') for r in existing]) or 'None'}. Return ONLY JSON: [{{"title":"...","icon":"emoji","cost":50,"reason":"..."}}]"""
    try:
        api_key = os.getenv("EMERGENT_LLM_KEY")
        chat = LlmChat(api_key=api_key, session_id=f"rew_{current_user.id}", system_message="Return valid JSON arrays.").with_model("openai", "gpt-5.2")
        response = await chat.send_message(UserMessage(text=prompt))
        return {"suggestions": json.loads(clean_llm_json(response))}
    except Exception as e:
        logging.error(f"AI reward error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")
