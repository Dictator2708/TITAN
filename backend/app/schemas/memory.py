from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class MemoryBase(BaseModel):
    key: str
    content: str
    category: str = "general"  # preference, project, fact, goal, personal, general


class MemoryCreate(MemoryBase):
    pass


class MemoryUpdate(BaseModel):
    key: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None


class MemoryOut(MemoryBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
