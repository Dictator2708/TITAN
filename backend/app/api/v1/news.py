from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.integrations import NewsResponseOut
from app.services import news_service

router = APIRouter(prefix="/news", tags=["Live News"])


@router.get("/", response_model=NewsResponseOut)
async def get_news(
    category: str = Query("technology"),
    query: Optional[str] = Query(None),
    page_size: int = Query(10, ge=1, le=25),
    current_user: User = Depends(get_current_user),
):
    news_data = await news_service.get_live_news(
        category=category, query=query, page_size=page_size
    )
    return news_data
