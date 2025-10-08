import { Task } from '@/components/tasks/KanbanBoard';

// Real tasks storage - no mock data
const mockTasks: Task[] = [];

export const tasksApi = {
  async getByProject(projectId: string): Promise<Task[]> {
    console.log('🔍 Loading tasks for project:', projectId);
    
    try {
      const response = await fetch(`/api/tasks?projectId=${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project tasks');
      
      const tasks = await response.json();
      console.log('✅ Found tasks for project:', tasks.length);
      console.log('📝 Task titles:', tasks.map((t: Task) => t.title));
      
      return tasks;
    } catch (error) {
      console.error('❌ Error fetching project tasks:', error);
      return [];
    }
  },

  async getByAssignee(assigneeId: string): Promise<Task[]> {
    console.log('🎯 Loading tasks for assignee:', assigneeId);
    
    try {
      const response = await fetch(`/api/tasks?assigneeId=${assigneeId}`);
      if (!response.ok) throw new Error('Failed to fetch assignee tasks');
      
      const tasks = await response.json();
      console.log('✅ Found assigned tasks:', tasks.length);
      console.log('📝 Assigned task titles:', tasks.map((t: Task) => t.title));
      
      return tasks;
    } catch (error) {
      console.error('❌ Error fetching assignee tasks:', error);
      return [];
    }
  },

  async updateStatus(taskId: string, status: Task['status']): Promise<Task> {
    console.log('🔄 Updating task status:', { taskId, status });
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId, status }),
      });
      
      if (!response.ok) throw new Error('Failed to update task status');
      
      const updatedTask = await response.json();
      console.log('✅ Task status updated successfully');
      return updatedTask;
    } catch (error) {
      console.error('❌ Error updating task status:', error);
      throw error;
    }
  },

  async create(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    console.log('🚀 Creating new task:', taskData);
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });
      
      if (!response.ok) throw new Error('Failed to create task');
      
      const newTask = await response.json();
      console.log('✅ Task created in database:', newTask.id);
      
      return newTask;
    } catch (error) {
      console.error('❌ Error creating task:', error);
      throw error;
    }
  },

  async update(taskId: string, updates: Partial<Task>): Promise<Task> {
    console.log('Updating task:', { taskId, updates });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const taskIndex = mockTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }
    
    mockTasks[taskIndex] = {
      ...mockTasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    console.log('Task updated successfully');
    return mockTasks[taskIndex];
  },

  async delete(taskId: string): Promise<void> {
    console.log('Deleting task:', taskId);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const taskIndex = mockTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }
    
    mockTasks.splice(taskIndex, 1);
    console.log('Task deleted successfully');
  }
};