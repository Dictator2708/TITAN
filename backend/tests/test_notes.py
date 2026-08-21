import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_notes_crud_and_search(client: AsyncClient, auth_headers_a):
    # 1. Create notes
    note1_payload = {
        "title": "TITAN Architecture Notes",
        "content": "FastAPI backend, PostgreSQL database, React frontend, LiveKit voice.",
        "tags": "architecture, titan, python",
        "is_pinned": True,
    }
    note2_payload = {
        "title": "Grocery Shopping List",
        "content": "Milk, eggs, coffee beans, sourdough bread.",
        "tags": "personal, shopping",
        "is_pinned": False,
    }

    n1_resp = await client.post("/api/v1/notes/", json=note1_payload, headers=auth_headers_a)
    assert n1_resp.status_code == 201
    n1_id = n1_resp.json()["id"]

    n2_resp = await client.post("/api/v1/notes/", json=note2_payload, headers=auth_headers_a)
    assert n2_resp.status_code == 201

    # 2. List all notes
    list_resp = await client.get("/api/v1/notes/", headers=auth_headers_a)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 2

    # 3. Filter by pinned
    pinned_resp = await client.get("/api/v1/notes/?is_pinned=true", headers=auth_headers_a)
    assert pinned_resp.status_code == 200
    assert len(pinned_resp.json()) == 1
    assert pinned_resp.json()[0]["id"] == n1_id

    # 4. Search notes
    search_resp = await client.get("/api/v1/notes/?search=FastAPI", headers=auth_headers_a)
    assert search_resp.status_code == 200
    assert len(search_resp.json()) == 1
    assert search_resp.json()[0]["title"] == "TITAN Architecture Notes"

    # 5. Update note
    up_resp = await client.put(
        f"/api/v1/notes/{n1_id}",
        json={"title": "TITAN Architecture Master Plan"},
        headers=auth_headers_a,
    )
    assert up_resp.status_code == 200
    assert up_resp.json()["title"] == "TITAN Architecture Master Plan"

    # 6. Delete note
    del_resp = await client.delete(f"/api/v1/notes/{n1_id}", headers=auth_headers_a)
    assert del_resp.status_code == 204
