export type UserRole = 'client' | 'project_manager' | 'designer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface ProjectAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  requirements: string;
  timeline: string;
  status: 'planning' | 'in_progress' | 'review' | 'completed';
  clientId: string;
  managerId: string;
  designerIds: string[];
  attachments?: ProjectAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  userId: string;
  type: 'design' | 'file' | 'comment';
  title: string;
  description?: string;
  fileUrl?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}