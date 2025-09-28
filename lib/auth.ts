import { User, UserRole } from '@/types';
import { clientsApi } from './api/clients';

// Mock users for demo (non-clients)
const mockUsers: User[] = [
  {
    id: '2',
    email: 'manager@example.com',
    name: 'Manager',
    role: 'project_manager',
  },
  {
    id: '3',
    email: 'designer@example.com',
    name: 'Mike Designer',
    role: 'designer',
  },
];

export const authenticateUser = async (email: string, password: string): Promise<User | null> => {
  try {
    // First, try to authenticate as client using email and phone number
    const clients = await clientsApi.getAll();
    const client = clients.find(c => c.email === email);

    if (client && client.phoneNumber === password) {
      // Client found and phone number matches
      return {
        id: client.id,
        email: client.email,
        name: client.name,
        role: 'client' as UserRole,
      };
    }

    // Then, try to authenticate as designer using email and phone number
    const { designersApi } = await import('./api/designers');
    const designers = await designersApi.getAll();
    const designer = designers.find(d => d.email === email);

    if (designer && designer.phoneNumber === password) {
      // Designer found and phone number matches
      return {
        id: designer.id,
        email: designer.email,
        name: designer.name,
        role: 'designer' as UserRole,
      };
    }

    // Finally, check mock users (managers only) with regular password
    const user = mockUsers.find(u => u.email === email);
    if (user && password === 'password') {
      return user;
    }

    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
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