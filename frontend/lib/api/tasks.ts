import { Task } from '@/components/tasks/KanbanBoard';
import { getCookie } from '@/lib/cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
// Django with APPEND_SLASH expects trailing slash for collection routes
const getAuthHeaders = () => {
  const token = getCookie('auth_token');
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  } as Record<string, string>;
};

export const tasksApi = {
  _mapApiTask(p: any): Task {
    return {
      id: String(p.id),
      projectId: String(p.project_id ?? p.projectId ?? ''),
      title: String(p.title ?? ''),
      description: String(p.description ?? ''),
      assigneeId: p.assignee_id != null ? String(p.assignee_id) : '',
      assigneeName: '',
      createdBy: p.created_by_id != null ? String(p.created_by_id) : '',
      createdByName: '',
      status: (p.status ?? 'todo') as Task['status'],
      priority: (p.priority ?? 'medium') as Task['priority'],
      dueDate: p.due_date ? String(p.due_date) : undefined,
      createdAt: String(p.created_at ?? new Date().toISOString()),
      updatedAt: String(p.updated_at ?? new Date().toISOString()),
      attachments: Array.isArray(p.attachments) ? p.attachments : [],
      comments: Array.isArray(p.comments) ? p.comments : [],
    };
  },

  async getByProject(projectId: string): Promise<Task[]> {
    console.log('🔍 Loading tasks for project:', projectId);
    try {
      const url = `${API_BASE_URL}/projects/${projectId}/tasks`;
      console.log('GET tasks URL:', url);
      const response = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) throw new Error(`Failed to fetch project tasks: ${response.status}`);
      const data = await response.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const tasks = arr.map(this._mapApiTask);
      console.log('✅ Found tasks for project:', tasks.length);
      return tasks;
    } catch (error) {
      console.error('❌ Error fetching project tasks:', error);
      return [];
    }
  },

  // Get all tasks for the current user (optimized bulk endpoint)
  async getByAssignee(assigneeId: string): Promise<Task[]> {
    console.log('🎯 Loading tasks for assignee (bulk endpoint):', assigneeId);
    try {
      const url = `${API_BASE_URL}/projects/tasks/bulk`;
      console.log('GET bulk tasks URL:', url);
      const response = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) throw new Error(`Failed to fetch user tasks: ${response.status}`);
      const data = await response.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const tasks = arr.map(this._mapApiTask);
      console.log('✅ Found user tasks:', tasks.length);
      return tasks;
    } catch (error) {
      console.error('❌ Error fetching assignee tasks:', error);
      return [];
    }
  },

  async updateStatus(taskId: string, status: Task['status']): Promise<Task> {
    console.log('🔄 Updating task status:', { taskId, status });
    try {
      const url = `${API_BASE_URL}/projects/tasks/${taskId}`;
      console.log('PUT task URL:', url);
      const response = await fetch(url, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error(`Failed to update task status: ${response.status}`);
      const updatedTask = await response.json();
      console.log('✅ Task status updated successfully');
      return this._mapApiTask(updatedTask);
    } catch (error) {
      console.error('❌ Error updating task status:', error);
      throw error;
    }
  },

  async create(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { projectId: string }): Promise<Task> {
    console.log('🚀 Creating new task:', taskData);
    try {
      const url = `${API_BASE_URL}/projects/${taskData.projectId}/tasks`;
      console.log('POST task URL:', url);
      // Map camelCase → snake_case for backend
      const payload: any = {
        title: taskData.title,
        description: taskData.description || '',
        status: taskData.status,
        priority: taskData.priority,
        assignee_id: taskData.assigneeId ? Number(taskData.assigneeId) : null,
        due_date: taskData.dueDate ? taskData.dueDate.split('T')[0] : null,
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Failed to create task: ${response.status} ${errorText}`);
      }
      const newTask = await response.json();
      console.log('✅ Task created in database:', newTask.id);

      // If assignee was provided (allowed to be set via update), set it now
      if (taskData.assigneeId) {
        try {
          const assignUrl = `${API_BASE_URL}/projects/tasks/${newTask.id}`;
          console.log('PUT assign task URL:', assignUrl);
          const assignRes = await fetch(assignUrl, {
            method: 'PUT',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify({ assignee_id: Number(taskData.assigneeId) })
          });
          if (assignRes.ok) {
            const assignedTask = await assignRes.json();
            return this._mapApiTask(assignedTask);
          } else {
            console.warn('⚠️ Failed to set assignee on create, proceeding with created task');
          }
        } catch (e) {
          console.warn('⚠️ Error setting assignee after create:', e);
        }
      }

      return this._mapApiTask(newTask);
    } catch (error) {
      console.error('❌ Error creating task:', error);
      throw error;
    }
  },

  async update(taskId: string, updates: Partial<Task>): Promise<Task> {
    console.log('🔧 Updating task:', { taskId, updates });
    const url = `${API_BASE_URL}/projects/tasks/${taskId}`;
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.status !== undefined) payload.status = updates.status;
    if ((updates as any).priority !== undefined) payload.priority = (updates as any).priority;
    if ((updates as any).assigneeId !== undefined) payload.assignee_id = Number((updates as any).assigneeId);
    if (updates.dueDate !== undefined) payload.due_date = updates.dueDate ? updates.dueDate.split('T')[0] : null;

    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to update task: ${response.status} ${errorText}`);
    }
    const updated = await response.json();
    return this._mapApiTask(updated);
  },

  async delete(taskId: string): Promise<void> {
    console.log('Deleting task (legacy placeholder):', taskId);
    throw new Error('Not implemented');
  }
};