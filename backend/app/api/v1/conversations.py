from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.chat import (
    ConversationCreate,
    ConversationOut,
    ConversationUpdate,
    ConversationWithMessagesOut,
)
from app.services import conversation_service

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("/", response_model=List[ConversationOut])
async def list_conversations(
    is_archived: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convs = await conversation_service.get_conversations(
        db, user_id=current_user.id, is_archived=is_archived, limit=limit, offset=offset
    )
    return [ConversationOut.model_validate(c) for c in convs]


@router.post("/", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conv_in: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await conversation_service.create_conversation(
        db, user_id=current_user.id, title=conv_in.title or "New Conversation"
    )
    return ConversationOut.model_validate(conv)


@router.get("/{conversation_id}", response_model=ConversationWithMessagesOut)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await conversation_service.get_conversation_by_id(
        db, user_id=current_user.id, conversation_id=conversation_id, load_messages=True
    )
    return ConversationWithMessagesOut.model_validate(conv)


@router.put("/{conversation_id}", response_model=ConversationOut)
async def update_conversation(
    conversation_id: str,
    conv_in: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await conversation_service.update_conversation(
        db,
        user_id=current_user.id,
        conversation_id=conversation_id,
        title=conv_in.title,
        is_archived=conv_in.is_archived,
    )
    return ConversationOut.model_validate(conv)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await conversation_service.delete_conversation(
        db, user_id=current_user.id, conversation_id=conversation_id
    )
    return None
