from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.integrations import VoiceTokenRequest, VoiceTokenResponseOut
from app.services import voice_service

router = APIRouter(prefix="/voice", tags=["LiveKit Voice Agent"])


@router.post("/token", response_model=VoiceTokenResponseOut)
async def generate_voice_token(
    request: VoiceTokenRequest = VoiceTokenRequest(),
    current_user: User = Depends(get_current_user),
):
    token_response = voice_service.generate_livekit_token(
        user_id=current_user.id,
        user_name=request.participant_name or current_user.full_name or f"User {current_user.id}",
        room_name=request.room_name,
    )
    return token_response


@router.get("/status")
async def get_voice_status(current_user: User = Depends(get_current_user)):
    is_ready = bool(
        settings.LIVEKIT_URL and settings.LIVEKIT_API_KEY and settings.LIVEKIT_API_SECRET
    )
    return {
        "voice_agent_configured": is_ready,
        "server_url": settings.LIVEKIT_URL if is_ready else None,
        "missing_credentials": [
            key
            for key, val in [
                ("LIVEKIT_URL", settings.LIVEKIT_URL),
                ("LIVEKIT_API_KEY", settings.LIVEKIT_API_KEY),
                ("LIVEKIT_API_SECRET", settings.LIVEKIT_API_SECRET),
            ]
            if not val or not val.strip()
        ],
    }
