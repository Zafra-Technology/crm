from ninja import Router
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

    # Debug print for designers
    try:
        ids_debug = list(project.designers.values_list('id', flat=True))
        print(f"[ProjectsAPI] serialize_project: project_id={project.id} designer_ids={ids_debug} count={len(ids_debug)}")
    except Exception as e:
        print(f"[ProjectsAPI] serialize_project: project_id={getattr(project,'id',None)} designer_ids=error: {e}")

    return {
        "id": project.id,
        "name": project.name,
        "description": getattr(project, "description", ""),
        "requirements": getattr(project, "requirements", ""),
        "timeline": getattr(project, "timeline", ""),
        "status": getattr(project, "status", "planning"),
        "client_id": getattr(project, "client_id", None),
        "manager_id": getattr(project, "manager_id", None),
        # Use explicit list of ids obtained earlier to avoid Djongo eval quirks
        "designer_ids": ids_debug,
        "designer_count": len(ids_debug),
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
    """Create new project (admin and project manager only)"""
    user = request.auth
    
    if not (user.is_admin() or user.is_project_manager() or user.is_superuser):
        return {"error": "Permission denied"}, 403
    
    project_data = data.dict()
    designer_ids = project_data.pop('designer_ids', [])
    
    project = Project.objects.create(**project_data)
    try:
        # Debug: confirm attachments state after create
        from .models import ProjectAttachment as _PA
        _count = _PA.objects.filter(project=project).count()
        print(f"[ProjectsAPI] create_project: project_id={project.id} attachments_incoming=0 attachments_saved={_count}")
    except Exception as e:
        print(f"[ProjectsAPI] create_project debug error: {e}")
    
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
        try:
            print(f"[ProjectsAPI] update_project incoming attachments: project_id={project.id} count={len(attachments)}")
        except Exception:
            print(f"[ProjectsAPI] update_project incoming attachments: project_id={project.id} count=? (len failed)")
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
        try:
            saved_count = ProjectAttachment.objects.filter(project=project).count()
            print(f"[ProjectsAPI] update_project saved attachments: project_id={project.id} saved_count={saved_count}")
        except Exception as e:
            print(f"[ProjectsAPI] update_project count error: {e}")
    
    if designer_ids is not None:
        project.designers.set(designer_ids)
        try:
            print(f"[ProjectsAPI] update_project designers set: project_id={project.id} designer_ids={list(project.designers.values_list('id', flat=True))}")
        except Exception as e:
            print(f"[ProjectsAPI] update_project designers set error: {e}")

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