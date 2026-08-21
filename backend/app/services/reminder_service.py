from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.reminder import Reminder
from app.schemas.reminder import ReminderCreate, ReminderUpdate
from app.services.activity_service import log_activity


async def create_reminder(
    db: AsyncSession, user_id: int, reminder_in: ReminderCreate
) -> Reminder:
    # Ensure scheduled_time is timezone-aware
    sched_time = reminder_in.scheduled_time
    if sched_time.tzinfo is None:
        sched_time = sched_time.replace(tzinfo=timezone.utc)

    reminder = Reminder(
        user_id=user_id,
        reminder_text=reminder_in.reminder_text,
        scheduled_time=sched_time,
        status="pending",
    )
    db.add(reminder)
    await db.flush()

    await log_activity(
        db,
        user_id=user_id,
        action_type="reminder_scheduled",
        entity_type="reminder",
        entity_id=str(reminder.id),
        details={
            "reminder_text": reminder.reminder_text,
            "scheduled_time": reminder.scheduled_time.isoformat(),
        },
    )
    await db.commit()
    await db.refresh(reminder)
    return reminder


async def get_reminders(
    db: AsyncSession,
    user_id: int,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[Reminder]:
    query = select(Reminder).where(Reminder.user_id == user_id)
    if status and status != "all":
        query = query.where(Reminder.status == status)

    query = query.order_by(Reminder.scheduled_time.asc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_reminder_by_id(
    db: AsyncSession, user_id: int, reminder_id: int
) -> Reminder:
    result = await db.execute(
        select(Reminder).where(
            Reminder.id == reminder_id, Reminder.user_id == user_id
        )
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise NotFoundException("Reminder", reminder_id)
    return reminder


async def update_reminder(
    db: AsyncSession, user_id: int, reminder_id: int, reminder_in: ReminderUpdate
) -> Reminder:
    reminder = await get_reminder_by_id(db, user_id, reminder_id)
    update_data = reminder_in.model_dump(exclude_unset=True)

    if "scheduled_time" in update_data and update_data["scheduled_time"] is not None:
        st = update_data["scheduled_time"]
        if st.tzinfo is None:
            update_data["scheduled_time"] = st.replace(tzinfo=timezone.utc)

    if "status" in update_data and update_data["status"] == "delivered":
        reminder.delivered_at = datetime.now(timezone.utc)

    for field, value in update_data.items():
        setattr(reminder, field, value)

    await db.commit()
    await db.refresh(reminder)
    return reminder


async def delete_reminder(db: AsyncSession, user_id: int, reminder_id: int) -> bool:
    reminder = await get_reminder_by_id(db, user_id, reminder_id)
    text = reminder.reminder_text
    await db.delete(reminder)

    await log_activity(
        db,
        user_id=user_id,
        action_type="reminder_deleted",
        entity_type="reminder",
        entity_id=str(reminder_id),
        details={"reminder_text": text},
    )
    await db.commit()
    return True


async def get_due_reminders(db: AsyncSession) -> List[Reminder]:
    now_utc = datetime.now(timezone.utc)
    query = select(Reminder).where(
        Reminder.status == "pending",
        Reminder.scheduled_time <= now_utc,
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def mark_reminder_delivered(db: AsyncSession, reminder_id: int) -> Optional[Reminder]:
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    reminder = result.scalar_one_or_none()
    if not reminder:
        return None

    reminder.status = "delivered"
    reminder.delivered_at = datetime.now(timezone.utc)

    await log_activity(
        db,
        user_id=reminder.user_id,
        action_type="reminder_delivered",
        entity_type="reminder",
        entity_id=str(reminder.id),
        details={"reminder_text": reminder.reminder_text},
    )
    await db.commit()
    await db.refresh(reminder)
    return reminder
