from datetime import datetime, timezone
from typing import Any, List, Optional
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityLog
from app.models.task import Task
from app.models.reminder import Reminder
from app.models.note import Note
from app.schemas.activity import DailySummaryOut, ActivityLogOut


async def log_activity(
    db: AsyncSession,
    user_id: int,
    action_type: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[Any] = None,
) -> ActivityLog:
    log = ActivityLog(
        user_id=user_id,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details,
        created_at=datetime.now(timezone.utc),
    )
    db.add(log)
    await db.flush()
    return log


async def get_activities(
    db: AsyncSession,
    user_id: int,
    limit: int = 50,
    offset: int = 0,
    action_type: Optional[str] = None,
) -> List[ActivityLog]:
    query = (
        select(ActivityLog)
        .where(ActivityLog.user_id == user_id)
        .order_by(desc(ActivityLog.created_at))
        .offset(offset)
        .limit(limit)
    )
    if action_type:
        query = query.where(ActivityLog.action_type == action_type)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_daily_summary(db: AsyncSession, user_id: int) -> DailySummaryOut:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # 1. Pending tasks
    pending_tasks_res = await db.execute(
        select(func.count(Task.id)).where(
            Task.user_id == user_id,
            Task.status.in_(["pending", "in_progress"])
        )
    )
    pending_tasks_count = pending_tasks_res.scalar() or 0

    # 2. Completed tasks today
    completed_today_res = await db.execute(
        select(func.count(Task.id)).where(
            Task.user_id == user_id,
            Task.status == "completed",
            Task.completed_at >= today_start
        )
    )
    completed_today_count = completed_today_res.scalar() or 0

    # 3. Upcoming reminders count
    reminders_res = await db.execute(
        select(func.count(Reminder.id)).where(
            Reminder.user_id == user_id,
            Reminder.status == "pending"
        )
    )
    upcoming_reminders_count = reminders_res.scalar() or 0

    # 4. Notes count
    notes_res = await db.execute(
        select(func.count(Note.id)).where(Note.user_id == user_id)
    )
    notes_count = notes_res.scalar() or 0

    # 5. Recent activity
    recent_logs = await get_activities(db, user_id, limit=8)

    summary_text = (
        f"You have {pending_tasks_count} pending task{'s' if pending_tasks_count != 1 else ''}, "
        f"{upcoming_reminders_count} upcoming reminder{'s' if upcoming_reminders_count != 1 else ''}, and "
        f"{completed_today_count} task{'s' if completed_today_count != 1 else ''} completed today."
    )

    return DailySummaryOut(
        date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        total_tasks_pending=pending_tasks_count,
        total_tasks_completed_today=completed_today_count,
        upcoming_reminders_count=upcoming_reminders_count,
        total_notes_count=notes_count,
        recent_activities=[ActivityLogOut.model_validate(log) for log in recent_logs],
        summary_text=summary_text,
    )
