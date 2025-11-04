import { getCookie } from '@/lib/cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_BASE = `${API_BASE_URL}/utilities/`;

const getAuthHeaders = () => {
  const token = getCookie('auth_token');
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  } as Record<string, string>;
};

export interface Utility {
  id: number;
  model_name: string;
  category: 'Inventor' | 'Module' | 'Mounting' | 'Battery';
  created_at?: string;
  updated_at?: string;
}

export interface CreateUtilityData {
  model_name: string;
  category: 'Inventor' | 'Module' | 'Mounting' | 'Battery';
}

export const utilitiesApi = {
  // Get all utilities
  getAll: async (): Promise<Utility[]> => {
    try {
      const res = await fetch(API_BASE, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch utilities');
      }
      const data = await res.json();
      // Handle both array and object with results property
      return Array.isArray(data) ? data : (data.results || data.utilities || []);
    } catch (error) {
      console.error('Error fetching utilities:', error);
      return [];
    }
  },

  // Create a new utility
  create: async (utilityData: CreateUtilityData): Promise<Utility | null> => {
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify(utilityData),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || 'Failed to create utility');
      }
      return await res.json();
    } catch (error) {
      console.error('Error creating utility:', error);
      throw error;
    }
  },

  // Update a utility
  update: async (id: number, utilityData: Partial<CreateUtilityData>): Promise<Utility | null> => {
    try {
      const res = await fetch(`${API_BASE}${id}/`, {
        method: 'PUT',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify(utilityData),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || 'Failed to update utility');
      }
      return await res.json();
    } catch (error) {
      console.error('Error updating utility:', error);
      throw error;
    }
  },

  // Delete a utility
  delete: async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch (error) {
      console.error('Error deleting utility:', error);
      return false;
    }
  },

  // Get utilities by category
  getByCategory: async (category: 'Inventor' | 'Module' | 'Mounting' | 'Battery'): Promise<Utility[]> => {
    try {
      const res = await fetch(`${API_BASE}?category=${category}`, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch utilities');
      }
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results || data.utilities || []);
    } catch (error) {
      console.error('Error fetching utilities by category:', error);
      return [];
    }
  },

  // Get project utilities
  getProjectUtilities: async (projectId: number, category?: string): Promise<Utility[]> => {
    try {
      const url = category 
        ? `${API_BASE}project/${projectId}/?category=${category}`
        : `${API_BASE}project/${projectId}/`;
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch project utilities');
      }
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      console.error('Error fetching project utilities:', error);
      return [];
    }
  },

  // Add utilities to project
  addToProject: async (projectId: number, utilityIds: number[]): Promise<Utility[]> => {
    try {
      const res = await fetch(`${API_BASE}project/${projectId}/add/`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ utility_ids: utilityIds }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || 'Failed to add utilities to project');
      }
      return await res.json();
    } catch (error) {
      console.error('Error adding utilities to project:', error);
      throw error;
    }
  },

  // Remove utility from project
  removeFromProject: async (projectId: number, utilityId: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}project/${projectId}/remove/${utilityId}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch (error) {
      console.error('Error removing utility from project:', error);
      return false;
    }
  },
};

