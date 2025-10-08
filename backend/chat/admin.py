from django.contrib import admin
from .models import ChatMessage, IndividualChatMessage


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    """Admin for ChatMessage model"""
    
    list_display = ('project', 'user', 'message_type', 'timestamp')
    list_filter = ('message_type', 'timestamp', 'project')
    search_fields = ('message', 'user__email', 'project__name')
    readonly_fields = ('timestamp',)
    
    fieldsets = (
        ('Message Information', {
            'fields': ('project', 'user', 'message', 'message_type')
        }),
        ('File Attachment', {
            'fields': ('file', 'file_name', 'file_size', 'file_type'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('timestamp',)
        }),
    )


@admin.register(IndividualChatMessage)
class IndividualChatMessageAdmin(admin.ModelAdmin):
    """Admin for IndividualChatMessage model"""
    
    list_display = ('sender', 'recipient', 'message_type', 'is_read', 'timestamp')
    list_filter = ('message_type', 'is_read', 'timestamp')
    search_fields = ('message', 'sender__email', 'recipient__email')
    readonly_fields = ('timestamp',)
    
    fieldsets = (
        ('Message Information', {
            'fields': ('sender', 'recipient', 'message', 'message_type', 'is_read')
        }),
        ('File Attachment', {
            'fields': ('file', 'file_name', 'file_size', 'file_type'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('timestamp',)
        }),
    )