import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_memories_crud_and_search(client: AsyncClient, auth_headers_a):
    # 1. Save memory
    payload1 = {
        "key": "preferred_language",
        "content": "User prefers Python for backend and React for frontend.",
        "category": "preference",
    }
    payload2 = {
        "key": "project_titan",
        "content": "TITAN is an advanced personal AI command center.",
        "category": "project",
    }

    m1_resp = await client.post("/api/v1/memories/", json=payload1, headers=auth_headers_a)
    assert m1_resp.status_code == 201
    m1_data = m1_resp.json()
    assert m1_data["key"] == "preferred_language"
    m1_id = m1_data["id"]

    m2_resp = await client.post("/api/v1/memories/", json=payload2, headers=auth_headers_a)
    assert m2_resp.status_code == 201

    # 2. List memories by category
    cat_resp = await client.get("/api/v1/memories/?category=preference", headers=auth_headers_a)
    assert cat_resp.status_code == 200
    assert len(cat_resp.json()) == 1
    assert cat_resp.json()[0]["key"] == "preferred_language"

    # 3. Search memories
    search_resp = await client.get("/api/v1/memories/search?query=command+center", headers=auth_headers_a)
    assert search_resp.status_code == 200
    assert len(search_resp.json()) == 1
    assert search_resp.json()[0]["key"] == "project_titan"

    # 4. Upsert memory with same key
    upsert_payload = {
        "key": "preferred_language",
        "content": "User prefers Python 3.12, FastAPI, and React.",
        "category": "preference",
    }
    upsert_resp = await client.post("/api/v1/memories/", json=upsert_payload, headers=auth_headers_a)
    assert upsert_resp.status_code == 201
    assert upsert_resp.json()["id"] == m1_id
    assert "FastAPI" in upsert_resp.json()["content"]

    # 5. Delete memory
    del_resp = await client.delete(f"/api/v1/memories/{m1_id}", headers=auth_headers_a)
    assert del_resp.status_code == 204
