import { Project } from '@/types';

const API_BASE = '/api/projects';

export const projectsApi = {
  // Get all projects
  getAll: async (): Promise<Project[]> => {
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      return data.projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  },

  // Get projects by user
  getByUser: async (userId: string, userRole: string): Promise<Project[]> => {
    try {
      const response = await fetch(`${API_BASE}?userId=${userId}&userRole=${userRole}`);
      if (!response.ok) throw new Error('Failed to fetch user projects');
      const data = await response.json();
      return data.projects;
    } catch (error) {
      console.error('Error fetching user projects:', error);
      return [];
    }
  },

  // Search projects
  search: async (searchTerm: string): Promise<Project[]> => {
    try {
      const response = await fetch(`${API_BASE}?search=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error('Failed to search projects');
      const data = await response.json();
      return data.projects;
    } catch (error) {
      console.error('Error searching projects:', error);
      return [];
    }
  },

  // Get single project
  getById: async (id: string): Promise<Project | null> => {
    try {
      const response = await fetch(`${API_BASE}/${id}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.project;
    } catch (error) {
      console.error('Error fetching project:', error);
      return null;
    }
  },

  // Create new project
  create: async (projectData: {
    name: string;
    description: string;
    requirements: string;
    timeline: string;
    clientId: string;
    managerId: string;
    designerIds?: string[];
  }): Promise<Project | null> => {
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }
      
      const data = await response.json();
      return data.project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },

  // Update project
  update: async (id: string, updateData: Partial<Project>): Promise<Project | null> => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update project');
      }
      
      const data = await response.json();
      return data.project;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  },

  // Delete project
  delete: async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
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
};