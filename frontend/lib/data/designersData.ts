import { Designer } from '@/types/designer';

export const mockDesigners: Designer[] = [
  {
    id: '1',
    name: 'Mike Designer',
    email: 'mike@example.com',
    phoneNumber: '+1 (555) 123-4567',
    role: 'Senior UI/UX Designer',
    status: 'active',
    joinedDate: '2024-01-15',
    projectsCount: 3
  },
  {
    id: '2',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@example.com',
    phoneNumber: '+1 (555) 234-5678',
    role: 'Graphic Designer',
    status: 'active',
    joinedDate: '2024-02-01',
    projectsCount: 2
  },
  {
    id: '3',
    name: 'Alex Chen',
    email: 'alex.chen@example.com',
    phoneNumber: '+1 (555) 345-6789',
    role: 'Web Designer',
    status: 'inactive',
    joinedDate: '2023-12-10',
    projectsCount: 1
  }
];