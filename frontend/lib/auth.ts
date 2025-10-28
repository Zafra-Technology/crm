import { authAPI, User as APIUser, LoginData } from './api/auth';

// Convert API User to frontend User type
const convertAPIUser = (apiUser: APIUser) => ({
  id: apiUser.id.toString(),
  email: apiUser.email,
  name: apiUser.full_name,
  role: (apiUser.role || '').toLowerCase() as 'admin' | 'operation_manager' | 'project_manager' | 'assistant_project_manager' | 'team_head' | 'team_lead' | 'senior_designer' | 'designer' | 'professional_engineer' | 'auto_cad_drafter' | 'hr_manager' | 'accountant' | 'sales_manager' | 'digital_marketing' | 'client',
  company_name: apiUser.company_name,
  is_active: apiUser.is_active,
  role_display: apiUser.role_display,
  is_first_login: apiUser.is_first_login
});

export const authenticateUser = async (email: string, password: string) => {
  try {
    const loginData: LoginData = { email, password };
    const response = await authAPI.login(loginData);
    
    // Return converted user for frontend use
    const user = convertAPIUser(response.user);
    
    return user;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<any | null> => {
  try {
    const apiUser = await authAPI.getCurrentUser();
    const convertedUser = convertAPIUser(apiUser);
    return convertedUser;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
};


export const getAuthToken = (): string | null => {
  return authAPI.getToken();
};

export const logout = (): void => {
  authAPI.logout();
};

export const isAdmin = (user: any): boolean => {
  return user?.role === 'admin';
};

export const isProjectManager = (user: any): boolean => {
  return user?.role === 'project_manager';
};