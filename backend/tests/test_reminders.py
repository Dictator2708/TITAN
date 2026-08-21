from datetime import datetime, timezone
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_reminders_crud(client: AsyncClient, auth_headers_a):
    sched = datetime.now(timezone.utc).isoformat()
    # 1. Create reminder
    payload = {
        "reminder_text": "Call Rahul at 8 PM",
        "scheduled_time": sched,
    }
    create_resp = await client.post("/api/v1/reminders/", json=payload, headers=auth_headers_a)
    assert create_resp.status_code == 201
    reminder = create_resp.json()
    assert reminder["reminder_text"] == "Call Rahul at 8 PM"
    assert reminder["status"] == "pending"
    rem_id = reminder["id"]

    # 2. Get reminder
    get_resp = await client.get(f"/api/v1/reminders/{rem_id}", headers=auth_headers_a)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == rem_id

    # 3. List reminders
    list_resp = await client.get("/api/v1/reminders/", headers=auth_headers_a)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    # 4. Update reminder
    up_resp = await client.put(
        f"/api/v1/reminders/{rem_id}",
        json={"reminder_text": "Call Rahul at 8:30 PM", "status": "delivered"},
        headers=auth_headers_a,
    )
    assert up_resp.status_code == 200
    assert up_resp.json()["status"] == "delivered"
    assert up_resp.json()["reminder_text"] == "Call Rahul at 8:30 PM"

    # 5. Delete reminder
    del_resp = await client.delete(f"/api/v1/reminders/{rem_id}", headers=auth_headers_a)
    assert del_resp.status_code == 204
