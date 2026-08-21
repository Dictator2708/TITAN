from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.memory import MemoryCreate, MemoryOut, MemoryUpdate
from app.services import memory_service

router = APIRouter(prefix="/memories", tags=["Memory & Intentional Preferences"])


@router.get("/", response_model=List[MemoryOut])
async def list_memories(
    category: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    memories = await memory_service.get_memories(
        db, user_id=current_user.id, category=category, limit=limit, offset=offset
    )
    return [MemoryOut.model_validate(m) for m in memories]


@router.get("/search", response_model=List[MemoryOut])
async def search_memories(
    query: str = Query(..., min_length=1),
    category: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    memories = await memory_service.search_memories(
        db, user_id=current_user.id, query_str=query, category=category, limit=limit
    )
    return [MemoryOut.model_validate(m) for m in memories]


@router.post("/", response_model=MemoryOut, status_code=status.HTTP_201_CREATED)
async def save_memory(
    memory_in: MemoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    memory = await memory_service.save_memory(db, user_id=current_user.id, memory_in=memory_in)
    return MemoryOut.model_validate(memory)


@router.get("/{memory_id}", response_model=MemoryOut)
async def get_memory(
    memory_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    memory = await memory_service.get_memory_by_id(
        db, user_id=current_user.id, memory_id=memory_id
    )
    return MemoryOut.model_validate(memory)


@router.put("/{memory_id}", response_model=MemoryOut)
async def update_memory(
    memory_id: int,
    memory_in: MemoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    memory = await memory_service.update_memory(
        db, user_id=current_user.id, memory_id=memory_id, memory_in=memory_in
    )
    return MemoryOut.model_validate(memory)


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(
    memory_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await memory_service.delete_memory(db, user_id=current_user.id, memory_id=memory_id)
    return None
