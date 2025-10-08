const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  mobile_number: string;
  company_name: string;
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
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  message: string;
}

class AuthAPI {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async login(data: LoginData): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
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
    
    // Store token in localStorage
    localStorage.setItem('auth_token', result.token);
    localStorage.setItem('current_user', JSON.stringify(result.user));
    
    return result;
  }

  async register(data: RegisterData): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
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
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Update failed');
    }

    const user = await response.json();
    localStorage.setItem('current_user', JSON.stringify(user));
    return user;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
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
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'User update failed');
    }

    return response.json();
  }

  async deleteUser(userId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'User deletion failed');
    }
  }

  async getRoleChoices(): Promise<Array<{value: string, label: string}>> {
    const response = await fetch(`${API_BASE_URL}/auth/roles`);
    
    if (!response.ok) {
      throw new Error('Failed to get role choices');
    }

    return response.json();
  }

  async checkEmailExists(email: string): Promise<{exists: boolean, email: string}> {
    const response = await fetch(`${API_BASE_URL}/auth/check-email/${encodeURIComponent(email)}`);
    
    if (!response.ok) {
      throw new Error('Failed to check email existence');
    }

    return response.json();
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
  }

  getCurrentUserFromStorage(): User | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('current_user');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const authAPI = new AuthAPI();