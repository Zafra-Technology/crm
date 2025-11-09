import { getAuthToken } from '@/lib/auth';
import { projectsApi } from '@/lib/api/projects';
import type { Project } from '@/types';

export interface ProjectAhj {
  id: number;
  ahj: string | null;
  country: string | null;
  us_state: string | null;
  electric_code?: string | null;
  building_code?: string | null;
  residential_code?: string | null;
  fire_code?: string | null;
  wind_speed_mph?: string | null;
  snow_load_psf?: string | null;
  fire_setback_required?: boolean | null;
  building_department_web?: string | null;
  site_plan?: string | null;
  structural_notes?: string | null;
  electrical_notes?: string | null;
  placards_notes?: string | null;
  files?: any[] | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export const ahjApi = {
  async list(): Promise<ProjectAhj[]> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/projects/ahj/`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to load AHJ list');
    return res.json();
  },

  async create(payload: {
    ahj: string;
    country?: string | null;
    us_state?: string | null;
    electric_code?: string | null;
    building_code?: string | null;
    residential_code?: string | null;
    fire_code?: string | null;
    wind_speed_mph?: string | null;
    snow_load_psf?: string | null;
    fire_setback_required?: boolean | null;
    building_department_web?: string | null;
    site_plan?: string | null;
    structural_notes?: string | null;
    electrical_notes?: string | null;
    placards_notes?: string | null;
    files?: any[] | null;
  }): Promise<ProjectAhj> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/projects/ahj/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create AHJ');
    return res.json();
  },

  async get(id: number): Promise<any> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/projects/ahj/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to load AHJ details');
    return res.json();
  },

  async update(id: number, payload: any): Promise<any> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/projects/ahj/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update AHJ');
    return res.json();
  },

  async getCodes(state?: string, country?: string): Promise<{ electric: string[]; building: string[]; residential: string[]; fire: string[] }> {
    const token = await getAuthToken();
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (country) params.append('country', country);
    const q = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/projects/ahj-codes${q}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to load codes');
    return res.json();
  },

  // Get projects linked to a given AHJ
  async getProjects(ahjId: number): Promise<Project[]> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/projects/ahj/${ahjId}/projects`, {
      headers: {
        'Accept': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [];
    return arr.map((p: any) => projectsApi._mapApiProject(p));
  },

  // Get project AHJs
  async getProjectAhjs(projectId: number): Promise<ProjectAhj[]> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/projects/${projectId}/ahj/`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      // If endpoint doesn't exist yet, return empty array
      if (res.status === 404) return [];
      throw new Error('Failed to load project AHJs');
    }
    return res.json();
  },

  // Add AHJs to project
  async addToProject(projectId: number, ahjIds: number[]): Promise<ProjectAhj[]> {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/projects/${projectId}/ahj/add/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ahj_ids: ahjIds }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || 'Failed to add AHJs to project');
      }
      return await res.json();
    } catch (error) {
      console.error('Error adding AHJs to project:', error);
      throw error;
    }
  },

  // Remove AHJ from project
  async removeFromProject(projectId: number, ahjId: number): Promise<boolean> {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/projects/${projectId}/ahj/remove/${ahjId}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return res.ok;
    } catch (error) {
      console.error('Error removing AHJ from project:', error);
      return false;
    }
  },

  // Delete AHJ
  async delete(id: number): Promise<void> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/projects/ahj/${id}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || 'Failed to delete AHJ');
    }
  },
};

 
