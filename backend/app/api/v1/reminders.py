from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.reminder import ReminderCreate, ReminderOut, ReminderUpdate
from app.services import reminder_service
from app.workers.scheduler import active_notifications

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.get("/", response_model=List[ReminderOut])
async def list_reminders(
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminders = await reminder_service.get_reminders(
        db, user_id=current_user.id, status=status, limit=limit, offset=offset
    )
    return [ReminderOut.model_validate(r) for r in reminders]


@router.post("/", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    reminder_in: ReminderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = await reminder_service.create_reminder(
        db, user_id=current_user.id, reminder_in=reminder_in
    )
    return ReminderOut.model_validate(reminder)


@router.get("/notifications/poll", response_model=List[Dict[str, Any]])
async def poll_notifications(current_user: User = Depends(get_current_user)):
    user_notifs = [n for n in active_notifications if n.get("user_id") == current_user.id]
    # Retain only notifications for other users
    active_notifications[:] = [n for n in active_notifications if n.get("user_id") != current_user.id]
    return user_notifs


@router.get("/{reminder_id}", response_model=ReminderOut)
async def get_reminder(
    reminder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = await reminder_service.get_reminder_by_id(
        db, user_id=current_user.id, reminder_id=reminder_id
    )
    return ReminderOut.model_validate(reminder)


@router.put("/{reminder_id}", response_model=ReminderOut)
async def update_reminder(
    reminder_id: int,
    reminder_in: ReminderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = await reminder_service.update_reminder(
        db, user_id=current_user.id, reminder_id=reminder_id, reminder_in=reminder_in
    )
    return ReminderOut.model_validate(reminder)


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(
    reminder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await reminder_service.delete_reminder(
        db, user_id=current_user.id, reminder_id=reminder_id
    )
    return None
