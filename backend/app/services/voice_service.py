import uuid
from typing import Optional
from app.core.config import settings
from app.core.exceptions import MissingServiceCredentialException
from app.schemas.integrations import VoiceTokenResponseOut


def generate_livekit_token(
    user_id: int,
    user_name: Optional[str] = None,
    room_name: Optional[str] = None,
) -> VoiceTokenResponseOut:
    if (
        not settings.LIVEKIT_URL
        or not settings.LIVEKIT_API_KEY
        or not settings.LIVEKIT_API_SECRET
    ):
        raise MissingServiceCredentialException(
            service_name="LiveKit Voice",
            env_var_name="LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET",
        )

    try:
        from livekit.api import AccessToken, VideoGrants

        identity = f"user_{user_id}_{uuid.uuid4().hex[:6]}"
        name = user_name or f"User {user_id}"
        room = room_name or f"titan_room_{user_id}"

        grant = VideoGrants(
            room_join=True,
            room=room,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
        )

        token = (
            AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
            .with_identity(identity)
            .with_name(name)
            .with_grants(grant)
            .to_jwt()
        )

        return VoiceTokenResponseOut(
            server_url=settings.LIVEKIT_URL,
            room_name=room,
            token=token,
            participant_identity=identity,
            participant_name=name,
        )
    except MissingServiceCredentialException:
        raise
    except Exception as e:
        raise MissingServiceCredentialException(
            service_name="LiveKit Voice",
            env_var_name=f"LIVEKIT credentials error: {str(e)}",
        )
