from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.ai.orchestrator import orchestrator
from app.models.user import User
from app.schemas.chat import ChatMessageCreate, ChatResponseOut

router = APIRouter(prefix="/chat", tags=["Chat & AI Assistant"])


@router.post("/", response_model=ChatResponseOut)
async def send_chat_message(
    chat_in: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    response = await orchestrator.process_chat(
        db=db,
        user=current_user,
        conversation_id=chat_in.conversation_id,
        content=chat_in.content,
    )
    return response
