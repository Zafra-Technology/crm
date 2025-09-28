import { Project, ProjectUpdate, ChatMessage } from '@/types';

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'E-commerce Website Redesign',
    description: 'Complete redesign of the company e-commerce platform with modern UI/UX',
    requirements: 'Mobile-first design, accessibility compliance, fast loading times',
    timeline: '8 weeks',
    status: 'in_progress',
    clientId: '1',
    managerId: '2',
    designerIds: ['3'],
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20'
  },
  {
    id: '2',
    name: 'Mobile App Interface',
    description: 'Design new mobile application interface for iOS and Android',
    requirements: 'Native feel, intuitive navigation, brand consistency',
    timeline: '6 weeks',
    status: 'planning',
    clientId: '1',
    managerId: '2',
    designerIds: ['3'],
    createdAt: '2024-01-10',
    updatedAt: '2024-01-18'
  },
  {
    id: '3',
    name: 'Brand Identity Package',
    description: 'Complete brand identity including logo, colors, typography',
    requirements: 'Professional, memorable, scalable across mediums',
    timeline: '4 weeks',
    status: 'review',
    clientId: '1',
    managerId: '2',
    designerIds: ['3'],
    createdAt: '2024-01-05',
    updatedAt: '2024-01-22'
  }
];

export const mockUpdates: ProjectUpdate[] = [
  {
    id: '1',
    projectId: '1',
    userId: '3',
    type: 'design',
    title: 'Homepage wireframes completed',
    description: 'Initial wireframes for the new homepage design',
    createdAt: '2024-01-20'
  },
  {
    id: '2',
    projectId: '1',
    userId: '2',
    type: 'comment',
    title: 'Requirements updated',
    description: 'Added accessibility requirements based on client feedback',
    createdAt: '2024-01-19'
  },
  {
    id: '3',
    projectId: '2',
    userId: '3',
    type: 'file',
    title: 'Research documents uploaded',
    fileUrl: '/files/mobile-research.pdf',
    createdAt: '2024-01-18'
  }
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: '1',
    projectId: '1',
    userId: '2',
    userName: 'Manager',
    userRole: 'project_manager',
    message: 'Great progress on the wireframes! Can we schedule a review meeting?',
    timestamp: '2024-01-20T10:30:00Z'
  },
  {
    id: '2',
    projectId: '1',
    userId: '3',
    userName: 'Mike Designer',
    userRole: 'designer',
    message: 'Sure! I have some questions about the mobile navigation.',
    timestamp: '2024-01-20T10:45:00Z'
  },
  {
    id: '3',
    projectId: '1',
    userId: '1',
    userName: 'John Client',
    userRole: 'client',
    message: 'Looking forward to seeing the progress. The timeline still looks good.',
    timestamp: '2024-01-20T11:00:00Z'
  }
];