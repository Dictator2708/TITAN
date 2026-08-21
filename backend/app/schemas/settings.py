from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class UserSettingsBase(BaseModel):
    timezone: str = "UTC"
    theme: str = "dark"
    voice_speed: float = 1.0
    voice_pitch: float = 1.0
    notification_enabled: bool = True
    custom_prompt_instructions: Optional[str] = None


class UserSettingsUpdate(BaseModel):
    timezone: Optional[str] = None
    theme: Optional[str] = None
    voice_speed: Optional[float] = None
    voice_pitch: Optional[float] = None
    notification_enabled: Optional[bool] = None
    custom_prompt_instructions: Optional[str] = None


class UserSettingsOut(UserSettingsBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
