import { getCookie } from '@/lib/cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_BASE = `${API_BASE_URL}/chat`;

const getAuthHeaders = () => {
  const token = getCookie('auth_token');
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  } as Record<string, string>;
};

export interface GroupOut {
  id: number;
  name: string;
  image_url?: string | null;
  member_ids: number[];
  created_by: number;
}

export interface GroupMessageOut {
  id: number;
  group_id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  message: string;
  message_type: string;
  timestamp: string;
  file_name?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  file_url?: string | null;
}

export const groupChatApi = {
  listGroups: async (): Promise<GroupOut[]> => {
    const res = await fetch(`${API_BASE}/groups/`, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  createGroup: async (payload: { name: string; member_ids: number[]; image_base64?: string | null }): Promise<GroupOut | null> => {
    const res = await fetch(`${API_BASE}/groups/`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return res.json();
  },

  getMessages: async (groupId: number): Promise<GroupMessageOut[]> => {
    const res = await fetch(`${API_BASE}/groups/${groupId}/messages/`, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  sendMessage: async (groupId: number, message: { message?: string; message_type?: string; file_name?: string | null; file_size?: number | null; file_type?: string | null; file_url?: string | null; }): Promise<GroupMessageOut | null> => {
    const res = await fetch(`${API_BASE}/groups/${groupId}/messages/`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify(message),
    });
    if (!res.ok) return null;
    return res.json();
  },

  addMember: async (groupId: number, userId: number): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/groups/${groupId}/add_member/`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId }),
    });
    return res.ok;
  },

  removeMember: async (groupId: number, userId: number): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/groups/${groupId}/remove_member/`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId }),
    });
    return res.ok;
  },
};


