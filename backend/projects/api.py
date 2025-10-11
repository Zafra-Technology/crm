from ninja import Router, UploadedFile
from ninja.pagination import paginate
from django.shortcuts import get_object_or_404
from typing import List
from accounts.api import auth
from .models import Project, ProjectAttachment, ProjectUpdate, Task
from .serializers import (
    ProjectCreateSchema, ProjectUpdateSchema, ProjectResponseSchema,
    TaskCreateSchema, TaskUpdateSchema, TaskResponseSchema,
    ProjectUpdateCreateSchema, ProjectUpdateResponseSchema
)

router = Router()

# Custom endpoint for file uploads that Django Ninja can't handle properly
@router.api_operation(["POST"], "/{project_id}/submit-quotation-custom", auth=auth)
def submit_quotation_custom(request, project_id: int):
    """Custom endpoint for submitting quotations with file upload support"""
    from django.http import JsonResponse
    import json
    
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    if not (user.is_admin() or user.is_superuser or user.is_project_manager()):
        return JsonResponse({"error": "Permission denied"}, status=403)
    
    if project.project_type != 'commercial':
        return JsonResponse({"error": "Quotation can only be submitted for commercial projects"}, status=400)
    
    if project.status != 'inactive':
        return JsonResponse({"error": "Project is not in inactive status"}, status=400)
    
    # For now, let's just accept the quotation message without file upload
    # We'll handle file uploads separately
    quotation_message = ""
    
    # Try to get quotation message from JSON body
    try:
        body = json.loads(request.body)
        quotation_message = body.get('quotation_message', '')
    except (json.JSONDecodeError, AttributeError, UnicodeDecodeError) as e:
        # Try to get from POST data as fallback
        if hasattr(request, 'POST') and request.POST:
            quotation_message = request.POST.get('quotation_message', '')
    
    
    project.quotation_message = quotation_message
    project.status = 'quotation_submitted'
    project.save()
    
    return JsonResponse(serialize_project(project))


def _get_quotation_file_url(project):
    """Safely get quotation file URL, handling cases where no file is associated"""
    try:
        quotation_file = getattr(project, "quotation_file", None)
        if quotation_file and hasattr(quotation_file, 'url'):
            return quotation_file.url
        return None
    except (ValueError, AttributeError):
        return None


