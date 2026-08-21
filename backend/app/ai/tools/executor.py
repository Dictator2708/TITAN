from datetime import date, datetime, time, timezone
import json
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.task import TaskCreate, TaskUpdate
from app.schemas.reminder import ReminderCreate, ReminderUpdate
from app.schemas.note import NoteCreate, NoteUpdate
from app.schemas.memory import MemoryCreate
from app.services import (
    task_service,
    reminder_service,
    note_service,
    memory_service,
    activity_service,
    conversation_service,
    weather_service,
    news_service,
    map_service,
)
from app.services.activity_service import log_activity
from app.ai.tools import system_tools


def parse_date_str(val: Optional[str]) -> Optional[date]:
    if not val:
        return None
    try:
        return datetime.strptime(val.strip(), "%Y-%m-%d").date()
    except Exception:
        return None


def parse_time_str(val: Optional[str]) -> Optional[time]:
    if not val:
        return None
    try:
        parts = val.strip().split(":")
        return time(hour=int(parts[0]), minute=int(parts[1]))
    except Exception:
        return None


def parse_datetime_str(val: Optional[str]) -> datetime:
    if not val:
        return datetime.now(timezone.utc)
    try:
        clean_val = val.strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_val)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


async def execute_tool(
    db: AsyncSession,
    user_id: int,
    tool_name: str,
    tool_args: Dict[str, Any],
    current_conversation_id: Optional[str] = None,
) -> Dict[str, Any]:
    try:
        # ------------------- TASKS -------------------
        if tool_name == "create_task":
            due_date = parse_date_str(tool_args.get("due_date"))
            due_time = parse_time_str(tool_args.get("due_time"))
            task_in = TaskCreate(
                title=tool_args["title"],
                description=tool_args.get("description"),
                status=tool_args.get("status", "pending"),
                priority=tool_args.get("priority", "medium"),
                due_date=due_date,
                due_time=due_time,
            )
            task = await task_service.create_task(db, user_id, task_in)
            return {
                "success": True,
                "action": "task_created",
                "task": {
                    "id": task.id,
                    "title": task.title,
                    "status": task.status,
                    "priority": task.priority,
                    "due_date": str(task.due_date) if task.due_date else None,
                    "due_time": str(task.due_time) if task.due_time else None,
                },
            }

        elif tool_name == "list_tasks":
            due_date = parse_date_str(tool_args.get("due_date"))
            tasks = await task_service.get_tasks(
                db,
                user_id=user_id,
                status=tool_args.get("status"),
                priority=tool_args.get("priority"),
                search=tool_args.get("search"),
                due_date=due_date,
            )
            return {
                "success": True,
                "count": len(tasks),
                "tasks": [
                    {
                        "id": t.id,
                        "title": t.title,
                        "status": t.status,
                        "priority": t.priority,
                        "due_date": str(t.due_date) if t.due_date else None,
                        "due_time": str(t.due_time) if t.due_time else None,
                        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                    }
                    for t in tasks
                ],
            }

        elif tool_name == "get_task":
            task = await task_service.get_task_by_id(db, user_id, int(tool_args["task_id"]))
            return {
                "success": True,
                "task": {
                    "id": task.id,
                    "title": task.title,
                    "description": task.description,
                    "status": task.status,
                    "priority": task.priority,
                    "due_date": str(task.due_date) if task.due_date else None,
                    "due_time": str(task.due_time) if task.due_time else None,
                },
            }

        elif tool_name == "update_task":
            task_id = int(tool_args["task_id"])
            update_kwargs: Dict[str, Any] = {}
            if "title" in tool_args:
                update_kwargs["title"] = tool_args["title"]
            if "description" in tool_args:
                update_kwargs["description"] = tool_args["description"]
            if "status" in tool_args:
                update_kwargs["status"] = tool_args["status"]
            if "priority" in tool_args:
                update_kwargs["priority"] = tool_args["priority"]
            if "due_date" in tool_args:
                update_kwargs["due_date"] = parse_date_str(tool_args["due_date"])
            if "due_time" in tool_args:
                update_kwargs["due_time"] = parse_time_str(tool_args["due_time"])

            task_update = TaskUpdate(**update_kwargs)
            task = await task_service.update_task(db, user_id, task_id, task_update)
            return {
                "success": True,
                "action": "task_updated",
                "task": {
                    "id": task.id,
                    "title": task.title,
                    "status": task.status,
                    "priority": task.priority,
                },
            }

        elif tool_name == "complete_task":
            task = await task_service.complete_task(db, user_id, int(tool_args["task_id"]))
            return {
                "success": True,
                "action": "task_completed",
                "task": {"id": task.id, "title": task.title, "status": task.status},
            }

        elif tool_name == "delete_task":
            await task_service.delete_task(db, user_id, int(tool_args["task_id"]))
            return {"success": True, "action": "task_deleted", "task_id": tool_args["task_id"]}

        # ------------------- REMINDERS -------------------
        elif tool_name == "create_reminder":
            sched_time = parse_datetime_str(tool_args["scheduled_time"])
            rem_in = ReminderCreate(
                reminder_text=tool_args["reminder_text"],
                scheduled_time=sched_time,
            )
            reminder = await reminder_service.create_reminder(db, user_id, rem_in)
            return {
                "success": True,
                "action": "reminder_created",
                "reminder": {
                    "id": reminder.id,
                    "reminder_text": reminder.reminder_text,
                    "scheduled_time": reminder.scheduled_time.isoformat(),
                    "status": reminder.status,
                },
            }

        elif tool_name == "list_reminders":
            reminders = await reminder_service.get_reminders(
                db, user_id=user_id, status=tool_args.get("status")
            )
            return {
                "success": True,
                "count": len(reminders),
                "reminders": [
                    {
                        "id": r.id,
                        "reminder_text": r.reminder_text,
                        "scheduled_time": r.scheduled_time.isoformat(),
                        "status": r.status,
                        "delivered_at": r.delivered_at.isoformat() if r.delivered_at else None,
                    }
                    for r in reminders
                ],
            }

        elif tool_name == "get_reminder":
            reminder = await reminder_service.get_reminder_by_id(
                db, user_id, int(tool_args["reminder_id"])
            )
            return {
                "success": True,
                "reminder": {
                    "id": reminder.id,
                    "reminder_text": reminder.reminder_text,
                    "scheduled_time": reminder.scheduled_time.isoformat(),
                    "status": reminder.status,
                },
            }

        elif tool_name == "update_reminder":
            rem_id = int(tool_args["reminder_id"])
            update_kwargs = {}
            if "reminder_text" in tool_args:
                update_kwargs["reminder_text"] = tool_args["reminder_text"]
            if "scheduled_time" in tool_args:
                update_kwargs["scheduled_time"] = parse_datetime_str(tool_args["scheduled_time"])
            if "status" in tool_args:
                update_kwargs["status"] = tool_args["status"]

            rem_update = ReminderUpdate(**update_kwargs)
            reminder = await reminder_service.update_reminder(db, user_id, rem_id, rem_update)
            return {
                "success": True,
                "action": "reminder_updated",
                "reminder": {
                    "id": reminder.id,
                    "reminder_text": reminder.reminder_text,
                    "scheduled_time": reminder.scheduled_time.isoformat(),
                    "status": reminder.status,
                },
            }

        elif tool_name == "delete_reminder":
            await reminder_service.delete_reminder(db, user_id, int(tool_args["reminder_id"]))
            return {
                "success": True,
                "action": "reminder_deleted",
                "reminder_id": tool_args["reminder_id"],
            }

        # ------------------- NOTES -------------------
        elif tool_name == "create_note":
            note_in = NoteCreate(
                title=tool_args["title"],
                content=tool_args["content"],
                tags=tool_args.get("tags"),
                is_pinned=tool_args.get("is_pinned", False),
            )
            note = await note_service.create_note(db, user_id, note_in)
            return {
                "success": True,
                "action": "note_created",
                "note": {
                    "id": note.id,
                    "title": note.title,
                    "content": note.content,
                    "tags": note.tags,
                    "is_pinned": note.is_pinned,
                },
            }

        elif tool_name == "search_notes":
            notes = await note_service.get_notes(
                db,
                user_id=user_id,
                search=tool_args.get("query"),
                is_pinned=tool_args.get("is_pinned"),
            )
            return {
                "success": True,
                "count": len(notes),
                "notes": [
                    {
                        "id": n.id,
                        "title": n.title,
                        "content": n.content,
                        "tags": n.tags,
                        "is_pinned": n.is_pinned,
                    }
                    for n in notes
                ],
            }

        elif tool_name == "get_note":
            note = await note_service.get_note_by_id(db, user_id, int(tool_args["note_id"]))
            return {
                "success": True,
                "note": {
                    "id": note.id,
                    "title": note.title,
                    "content": note.content,
                    "tags": note.tags,
                    "is_pinned": note.is_pinned,
                },
            }

        elif tool_name == "update_note":
            note_id = int(tool_args["note_id"])
            update_kwargs = {}
            for k in ["title", "content", "tags", "is_pinned"]:
                if k in tool_args:
                    update_kwargs[k] = tool_args[k]

            note_update = NoteUpdate(**update_kwargs)
            note = await note_service.update_note(db, user_id, note_id, note_update)
            return {
                "success": True,
                "action": "note_updated",
                "note": {"id": note.id, "title": note.title},
            }

        elif tool_name == "delete_note":
            await note_service.delete_note(db, user_id, int(tool_args["note_id"]))
            return {"success": True, "action": "note_deleted", "note_id": tool_args["note_id"]}

        # ------------------- MEMORY -------------------
        elif tool_name == "save_memory":
            mem_in = MemoryCreate(
                key=tool_args["key"],
                content=tool_args["content"],
                category=tool_args.get("category", "general"),
            )
            memory = await memory_service.save_memory(db, user_id, mem_in)
            return {
                "success": True,
                "action": "memory_saved",
                "memory": {
                    "id": memory.id,
                    "key": memory.key,
                    "content": memory.content,
                    "category": memory.category,
                },
            }

        elif tool_name == "search_memory":
            memories = await memory_service.search_memories(
                db,
                user_id=user_id,
                query_str=tool_args.get("query", ""),
                category=tool_args.get("category"),
            )
            return {
                "success": True,
                "count": len(memories),
                "memories": [
                    {
                        "id": m.id,
                        "key": m.key,
                        "content": m.content,
                        "category": m.category,
                    }
                    for m in memories
                ],
            }

        elif tool_name == "delete_memory":
            if "key" in tool_args and tool_args["key"]:
                deleted = await memory_service.delete_memory_by_key(db, user_id, tool_args["key"])
                return {"success": deleted, "action": "memory_deleted", "key": tool_args["key"]}
            elif "memory_id" in tool_args and tool_args["memory_id"]:
                deleted = await memory_service.delete_memory(db, user_id, int(tool_args["memory_id"]))
                return {"success": deleted, "action": "memory_deleted", "memory_id": tool_args["memory_id"]}
            return {"success": False, "error": "Either 'key' or 'memory_id' must be provided"}

        # ------------------- ACTIVITY -------------------
        elif tool_name == "get_activity":
            limit = int(tool_args.get("limit", 20))
            action_type = tool_args.get("action_type")
            activities = await activity_service.get_activities(
                db, user_id=user_id, limit=limit, action_type=action_type
            )
            return {
                "success": True,
                "count": len(activities),
                "activities": [
                    {
                        "action_type": a.action_type,
                        "entity_type": a.entity_type,
                        "details": a.details,
                        "created_at": a.created_at.isoformat(),
                    }
                    for a in activities
                ],
            }

        elif tool_name == "get_daily_summary":
            summary = await activity_service.get_daily_summary(db, user_id)
            return {
                "success": True,
                "summary": summary.model_dump(),
            }

        # ------------------- INFORMATION -------------------
        elif tool_name == "get_weather":
            location = tool_args.get("location", "London")
            days = int(tool_args.get("days", 3))
            weather_data = await weather_service.get_weather_forecast(location, days=days)
            return {
                "success": True,
                "weather": weather_data.model_dump(),
            }

        elif tool_name == "get_news":
            category = tool_args.get("category", "technology")
            query = tool_args.get("query")
            page_size = int(tool_args.get("page_size", 5))
            news_data = await news_service.get_live_news(category=category, query=query, page_size=page_size)
            return {
                "success": True,
                "news": news_data.model_dump(),
            }

        elif tool_name == "search_location":
            query = tool_args.get("query", "")
            limit = int(tool_args.get("limit", 5))
            locations = await map_service.search_locations(query, limit=limit)
            return {
                "success": True,
                "count": len(locations),
                "locations": [loc.model_dump() for loc in locations],
            }

        # ------------------- CONVERSATIONS -------------------
        elif tool_name == "get_conversation_history":
            conv_id = tool_args.get("conversation_id") or current_conversation_id
            if not conv_id:
                return {"success": False, "error": "No active conversation ID"}
            messages = await conversation_service.get_conversation_messages(
                db, user_id=user_id, conversation_id=conv_id, limit=int(tool_args.get("limit", 50))
            )
            return {
                "success": True,
                "count": len(messages),
                "messages": [
                    {"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
                    for m in messages
                ],
            }

        elif tool_name == "search_conversations":
            convs = await conversation_service.search_conversations(
                db, user_id=user_id, query_str=tool_args.get("query", "")
            )
            return {
                "success": True,
                "count": len(convs),
                "conversations": [
                    {"id": c.id, "title": c.title, "updated_at": c.updated_at.isoformat()}
                    for c in convs
                ],
            }

        # ------------------- COMPUTER ASSISTANT (FILES / SHELL) -------------------
        elif tool_name == "list_directory":
            return system_tools.list_directory(path=tool_args.get("path", "."))

        elif tool_name == "search_files":
            return system_tools.search_files(
                query=tool_args.get("query", ""),
                path=tool_args.get("path", "."),
                max_results=int(tool_args.get("max_results", 20)),
            )

        elif tool_name == "read_file":
            return system_tools.read_file(
                path=tool_args.get("path", ""),
                max_bytes=int(tool_args.get("max_bytes", 20000)),
            )

        elif tool_name == "open_file":
            return system_tools.open_file(path=tool_args.get("path", ""))

        elif tool_name == "run_command":
            return system_tools.run_command(
                command=tool_args.get("command", ""),
                confirm=bool(tool_args.get("confirm", False)),
            )

        else:
            return {"success": False, "error": f"Unknown tool '{tool_name}'"}

    except Exception as e:
        return {"success": False, "error": str(e), "tool": tool_name}
    finally:
        # Log tool execution to activity log
        try:
            await log_activity(
                db,
                user_id=user_id,
                action_type="tool_executed",
                entity_type="system",
                entity_id=tool_name,
                details={"tool_name": tool_name, "args": tool_args},
            )
            await db.commit()
        except Exception:
            pass
