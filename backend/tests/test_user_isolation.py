import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_task_user_isolation(client: AsyncClient, auth_headers_a, auth_headers_b):
    # User A creates a task
    create_resp = await client.post(
        "/api/v1/tasks/",
        json={"title": "Alex's Secret Task", "priority": "high"},
        headers=auth_headers_a,
    )
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    # User B tries to get User A's task -> 404
    get_resp = await client.get(f"/api/v1/tasks/{task_id}", headers=auth_headers_b)
    assert get_resp.status_code == 404

    # User B lists tasks -> should not see User A's task
    list_resp = await client.get("/api/v1/tasks/", headers=auth_headers_b)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 0

    # User B tries to update User A's task -> 404
    update_resp = await client.put(
        f"/api/v1/tasks/{task_id}",
        json={"title": "Hacked Title"},
        headers=auth_headers_b,
    )
    assert update_resp.status_code == 404

    # User B tries to delete User A's task -> 404
    del_resp = await client.delete(f"/api/v1/tasks/{task_id}", headers=auth_headers_b)
    assert del_resp.status_code == 404


async def test_note_user_isolation(client: AsyncClient, auth_headers_a, auth_headers_b):
    # User A creates a note
    create_resp = await client.post(
        "/api/v1/notes/",
        json={"title": "Alex Private Note", "content": "Confidential data"},
        headers=auth_headers_a,
    )
    assert create_resp.status_code == 201
    note_id = create_resp.json()["id"]

    # User B tries to access note -> 404
    get_resp = await client.get(f"/api/v1/notes/{note_id}", headers=auth_headers_b)
    assert get_resp.status_code == 404


async def test_memory_user_isolation(client: AsyncClient, auth_headers_a, auth_headers_b):
    # User A saves memory
    create_resp = await client.post(
        "/api/v1/memories/",
        json={"key": "favorite_editor", "content": "Neovim", "category": "preference"},
        headers=auth_headers_a,
    )
    assert create_resp.status_code == 201

    # User B searches memory for 'Neovim' -> 0 results
    search_resp = await client.get(
        "/api/v1/memories/search?query=Neovim", headers=auth_headers_b
    )
    assert search_resp.status_code == 200
    assert len(search_resp.json()) == 0


async def test_conversation_user_isolation(client: AsyncClient, auth_headers_a, auth_headers_b):
    # User A creates conversation
    conv_resp = await client.post(
        "/api/v1/conversations/",
        json={"title": "Classified Discussion"},
        headers=auth_headers_a,
    )
    assert conv_resp.status_code == 201
    conv_id = conv_resp.json()["id"]

    # User B cannot access conversation
    get_resp = await client.get(f"/api/v1/conversations/{conv_id}", headers=auth_headers_b)
    assert get_resp.status_code == 404
