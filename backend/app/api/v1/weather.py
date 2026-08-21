from fastapi import APIRouter, Depends, Query
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.integrations import WeatherForecastOut
from app.services import weather_service

router = APIRouter(prefix="/weather", tags=["Live Weather"])


@router.get("/", response_model=WeatherForecastOut)
async def get_weather(
    location: str = Query("London", min_length=1),
    days: int = Query(3, ge=1, le=7),
    current_user: User = Depends(get_current_user),
):
    weather_data = await weather_service.get_weather_forecast(location=location, days=days)
    return weather_data
