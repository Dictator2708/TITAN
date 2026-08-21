from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict


class ActivityLogCreate(BaseModel):
    action_type: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[Any] = None


class ActivityLogOut(BaseModel):
    id: int
    user_id: int
    action_type: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[Any] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DailySummaryOut(BaseModel):
    date: str
    total_tasks_pending: int
    total_tasks_completed_today: int
    upcoming_reminders_count: int
    total_notes_count: int
    recent_activities: List[ActivityLogOut]
    summary_text: Optional[str] = None
