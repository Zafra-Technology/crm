from ninja import Schema
from typing import Optional
from datetime import datetime


class ChatMessageCreateSchema(Schema):
    """Schema for creating a chat message"""
    message: str
    message_type: str = "text"
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None


class ChatMessageResponseSchema(Schema):
    """Schema for chat message response"""
    id: int
    project_id: int
    user_id: int
    user_name: str
    user_role: str
    message: str
    message_type: str
    file_name: str
    file_size: Optional[int]
    file_type: str
    timestamp: datetime

    @staticmethod
    def resolve_user_name(obj):
        return obj.user.full_name

    @staticmethod
    def resolve_user_role(obj):
        return obj.user.role


class IndividualChatMessageCreateSchema(Schema):
    """Schema for creating an individual chat message"""
    message: str
    message_type: str = "text"
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None


class IndividualChatMessageResponseSchema(Schema):
    """Schema for individual chat message response"""
    id: int
    sender_id: int
    recipient_id: int
    sender_name: str
    message: str
    message_type: str
    file_name: str
    file_size: Optional[int]
    file_type: str
    is_read: bool
    timestamp: datetime

    @staticmethod
    def resolve_sender_name(obj):
        return obj.sender.full_name