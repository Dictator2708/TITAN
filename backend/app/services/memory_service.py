from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.memory import Memory
from app.schemas.memory import MemoryCreate, MemoryUpdate
from app.services.activity_service import log_activity


async def save_memory(
    db: AsyncSession, user_id: int, memory_in: MemoryCreate
) -> Memory:
    # Check if a memory with this key already exists for the user
    result = await db.execute(
        select(Memory).where(
            Memory.user_id == user_id, Memory.key.ilike(memory_in.key.strip())
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.content = memory_in.content
        existing.category = memory_in.category or existing.category
        existing.updated_at = datetime.now(timezone.utc)
        memory = existing
        action = "memory_updated"
    else:
        memory = Memory(
            user_id=user_id,
            key=memory_in.key.strip(),
            content=memory_in.content,
            category=memory_in.category or "general",
        )
        db.add(memory)
        action = "memory_saved"

    await db.flush()
    await log_activity(
        db,
        user_id=user_id,
        action_type=action,
        entity_type="memory",
        entity_id=str(memory.id),
        details={"key": memory.key, "category": memory.category},
    )
    await db.commit()
    await db.refresh(memory)
    return memory


async def get_memories(
    db: AsyncSession,
    user_id: int,
    category: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[Memory]:
    query = select(Memory).where(Memory.user_id == user_id)
    if category and category != "all":
        query = query.where(Memory.category == category)

    query = query.order_by(desc(Memory.updated_at)).offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def search_memories(
    db: AsyncSession,
    user_id: int,
    query_str: str,
    category: Optional[str] = None,
    limit: int = 20,
) -> List[Memory]:
    query = select(Memory).where(Memory.user_id == user_id)

    if category and category != "all":
        query = query.where(Memory.category == category)

    if query_str and query_str.strip():
        term = f"%{query_str.strip()}%"
        query = query.where(
            or_(
                Memory.key.ilike(term),
                Memory.content.ilike(term),
                Memory.category.ilike(term),
            )
        )

    query = query.order_by(desc(Memory.updated_at)).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_memory_by_id(
    db: AsyncSession, user_id: int, memory_id: int
) -> Memory:
    result = await db.execute(
        select(Memory).where(Memory.id == memory_id, Memory.user_id == user_id)
    )
    memory = result.scalar_one_or_none()
    if not memory:
        raise NotFoundException("Memory", memory_id)
    return memory


async def update_memory(
    db: AsyncSession, user_id: int, memory_id: int, memory_in: MemoryUpdate
) -> Memory:
    memory = await get_memory_by_id(db, user_id, memory_id)
    update_data = memory_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(memory, field, value)

    await db.commit()
    await db.refresh(memory)
    return memory


async def delete_memory(db: AsyncSession, user_id: int, memory_id: int) -> bool:
    memory = await get_memory_by_id(db, user_id, memory_id)
    key = memory.key
    await db.delete(memory)

    await log_activity(
        db,
        user_id=user_id,
        action_type="memory_deleted",
        entity_type="memory",
        entity_id=str(memory_id),
        details={"key": key},
    )
    await db.commit()
    return True


async def delete_memory_by_key(
    db: AsyncSession, user_id: int, key: str
) -> bool:
    result = await db.execute(
        select(Memory).where(
            Memory.user_id == user_id, Memory.key.ilike(key.strip())
        )
    )
    memory = result.scalar_one_or_none()
    if not memory:
        return False

    await db.delete(memory)
    await log_activity(
        db,
        user_id=user_id,
        action_type="memory_deleted",
        entity_type="memory",
        entity_id=str(memory.id),
        details={"key": memory.key},
    )
    await db.commit()
    return True
