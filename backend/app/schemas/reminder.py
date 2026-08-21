from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ReminderBase(BaseModel):
    reminder_text: str
    scheduled_time: datetime


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(BaseModel):
    reminder_text: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    status: Optional[str] = None  # pending, delivered, cancelled


class ReminderOut(ReminderBase):
    id: int
    user_id: int
    status: str
    delivered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
