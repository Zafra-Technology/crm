import { Project, ProjectAttachment } from '@/types';
import { getCookie } from '@/lib/cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
// Django with APPEND_SLASH expects trailing slash for POST/collection routes
const API_BASE = `${API_BASE_URL}/projects/`;

const getAuthHeaders = () => {
  const token = getCookie('auth_token');
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  } as Record<string, string>;
};

export const projectsApi = {
  // Internal: map backend project (snake_case) to frontend Project (camelCase)
  _mapApiProject(p: any): Project {
    const attachments: ProjectAttachment[] = Array.isArray(p.attachments)
      ? p.attachments.map((a: any) => ({
          id: String(a.id),
          name: String(a.name || ''),
          size: Number(a.size || 0),
          type: String(a.type || ''),
          url: String(a.url || ''),
          uploadedAt: String(a.uploadedAt || a.uploaded_at || ''),
          uploadedBy: String(a.uploadedBy || a.uploaded_by || ''),
        }))
      : [];

    const designerIds = Array.isArray(p.designerIds)
      ? p.designerIds.map((d: any) => String(d))
      : Array.isArray(p.designer_ids)
      ? p.designer_ids.map((d: any) => String(d))
      : [];

    const project: Project = {
      id: String(p.id),
      name: String(p.name || ''),
      projectCode: (p.project_code || p.projectCode || '') || undefined,
      description: String(p.description || ''),
      requirements: String(p.requirements || ''),
      status: (p.status || 'inactive') as Project['status'],
      projectType: (p.project_type || p.projectType || 'residential') as Project['projectType'],
      services: Array.isArray(p.services) ? p.services : [],
      wetstamp: Boolean(p.wetstamp ?? false),
      projectAddress: p.project_address || p.projectAddress || undefined,
      projectLocationUrl: p.project_location_url || p.projectLocationUrl || undefined,
      projectAhj: p.project_ahj || p.projectAhj || undefined,
      projectAhjType: (p.project_ahj_type || p.projectAhjType) as Project['projectAhjType'] | undefined,
      ballInCourt: (p.ball_in_court || p.ballInCourt) as Project['ballInCourt'] | undefined,
      structuralPe: (p.structural_pe != null && p.structural_pe !== '' ? p.structural_pe : (p.structuralPe != null && p.structuralPe !== '' ? p.structuralPe : undefined)) as Project['structuralPe'] | undefined,
      structuralPeStatus: (p.structural_pe_status != null && p.structural_pe_status !== '' ? p.structural_pe_status : (p.structuralPeStatus != null && p.structuralPeStatus !== '' ? p.structuralPeStatus : 'new')) as Project['structuralPeStatus'],
      electricalPe: (p.electrical_pe != null && p.electrical_pe !== '' ? p.electrical_pe : (p.electricalPe != null && p.electricalPe !== '' ? p.electricalPe : undefined)) as Project['electricalPe'] | undefined,
      electricalPeStatus: (p.electrical_pe_status != null && p.electrical_pe_status !== '' ? p.electrical_pe_status : (p.electricalPeStatus != null && p.electricalPeStatus !== '' ? p.electricalPeStatus : 'new')) as Project['electricalPeStatus'],
      postInstallationLetter: Boolean(p.post_installation_letter ?? false),
      priority: (p.priority || p.priority) as Project['priority'] | undefined,
      projectReport: (p.project_report != null && p.project_report !== '' ? p.project_report : (p.projectReport != null && p.projectReport !== '' ? p.projectReport : undefined)) as Project['projectReport'] | undefined,
      designStatus: (p.design_status != null && p.design_status !== '' ? p.design_status : (p.designStatus != null && p.designStatus !== '' ? p.designStatus : 'new')) as Project['designStatus'],
      numberOfErrors: p.number_of_errors != null ? Number(p.number_of_errors) : (p.numberOfErrors != null ? Number(p.numberOfErrors) : 0),
      numberOfErrorsTeamLead: p.number_of_errors_team_lead != null ? Number(p.number_of_errors_team_lead) : (p.numberOfErrorsTeamLead != null ? Number(p.numberOfErrorsTeamLead) : 0),
      numberOfErrorsDrafter: p.number_of_errors_drafter != null ? Number(p.number_of_errors_drafter) : (p.numberOfErrorsDrafter != null ? Number(p.numberOfErrorsDrafter) : 0),
      finalOutputFiles: Array.isArray(p.final_output_files) ? p.final_output_files.map((f: any) => ({
        id: String(f.id || f.name || Date.now()),
        name: String(f.name || ''),
        size: Number(f.size || 0),
        type: String(f.type || f.file_type || ''),
        url: String(f.url || f.file || ''),
        uploadedAt: String(f.uploadedAt || f.uploaded_at || ''),
        uploadedBy: String(f.uploadedBy || f.uploaded_by || ''),
      })) : (Array.isArray(p.finalOutputFiles) ? p.finalOutputFiles : []),
      stampedFiles: Array.isArray(p.stamped_files) ? p.stamped_files.map((f: any) => ({
        id: String(f.id || f.name || Date.now()),
        name: String(f.name || ''),
        size: Number(f.size || 0),
        type: String(f.type || f.file_type || ''),
        url: String(f.url || f.file || ''),
        uploadedAt: String(f.uploadedAt || f.uploaded_at || ''),
        uploadedBy: String(f.uploadedBy || f.uploaded_by || ''),
      })) : (Array.isArray(p.stampedFiles) ? p.stampedFiles : []),
      feedbackMessage: p.feedback_message || p.feedbackMessage || undefined,
      quotationMessage: p.quotation_message || p.quotationMessage || undefined,
      quotationFile: p.quotation_file || p.quotationFile || undefined,
      quotationAccepted: Boolean(p.quotation_accepted || p.quotationAccepted || false),
      clientId: p.clientId ? String(p.clientId) : String(p.client_id ?? ''),
      // Backend may include helpful display fields
      ...(p.client_name ? { clientName: String(p.client_name) } : {}),
      ...(p.client_company ? { clientCompany: String(p.client_company) } : {}),
      ...(p.client_email ? { clientEmail: String(p.client_email) } : {}),
      managerId: p.managerId ? String(p.managerId) : String(p.manager_id ?? ''),
      ...(p.manager_name ? { managerName: String(p.manager_name) } : {}),
      designerIds,
      attachments,
      createdAt: String(p.createdAt || p.created_at || ''),
      updatedAt: String(p.updatedAt || p.updated_at || ''),
    };
    
    // Pass-through designers array from backend for team rendering
    if (Array.isArray((p as any).designers)) {
      (project as any).designers = (p as any).designers;
    }
    
    // Calculate designer count with better logic
    const designerCount = Number(
      p.designerCount ?? p.designer_count ?? designerIds.length
    );
    
    (project as any).designerCount = designerCount;
    
    return project;
  },
  // Get all projects
  getAll: async (): Promise<Project[]> => {
    try {
      const response = await fetch(API_BASE, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) throw new Error(`Failed to fetch projects: ${response.status}`);
      const data = await response.json();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.projects)
        ? data.projects
        : [];
      return arr.map((project: any) => projectsApi._mapApiProject(project));
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  },

  // Get projects by user, optionally filtered by client id
  getByUser: async (userId: string, userRole: string, options?: { clientId?: string | number }): Promise<Project[]> => {
    try {
      // Backend uses authentication to determine user and role automatically
      // Optional query filtering (e.g., client)
      const qs = new URLSearchParams();
      if (options?.clientId) {
        qs.set('client', String(options.clientId));
      }
      const url = qs.toString() ? `${API_BASE}?${qs.toString()}` : API_BASE;
      const response = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Projects API error response:', errorText);
        throw new Error(`Failed to fetch user projects: ${response.status}`);
      }
      const data = await response.json();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.projects)
        ? data.projects
        : [];
      return arr.map((project: any) => projectsApi._mapApiProject(project));
    } catch (error) {
      console.error('Error fetching user projects:', error);
      return [];
    }
  },

  // Get pending projects (status: inactive)
  getPending: async (): Promise<Project[]> => {
    try {
      // Get all projects and filter for inactive ones on the frontend
      // This ensures we get the correct filtering even if backend filtering isn't working
      const response = await fetch(API_BASE, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Projects API error response:', errorText);
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }
      const data = await response.json();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.projects)
        ? data.projects
        : [];
      
      const allProjects = arr.map((project: any) => projectsApi._mapApiProject(project));
      // Filter for inactive projects on the frontend
      return allProjects.filter((project: any) => project.status === 'inactive');
    } catch (error) {
      console.error('Error fetching pending projects:', error);
      return [];
    }
  },

  // Search projects
  search: async (searchTerm: string): Promise<Project[]> => {
    try {
      const response = await fetch(`${API_BASE}?search=${encodeURIComponent(searchTerm)}`, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) throw new Error(`Failed to search projects: ${response.status}`);
      const data = await response.json();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.projects)
        ? data.projects
        : [];
      return arr.map((project: any) => projectsApi._mapApiProject(project));
    } catch (error) {
      console.error('Error searching projects:', error);
      return [];
    }
  },

  // Get single project
  getById: async (id: string): Promise<Project | null> => {
    try {
      // Detail routes in Django Ninja here are defined without trailing slash
      const response = await fetch(`${API_BASE}${id}`, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) return null;
      const data = await response.json();
      const mapped = projectsApi._mapApiProject(data);
      return mapped;
    } catch (error) {
      console.error('Error fetching project:', error);
      return null;
    }
  },

  // Create new project
  create: async (projectData: {
    name: string;
    projectCode?: string;
    description: string;
    requirements: string;
    projectType?: string;
    status?: string;
    services?: string[];
    wetstamp?: boolean;
    projectAddress?: string;
    projectLocationUrl?: string;
    projectAhj?: string;
    projectAhjType?: string;
    ballInCourt?: string;
    pe?: string;
    priority?: string;
    clientId: string;
    managerId: string;
    designerIds?: string[];
    attachments?: any[];
  }): Promise<Project | null> => {
    try {
      // Map to backend-expected snake_case keys
      const payload: Record<string, any> = {
        name: projectData.name,
        project_code: projectData.projectCode || undefined,
        description: projectData.description,
        requirements: projectData.requirements,
        project_type: projectData.projectType || 'residential',
        status: projectData.status || 'inactive',
        services: projectData.services || [],
        wetstamp: projectData.wetstamp ?? false,
        project_address: projectData.projectAddress || undefined,
        project_location_url: projectData.projectLocationUrl || undefined,
        project_ahj: projectData.projectAhj || undefined,
        project_ahj_type: projectData.projectAhjType || undefined,
        ball_in_court: projectData.ballInCourt || undefined,
        pe: projectData.pe || undefined,
        priority: projectData.priority || undefined,
        client_id: projectData.clientId ? parseInt(projectData.clientId) : undefined,
        manager_id: projectData.managerId ? parseInt(projectData.managerId) : undefined,
        designer_ids: Array.isArray(projectData.designerIds)
          ? projectData.designerIds.map(id => parseInt(id)).filter(n => !Number.isNaN(n))
          : [],
        attachments: projectData.attachments || [],
      };
      // Remove undefined keys
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      // Debug: log payload being sent
      console.log('Creating project with payload:', payload);

      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        let detail = 'Failed to create project';
        try {
          const text = await response.text();
          console.error('Create project error status:', response.status, 'body:', text);
          try {
            const error = JSON.parse(text);
            detail = error.error || error.detail || text;
          } catch {
            detail = text || detail;
          }
        } catch {}
        throw new Error(`HTTP ${response.status} - ${detail}`);
      }
      
      const data = await response.json();
      return projectsApi._mapApiProject(data);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },

  // Update project
  update: async (id: string, updateData: Partial<Project>): Promise<Project | null> => {
    try {
      // Transform to backend-expected shape
      const payload: Record<string, any> = {};

      if (updateData.name !== undefined) payload.name = updateData.name;
      if ((updateData as any).projectCode !== undefined) payload.project_code = (updateData as any).projectCode;
      if (updateData.description !== undefined) payload.description = updateData.description;
      if (updateData.requirements !== undefined) payload.requirements = updateData.requirements;
      if (updateData.projectType !== undefined) payload.project_type = updateData.projectType;
      if ((updateData as any).status !== undefined) payload.status = (updateData as any).status;
      if (updateData.services !== undefined) payload.services = updateData.services;
      if (updateData.wetstamp !== undefined) payload.wetstamp = updateData.wetstamp;
      if (updateData.projectAddress !== undefined) payload.project_address = updateData.projectAddress;
      if (updateData.projectLocationUrl !== undefined) payload.project_location_url = updateData.projectLocationUrl;
      if (updateData.projectAhj !== undefined) payload.project_ahj = updateData.projectAhj;
      if (updateData.projectAhjType !== undefined) payload.project_ahj_type = updateData.projectAhjType;
      if (updateData.ballInCourt !== undefined) payload.ball_in_court = updateData.ballInCourt;
      if (updateData.structuralPe !== undefined) payload.structural_pe = updateData.structuralPe;
      if (updateData.structuralPeStatus !== undefined) payload.structural_pe_status = updateData.structuralPeStatus;
      if (updateData.electricalPe !== undefined) payload.electrical_pe = updateData.electricalPe;
      if (updateData.electricalPeStatus !== undefined) payload.electrical_pe_status = updateData.electricalPeStatus;
      if (updateData.postInstallationLetter !== undefined) payload.post_installation_letter = updateData.postInstallationLetter;
      if (updateData.priority !== undefined) payload.priority = updateData.priority;
      if (updateData.projectReport !== undefined) payload.project_report = updateData.projectReport;
      if (updateData.designStatus !== undefined) payload.design_status = updateData.designStatus;
      if (updateData.numberOfErrors !== undefined) payload.number_of_errors = updateData.numberOfErrors;
      if (updateData.numberOfErrorsTeamLead !== undefined) payload.number_of_errors_team_lead = updateData.numberOfErrorsTeamLead;
      if (updateData.numberOfErrorsDrafter !== undefined) payload.number_of_errors_drafter = updateData.numberOfErrorsDrafter;
      if (updateData.finalOutputFiles !== undefined) payload.final_output_files = updateData.finalOutputFiles;
      if (updateData.stampedFiles !== undefined) payload.stamped_files = updateData.stampedFiles;

      const clientId = (updateData as any).clientId;
      if (clientId !== undefined) payload.client_id = clientId ? parseInt(String(clientId)) : null;

      const managerId = (updateData as any).managerId;
      if (managerId !== undefined) payload.manager_id = managerId ? parseInt(String(managerId)) : null;

      const designerIds = (updateData as any).designerIds as (string[] | number[] | undefined);
      if (designerIds !== undefined) {
        payload.designer_ids = Array.isArray(designerIds)
          ? designerIds.map((d) => parseInt(String(d))).filter((n) => !Number.isNaN(n))
          : [];
      }

      // Pass attachments through as-is; backend expects [{name,size,type,url,...}]
      const attachments = (updateData as any).attachments as any[] | undefined;
      if (attachments !== undefined) {
        payload.attachments = attachments;
      }

      const response = await fetch(`${API_BASE}${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let detail = 'Failed to update project';
        try {
          const text = await response.text();
          console.error('Update project error status:', response.status, 'body:', text);
          try {
            const error = JSON.parse(text);
            detail = error.error || error.detail || text;
          } catch {
            detail = text || detail;
          }
        } catch {}
        throw new Error(detail);
      }

      const data = await response.json();
      const mapped = projectsApi._mapApiProject(data);
      return mapped;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  },

  // Delete project
  delete: async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  },

  // Assign designer to project
  assignDesigner: async (projectId: string, designerId: string): Promise<Project | null> => {
    try {
      const project = await projectsApi.getById(projectId);
      if (!project) return null;

      const updatedDesignerIds = [...(project.designerIds || []), designerId];
      return await projectsApi.update(projectId, { designerIds: updatedDesignerIds });
    } catch (error) {
      console.error('Error assigning designer:', error);
      return null;
    }
  },

  // Unassign designer from project
  unassignDesigner: async (projectId: string, designerId: string): Promise<Project | null> => {
    try {
      const project = await projectsApi.getById(projectId);
      if (!project) return null;

      const updatedDesignerIds = (project.designerIds || []).filter(id => id !== designerId);
      return await projectsApi.update(projectId, { designerIds: updatedDesignerIds });
    } catch (error) {
      console.error('Error unassigning designer:', error);
      return null;
    }
  },

  // Project approval/rejection functions
  approveProject: async (projectId: string): Promise<Project> => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve project');
      }

      const data = await response.json();
      return projectsApi._mapApiProject(data);
    } catch (error) {
      console.error('Error approving project:', error);
      throw error;
    }
  },

  rejectProject: async (projectId: string, feedbackMessage: string): Promise<Project> => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/reject`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ feedback_message: feedbackMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject project');
      }

      const data = await response.json();
      return projectsApi._mapApiProject(data);
    } catch (error) {
      console.error('Error rejecting project:', error);
      throw error;
    }
  },

  submitQuotation: async (projectId: string, quotationMessage: string, quotationFile?: File): Promise<Project> => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('quotation_message', quotationMessage);
      
      if (quotationFile) {
        formData.append('quotation_file', quotationFile);
      }

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/submit-quotation`, {
        method: 'POST',
        headers: (() => {
          const token = getCookie('auth_token');
          const headers: Record<string, string> = { 'Accept': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          return headers;
        })(),
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to submit quotation';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch (e) {
          // If we can't parse the error response, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return projectsApi._mapApiProject(data);
    } catch (error) {
      console.error('Error submitting quotation:', error);
      throw error;
    }
  },

  acceptQuotation: async (projectId: string): Promise<Project> => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/accept-quotation`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept quotation');
      }

      const data = await response.json();
      return projectsApi._mapApiProject(data);
    } catch (error) {
      console.error('Error accepting quotation:', error);
      throw error;
    }
  },

  rejectQuotation: async (projectId: string, feedbackMessage: string): Promise<Project> => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/reject-quotation`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ feedback_message: feedbackMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject quotation');
      }

      const data = await response.json();
      return projectsApi._mapApiProject(data);
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      throw error;
    }
  },
};