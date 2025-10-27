import { authAPI, User as APIUser, LoginData } from './api/auth';

// Convert API User to frontend User type
const convertAPIUser = (apiUser: APIUser) => ({
  id: apiUser.id.toString(),
  email: apiUser.email,
  name: apiUser.full_name,
  role: apiUser.role as 'admin' | 'operation_manager' | 'project_manager' | 'assistant_project_manager' | 'team_head' | 'team_lead' | 'senior_designer' | 'designer' | 'professional_engineer' | 'auto_cad_drafter' | 'hr_manager' | 'accountant' | 'sales_manager' | 'digital_marketing' | 'client',
  company_name: apiUser.company_name,
  is_active: apiUser.is_active,
  role_display: apiUser.role_display
});

export const authenticateUser = async (email: string, password: string) => {
  try {
    const loginData: LoginData = { email, password };
    const response = await authAPI.login(loginData);
    
    // Store user data
    const user = convertAPIUser(response.user);
    setCurrentUser(user);
    
    return user;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

export const getCurrentUser = () => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('current_user');
    const token = localStorage.getItem('auth_token');
    
    if (userData && token) {
      const apiUser = JSON.parse(userData);
      return convertAPIUser(apiUser);
    }
  }
  return null;
};

export const setCurrentUser = (user: any): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('current_user', JSON.stringify(user));
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

export const logout = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('current_user');
    localStorage.removeItem('auth_token');
  }
};

export const isAdmin = (user: any): boolean => {
  return user?.role === 'admin';
};

export const isProjectManager = (user: any): boolean => {
  return user?.role === 'project_manager';
};