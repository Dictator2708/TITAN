"""
Real-time voice endpoint powered by the Gemini Live API (gemini-3.1-flash-live-preview).

Protocol (browser <-> backend, over one WebSocket at /api/v1/voice/live/ws?token=<jwt>):
- Client -> Server:
    - binary frames: raw 16-bit PCM mono audio, 16kHz, from the microphone
    - text frames (JSON): {"type": "text", "text": "..."}      (typed input, optional)
                            {"type": "end_turn"}                 (mic released / user stopped talking)
- Server -> Client:
    - binary frames: raw 16-bit PCM audio (24kHz) - Gemini's spoken reply, play immediately
    - text frames (JSON): {"type": "transcript", "role": "user"|"assistant", "text": "..."}
                            {"type": "tool_call", "name": "...", "args": {...}}
                            {"type": "tool_result", "name": "...", "result": {...}}
                            {"type": "turn_complete"}
                            {"type": "error", "message": "..."}

This preserves TITAN's existing tool/function-calling layer: any function call Gemini makes
during the live session is dispatched through the same `execute_tool` used by the text
orchestrator, so tasks/reminders/notes/memory/weather/maps/file+shell tools all work from voice.
"""
import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect

from app.api.deps import get_current_user
from app.models.user import User

from app.core.config import settings
from app.core.security import decode_access_token
from app.database.session import AsyncSessionLocal
from app.services.auth_service import get_user_by_id
from app.services import memory_service, settings_service
from app.ai.gemini_client import gemini_client_provider
from app.ai.prompts import build_system_prompt
from app.ai.tools.gemini_schema import build_gemini_tools
from app.ai.tools.executor import execute_tool

logger = logging.getLogger("titan.voice_live")
router = APIRouter(prefix="/voice/live", tags=["Gemini Live Voice"])


async def _authenticate(token: Optional[str]):
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        return None

    async with AsyncSessionLocal() as db:
        user = await get_user_by_id(db, user_id)
        if not user or not user.is_active:
            return None
        user_settings = await settings_service.get_user_settings(db, user.id)
        memories = await memory_service.get_memories(db, user.id, limit=15)
        system_prompt = build_system_prompt(user, user_settings, memories)
        return user, system_prompt


@router.get("/status")
async def get_gemini_live_status(current_user: User = Depends(get_current_user)):
    is_ready = gemini_client_provider.is_configured
    return {
        "gemini_live_configured": is_ready,
        "model": settings.GEMINI_MODEL if is_ready else None,
        "missing_credentials": [] if is_ready else ["GEMINI_API_KEY"],
    }


@router.websocket("/ws")
async def voice_live_ws(websocket: WebSocket, token: Optional[str] = Query(default=None)):
    await websocket.accept()

    auth_result = await _authenticate(token)
    if not auth_result:
        await websocket.send_text(json.dumps({"type": "error", "message": "Authentication failed."}))
        await websocket.close(code=4401)
        return
    user, system_prompt = auth_result

    client = gemini_client_provider.get_client()
    if not client:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": "Gemini is not configured on the server (missing GEMINI_API_KEY).",
        }))
        await websocket.close(code=4500)
        return

    from google.genai import types

    live_config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=system_prompt,
        tools=build_gemini_tools(),
        input_audio_transcription={},
        output_audio_transcription={},
    )

    try:
        async with client.aio.live.connect(model=settings.GEMINI_MODEL, config=live_config) as session:

            async def pump_client_to_gemini():
                while True:
                    message = await websocket.receive()
                    if message.get("type") == "websocket.disconnect":
                        break
                    if "bytes" in message and message["bytes"] is not None:
                        await session.send_realtime_input(
                            audio=types.Blob(data=message["bytes"], mime_type="audio/pcm;rate=16000")
                        )
                    elif "text" in message and message["text"] is not None:
                        try:
                            payload = json.loads(message["text"])
                        except json.JSONDecodeError:
                            continue
                        msg_type = payload.get("type")
                        if msg_type == "text" and payload.get("text"):
                            await session.send_realtime_input(text=payload["text"])
                        elif msg_type == "end_turn":
                            await session.send_realtime_input(audio_stream_end=True)

            async def pump_gemini_to_client():
                # Each `execute_tool` call needs its own DB session.
                async with AsyncSessionLocal() as tool_db:
                    async for server_message in session.receive():
                        if server_message.data:
                            await websocket.send_bytes(server_message.data)

                        server_content = server_message.server_content
                        if server_content:
                            if server_content.input_transcription and server_content.input_transcription.text:
                                await websocket.send_text(json.dumps({
                                    "type": "transcript",
                                    "role": "user",
                                    "text": server_content.input_transcription.text,
                                }))
                            if server_content.output_transcription and server_content.output_transcription.text:
                                await websocket.send_text(json.dumps({
                                    "type": "transcript",
                                    "role": "assistant",
                                    "text": server_content.output_transcription.text,
                                }))
                            if server_content.turn_complete:
                                await websocket.send_text(json.dumps({"type": "turn_complete"}))

                        tool_call = server_message.tool_call
                        if tool_call and tool_call.function_calls:
                            responses = []
                            for fc in tool_call.function_calls:
                                args = dict(fc.args) if fc.args else {}
                                await websocket.send_text(json.dumps({
                                    "type": "tool_call", "name": fc.name, "args": args,
                                }))
                                result = await execute_tool(
                                    db=tool_db,
                                    user_id=user.id,
                                    tool_name=fc.name,
                                    tool_args=args,
                                    current_conversation_id=None,
                                )
                                await websocket.send_text(json.dumps({
                                    "type": "tool_result", "name": fc.name, "result": result,
                                }))
                                responses.append(
                                    types.FunctionResponse(
                                        id=fc.id,
                                        name=fc.name,
                                        response=result if isinstance(result, dict) else {"result": result},
                                    )
                                )
                            if responses:
                                await session.send_tool_response(function_responses=responses)

            client_task = asyncio.create_task(pump_client_to_gemini())
            gemini_task = asyncio.create_task(pump_gemini_to_client())
            done, pending = await asyncio.wait(
                {client_task, gemini_task}, return_when=asyncio.FIRST_COMPLETED
            )
            for task in pending:
                task.cancel()
            for task in done:
                if task.exception():
                    logger.warning("Voice live task ended with exception: %s", task.exception())

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.exception("Gemini Live voice session error")
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
