import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_register_user(client: AsyncClient):
    payload = {
        "email": "newuser@titan.ai",
        "password": "SecurePassword123!",
        "full_name": "New User",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "newuser@titan.ai"
    assert data["user"]["full_name"] == "New User"


async def test_register_duplicate_email(client: AsyncClient, test_user_a):
    payload = {
        "email": "alex@titan.ai",
        "password": "AnyPassword123!",
        "full_name": "Duplicate Alex",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


async def test_login_success(client: AsyncClient, test_user_a):
    payload = {
        "email": "alex@titan.ai",
        "password": "TitanPassword123!",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alex@titan.ai"


async def test_login_invalid_password(client: AsyncClient, test_user_a):
    payload = {
        "email": "alex@titan.ai",
        "password": "WrongPassword!",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401


async def test_get_current_user_profile(client: AsyncClient, auth_headers_a):
    response = await client.get("/api/v1/auth/me", headers=auth_headers_a)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "alex@titan.ai"
    assert data["full_name"] == "Alex Mercer"


async def test_update_current_user_profile(client: AsyncClient, auth_headers_a):
    payload = {"full_name": "Alexander Mercer"}
    response = await client.put("/api/v1/auth/me", json=payload, headers=auth_headers_a)
    assert response.status_code == 200
    assert response.json()["full_name"] == "Alexander Mercer"