def serialize_project(project):
    """Return dict matching ProjectResponseSchema, including designer_ids and attachments."""
    attachments = []
    try:
        for a in project.attachments.all():
            attachments.append({
                "id": str(a.id),
                "name": a.name,
                "size": a.size,
                "type": a.file_type,
                "url": getattr(a.file, "url", ""),
                "uploadedAt": a.uploaded_at,
                "uploadedBy": str(a.uploaded_by_id),
            })
    except Exception:
        attachments = []

    # Designers details (optional, helps frontend render team)
    designers_list = []
    try:
        for d in project.designers.all():
            designers_list.append({
                "id": d.id,
                "full_name": getattr(d, "full_name", str(d)),
                "email": getattr(d, "email", ""),
                "role": getattr(d, "role", ""),
                "profile_pic": getattr(getattr(d, "profile_pic", None), "url", None),
            })
    except Exception:
        designers_list = []

    # Get designer IDs for serialization
    try:
        designer_ids = list(project.designers.values_list('id', flat=True))
    except Exception as e:
        designer_ids = []

    return {
        "id": project.id,
        "name": project.name,
        "description": getattr(project, "description", ""),
        "requirements": getattr(project, "requirements", ""),
        "timeline": getattr(project, "timeline", ""),
        "status": getattr(project, "status", "inactive"),
        "project_type": getattr(project, "project_type", "residential"),
        "feedback_message": getattr(project, "feedback_message", None),
        "quotation_message": getattr(project, "quotation_message", None),
        "quotation_file": _get_quotation_file_url(project),
        "quotation_accepted": getattr(project, "quotation_accepted", False),
        "client_id": getattr(project, "client_id", None),
        "manager_id": getattr(project, "manager_id", None),
        # Use explicit list of ids obtained earlier to avoid Djongo eval quirks
        "designer_ids": designer_ids,
        "designer_count": len(designer_ids),
        "designers": designers_list,
        "attachments": attachments,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


@router.get("/", response=List[ProjectResponseSchema], auth=auth)
@paginate
def list_projects(request):
    """List projects based on user role"""
    user = request.auth
    
    if user.is_admin() or user.is_superuser:
        queryset = Project.objects.all()
    elif user.is_project_manager():
        # Project managers can see all projects (they manage all projects)
        queryset = Project.objects.all()
    elif user.is_designer():
        queryset = Project.objects.filter(designers=user)
    elif user.is_client():
        queryset = Project.objects.filter(client=user)
    else:
        queryset = Project.objects.none()
    
    # Return concrete list to ensure designer_ids are materialized
    return [serialize_project(p) for p in queryset]


@router.post("/", response=ProjectResponseSchema, auth=auth)
def create_project(request, data: ProjectCreateSchema):
    """Create new project (admin, project manager, and clients can create)"""
    user = request.auth
    
    # Allow clients to create projects, but they can only set themselves as client
    if user.is_client():
        # For clients, ensure they can only create projects for themselves
        project_data = data.dict()
        project_data['client_id'] = user.id
        # For clients, we need to assign a project manager - get the first available one
        from accounts.models import StaffUserAuth
        try:
            manager = StaffUserAuth.objects.filter(role='project_manager').first()
            if not manager:
                return {"error": "No project manager available"}, 400
            project_data['manager_id'] = manager.id
        except Exception:
            return {"error": "Failed to assign project manager"}, 400
    elif not (user.is_admin() or user.is_project_manager() or user.is_superuser):
        return {"error": "Permission denied"}, 403
    else:
        project_data = data.dict()
    
    designer_ids = project_data.pop('designer_ids', [])
    attachments_data = project_data.pop('attachments', [])
    
    
    project = Project.objects.create(**project_data)
    
    # Handle attachments
    if attachments_data:
        from .models import ProjectAttachment
        from accounts.models import StaffUserAuth
        from django.core.files.base import ContentFile
        import base64
        
        try:
            for attachment_data in attachments_data:
                # Decode base64 file data
                file_data = base64.b64decode(attachment_data['url'].split(',')[1])
                file_content = ContentFile(file_data, name=attachment_data['name'])
                
                # Create ProjectAttachment
                ProjectAttachment.objects.create(
                    project=project,
                    name=attachment_data['name'],
                    size=attachment_data['size'],
                    file_type=attachment_data['type'],
                    file=file_content,
                    uploaded_by=user
                )
        except Exception as e:
            pass  # Handle attachment errors silently
    
    if designer_ids:
        project.designers.set(designer_ids)
    else:
        project.designers.clear()

    return serialize_project(project)


@router.get("/{project_id}", response=ProjectResponseSchema, auth=auth)
def get_project(request, project_id: int):
    """Get specific project details"""
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    # Check permissions
    if not (user.is_admin() or user.is_superuser or user.is_project_manager() or
            project.manager == user or 
            project.client == user or 
            user in project.designers.all()):
        return {"error": "Permission denied"}, 403
    
    return serialize_project(project)


@router.put("/{project_id}", response=ProjectResponseSchema, auth=auth)
def update_project(request, project_id: int, data: ProjectUpdateSchema):
    """Update project (admin and project manager only)"""
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    if not (user.is_admin() or user.is_superuser or project.manager == user):
        return {"error": "Permission denied"}, 403
    
    update_data = data.dict(exclude_unset=True)
    designer_ids = update_data.pop('designer_ids', None)
    attachments = update_data.pop('attachments', None)
    
    for field, value in update_data.items():
        setattr(project, field, value)
    
    project.save()

    # Handle attachments upsert from base64 data URLs
    if attachments is not None:
        # Clear and recreate for simplicity (can be optimized later)
        ProjectAttachment.objects.filter(project=project).delete()
        from django.core.files.base import ContentFile
        import base64
        import re
        data_url_re = re.compile(r'^data:(?P<mime>[-\w\.\/]+);base64,(?P<data>.+)$')

        for att in attachments:
            url = att.get('url')
            name = att.get('name') or 'attachment'
            file_type = att.get('type') or 'application/octet-stream'
            size = int(att.get('size') or 0)

            file_obj = None
            if isinstance(url, str):
                m = data_url_re.match(url)
                if m:
                    b64 = m.group('data')
                    try:
                        file_bytes = base64.b64decode(b64)
                        file_obj = ContentFile(file_bytes, name=name)
                    except Exception:
                        file_obj = None

            pa = ProjectAttachment(
                project=project,
                name=name,
                size=size,
                file_type=file_type,
                uploaded_by=request.auth,
            )
            if file_obj is not None:
                pa.file = file_obj
            pa.save()
    
    if designer_ids is not None:
        project.designers.set(designer_ids)

    return serialize_project(project)


@router.delete("/{project_id}", auth=auth)
def delete_project(request, project_id: int):
    """Delete project (admin only)"""
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    if not (user.is_admin() or user.is_superuser):
        return {"error": "Permission denied"}, 403
    
    project.delete()
    return {"message": "Project deleted successfully"}


# Project Updates endpoints
@router.get("/{project_id}/updates", response=List[ProjectUpdateResponseSchema], auth=auth)
def list_project_updates(request, project_id: int):
    """List project updates"""
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    # Check permissions
    if not (user.is_admin() or user.is_superuser or user.is_project_manager() or
            project.manager == user or 
            project.client == user or 
            user in project.designers.all()):
        return {"error": "Permission denied"}, 403
    
    updates = ProjectUpdate.objects.filter(project=project)
    return [ProjectUpdateResponseSchema.from_orm(update) for update in updates]


@router.post("/{project_id}/updates", response=ProjectUpdateResponseSchema, auth=auth)
def create_project_update(request, project_id: int, data: ProjectUpdateCreateSchema):
    """Create project update"""
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    # Check permissions
    if not (user.is_admin() or user.is_superuser or 
            project.manager == user or 
            user in project.designers.all()):
        return {"error": "Permission denied"}, 403
    
    update = ProjectUpdate.objects.create(
        project=project,
        user=user,
        **data.dict()
    )
    
    return ProjectUpdateResponseSchema.from_orm(update)


# Tasks endpoints
@router.get("/{project_id}/tasks", response=List[TaskResponseSchema], auth=auth)
def list_project_tasks(request, project_id: int):
    """List project tasks"""
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    # Check permissions
    if not (user.is_admin() or user.is_superuser or user.is_project_manager() or
            project.manager == user or 
            project.client == user or 
            user in project.designers.all()):
        return {"error": "Permission denied"}, 403
    
    tasks = Task.objects.filter(project=project)
    return [TaskResponseSchema.from_orm(task) for task in tasks]


@router.post("/{project_id}/tasks", response=TaskResponseSchema, auth=auth)
def create_task(request, project_id: int, data: TaskCreateSchema):
    """Create new task"""
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    # Check permissions
    if not (user.is_admin() or user.is_superuser or project.manager == user):
        return {"error": "Permission denied"}, 403
    
    task = Task.objects.create(
        project=project,
        created_by=user,
        **data.dict()
    )
    
    return TaskResponseSchema.from_orm(task)


@router.put("/tasks/{task_id}", response=TaskResponseSchema, auth=auth)
def update_task(request, task_id: int, data: TaskUpdateSchema):
    """Update task"""
    user = request.auth
    task = get_object_or_404(Task, id=task_id)
    
    # Check permissions
    if not (user.is_admin() or user.is_superuser or 
            task.project.manager == user or 
            task.assignee == user):
        return {"error": "Permission denied"}, 403
    
    for field, value in data.dict(exclude_unset=True).items():
        setattr(task, field, value)
    
    task.save()
    return TaskResponseSchema.from_orm(task)


# Project approval/rejection endpoints
@router.post("/{project_id}/approve", response=ProjectResponseSchema, auth=auth)
def approve_project(request, project_id: int):
    """Approve a project (project manager and admin only)"""
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    if not (user.is_admin() or user.is_superuser or user.is_project_manager()):
        return {"error": "Permission denied"}, 403
    
    if project.status != 'inactive':
        return {"error": "Project is not in inactive status"}, 400
    
    # For residential projects, approve directly
    if project.project_type == 'residential':
        project.status = 'planning'
        project.save()
    # For commercial projects, status remains inactive until quotation is accepted
    
    return serialize_project(project)


@router.post("/{project_id}/reject", response=ProjectResponseSchema, auth=auth)
def reject_project(request, project_id: int):
    """Reject a project with feedback (project manager and admin only)"""
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    if not (user.is_admin() or user.is_superuser or user.is_project_manager()):
        return {"error": "Permission denied"}, 403
    
    if project.status != 'inactive':
        return {"error": "Project is not in inactive status"}, 400
    
    # Get feedback message from request body
    import json
    try:
        body = json.loads(request.body)
        feedback_message = body.get('feedback_message', '')
    except (json.JSONDecodeError, AttributeError) as e:
        feedback_message = ''
    
    project.feedback_message = feedback_message
    project.status = 'rejected'
    project.save()
    
    return serialize_project(project)


@router.api_operation(["POST"], "/{project_id}/submit-quotation", auth=auth)
def submit_quotation(request, project_id: int):
    """Submit quotation for commercial project (project manager and admin only)"""
    from django.http import JsonResponse
    import json
    
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    if not (user.is_admin() or user.is_superuser or user.is_project_manager()):
        return JsonResponse({"error": "Permission denied"}, status=403)
    
    if project.project_type != 'commercial':
        return JsonResponse({"error": "Quotation can only be submitted for commercial projects"}, status=400)
    
    if project.status != 'inactive':
        return JsonResponse({"error": "Project is not in inactive status"}, status=400)
    
    # Handle multipart form data
    quotation_message = ""
    quotation_file = None
    
    
    # Check if this is multipart form data
    if request.content_type and 'multipart/form-data' in request.content_type:
        # Handle as multipart form data
        if hasattr(request, 'POST') and request.POST:
            quotation_message = request.POST.get('quotation_message', '')
        if hasattr(request, 'FILES') and request.FILES:
            quotation_file = request.FILES.get('quotation_file')
    else:
        # Handle as JSON (fallback)
        try:
            body = json.loads(request.body)
            quotation_message = body.get('quotation_message', '')
        except (json.JSONDecodeError, AttributeError):
            quotation_message = ''
    
    
    project.quotation_message = quotation_message
    if quotation_file:
        project.quotation_file = quotation_file
    project.status = 'quotation_submitted'
    project.save()
    
    return JsonResponse(serialize_project(project))


@router.post("/{project_id}/accept-quotation", response=ProjectResponseSchema, auth=auth)
def accept_quotation(request, project_id: int):
    """Accept quotation (client only)"""
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    if not user.is_client() or project.client != user:
        return {"error": "Permission denied"}, 403
    
    if project.project_type != 'commercial':
        return {"error": "Quotation can only be accepted for commercial projects"}, 400
    
    if not project.quotation_message:
        return {"error": "No quotation available to accept"}, 400
    
    project.quotation_accepted = True
    project.status = 'planning'
    project.save()
    
    return serialize_project(project)


@router.post("/{project_id}/reject-quotation", response=ProjectResponseSchema, auth=auth)
def reject_quotation(request, project_id: int):
    """Reject quotation with feedback (client only)"""
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    if not user.is_client() or project.client != user:
        return {"error": "Permission denied"}, 403
    
    if project.project_type != 'commercial':
        return {"error": "Quotation can only be rejected for commercial projects"}, 400
    
    if not project.quotation_message:
        return {"error": "No quotation available to reject"}, 400
    
    # Get feedback message from request body
    import json
    try:
        body = json.loads(request.body)
        feedback_message = body.get('feedback_message', '')
    except (json.JSONDecodeError, AttributeError):
        feedback_message = ''
    
    project.feedback_message = feedback_message
    project.quotation_accepted = False
    project.save()
    
    return serialize_project(project)