from datetime import datetime, timezone
from typing import Any, List, Optional
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundException
from app.models.conversation import Conversation, Message
from app.services.activity_service import log_activity


async def create_conversation(
    db: AsyncSession, user_id: int, title: str = "New Conversation"
) -> Conversation:
    conv = Conversation(
        user_id=user_id,
        title=title or "New Conversation",
    )
    db.add(conv)
    await db.flush()

    await log_activity(
        db,
        user_id=user_id,
        action_type="conversation_started",
        entity_type="conversation",
        entity_id=conv.id,
        details={"title": conv.title},
    )
    await db.commit()
    await db.refresh(conv)
    return conv


async def get_conversations(
    db: AsyncSession,
    user_id: int,
    is_archived: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> List[Conversation]:
    query = (
        select(Conversation)
        .where(
            Conversation.user_id == user_id,
            Conversation.is_archived == is_archived,
        )
        .order_by(desc(Conversation.updated_at))
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_conversation_by_id(
    db: AsyncSession, user_id: int, conversation_id: str, load_messages: bool = True
) -> Conversation:
    query = select(Conversation).where(
        Conversation.id == conversation_id, Conversation.user_id == user_id
    )
    if load_messages:
        query = query.options(selectinload(Conversation.messages))

    result = await db.execute(query)
    conv = result.scalar_one_or_none()
    if not conv:
        raise NotFoundException("Conversation", conversation_id)
    return conv


async def update_conversation(
    db: AsyncSession,
    user_id: int,
    conversation_id: str,
    title: Optional[str] = None,
    is_archived: Optional[bool] = None,
) -> Conversation:
    conv = await get_conversation_by_id(db, user_id, conversation_id, load_messages=False)
    if title is not None:
        conv.title = title
    if is_archived is not None:
        conv.is_archived = is_archived
    conv.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(conv)
    return conv


async def delete_conversation(
    db: AsyncSession, user_id: int, conversation_id: str
) -> bool:
    conv = await get_conversation_by_id(db, user_id, conversation_id, load_messages=False)
    title = conv.title
    await db.delete(conv)

    await log_activity(
        db,
        user_id=user_id,
        action_type="conversation_deleted",
        entity_type="conversation",
        entity_id=conversation_id,
        details={"title": title},
    )
    await db.commit()
    return True


async def add_message(
    db: AsyncSession,
    conversation_id: str,
    user_id: int,
    role: str,
    content: Optional[str] = None,
    tool_calls: Optional[Any] = None,
    tool_call_id: Optional[str] = None,
) -> Message:
    msg = Message(
        conversation_id=conversation_id,
        user_id=user_id,
        role=role,
        content=content,
        tool_calls=tool_calls,
        tool_call_id=tool_call_id,
    )
    db.add(msg)

    # Touch conversation updated_at
    conv = await get_conversation_by_id(db, user_id, conversation_id, load_messages=False)
    conv.updated_at = datetime.now(timezone.utc)
    
    # Auto-title conversation if it is the first user message
    if role == "user" and conv.title == "New Conversation" and content:
        clean_title = content.strip().replace("\n", " ")
        if len(clean_title) > 40:
            clean_title = clean_title[:37] + "..."
        conv.title = clean_title

    await db.flush()
    await db.commit()
    await db.refresh(msg)
    return msg


async def get_conversation_messages(
    db: AsyncSession, user_id: int, conversation_id: str, limit: int = 100
) -> List[Message]:
    # Ensure user owns conversation
    await get_conversation_by_id(db, user_id, conversation_id, load_messages=False)

    query = (
        select(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.user_id == user_id,
        )
        .order_by(Message.created_at.asc())
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def search_conversations(
    db: AsyncSession, user_id: int, query_str: str, limit: int = 20
) -> List[Conversation]:
    term = f"%{query_str.strip()}%"
    query = (
        select(Conversation)
        .join(Message, Message.conversation_id == Conversation.id)
        .where(
            Conversation.user_id == user_id,
            or_(
                Conversation.title.ilike(term),
                Message.content.ilike(term),
            ),
        )
        .distinct()
        .order_by(desc(Conversation.updated_at))
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())
