import { ProjectUpdate } from '@/types';

const API_BASE = '/api/project-updates';

export const projectUpdatesApi = {
  // Get all updates
  getAll: async (): Promise<ProjectUpdate[]> => {
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error('Failed to fetch project updates');
      const data = await response.json();
      return data.updates;
    } catch (error) {
      console.error('Error fetching project updates:', error);
      return [];
    }
  },

  // Get updates by project ID
  getByProjectId: async (projectId: string): Promise<ProjectUpdate[]> => {
    try {
      const response = await fetch(`${API_BASE}?projectId=${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project updates');
      const data = await response.json();
      return data.updates;
    } catch (error) {
      console.error('Error fetching project updates:', error);
      return [];
    }
  },

  // Get single update
  getById: async (id: string): Promise<ProjectUpdate | null> => {
    try {
      const response = await fetch(`${API_BASE}/${id}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.update;
    } catch (error) {
      console.error('Error fetching project update:', error);
      return null;
    }
  },

  // Create new update
  create: async (updateData: {
    projectId: string;
    userId: string;
    type: 'design' | 'file' | 'comment';
    title: string;
    description?: string;
    fileUrl?: string;
  }): Promise<ProjectUpdate | null> => {
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project update');
      }
      
      const data = await response.json();
      return data.update;
    } catch (error) {
      console.error('Error creating project update:', error);
      throw error;
    }
  },

  // Update project update
  update: async (id: string, updateData: Partial<ProjectUpdate>): Promise<ProjectUpdate | null> => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update project update');
      }
      
      const data = await response.json();
      return data.update;
    } catch (error) {
      console.error('Error updating project update:', error);
      throw error;
    }
  },

  // Delete project update
  delete: async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error deleting project update:', error);
      return false;
    }
  },
};