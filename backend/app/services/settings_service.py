from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.settings import UserSettings
from app.schemas.settings import UserSettingsUpdate


async def get_user_settings(db: AsyncSession, user_id: int) -> UserSettings:
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user_id))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = UserSettings(
            user_id=user_id,
            timezone="UTC",
            theme="dark",
            voice_speed=1.0,
            voice_pitch=1.0,
            notification_enabled=True,
        )
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


async def update_user_settings(
    db: AsyncSession, user_id: int, update_data: UserSettingsUpdate
) -> UserSettings:
    settings = await get_user_settings(db, user_id)
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(settings, field, value)
        
    await db.commit()
    await db.refresh(settings)
    return settings
