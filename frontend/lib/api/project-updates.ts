import { ProjectUpdate } from '@/types';
import { getCookie } from '@/lib/cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const projectUpdatesApi = {
  // Get all updates
  getAll: async (updateData: { projectId: string }): Promise<ProjectUpdate[]> => {
    try {
      const token = getCookie('auth_token');
      const response = await fetch(`${API_BASE_URL}/projects/${updateData.projectId}/updates`, {
        credentials: 'include',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
      });
      if (!response.ok) throw new Error('Failed to fetch project updates');
      const data = await response.json();
      return Array.isArray(data) ? data : data.updates || [];
    } catch (error) {
      console.error('Error fetching project updates:', error);
      return [];
    }
  },

  // Get updates by project ID
  getByProjectId: async (updateData: { projectId: string }): Promise<ProjectUpdate[]> => {
    try {
      const token = getCookie('auth_token');
      const response = await fetch(`${API_BASE_URL}/projects/${updateData.projectId}/updates`, {
        credentials: 'include',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
      });
      if (!response.ok) throw new Error('Failed to fetch project updates');
      const data = await response.json();
      return Array.isArray(data) ? data : data.updates || [];
    } catch (error) {
      console.error('Error fetching project updates:', error);
      return [];
    }
  },

  // Get updates by user ID
  getByUserId: async (updateData: { projectId: string; userId: string }): Promise<ProjectUpdate[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${updateData.projectId}/updates?userId=${updateData.userId}`);
      if (!response.ok) throw new Error('Failed to fetch project updates');
      const data = await response.json();
      return data.updates;
    } catch (error) {
      console.error('Error fetching project updates:', error);
      return [];
    }
  },

  // Get single update
  getById: async (updateData: { projectId: string; id: string }): Promise<ProjectUpdate | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${updateData.projectId}/updates/${updateData.id}`);
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
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  }): Promise<ProjectUpdate | null> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${updateData.projectId}/updates`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );
      
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
  update: async (updateData: { projectId: string; id: string; updateData: Partial<ProjectUpdate> }): Promise<ProjectUpdate | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${updateData.projectId}/updates/${updateData.id}`, {
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
  delete: async (updateData: { projectId: string; id: string }): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${updateData.projectId}/updates/${updateData.id}`, {
        method: 'DELETE',
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error deleting project update:', error);
      return false;
    }
  },
};