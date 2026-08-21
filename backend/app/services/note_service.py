from typing import List, Optional
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.note import Note
from app.schemas.note import NoteCreate, NoteUpdate
from app.services.activity_service import log_activity


async def create_note(db: AsyncSession, user_id: int, note_in: NoteCreate) -> Note:
    note = Note(
        user_id=user_id,
        title=note_in.title,
        content=note_in.content,
        tags=note_in.tags,
        is_pinned=note_in.is_pinned,
    )
    db.add(note)
    await db.flush()

    await log_activity(
        db,
        user_id=user_id,
        action_type="note_created",
        entity_type="note",
        entity_id=str(note.id),
        details={"title": note.title, "tags": note.tags},
    )
    await db.commit()
    await db.refresh(note)
    return note


async def get_notes(
    db: AsyncSession,
    user_id: int,
    search: Optional[str] = None,
    is_pinned: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[Note]:
    query = select(Note).where(Note.user_id == user_id)

    if is_pinned is not None:
        query = query.where(Note.is_pinned == is_pinned)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Note.title.ilike(term),
                Note.content.ilike(term),
                Note.tags.ilike(term),
            )
        )

    # Order pinned notes first, then latest created
    query = (
        query.order_by(desc(Note.is_pinned), desc(Note.updated_at))
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_note_by_id(db: AsyncSession, user_id: int, note_id: int) -> Note:
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == user_id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise NotFoundException("Note", note_id)
    return note


async def update_note(
    db: AsyncSession, user_id: int, note_id: int, note_in: NoteUpdate
) -> Note:
    note = await get_note_by_id(db, user_id, note_id)
    update_data = note_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(note, field, value)

    await log_activity(
        db,
        user_id=user_id,
        action_type="note_updated",
        entity_type="note",
        entity_id=str(note.id),
        details={"title": note.title},
    )
    await db.commit()
    await db.refresh(note)
    return note


async def delete_note(db: AsyncSession, user_id: int, note_id: int) -> bool:
    note = await get_note_by_id(db, user_id, note_id)
    title = note.title
    await db.delete(note)

    await log_activity(
        db,
        user_id=user_id,
        action_type="note_deleted",
        entity_type="note",
        entity_id=str(note_id),
        details={"title": title},
    )
    await db.commit()
    return True
