import { User, UserRole } from '@/types';

// Mock users for demo
const mockUsers: User[] = [
  {
    id: '1',
    email: 'client@example.com',
    name: 'John Client',
    role: 'client',
  },
  {
    id: '2',
    email: 'manager@example.com',
    name: 'Sarah Manager',
    role: 'project_manager',
  },
  {
    id: '3',
    email: 'designer@example.com',
    name: 'Mike Designer',
    role: 'designer',
  },
];

export const authenticateUser = (email: string, password: string): User | null => {
  // Simple mock authentication
  const user = mockUsers.find(u => u.email === email);
  if (user && password === 'password') {
    return user;
  }
  return null;
};

export const getCurrentUser = (): User | null => {
  // In a real app, this would check session/token
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
  }
  return null;
};

export const setCurrentUser = (user: User): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
};

export const logout = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentUser');
  }
};