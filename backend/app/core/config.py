import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "TITAN"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "titan_super_secret_jwt_key_change_in_production_2026_x99!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/titan"
    DATABASE_ECHO: bool = False
    
    # AI Orchestration (legacy OpenAI - kept for backward compatibility, no longer used by default)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # AI Orchestration - Google Gemini (current primary provider)
    GEMINI_API_KEY: str = ""
    # Primary model - used for the real-time Gemini Live voice pipeline (audio-to-audio, WebSocket only)
    GEMINI_MODEL: str = "gemini-3.1-flash-live-preview"
    # Text/tool-calling model - used for the synchronous chat + function-calling orchestrator.
    # NOTE: Live models (e.g. gemini-3.1-flash-live-preview) are only reachable through the
    # WebSocket Live API and do NOT support the standard generateContent call used by the text
    # orchestrator, so a separate, generateContent-compatible model is configured here.
    GEMINI_TEXT_MODEL: str = "gemini-2.5-flash"

    # Computer-assistant tools (file/command tools) - restrict filesystem + shell access
    TITAN_FS_ROOT: str = os.getcwd()
    TITAN_ALLOW_SHELL_TOOL: bool = True
    
    # LiveKit Voice
    LIVEKIT_URL: str = ""
    LIVEKIT_API_KEY: str = ""
    LIVEKIT_API_SECRET: str = ""
    
    # External Information Services
    WEATHER_API_KEY: str = ""
    NEWS_API_KEY: str = ""
    MAPBOX_TOKEN: str = ""
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )


settings = Settings()
