from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class WeatherRequest(BaseModel):
    location: str
    days: Optional[int] = 3


class WeatherCurrentOut(BaseModel):
    location_name: str
    country: Optional[str] = None
    region: Optional[str] = None
    latitude: float
    longitude: float
    temperature_c: float
    temperature_f: float
    condition_text: str
    condition_icon: Optional[str] = None
    humidity: int
    wind_kph: float
    feels_like_c: float
    uv_index: Optional[float] = None
    is_day: bool = True
    provider: str = "Open-Meteo"


class WeatherDayForecast(BaseModel):
    date: str
    max_temp_c: float
    min_temp_c: float
    condition_text: str
    precipitation_prob: Optional[int] = None
    uv_index: Optional[float] = None


class WeatherForecastOut(BaseModel):
    current: WeatherCurrentOut
    forecast: List[WeatherDayForecast]


class NewsRequest(BaseModel):
    category: Optional[str] = "technology"  # technology, ai, general, business, science
    query: Optional[str] = None
    page_size: Optional[int] = 10


class NewsArticleOut(BaseModel):
    title: str
    description: Optional[str] = None
    url: str
    source_name: str
    image_url: Optional[str] = None
    published_at: Optional[str] = None
    category: Optional[str] = "general"


class NewsResponseOut(BaseModel):
    category: str
    query: Optional[str] = None
    total_results: int
    articles: List[NewsArticleOut]
    provider: str


class LocationSearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 5


class LocationResultOut(BaseModel):
    display_name: str
    latitude: float
    longitude: float
    place_type: Optional[str] = None
    bounding_box: Optional[List[float]] = None
    address_details: Optional[Dict[str, Any]] = None


class VoiceTokenRequest(BaseModel):
    room_name: Optional[str] = None
    participant_name: Optional[str] = None


class VoiceTokenResponseOut(BaseModel):
    server_url: str
    room_name: str
    token: str
    participant_identity: str
    participant_name: str


class CredentialStatus(BaseModel):
    name: str
    env_var: str
    configured: bool
    description: str


class HealthStatusOut(BaseModel):
    status: str
    version: str
    environment: str
    database_connected: bool
    credentials: List[CredentialStatus]
