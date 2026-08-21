from fastapi import APIRouter
from app.api.v1 import (
    activity,
    auth,
    chat,
    conversations,
    health,
    maps,
    memories,
    news,
    notes,
    reminders,
    settings,
    tasks,
    voice,
    voice_live,
    weather,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(chat.router)
api_router.include_router(conversations.router)
api_router.include_router(tasks.router)
api_router.include_router(reminders.router)
api_router.include_router(notes.router)
api_router.include_router(memories.router)
api_router.include_router(activity.router)
api_router.include_router(weather.router)
api_router.include_router(news.router)
api_router.include_router(maps.router)
api_router.include_router(voice.router)
api_router.include_router(voice_live.router)
api_router.include_router(settings.router)
api_router.include_router(health.router)
