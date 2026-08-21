from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.session import get_db
from app.schemas.integrations import CredentialStatus, HealthStatusOut

router = APIRouter(prefix="/health", tags=["System Health & Diagnostics"])


@router.get("/", response_model=HealthStatusOut)
async def check_health(db: AsyncSession = Depends(get_db)):
    db_ok = False
    try:
        res = await db.execute(text("SELECT 1"))
        db_ok = res.scalar() == 1
    except Exception:
        db_ok = False

    credentials = [
        CredentialStatus(
            name="OpenAI AI Orchestration",
            env_var="OPENAI_API_KEY",
            configured=bool(settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip()),
            description="Powers TITAN's natural language comprehension, dynamic reasoning, and tool selection.",
        ),
        CredentialStatus(
            name="LiveKit Voice Platform",
            env_var="LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET",
            configured=bool(
                settings.LIVEKIT_URL
                and settings.LIVEKIT_API_KEY
                and settings.LIVEKIT_API_SECRET
            ),
            description="Enables low-latency, real-time bidirectional voice streaming.",
        ),
        CredentialStatus(
            name="WeatherAPI (Optional)",
            env_var="WEATHER_API_KEY",
            configured=bool(settings.WEATHER_API_KEY and settings.WEATHER_API_KEY.strip()),
            description="Optional premium weather provider. Open-Meteo zero-key fallback is active by default.",
        ),
        CredentialStatus(
            name="NewsAPI (Optional)",
            env_var="NEWS_API_KEY",
            configured=bool(settings.NEWS_API_KEY and settings.NEWS_API_KEY.strip()),
            description="Optional global news provider. Live tech/AI developer feeds are active by default.",
        ),
        CredentialStatus(
            name="Mapbox Token (Optional)",
            env_var="MAPBOX_TOKEN",
            configured=bool(settings.MAPBOX_TOKEN and settings.MAPBOX_TOKEN.strip()),
            description="Optional custom vector tiles. OpenStreetMap Leaflet tiles are active by default.",
        ),
    ]

    return HealthStatusOut(
        status="healthy" if db_ok else "degraded",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database_connected=db_ok,
        credentials=credentials,
    )
