import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_activity_logging_and_summary(client: AsyncClient, auth_headers_a):
    # Perform various actions that generate activity logs
    # 1. Create a task
    await client.post(
        "/api/v1/tasks/",
        json={"title": "Test Activity Task", "priority": "urgent"},
        headers=auth_headers_a,
    )
    # 2. Create a note
    await client.post(
        "/api/v1/notes/",
        json={"title": "Test Activity Note", "content": "Sample content"},
        headers=auth_headers_a,
    )

    # 3. Get activity log
    act_resp = await client.get("/api/v1/activity/", headers=auth_headers_a)
    assert act_resp.status_code == 200
    activities = act_resp.json()
    assert len(activities) >= 2
    action_types = [a["action_type"] for a in activities]
    assert "task_created" in action_types
    assert "note_created" in action_types

    # 4. Get daily summary
    summary_resp = await client.get("/api/v1/activity/summary", headers=auth_headers_a)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["total_tasks_pending"] >= 1
    assert summary["total_notes_count"] >= 1
    assert "You have" in summary["summary_text"]
