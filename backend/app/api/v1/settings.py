from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.settings import UserSettingsOut, UserSettingsUpdate
from app.services import settings_service

router = APIRouter(prefix="/settings", tags=["User Settings"])


@router.get("/", response_model=UserSettingsOut)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = await settings_service.get_user_settings(db, current_user.id)
    return UserSettingsOut.model_validate(settings)


@router.put("/", response_model=UserSettingsOut)
async def update_settings(
    settings_in: UserSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = await settings_service.update_user_settings(
        db, current_user.id, settings_in
    )
    return UserSettingsOut.model_validate(settings)
