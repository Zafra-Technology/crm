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

export interface ProjectChatUnreadCounts {
  client: number;
  team: number;
  professional_engineer: number;
}

export const projectChatApi = {
  /**
   * Get unread message counts for each chat type in a project
   */
  getUnreadCounts: async (projectId: string): Promise<ProjectChatUnreadCounts> => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/project/${projectId}/unread-counts`, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        console.error('Failed to fetch unread counts:', res.status);
        return { client: 0, team: 0, professional_engineer: 0 };
      }
      return res.json();
    } catch (error) {
      console.error('Error fetching unread counts:', error);
      return { client: 0, team: 0, professional_engineer: 0 };
    }
  },

  /**
   * Mark a specific chat type as read for the current user
   */
  markAsRead: async (projectId: string, chatType: 'client' | 'team' | 'professional_engineer'): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/project/${projectId}/mark-read`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ chat_type: chatType }),
      });
      return res.ok;
    } catch (error) {
      console.error('Error marking chat as read:', error);
      return false;
    }
  },
};

