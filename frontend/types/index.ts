export type UserRole = 'admin' | 'operation_manager' | 'project_manager' | 'assistant_project_manager' | 'team_head' | 'team_lead' | 'senior_designer' | 'designer' | 'professional_engineer' | 'auto_cad_drafter' | 'hr_manager' | 'accountant' | 'sales_manager' | 'digital_marketing' | 'client' | 'client_team_member';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  client_id?: string | number;
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

export type ServiceCode = 
  | 'single_line_diagram'
  | 'permit_package'
  | 'psa'
  | 'pe_stamp_structural'
  | 'pe_stamp_electrical'
  | 'generator_plan'
  | 'ev_plan'
  | 'design_review_quality_check';

export interface Project {
  id: string;
  name: string;
  description: string;
  requirements: string;
  timeline: string;
  status: 'inactive' | 'rejected' | 'quotation_submitted' | 'planning' | 'in_progress' | 'review' | 'completed' | 'cancelled' | 'onhold';
  projectType: 'residential' | 'commercial';
  services?: ServiceCode[];
  wetstamp?: boolean;
  projectAddress?: string;
  projectLocationUrl?: string;
  projectAhj?: string;
  projectAhjType?: 'pitched_roof' | 'ballast_ground_tilt_kit' | 'p2p' | 'battery_generator_ats' | 'only_generator' | 'only_ess';
  ballInCourt?: 'check_inputs' | 'pm_court' | 'waiting_client_response' | 'engg_court' | 'pe_stamp' | 'project_ready' | 'completed' | 'night_revision' | 'pending_payment';
  structuralPe?: 'structural_pe' | 'ev_engineer' | 'ahz_engineers' | 'lwm_engineering' | 'vector' | 'pzse' | 'current_renewables' | 'aos_structures' | 'solar_roof_check';
  structuralPeStatus?: 'new' | 'inprogress' | 'waiting_for_input' | 'completed';
  electricalPe?: 'ev_engineer' | 'vector' | 'pzse' | 'nola' | 'rivera' | 'current_renewables';
  electricalPeStatus?: 'new' | 'active_project' | 'waiting_for_input' | 'completed';
  postInstallationLetter?: boolean;
  priority?: 'low' | 'medium' | 'high';
  projectReport?: 'ext_rev_ip_change' | 'ext_rev_design_error' | 'ahj_utility_rejection' | 'good' | 'better_time_management';
  designStatus?: 'new' | 'in_progress' | 'for_review' | 'revision' | 'final_review' | 'completed' | 'on_hold' | 'stop' | 'completed_layout';
  numberOfErrors?: number;
  numberOfErrorsTeamLead?: number;
  numberOfErrorsDrafter?: number;
  finalOutputFiles?: ProjectAttachment[];
  stampedFiles?: ProjectAttachment[];
  feedbackMessage?: string;
  quotationMessage?: string;
  quotationFile?: string;
  quotationAccepted: boolean;
  clientId: string;
  clientName?: string;
  clientCompany?: string;
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
  userRole: 'admin' | 'operation_manager' | 'project_manager' | 'assistant_project_manager' | 'team_head' | 'team_lead' | 'senior_designer' | 'designer' | 'professional_engineer' | 'auto_cad_drafter' | 'hr_manager' | 'accountant' | 'sales_manager' | 'digital_marketing' | 'client' | 'client_team_member';
  message: string;
  timestamp: string;
  // File attachment fields
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  messageType?: 'text' | 'file' | 'image';
}