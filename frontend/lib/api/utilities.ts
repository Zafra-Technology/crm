import { getAuthToken } from '@/lib/auth';

export interface Utility {
  id: number;
  utility_name: string | null;
  utility_websites?: string[];
  site_plan_requirements?: string | null;
  electrical_plan_requirements?: string | null;
  other_plan_requirements?: string | null;
  files?: any[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export const utilitiesApi = {
  async list(): Promise<Utility[]> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/utilities/`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to load utilities list');
    return res.json();
  },

  async create(payload: { utility_name: string }): Promise<Utility> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/utilities/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create utility');
    return res.json();
  },

  async get(id: number): Promise<any> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/utilities/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to load utility details');
    return res.json();
  },

  async update(id: number, payload: {
    utility_name?: string;
    utility_websites?: string[];
    site_plan_requirements?: string;
    electrical_plan_requirements?: string;
    other_plan_requirements?: string;
  }): Promise<Utility> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/utilities/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update utility');
    return res.json();
  },

  async uploadFiles(utilityId: number, files: File[]): Promise<void> {
    const token = await getAuthToken();
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const res = await fetch(`${API_BASE}/utilities/${utilityId}/attachments/`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || 'Failed to upload files');
    }
  },

  async deleteAttachment(utilityId: number, attachmentId: number): Promise<void> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/utilities/${utilityId}/attachments/${attachmentId}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      throw new Error('Failed to delete attachment');
    }
  },

  // Get utilities linked to a project
  async getProjectUtilities(projectId: number): Promise<Utility[]> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/utilities/project/${projectId}/`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error('Failed to load project utilities');
    }
    return res.json();
  },

  // Add utilities to a project
  async addToProject(projectId: number, utilityIds: number[]): Promise<Utility[]> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/utilities/project/${projectId}/add/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ utility_ids: utilityIds }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || 'Failed to add utilities to project');
    }
    return res.json();
  },

  // Remove utility from project
  async removeFromProject(projectId: number, utilityId: number): Promise<boolean> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/utilities/project/${projectId}/remove/${utilityId}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.ok;
  },

  // Delete utility
  async delete(id: number): Promise<void> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/utilities/${id}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || 'Failed to delete utility');
    }
  },
};

