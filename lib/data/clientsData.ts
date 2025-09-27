import { Client } from '@/types/client';

export const mockClients: Client[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@company.com',
    phoneNumber: '+1 (555) 987-6543',
    company: 'Tech Solutions Inc.',
    status: 'active',
    joinedDate: '2024-01-10',
    projectsCount: 3
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.j@startup.io',
    phoneNumber: '+1 (555) 876-5432',
    company: 'Startup Innovations',
    status: 'active',
    joinedDate: '2024-02-05',
    projectsCount: 2
  },
  {
    id: '3',
    name: 'Michael Brown',
    email: 'mbrown@enterprise.com',
    phoneNumber: '+1 (555) 765-4321',
    company: 'Enterprise Corp',
    status: 'inactive',
    joinedDate: '2023-11-20',
    projectsCount: 1
  }
];