import json
import logging
from typing import Any, Dict, List, Optional

from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.ai.gemini_client import gemini_client_provider
from app.ai.prompts import build_system_prompt
from app.ai.tools.gemini_schema import build_gemini_tools
from app.ai.tools.executor import execute_tool
from app.models.user import User
from app.schemas.chat import (
    ChatMessageOut,
    ChatResponseOut,
    ToolCallExecutionLog,
)
from app.services import (
    conversation_service,
    memory_service,
    settings_service,
)

logger = logging.getLogger("titan.ai.orchestrator")

MAX_TOOL_ITERATIONS = 5


class AIOrchestrator:
    """
    Text + function-calling orchestrator, backed by Google Gemini.

    NOTE: settings.GEMINI_MODEL (gemini-3.1-flash-live-preview) is a Live-API-only,
    audio-to-audio model and cannot be used with the synchronous generateContent call
    this orchestrator relies on. This class therefore uses settings.GEMINI_TEXT_MODEL
    for text chat + tool calling, while the Live model powers real-time voice
    (see app/api/v1/voice_live.py).
    """

    def __init__(self):
        self.model = settings.GEMINI_TEXT_MODEL
        self.tools = build_gemini_tools()

    @property
    def _client(self):
        return gemini_client_provider.get_client()

    async def process_chat(
        self,
        db: AsyncSession,
        user: User,
        conversation_id: Optional[str],
        content: str,
    ) -> ChatResponseOut:
        # 1. Resolve or create conversation
        if not conversation_id:
            conv = await conversation_service.create_conversation(db, user.id)
            conversation_id = conv.id
        else:
            conv = await conversation_service.get_conversation_by_id(
                db, user.id, conversation_id, load_messages=False
            )

        # 2. Store user message in DB
        user_msg = await conversation_service.add_message(
            db,
            conversation_id=conversation_id,
            user_id=user.id,
            role="user",
            content=content,
        )

        executed_tools: List[ToolCallExecutionLog] = []

        # 3. Check Gemini API Key readiness
        client = self._client
        if not client:
            fallback_text = (
                "**TITAN AI Orchestration Notice**\n\n"
                "I am your TITAN AI Assistant. The backend and PostgreSQL database are fully connected and active. "
                "To enable dynamic LLM reasoning and conversational tool execution, please add your `GEMINI_API_KEY` "
                "to the `.env` file (see `GEMINI_MODEL` / `GEMINI_TEXT_MODEL`).\n\n"
                "In the meantime, you can create and manage Tasks, Reminders, Notes, Memory, Maps, and Live Weather "
                "directly using the navigation menu!"
            )
            assistant_msg = await conversation_service.add_message(
                db,
                conversation_id=conversation_id,
                user_id=user.id,
                role="assistant",
                content=fallback_text,
            )
            return ChatResponseOut(
                conversation_id=conversation_id,
                user_message=ChatMessageOut.model_validate(user_msg),
                assistant_message=ChatMessageOut.model_validate(assistant_msg),
                executed_tools=[],
            )

        # 4. Fetch context: user settings, memories, past messages
        user_settings = await settings_service.get_user_settings(db, user.id)
        memories = await memory_service.get_memories(db, user.id, limit=15)
        history_msgs = await conversation_service.get_conversation_messages(
            db, user.id, conversation_id, limit=20
        )

        system_prompt = build_system_prompt(user, user_settings, memories)

        # 5. Build Gemini contents payload (role "user" / "model")
        contents: List[types.Content] = []
        for m in history_msgs:
            if m.id == user_msg.id:
                continue
            if m.role == "user" and m.content:
                contents.append(types.Content(role="user", parts=[types.Part(text=m.content)]))
            elif m.role == "assistant" and m.content:
                contents.append(types.Content(role="model", parts=[types.Part(text=m.content)]))

        contents.append(types.Content(role="user", parts=[types.Part(text=content)]))

        gen_config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            tools=self.tools,
            temperature=0.7,
        )

        try:
            final_content = ""
            for _ in range(MAX_TOOL_ITERATIONS):
                response = await client.aio.models.generate_content(
                    model=self.model,
                    contents=contents,
                    config=gen_config,
                )

                candidate = response.candidates[0] if response.candidates else None
                model_content = candidate.content if candidate else None
                function_calls = [
                    part.function_call
                    for part in (model_content.parts if model_content and model_content.parts else [])
                    if getattr(part, "function_call", None)
                ]

                if not function_calls:
                    final_content = (response.text or "").strip()
                    break

                # Record the model's turn (containing the function call requests)
                contents.append(model_content)

                # Execute each requested tool call and collect responses
                response_parts = []
                for fc in function_calls:
                    func_name = fc.name
                    args = dict(fc.args) if fc.args else {}

                    tool_result = await execute_tool(
                        db=db,
                        user_id=user.id,
                        tool_name=func_name,
                        tool_args=args,
                        current_conversation_id=conversation_id,
                    )

                    response_parts.append(
                        types.Part.from_function_response(
                            name=func_name,
                            response=tool_result if isinstance(tool_result, dict) else {"result": tool_result},
                        )
                    )

                    executed_tools.append(
                        ToolCallExecutionLog(
                            tool_name=func_name,
                            tool_input=args,
                            tool_result=tool_result,
                            status="success" if isinstance(tool_result, dict) and tool_result.get("success") else "error",
                        )
                    )

                contents.append(types.Content(role="user", parts=response_parts))
            else:
                # Exceeded MAX_TOOL_ITERATIONS without a final text answer
                final_content = (
                    "I performed several tool actions but couldn't finalize a response. "
                    "Please check the executed actions above or try rephrasing your request."
                )

            # 7. Store final assistant message in DB
            assistant_msg = await conversation_service.add_message(
                db,
                conversation_id=conversation_id,
                user_id=user.id,
                role="assistant",
                content=final_content,
                tool_calls=[t.model_dump() for t in executed_tools] if executed_tools else None,
            )

            return ChatResponseOut(
                conversation_id=conversation_id,
                user_message=ChatMessageOut.model_validate(user_msg),
                assistant_message=ChatMessageOut.model_validate(assistant_msg),
                executed_tools=executed_tools,
            )

        except Exception as e:
            logger.exception("Gemini orchestration error")
            error_text = f"TITAN encountered an issue processing your request: {str(e)}"
            assistant_msg = await conversation_service.add_message(
                db,
                conversation_id=conversation_id,
                user_id=user.id,
                role="assistant",
                content=error_text,
            )
            return ChatResponseOut(
                conversation_id=conversation_id,
                user_message=ChatMessageOut.model_validate(user_msg),
                assistant_message=ChatMessageOut.model_validate(assistant_msg),
                executed_tools=executed_tools,
            )


orchestrator = AIOrchestrator()
