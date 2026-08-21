import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_tasks_crud(client: AsyncClient, auth_headers_a):
    # 1. Create task
    payload = {
        "title": "Study PostgreSQL Indexing",
        "description": "B-Tree, GIN, and GiST indexes deep dive",
        "priority": "high",
        "due_date": "2026-08-20",
        "due_time": "14:00",
    }
    create_resp = await client.post("/api/v1/tasks/", json=payload, headers=auth_headers_a)
    assert create_resp.status_code == 201
    task = create_resp.json()
    assert task["title"] == payload["title"]
    assert task["priority"] == "high"
    assert task["status"] == "pending"
    task_id = task["id"]

    # 2. Get task
    get_resp = await client.get(f"/api/v1/tasks/{task_id}", headers=auth_headers_a)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == task_id

    # 3. List tasks
    list_resp = await client.get("/api/v1/tasks/", headers=auth_headers_a)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    # 4. Filter tasks by priority
    filter_resp = await client.get("/api/v1/tasks/?priority=high", headers=auth_headers_a)
    assert filter_resp.status_code == 200
    assert len(filter_resp.json()) == 1

    filter_empty = await client.get("/api/v1/tasks/?priority=low", headers=auth_headers_a)
    assert filter_empty.status_code == 200
    assert len(filter_empty.json()) == 0

    # 5. Complete task
    comp_resp = await client.post(f"/api/v1/tasks/{task_id}/complete", headers=auth_headers_a)
    assert comp_resp.status_code == 200
    assert comp_resp.json()["status"] == "completed"
    assert comp_resp.json()["completed_at"] is not None

    # 6. Delete task
    del_resp = await client.delete(f"/api/v1/tasks/{task_id}", headers=auth_headers_a)
    assert del_resp.status_code == 204

    # 7. Verify deletion
    verify_resp = await client.get(f"/api/v1/tasks/{task_id}", headers=auth_headers_a)
    assert verify_resp.status_code == 404
