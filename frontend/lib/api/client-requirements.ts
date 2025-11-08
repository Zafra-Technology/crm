import { getAuthToken } from '@/lib/auth';

export interface ClientRequirement {
  id: number;
  client_name: string | null;
  other?: string | null;
  layout?: string | null;
  structural?: string | null;
  electrical?: string | null;
  files?: any[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  file_count?: number;
}

export interface CreateClientRequirementData {
  client_name: string;
  other?: string;
  layout?: string;
  structural?: string;
  electrical?: string;
  files?: any[];
}

export interface UpdateClientRequirementData {
  client_name?: string;
  other?: string;
  layout?: string;
  structural?: string;
  electrical?: string;
  files?: any[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export const clientRequirementsApi = {
  async list(): Promise<ClientRequirement[]> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/projects/client-requirements/`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error('Failed to load client requirements');
    }
    const data = await res.json();
    // Calculate file count for each requirement
    return (Array.isArray(data) ? data : []).map((req: ClientRequirement) => ({
      ...req,
      file_count: Array.isArray(req.files) ? req.files.length : 0,
    }));
  },

  async create(payload: CreateClientRequirementData): Promise<ClientRequirement> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/projects/client-requirements/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || 'Failed to create client requirement');
    }
    const data = await res.json();
    return {
      ...data,
      file_count: Array.isArray(data.files) ? data.files.length : 0,
    };
  },

  async get(id: number): Promise<ClientRequirement> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/projects/client-requirements/${id}/`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to load client requirement details');
    const data = await res.json();
    return {
      ...data,
      file_count: Array.isArray(data.files) ? data.files.length : 0,
    };
  },

  async update(id: number, payload: UpdateClientRequirementData): Promise<ClientRequirement> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/projects/client-requirements/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || 'Failed to update client requirement');
    }
    const data = await res.json();
    return {
      ...data,
      file_count: Array.isArray(data.files) ? data.files.length : 0,
    };
  },

  async delete(id: number): Promise<boolean> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/projects/client-requirements/${id}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.ok;
  },

  // Link client requirement to project
  async linkToProject(projectId: number, requirementId: number | null): Promise<any> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/projects/${projectId}/client-requirement/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ client_requirement_id: requirementId }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || 'Failed to link client requirement to project');
    }
    const data = await res.json();
    console.log('linkToProject: Raw response from backend:', {
      id: data.id,
      client_requirements_id: data.client_requirements_id,
      all_keys: Object.keys(data),
      full_data: data
    });
    return data;
  },

  // Unlink client requirement from project
  async unlinkFromProject(projectId: number): Promise<any> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/projects/${projectId}/client-requirement/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || 'Failed to unlink client requirement from project');
    }
    return await res.json();
  },

  // Get projects linked to a client requirement
  async getProjects(requirementId: number): Promise<any[]> {
    const token = await getAuthToken();
    const url = `${API_BASE}/projects/client-requirements/${requirementId}/projects/`;
    console.log('getProjects: Fetching from URL:', url);
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
    console.log('getProjects: Response status:', res.status, res.statusText);
    if (!res.ok) {
      if (res.status === 404) {
        console.log('getProjects: 404 - No projects found');
        return [];
      }
      const errorText = await res.text();
      console.error('getProjects: Error response:', errorText);
      throw new Error('Failed to load projects');
    }
    const data = await res.json();
    console.log('getProjects: Received data:', data);
    return Array.isArray(data) ? data : [];
  },
};

