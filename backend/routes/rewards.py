from fastapi import APIRouter, HTTPException, Depends
from typing import List
from routes import db, get_current_user
from models import User, Reward, RewardCreate, RewardUpdate
from utils import generate_id

router = APIRouter(prefix="/rewards", tags=["rewards"])

@router.post("", response_model=Reward)
async def create_reward(reward_data: RewardCreate, current_user: User = Depends(get_current_user)):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    reward_id = generate_id()
    reward = Reward(id=reward_id, family_id=current_user.family_id, **reward_data.dict())
    await db.rewards.insert_one(reward.dict())
    return reward

@router.get("", response_model=List[Reward])
async def get_rewards(current_user: User = Depends(get_current_user)):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    rewards = await db.rewards.find({"family_id": current_user.family_id}).sort("pts", 1).to_list(100)
    return [Reward(**reward) for reward in rewards]

@router.put("/{reward_id}", response_model=Reward)
async def update_reward(reward_id: str, reward_data: RewardUpdate, current_user: User = Depends(get_current_user)):
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

@router.delete("/{reward_id}")
async def delete_reward(reward_id: str, current_user: User = Depends(get_current_user)):
    reward = await db.rewards.find_one({"id": reward_id})
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    if reward["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.rewards.delete_one({"id": reward_id})
    return {"message": "Reward deleted successfully"}
