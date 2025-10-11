from ninja import Router
from django.shortcuts import get_object_or_404
from django.db import models
from typing import List
from accounts.api import auth
from projects.models import Project
from .models import ChatMessage, IndividualChatMessage
from .serializers import (
    ChatMessageCreateSchema, ChatMessageResponseSchema,
    IndividualChatMessageCreateSchema, IndividualChatMessageResponseSchema
)

router = Router()


@router.get("/project/{project_id}/messages", response=List[ChatMessageResponseSchema], auth=auth)
def get_project_messages(request, project_id: int):
    """Get chat messages for a project"""
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    # Check permissions
    if not (user.is_admin() or user.is_superuser or 
            project.manager == user or 
            project.client == user or 
            user in project.designers.all()):
        return {"error": "Permission denied"}, 403
    
    messages = ChatMessage.objects.filter(project=project)
    return [ChatMessageResponseSchema.from_orm(msg) for msg in messages]


@router.post("/project/{project_id}/messages", response=ChatMessageResponseSchema, auth=auth)
def send_project_message(request, project_id: int, data: ChatMessageCreateSchema):
    """Send a message to project chat"""
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    # Check permissions
    if not (user.is_admin() or user.is_superuser or 
            project.manager == user or 
            project.client == user or 
            user in project.designers.all()):
        return {"error": "Permission denied"}, 403
    
    message = ChatMessage.objects.create(
        project=project,
        user=user,
        **data.dict()
    )
    
    return ChatMessageResponseSchema.from_orm(message)


@router.get("/individual/{user_id}/messages", response=List[IndividualChatMessageResponseSchema], auth=auth)
def get_individual_messages(request, user_id: int):
    """Get individual chat messages between current user and specified user"""
    current_user = request.auth
    
    messages = IndividualChatMessage.objects.filter(
        models.Q(sender=current_user, recipient_id=user_id) |
        models.Q(sender_id=user_id, recipient=current_user)
    ).order_by('timestamp')
    
    # Mark messages as read
    IndividualChatMessage.objects.filter(
        sender_id=user_id,
        recipient=current_user,
        is_read=False
    ).update(is_read=True)
    
    return [IndividualChatMessageResponseSchema.from_orm(msg) for msg in messages]


@router.post("/individual/{user_id}/messages", response=IndividualChatMessageResponseSchema, auth=auth)
def send_individual_message(request, user_id: int, data: IndividualChatMessageCreateSchema):
    """Send an individual message to a user"""
    current_user = request.auth
    
    message = IndividualChatMessage.objects.create(
        sender=current_user,
        recipient_id=user_id,
        **data.dict()
    )
    
    return IndividualChatMessageResponseSchema.from_orm(message)


@router.get("/conversations", response=List[dict], auth=auth)
def get_conversations(request):
    """Get list of conversations for current user"""
    current_user = request.auth
    
    # Get unique users who have chatted with current user
    sent_to = IndividualChatMessage.objects.filter(
        sender=current_user
    ).values_list('recipient_id', flat=True).distinct()
    
    received_from = IndividualChatMessage.objects.filter(
        recipient=current_user
    ).values_list('sender_id', flat=True).distinct()
    
    user_ids = set(list(sent_to) + list(received_from))
    
    conversations = []
    for user_id in user_ids:
        # Get last message
        last_message = IndividualChatMessage.objects.filter(
            models.Q(sender=current_user, recipient_id=user_id) |
            models.Q(sender_id=user_id, recipient=current_user)
        ).order_by('-timestamp').first()
        
        # Get unread count
        unread_count = IndividualChatMessage.objects.filter(
            sender_id=user_id,
            recipient=current_user,
            is_read=False
        ).count()
        
        if last_message:
            from accounts.models import StaffUserAuth
            other_user = StaffUserAuth.objects.get(id=user_id)
            conversations.append({
                'user_id': user_id,
                'user_name': other_user.full_name,
                'user_email': other_user.email,
                'last_message': last_message.message,
                'last_message_time': last_message.timestamp,
                'unread_count': unread_count
            })
    
    return sorted(conversations, key=lambda x: x['last_message_time'], reverse=True)