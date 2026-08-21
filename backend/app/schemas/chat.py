from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict


class ChatMessageCreate(BaseModel):
    conversation_id: Optional[str] = None
    content: str


class ChatMessageOut(BaseModel):
    id: str
    conversation_id: str
    user_id: int
    role: str
    content: Optional[str] = None
    tool_calls: Optional[Any] = None
    tool_call_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationBase(BaseModel):
    title: Optional[str] = "New Conversation"


class ConversationCreate(ConversationBase):
    pass


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    is_archived: Optional[bool] = None


class ConversationOut(ConversationBase):
    id: str
    user_id: int
    title: str
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationWithMessagesOut(ConversationOut):
    messages: List[ChatMessageOut] = []


class ToolCallExecutionLog(BaseModel):
    tool_name: str
    tool_input: Any
    tool_result: Any
    status: str = "success"


class ChatResponseOut(BaseModel):
    conversation_id: str
    user_message: ChatMessageOut
    assistant_message: ChatMessageOut
    executed_tools: List[ToolCallExecutionLog] = []
