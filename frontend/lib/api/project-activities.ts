import { getCookie } from '@/lib/cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getAuthHeaders = () => {
  const token = getCookie('auth_token');
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  } as Record<string, string>;
};

export interface ProjectActivity {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userRole: string;
  activityType: 'field_update' | 'status_change' | 'designer_assigned' | 'designer_removed' | 'attachment_added' | 'attachment_removed' | 'file_uploaded';
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
  createdAt: string;
}

export const projectActivitiesApi = {
  /**
   * Get all activities for a project
   * Only visible to admin, project_manager, and assistant_project_manager
   */
  getByProject: async (projectId: string): Promise<ProjectActivity[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/activities`, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        console.error('Failed to fetch project activities:', res.status);
        return [];
      }
      return res.json();
    } catch (error) {
      console.error('Error fetching project activities:', error);
      return [];
    }
  },
};

