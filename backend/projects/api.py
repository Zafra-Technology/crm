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


@router.get("/", response=List[ProjectResponseSchema], auth=auth)
@paginate
def list_projects(request, status: str = None):
    """List projects based on user role"""
    user = request.auth
    
    if user.is_admin() or user.is_superuser:
        queryset = Project.objects.all()
    elif user.is_project_manager():
        queryset = Project.objects.filter(manager=user)
    elif user.is_designer():
        queryset = Project.objects.filter(designers=user)
    elif user.is_client():
        queryset = Project.objects.filter(client=user)
    else:
        queryset = Project.objects.none()
    
    if status:
        queryset = queryset.filter(status=status)
    
    return queryset


@router.post("/", response=ProjectResponseSchema, auth=auth)
def create_project(request, data: ProjectCreateSchema):
    """Create new project (admin and project manager only)"""
    user = request.auth
    
    if not (user.is_admin() or user.is_project_manager() or user.is_superuser):
        return {"error": "Permission denied"}, 403
    
    project_data = data.dict()
    designer_ids = project_data.pop('designer_ids', [])
    
    project = Project.objects.create(**project_data)
    
    if designer_ids:
        project.designers.set(designer_ids)
    
    return ProjectResponseSchema.from_orm(project)


@router.get("/{project_id}", response=ProjectResponseSchema, auth=auth)
def get_project(request, project_id: int):
    """Get specific project details"""
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    # Check permissions
    if not (user.is_admin() or user.is_superuser or 
            project.manager == user or 
            project.client == user or 
            user in project.designers.all()):
        return {"error": "Permission denied"}, 403
    
    return ProjectResponseSchema.from_orm(project)


@router.put("/{project_id}", response=ProjectResponseSchema, auth=auth)
def update_project(request, project_id: int, data: ProjectUpdateSchema):
    """Update project (admin and project manager only)"""
    user = request.auth
    project = get_object_or_404(Project, id=project_id)
    
    if not (user.is_admin() or user.is_superuser or project.manager == user):
        return {"error": "Permission denied"}, 403
    
    update_data = data.dict(exclude_unset=True)
    designer_ids = update_data.pop('designer_ids', None)
    
    for field, value in update_data.items():
        setattr(project, field, value)
    
    project.save()
    
    if designer_ids is not None:
        project.designers.set(designer_ids)
    
    return ProjectResponseSchema.from_orm(project)


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
    if not (user.is_admin() or user.is_superuser or 
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
    if not (user.is_admin() or user.is_superuser or 
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