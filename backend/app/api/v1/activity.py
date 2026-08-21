from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.activity import ActivityLogOut, DailySummaryOut
from app.services import activity_service

router = APIRouter(prefix="/activity", tags=["Activity Log & Dashboard Summary"])


@router.get("/", response_model=List[ActivityLogOut])
async def get_activity_log(
    action_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activities = await activity_service.get_activities(
        db, user_id=current_user.id, limit=limit, offset=offset, action_type=action_type
    )
    return [ActivityLogOut.model_validate(a) for a in activities]


@router.get("/summary", response_model=DailySummaryOut)
async def get_daily_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    summary = await activity_service.get_daily_summary(db, current_user.id)
    return summary
