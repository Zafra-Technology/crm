import { getCookie } from '@/lib/cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_BASE = `${API_BASE_URL}/equipments/`;

const getAuthHeaders = () => {
  const token = getCookie('auth_token');
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  } as Record<string, string>;
};

export interface Equipment {
  id: number;
  model_name: string;
  category: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateEquipmentData {
  model_name: string;
  category: string;
}

export const equipmentsApi = {
  // Get equipment by ID
  getById: async (id: number): Promise<Equipment> => {
    try {
      const res = await fetch(`${API_BASE}${id}/`, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error('Failed to fetch equipment');
      }
      return await res.json();
    } catch (error) {
      console.error('Error fetching equipment:', error);
      throw error;
    }
  },

  // Get all equipments
  getAll: async (): Promise<Equipment[]> => {
    try {
      const res = await fetch(API_BASE, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch equipments');
      }
      const data = await res.json();
      // Handle both array and object with results property
      return Array.isArray(data) ? data : (data.results || data.equipments || []);
    } catch (error) {
      console.error('Error fetching equipments:', error);
      return [];
    }
  },

  // Create a new equipment
  create: async (equipmentData: CreateEquipmentData): Promise<Equipment | null> => {
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify(equipmentData),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || 'Failed to create equipment');
      }
      return await res.json();
    } catch (error) {
      console.error('Error creating equipment:', error);
      throw error;
    }
  },

  // Update an equipment
  update: async (id: number, equipmentData: Partial<CreateEquipmentData>): Promise<Equipment | null> => {
    try {
      const res = await fetch(`${API_BASE}${id}/`, {
        method: 'PUT',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify(equipmentData),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || 'Failed to update equipment');
      }
      return await res.json();
    } catch (error) {
      console.error('Error updating equipment:', error);
      throw error;
    }
  },

  // Delete an equipment
  delete: async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch (error) {
      console.error('Error deleting equipment:', error);
      return false;
    }
  },

  // Get available categories
  getCategories: async (): Promise<string[]> => {
    try {
      const res = await fetch(`${API_BASE}categories/`, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await res.json();
      return data.categories || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  // Get equipments by category
  getByCategory: async (category: string): Promise<Equipment[]> => {
    try {
      const res = await fetch(`${API_BASE}?category=${category}`, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch equipments');
      }
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results || data.equipments || []);
    } catch (error) {
      console.error('Error fetching equipments by category:', error);
      return [];
    }
  },

  // Get project equipments
  getProjectEquipments: async (projectId: number, category?: string): Promise<Equipment[]> => {
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
        throw new Error('Failed to fetch project equipments');
      }
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      console.error('Error fetching project equipments:', error);
      return [];
    }
  },

  // Add equipments to project
  addToProject: async (projectId: number, equipmentIds: number[]): Promise<Equipment[]> => {
    try {
      const res = await fetch(`${API_BASE}project/${projectId}/add/`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ equipment_ids: equipmentIds }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || 'Failed to add equipments to project');
      }
      return await res.json();
    } catch (error) {
      console.error('Error adding equipments to project:', error);
      throw error;
    }
  },

  // Remove equipment from project
  removeFromProject: async (projectId: number, equipmentId: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}project/${projectId}/remove/${equipmentId}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch (error) {
      console.error('Error removing equipment from project:', error);
      return false;
    }
  },

  // Get attachments for an equipment
  getAttachments: async (equipmentId: number): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE}${equipmentId}/attachments/`, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch equipment attachments');
      }
      return await res.json();
    } catch (error) {
      console.error('Error fetching equipment attachments:', error);
      return [];
    }
  },

  // Upload files for an equipment
  uploadFiles: async (equipmentId: number, files: File[]): Promise<void> => {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const token = getCookie('auth_token');
      const res = await fetch(`${API_BASE}${equipmentId}/attachments/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || 'Failed to upload files');
      }
    } catch (error) {
      console.error('Error uploading equipment files:', error);
      throw error;
    }
  },

  // Delete an attachment
  deleteAttachment: async (equipmentId: number, attachmentId: number): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}${equipmentId}/attachments/${attachmentId}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error('Failed to delete attachment');
      }
    } catch (error) {
      console.error('Error deleting equipment attachment:', error);
      throw error;
    }
  },

  // Get projects that have this equipment
  getProjects: async (equipmentId: number): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE}${equipmentId}/projects/`, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch equipment projects');
      }
      return await res.json();
    } catch (error) {
      console.error('Error fetching equipment projects:', error);
      return [];
    }
  },
};

