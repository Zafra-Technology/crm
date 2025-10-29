const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
import { getCookie, setCookie, deleteCookie } from '@/lib/cookies';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  mobile_number?: string;
  company_name?: string;
  company_code?: string;
  pan_number?: string;
  role?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  aadhar_number?: string;
  date_of_joining?: string;
  is_active?: boolean;
  client_id?: string | number;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  mobile_number: string;
  company_name: string;
  pan_number?: string;
  role: string;
  role_display: string;
  date_of_birth?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  aadhar_number?: string;
  date_of_joining?: string;
  date_of_exit?: string;
  profile_pic?: string;
  is_active: boolean;
  credentials_sent: boolean;
  created_at: string;
  updated_at: string;
  client_id?: string | number;
}

export interface LoginResponse {
  user: User;
  token: string;
  message: string;
}

export function getBackendOrigin(): string {
  try {
    const url = new URL(API_BASE_URL);
    return url.origin;
  } catch {
    return '';
  }
}

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const origin = getBackendOrigin();
  if (!origin) return url;
  if (url.startsWith('/')) return origin + url;
  return `${origin}/${url}`;
}

class AuthAPI {
  private getAuthHeaders() {
    const token = getCookie('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  async login(data: LoginData): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const result = await response.json();
    if (result?.token) {
      setCookie('auth_token', result.token);
    }
    return result;
  }

  async register(data: RegisterData): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    return response.json();
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to get current user');
    }

    return response.json();
  }

  async updateCurrentUser(data: Partial<RegisterData>): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Update failed');
    }

    const user = await response.json();
    return user;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Password change failed');
    }
  }

  async getUsers(role?: string, search?: string): Promise<User[]> {
    try {
      // Simple approach - always call without query params first
      let url = `${API_BASE_URL}/auth/users`;
      
      // Only add query params if they have meaningful values
      const queryParams = new URLSearchParams();
      if (role && role.trim() && role !== 'undefined' && role !== 'null') {
        queryParams.append('role', role);
      }
      if (search && search.trim() && search !== 'undefined' && search !== 'null') {
        queryParams.append('search', search);
      }
      
      if (queryParams.toString()) {
        url += '?' + queryParams.toString();
      }

      console.log('getUsers API call:', { 
        originalRole: role, 
        originalSearch: search, 
        finalUrl: url,
        hasParams: queryParams.toString() !== ''
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.getAuthHeaders(),
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('getUsers API Error:', response.status, errorText);
        throw new Error(`Failed to get users: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('getUsers success response:', Array.isArray(data) ? `${data.length} users` : data);
      return data;
    } catch (error) {
      console.error('getUsers method error:', error);
      throw error;
    }
  }

  async createUser(data: RegisterData): Promise<User> {
    console.log('API call to create user:', data);
    
    const response = await fetch(`${API_BASE_URL}/auth/users`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error || 'User creation failed');
      } catch (parseError) {
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
    }

    const result = await response.json();
    console.log('User creation result:', result);
    return result;
  }

  async updateUser(userId: number, data: Partial<RegisterData>): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'User update failed');
    }

    return response.json();
  }

  async uploadUserProfilePic(userId: number, file: File): Promise<User> {
    const formData = new FormData();
    formData.append('profile_pic', file);

    const token = getCookie('auth_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/upload-profile-pic`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to upload profile picture');
    }

    return response.json();
  }

  async deleteUser(userId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'User deletion failed');
    }
  }

  async getTeamMembersByClient(clientId: string | number): Promise<User[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/team-members`, {
        method: 'GET',
        headers: {
          ...this.getAuthHeaders(),
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('getTeamMembersByClient API Error:', response.status, errorText);
        throw new Error(`Failed to get team members: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('getTeamMembersByClient method error:', error);
      throw error;
    }
  }

  async createTeamMember(data: any): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/team-members`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('createTeamMember API Error:', response.status, errorText);
        throw new Error(`Failed to create team member: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('createTeamMember method error:', error);
      throw error;
    }
  }

  async updateTeamMember(memberId: number, data: any): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/team-members/${memberId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('updateTeamMember API Error:', response.status, errorText);
        throw new Error(`Failed to update team member: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('updateTeamMember method error:', error);
      throw error;
    }
  }

  async deleteTeamMember(memberId: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/team-members/${memberId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('deleteTeamMember API Error:', response.status, errorText);
        throw new Error(`Failed to delete team member: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('deleteTeamMember method error:', error);
      throw error;
    }
  }

  async setUserPassword(userId: number, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/set-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ new_password: newPassword }),
    });

    if (!response.ok) {
      let msg = 'Set password failed';
      try {
        const error = await response.json();
        msg = error?.detail || error?.message || error?.error || msg;
      } catch (_) {}
      throw new Error(msg);
    }

    return response.json();
  }

  async getRoleChoices(): Promise<Array<{value: string, label: string}>> {
    const response = await fetch(`${API_BASE_URL}/auth/roles`, { credentials: 'include' });
    
    if (!response.ok) {
      throw new Error('Failed to get role choices');
    }

    return response.json();
  }

  async checkEmailExists(email: string): Promise<{exists: boolean, email: string}> {
    const response = await fetch(`${API_BASE_URL}/auth/check-email/${encodeURIComponent(email)}`, { credentials: 'include' });
    
    if (!response.ok) {
      throw new Error('Failed to check email existence');
    }

    return response.json();
  }

  logout(): void {
    deleteCookie('auth_token');
  }

  getCurrentUserFromStorage(): User | null {
    return null;
  }

  getToken(): string | null {
    return getCookie('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  async sendMail(payload: { to: string; subject: string; message: string }): Promise<{ message: string; success?: boolean }> {
    const response = await fetch(`${API_BASE_URL}/auth/send-mail`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to send email');
    }

    return response.json();
  }

  async onboardClient(data: { name: string; email: string; company: string }): Promise<{ user: User; password: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/onboard-client`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to onboard client');
    }

    return response.json();
  }

  async sendClientCredentials(clientId: number, clientEmail: string, clientName: string, companyName: string, password?: string): Promise<{ message: string; success?: boolean }> {
    const payload: any = {
      client_id: clientId,
      client_email: clientEmail,
      client_name: clientName,
      company_name: companyName,
    };
    
    if (password) {
      payload.password = password;
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/send-client-credentials`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to send client credentials');
    }

    return response.json();
  }

  async testClientLogin(email: string, password: string): Promise<{ success: boolean; message: string; user?: User; token?: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/test-client-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to test client login');
    }

    return response.json();
  }
}

export const authAPI = new AuthAPI();