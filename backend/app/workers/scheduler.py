import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database.session import AsyncSessionLocal
from app.services.reminder_service import get_due_reminders, mark_reminder_delivered

logger = logging.getLogger("titan.scheduler")

scheduler = AsyncIOScheduler()

# In-memory notification dispatch buffer for real-time alerts
active_notifications: List[Dict[str, Any]] = []


async def check_due_reminders():
    try:
        async with AsyncSessionLocal() as db:
            due = await get_due_reminders(db)
            if due:
                logger.info(f"Processing {len(due)} due reminders...")
                for rem in due:
                    updated = await mark_reminder_delivered(db, rem.id)
                    if updated:
                        active_notifications.append({
                            "id": f"rem_{updated.id}_{int(datetime.now(timezone.utc).timestamp())}",
                            "user_id": updated.user_id,
                            "type": "reminder",
                            "title": "Reminder Alert",
                            "message": updated.reminder_text,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                        })
    except Exception as e:
        logger.error(f"Error checking due reminders: {e}")


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            check_due_reminders,
            "interval",
            seconds=15,
            id="check_due_reminders",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("TITAN background scheduler started.")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("TITAN background scheduler stopped.")
