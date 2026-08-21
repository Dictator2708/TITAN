import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.ai.tools.executor import execute_tool

pytestmark = pytest.mark.asyncio


async def test_tool_executor_tasks(db_session: AsyncSession, test_user_a):
    # 1. create_task tool
    res = await execute_tool(
        db=db_session,
        user_id=test_user_a.id,
        tool_name="create_task",
        tool_args={
            "title": "Study Neural Networks",
            "priority": "high",
            "due_date": "2026-08-22",
            "due_time": "10:30",
        },
    )
    assert res["success"] is True
    assert res["task"]["title"] == "Study Neural Networks"
    task_id = res["task"]["id"]

    # 2. list_tasks tool
    list_res = await execute_tool(
        db=db_session,
        user_id=test_user_a.id,
        tool_name="list_tasks",
        tool_args={"priority": "high"},
    )
    assert list_res["success"] is True
    assert list_res["count"] >= 1

    # 3. complete_task tool
    comp_res = await execute_tool(
        db=db_session,
        user_id=test_user_a.id,
        tool_name="complete_task",
        tool_args={"task_id": task_id},
    )
    assert comp_res["success"] is True
    assert comp_res["task"]["status"] == "completed"


async def test_tool_executor_notes_and_memory(db_session: AsyncSession, test_user_a):
    # 1. create_note tool
    note_res = await execute_tool(
        db=db_session,
        user_id=test_user_a.id,
        tool_name="create_note",
        tool_args={"title": "Voice Pipeline Spec", "content": "LiveKit + WebRTC + OpenAI"},
    )
    assert note_res["success"] is True
    assert note_res["note"]["title"] == "Voice Pipeline Spec"

    # 2. save_memory tool
    mem_res = await execute_tool(
        db=db_session,
        user_id=test_user_a.id,
        tool_name="save_memory",
        tool_args={
            "key": "framework_choice",
            "content": "User prefers React with Vite for fast frontend iteration.",
            "category": "preference",
        },
    )
    assert mem_res["success"] is True
    assert mem_res["memory"]["key"] == "framework_choice"

    # 3. search_memory tool
    search_res = await execute_tool(
        db=db_session,
        user_id=test_user_a.id,
        tool_name="search_memory",
        tool_args={"query": "Vite"},
    )
    assert search_res["success"] is True
    assert search_res["count"] >= 1


async def test_tool_executor_daily_summary(db_session: AsyncSession, test_user_a):
    summary_res = await execute_tool(
        db=db_session,
        user_id=test_user_a.id,
        tool_name="get_daily_summary",
        tool_args={},
    )
    assert summary_res["success"] is True
    assert "summary" in summary_res
