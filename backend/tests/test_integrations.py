import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_health_check(client: AsyncClient):
    response = await client.get("/api/v1/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "credentials" in data
    assert len(data["credentials"]) >= 5


async def test_weather_endpoint(client: AsyncClient, auth_headers_a):
    response = await client.get("/api/v1/weather/?location=London&days=2", headers=auth_headers_a)
    assert response.status_code == 200
    data = response.json()
    assert "current" in data
    assert "London" in data["current"]["location_name"]
    assert "temperature_c" in data["current"]
    assert len(data["forecast"]) >= 1


async def test_news_endpoint(client: AsyncClient, auth_headers_a):
    response = await client.get("/api/v1/news/?category=technology", headers=auth_headers_a)
    assert response.status_code == 200
    data = response.json()
    assert "articles" in data
    assert isinstance(data["articles"], list)


async def test_maps_endpoint(client: AsyncClient, auth_headers_a):
    response = await client.get("/api/v1/maps/search?query=Berlin", headers=auth_headers_a)
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    if len(results) > 0:
        assert "latitude" in results[0]
        assert "longitude" in results[0]


async def test_voice_status_endpoint(client: AsyncClient, auth_headers_a):
    response = await client.get("/api/v1/voice/status", headers=auth_headers_a)
    assert response.status_code == 200
    data = response.json()
    assert "voice_agent_configured" in data
    assert "missing_credentials" in data
