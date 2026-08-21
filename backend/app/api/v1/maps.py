from typing import List
from fastapi import APIRouter, Depends, Query
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.integrations import LocationResultOut
from app.services import map_service

router = APIRouter(prefix="/maps", tags=["Interactive Maps & Geocoding"])


@router.get("/search", response_model=List[LocationResultOut])
async def search_locations(
    query: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=10),
    current_user: User = Depends(get_current_user),
):
    results = await map_service.search_locations(query=query, limit=limit)
    return results
