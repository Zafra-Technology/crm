export type UserRole = 'admin' | 'project_manager' | 'assistant_project_manager' | 'team_head' | 'team_lead' | 'senior_designer' | 'designer' | 'auto_cad_drafter' | 'hr' | 'accountant' | 'marketing' | 'sales' | 'digital_marketing' | 'client';

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
  status: 'inactive' | 'rejected' | 'quotation_submitted' | 'planning' | 'in_progress' | 'review' | 'completed';
  projectType: 'residential' | 'commercial';
  feedbackMessage?: string;
  quotationMessage?: string;
  quotationFile?: string;
  quotationAccepted: boolean;
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
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'project_manager' | 'assistant_project_manager' | 'team_head' | 'team_lead' | 'senior_designer' | 'designer' | 'auto_cad_drafter' | 'hr' | 'accountant' | 'marketing' | 'sales' | 'digital_marketing' | 'client';
  message: string;
  timestamp: string;
  // File attachment fields
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  messageType?: 'text' | 'file' | 'image';
}