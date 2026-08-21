from typing import List, Dict, Any

TITAN_TOOLS: List[Dict[str, Any]] = [
    # ------------------- TASKS -------------------
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Create a new task for the user with title, optional description, priority, and due date/time.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Title or headline of the task"},
                    "description": {"type": "string", "description": "Detailed description or notes about the task"},
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "urgent"],
                        "description": "Priority level of the task",
                    },
                    "due_date": {
                        "type": "string",
                        "description": "Due date in YYYY-MM-DD format (e.g. 2026-08-19)",
                    },
                    "due_time": {
                        "type": "string",
                        "description": "Due time in HH:MM format (e.g. 14:30)",
                    },
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_tasks",
            "description": "List tasks for the user with optional filters for status, priority, due date, or search keyword.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["all", "pending", "in_progress", "completed", "cancelled"],
                        "description": "Filter by task status",
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["all", "low", "medium", "high", "urgent"],
                        "description": "Filter by task priority",
                    },
                    "search": {"type": "string", "description": "Search keyword matching title or description"},
                    "due_date": {"type": "string", "description": "Filter by due date (YYYY-MM-DD)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_task",
            "description": "Get detailed information about a specific task by its ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer", "description": "The ID of the task to retrieve"},
                },
                "required": ["task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_task",
            "description": "Update attributes of an existing task (title, description, status, priority, due date/time).",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer", "description": "The ID of the task to update"},
                    "title": {"type": "string", "description": "Updated title"},
                    "description": {"type": "string", "description": "Updated description"},
                    "status": {
                        "type": "string",
                        "enum": ["pending", "in_progress", "completed", "cancelled"],
                        "description": "Updated status",
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "urgent"],
                        "description": "Updated priority",
                    },
                    "due_date": {"type": "string", "description": "Updated due date in YYYY-MM-DD format"},
                    "due_time": {"type": "string", "description": "Updated due time in HH:MM format"},
                },
                "required": ["task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "complete_task",
            "description": "Mark an existing task as completed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer", "description": "The ID of the task to complete"},
                },
                "required": ["task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_task",
            "description": "Delete a task by its ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer", "description": "The ID of the task to delete"},
                },
                "required": ["task_id"],
            },
        },
    },

    # ------------------- REMINDERS -------------------
    {
        "type": "function",
        "function": {
            "name": "create_reminder",
            "description": "Schedule a reminder with text and a future date/time.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reminder_text": {"type": "string", "description": "What to remind the user about"},
                    "scheduled_time": {
                        "type": "string",
                        "description": "ISO 8601 timestamp or date/time string when the reminder should trigger (e.g. 2026-08-18T20:00:00Z)",
                    },
                },
                "required": ["reminder_text", "scheduled_time"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_reminders",
            "description": "List reminders for the user, optionally filtered by status (pending, delivered, cancelled).",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["all", "pending", "delivered", "cancelled"],
                        "description": "Filter by status",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_reminder",
            "description": "Get details of a specific reminder by ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reminder_id": {"type": "integer", "description": "The ID of the reminder"},
                },
                "required": ["reminder_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_reminder",
            "description": "Update a reminder's text, scheduled time, or status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reminder_id": {"type": "integer", "description": "The ID of the reminder to update"},
                    "reminder_text": {"type": "string", "description": "Updated reminder text"},
                    "scheduled_time": {"type": "string", "description": "Updated ISO 8601 scheduled time"},
                    "status": {
                        "type": "string",
                        "enum": ["pending", "delivered", "cancelled"],
                        "description": "Updated status",
                    },
                },
                "required": ["reminder_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_reminder",
            "description": "Delete a reminder by ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reminder_id": {"type": "integer", "description": "The ID of the reminder to delete"},
                },
                "required": ["reminder_id"],
            },
        },
    },

    # ------------------- NOTES -------------------
    {
        "type": "function",
        "function": {
            "name": "create_note",
            "description": "Create a new personal note with title, content, optional tags, and pin flag.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Title of the note"},
                    "content": {"type": "string", "description": "Full content / body of the note"},
                    "tags": {"type": "string", "description": "Comma-separated tags (e.g. 'work, project, idea')"},
                    "is_pinned": {"type": "boolean", "description": "Whether to pin the note to the top"},
                },
                "required": ["title", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_notes",
            "description": "Search notes by keyword in title, body, or tags.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search keyword or phrase"},
                    "is_pinned": {"type": "boolean", "description": "Filter by pinned status"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_note",
            "description": "Get full details of a specific note by ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "note_id": {"type": "integer", "description": "The ID of the note"},
                },
                "required": ["note_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_note",
            "description": "Update an existing note's title, content, tags, or pinned status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "note_id": {"type": "integer", "description": "The ID of the note to update"},
                    "title": {"type": "string", "description": "Updated title"},
                    "content": {"type": "string", "description": "Updated content"},
                    "tags": {"type": "string", "description": "Updated tags"},
                    "is_pinned": {"type": "boolean", "description": "Updated pinned status"},
                },
                "required": ["note_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_note",
            "description": "Delete a note by ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "note_id": {"type": "integer", "description": "The ID of the note to delete"},
                },
                "required": ["note_id"],
            },
        },
    },

    # ------------------- MEMORY -------------------
    {
        "type": "function",
        "function": {
            "name": "save_memory",
            "description": "Save an intentional, permanent fact or preference about the user into persistent memory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "A descriptive key or topic (e.g. 'coding_language_preference', 'project_name')"},
                    "content": {"type": "string", "description": "The memory content to remember"},
                    "category": {
                        "type": "string",
                        "enum": ["preference", "project", "fact", "goal", "personal", "general"],
                        "description": "Category for organizing the memory",
                    },
                },
                "required": ["key", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_memory",
            "description": "Search stored persistent memories about the user by keyword or category.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Keyword to search in memories"},
                    "category": {"type": "string", "description": "Filter by memory category"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_memory",
            "description": "Delete a specific memory by key or ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "The memory key to delete"},
                    "memory_id": {"type": "integer", "description": "The memory ID to delete (optional if key provided)"},
                },
            },
        },
    },

    # ------------------- ACTIVITY -------------------
    {
        "type": "function",
        "function": {
            "name": "get_activity",
            "description": "Get recent meaningful activity log history for the user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Number of activity entries to retrieve (default 20)"},
                    "action_type": {"type": "string", "description": "Filter by action type (e.g. 'task_created', 'reminder_delivered')"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_daily_summary",
            "description": "Get a holistic daily summary of pending tasks, completed items today, upcoming reminders, notes, and recent activity.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },

    # ------------------- INFORMATION -------------------
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get live real-time current weather and multi-day forecast for any city or location worldwide.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "City or location name (e.g. 'San Francisco', 'London', 'Delhi')"},
                    "days": {"type": "integer", "description": "Number of forecast days (1 to 7, default 3)"},
                },
                "required": ["location"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_news",
            "description": "Get live top news headlines or topic-specific articles (AI, technology, business, science).",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": ["technology", "ai", "business", "science", "general"],
                        "description": "News category",
                    },
                    "query": {"type": "string", "description": "Optional search term (e.g. 'GPT-4o', 'Quantum Computing')"},
                    "page_size": {"type": "integer", "description": "Number of articles (default 5)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_location",
            "description": "Search and geocode locations, cities, landmarks, or addresses to get coordinates, bounding box, and map pin details.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Location name or address to search"},
                    "limit": {"type": "integer", "description": "Maximum number of results to return (default 5)"},
                },
                "required": ["query"],
            },
        },
    },

    # ------------------- CONVERSATIONS -------------------
    {
        "type": "function",
        "function": {
            "name": "get_conversation_history",
            "description": "Retrieve messages from the current conversation or a past conversation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "conversation_id": {"type": "string", "description": "The conversation ID (uses current if omitted)"},
                    "limit": {"type": "integer", "description": "Maximum messages to retrieve (default 50)"},
                },
            },
        },
    },
    # ------------------- COMPUTER ASSISTANT (FILES / SHELL) -------------------
    {
        "type": "function",
        "function": {
            "name": "list_directory",
            "description": "List files and subdirectories at a given path inside the TITAN workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path to list (default '.' for workspace root)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_files",
            "description": "Recursively search for files by filename keyword inside the TITAN workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Filename keyword to search for"},
                    "path": {"type": "string", "description": "Relative directory to search under (default '.')"},
                    "max_results": {"type": "integer", "description": "Maximum number of matches to return (default 20)"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the text content of a file inside the TITAN workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path of the file to read"},
                    "max_bytes": {"type": "integer", "description": "Maximum number of bytes to read (default 20000)"},
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "open_file",
            "description": "Open a file with the host operating system's default application.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path of the file to open"},
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_command",
            "description": (
                "Execute a terminal/PowerShell command in the TITAN workspace. Destructive or "
                "irreversible commands (deleting files, formatting, force-pushing, killing "
                "processes, shutting down, etc.) are NOT executed automatically - they return a "
                "confirmation request. Only set confirm=true after the user has explicitly approved "
                "running that exact command."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "The shell/PowerShell command to run"},
                    "confirm": {
                        "type": "boolean",
                        "description": "Set true only after the user explicitly confirmed a destructive command",
                    },
                },
                "required": ["command"],
            },
        },
    },

    {
        "type": "function",
        "function": {
            "name": "search_conversations",
            "description": "Search past conversation titles and message content by keyword.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                },
                "required": ["query"],
            },
        },
    },
]
