from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.note import NoteCreate, NoteOut, NoteUpdate
from app.services import note_service

router = APIRouter(prefix="/notes", tags=["Notes"])


@router.get("/", response_model=List[NoteOut])
async def list_notes(
    search: Optional[str] = Query(None),
    is_pinned: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notes = await note_service.get_notes(
        db,
        user_id=current_user.id,
        search=search,
        is_pinned=is_pinned,
        limit=limit,
        offset=offset,
    )
    return [NoteOut.model_validate(n) for n in notes]


@router.post("/", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    note_in: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = await note_service.create_note(db, user_id=current_user.id, note_in=note_in)
    return NoteOut.model_validate(note)


@router.get("/{note_id}", response_model=NoteOut)
async def get_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = await note_service.get_note_by_id(db, user_id=current_user.id, note_id=note_id)
    return NoteOut.model_validate(note)


@router.put("/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: int,
    note_in: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = await note_service.update_note(
        db, user_id=current_user.id, note_id=note_id, note_in=note_in
    )
    return NoteOut.model_validate(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await note_service.delete_note(db, user_id=current_user.id, note_id=note_id)
    return None
