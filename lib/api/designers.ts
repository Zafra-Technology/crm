import { Designer } from '@/types/designer';

const API_BASE = '/api/designers';

export const designersApi = {
  // Get all designers
  getAll: async (): Promise<Designer[]> => {
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error('Failed to fetch designers');
      const data = await response.json();
      return data.designers;
    } catch (error) {
      console.error('Error fetching designers:', error);
      return [];
    }
  },

  // Search designers
  search: async (searchTerm: string): Promise<Designer[]> => {
    try {
      const response = await fetch(`${API_BASE}?search=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error('Failed to search designers');
      const data = await response.json();
      return data.designers;
    } catch (error) {
      console.error('Error searching designers:', error);
      return [];
    }
  },

  // Get single designer
  getById: async (id: string): Promise<Designer | null> => {
    try {
      const response = await fetch(`${API_BASE}/${id}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.designer;
    } catch (error) {
      console.error('Error fetching designer:', error);
      return null;
    }
  },

  // Create new designer
  create: async (designerData: Omit<Designer, 'id' | 'status' | 'joinedDate' | 'projectsCount'>): Promise<Designer | null> => {
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(designerData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create designer');
      }
      
      const data = await response.json();
      return data.designer;
    } catch (error) {
      console.error('Error creating designer:', error);
      throw error;
    }
  },

  // Update designer
  update: async (id: string, updateData: Partial<Designer>): Promise<Designer | null> => {
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
        throw new Error(error.error || 'Failed to update designer');
      }
      
      const data = await response.json();
      return data.designer;
    } catch (error) {
      console.error('Error updating designer:', error);
      throw error;
    }
  },

  // Delete designer
  delete: async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error deleting designer:', error);
      return false;
    }
  },

  // Toggle designer status
  toggleStatus: async (id: string, currentStatus: 'active' | 'inactive'): Promise<Designer | null> => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    return await designersApi.update(id, { status: newStatus });
  },
};