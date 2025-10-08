from django.contrib import admin
from .models import Project, ProjectAttachment, ProjectUpdate, Task


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """Admin for Project model"""
    
    list_display = ('name', 'client', 'manager', 'status', 'created_at')
    list_filter = ('status', 'created_at', 'updated_at')
    search_fields = ('name', 'description', 'client__email', 'manager__email')
    filter_horizontal = ('designers',)
    
    fieldsets = (
        ('Project Information', {
            'fields': ('name', 'description', 'requirements', 'timeline', 'status')
        }),
        ('Team Assignment', {
            'fields': ('client', 'manager', 'designers')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ProjectAttachment)
class ProjectAttachmentAdmin(admin.ModelAdmin):
    """Admin for ProjectAttachment model"""
    
    list_display = ('name', 'project', 'uploaded_by', 'size', 'uploaded_at')
    list_filter = ('uploaded_at', 'file_type')
    search_fields = ('name', 'project__name', 'uploaded_by__email')


@admin.register(ProjectUpdate)
class ProjectUpdateAdmin(admin.ModelAdmin):
    """Admin for ProjectUpdate model"""
    
    list_display = ('title', 'project', 'user', 'type', 'created_at')
    list_filter = ('type', 'created_at')
    search_fields = ('title', 'description', 'project__name', 'user__email')


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    """Admin for Task model"""
    
    list_display = ('title', 'project', 'assignee', 'status', 'priority', 'due_date', 'created_at')
    list_filter = ('status', 'priority', 'created_at', 'due_date')
    search_fields = ('title', 'description', 'project__name', 'assignee__email')
    
    fieldsets = (
        ('Task Information', {
            'fields': ('title', 'description', 'project')
        }),
        ('Assignment & Status', {
            'fields': ('assignee', 'status', 'priority', 'due_date')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_by', 'created_at', 'updated_at')