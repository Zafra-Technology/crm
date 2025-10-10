from ninja import Schema
from typing import Optional, List
from datetime import date, datetime


class ProjectCreateSchema(Schema):
    """Schema for creating a project"""
    name: str
    description: str
    requirements: Optional[str] = ""
    timeline: Optional[str] = ""
    status: str = "planning"
    client_id: int
    manager_id: int
    designer_ids: Optional[List[int]] = []


class ProjectUpdateSchema(Schema):
    """Schema for updating a project"""
    name: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    timeline: Optional[str] = None
    status: Optional[str] = None
    client_id: Optional[int] = None
    manager_id: Optional[int] = None
    designer_ids: Optional[List[int]] = None
    # Frontend sends camelCase attachments with base64 data URLs
    class AttachmentSchema(Schema):
        id: Optional[str] = None
        name: str
        size: int
        type: str
        url: str
        uploadedAt: Optional[datetime] = None
        uploadedBy: Optional[str] = None

    attachments: Optional[List[AttachmentSchema]] = None


class ProjectResponseSchema(Schema):
    """Schema for project response"""
    id: int
    name: str
    description: str
    requirements: str
    timeline: str
    status: str
    client_id: int
    manager_id: int
    designer_ids: List[int] = []
    designer_count: int = 0
    # Optional: include designers details for convenience
    class DesignerSchema(Schema):
        id: int
        full_name: str
        email: str
        role: str
        profile_pic: Optional[str] = None

    designers: Optional[List[DesignerSchema]] = None
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_designer_ids(obj):
        """Prefer provided designer_ids; fallback to M2M only if needed."""
        try:
            if isinstance(obj, dict):
                ids = obj.get('designer_ids')
                if ids is not None:
                    return ids
            # obj may be a Django model instance
            return list(obj.designers.values_list('id', flat=True))
        except Exception:
            try:
                # last resort for dicts
                return list(obj.get('designer_ids', []))
            except Exception:
                return []
    # Include attachments in response for frontend
    class AttachmentResponseSchema(Schema):
        id: str
        name: str
        size: int
        type: str
        url: str
        uploadedAt: datetime
        uploadedBy: str

    attachments: List[AttachmentResponseSchema] = []

    @staticmethod
    def resolve_designer_ids(obj):
        try:
            return list(obj.designers.values_list('id', flat=True))
        except Exception:
            return []


class TaskCreateSchema(Schema):
    """Schema for creating a task"""
    title: str
    description: Optional[str] = ""
    status: str = "todo"
    priority: str = "medium"
    assignee_id: Optional[int] = None
    due_date: Optional[date] = None


class TaskUpdateSchema(Schema):
    """Schema for updating a task"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[int] = None
    due_date: Optional[date] = None


class TaskResponseSchema(Schema):
    """Schema for task response"""
    id: int
    title: str
    description: str
    status: str
    priority: str
    project_id: int
    assignee_id: Optional[int]
    created_by_id: int
    due_date: Optional[date]
    created_at: datetime
    updated_at: datetime


class ProjectUpdateCreateSchema(Schema):
    """Schema for creating project update"""
    type: str
    title: str
    description: Optional[str] = ""
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None


class ProjectUpdateResponseSchema(Schema):
    """Schema for project update response"""
    id: int
    project_id: int
    user_id: int
    type: str
    title: str
    description: str
    file_name: str
    file_size: Optional[int]
    file_type: str
    created_at: datetime