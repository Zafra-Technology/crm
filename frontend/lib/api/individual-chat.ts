import { getCookie } from '@/lib/cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_BASE = `${API_BASE_URL}/chat/individual`;

const getAuthHeaders = () => {
  const token = getCookie('auth_token');
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  } as Record<string, string>;
};

export interface IndividualMessageOut {
  id: number;
  sender_id: number;
  recipient_id: number;
  sender_name: string;
  message: string;
  message_type: 'text' | 'file' | 'image';
  file_name?: string;
  file_size?: number | null;
  file_type?: string;
  file_url?: string | null;
  is_read?: boolean;
  timestamp: string;
}

export const individualChatApi = {
  getMessages: async (userId: number): Promise<IndividualMessageOut[]> => {
    const res = await fetch(`${API_BASE}/${userId}/messages`, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  sendMessage: async (
    userId: number,
    message: {
      message?: string;
      message_type?: 'text' | 'file' | 'image';
      file_name?: string | null;
      file_size?: number | null;
      file_type?: string | null;
      file_url?: string | null; // data URL expected for files/images
    }
  ): Promise<IndividualMessageOut | null> => {
    const res = await fetch(`${API_BASE}/${userId}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify(message),
    });
    if (!res.ok) return null;
    return res.json();
  },
};


