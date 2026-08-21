"""
Thin, lazy singleton wrapper around the Google Gemini SDK (`google-genai`).

This mirrors the role the old `AsyncOpenAI` client played in the orchestrator:
one shared, lazily-constructed client, built only when a GEMINI_API_KEY is
present, so the rest of the app can import `gemini_client` without crashing
when the key hasn't been configured yet.
"""
from typing import Optional

from app.core.config import settings

try:
    from google import genai
except ImportError:  # pragma: no cover - dependency not installed
    genai = None


class GeminiClientProvider:
    def __init__(self) -> None:
        self._client: Optional["genai.Client"] = None
        self._attempted = False

    @property
    def is_configured(self) -> bool:
        return bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())

    def get_client(self) -> Optional["genai.Client"]:
        """Return a cached `genai.Client`, or None if not configured/available."""
        if self._client is not None:
            return self._client
        if self._attempted:
            return None
        self._attempted = True

        if genai is None or not self.is_configured:
            return None

        # NOTE: the API key is read from settings and passed directly to the SDK.
        # It is never logged, printed, or otherwise exposed.
        self._client = genai.Client(api_key=settings.GEMINI_API_KEY.strip())
        return self._client


gemini_client_provider = GeminiClientProvider()
