from fastapi import APIRouter, HTTPException, Depends
from typing import List
from routes import db, get_current_user
from models import User, Child, ChildCreate, ChildUpdate, Progress
from utils import generate_id

router = APIRouter(prefix="/children", tags=["children"])

@router.post("", response_model=Child)
async def create_child(child_data: ChildCreate, current_user: User = Depends(get_current_user)):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    child_id = generate_id()
    child = Child(id=child_id, family_id=current_user.family_id, **child_data.dict())
    await db.children.insert_one(child.dict())
    progress = Progress(child_id=child_id)
    await db.progress.insert_one(progress.dict())
    return child

@router.get("", response_model=List[Child])
async def get_children(current_user: User = Depends(get_current_user)):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User has no family")
    children = await db.children.find({"family_id": current_user.family_id}).to_list(100)
    return [Child(**child) for child in children]

@router.get("/{child_id}", response_model=Child)
async def get_child(child_id: str, current_user: User = Depends(get_current_user)):
    child = await db.children.find_one({"id": child_id})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not current_user.family_id or child["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return Child(**child)

@router.put("/{child_id}", response_model=Child)
async def update_child(child_id: str, child_data: ChildUpdate, current_user: User = Depends(get_current_user)):
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

@router.delete("/{child_id}")
async def delete_child(child_id: str, current_user: User = Depends(get_current_user)):
    child = await db.children.find_one({"id": child_id})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if child["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.children.delete_one({"id": child_id})
    await db.progress.delete_one({"child_id": child_id})
    await db.cheers.delete_many({"child_id": child_id})
    return {"message": "Child deleted successfully"}
