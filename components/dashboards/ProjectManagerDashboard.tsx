'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import { Designer } from '@/types/designer';
import ProjectCard from '@/components/ProjectCard';
import ConfirmModal from '@/components/modals/ConfirmModal';
import AssignDesignersModal from '@/components/modals/AssignDesignersModal';
import { projectsApi } from '@/lib/api/projects';
import { designersApi } from '@/lib/api/designers';
import { PlusIcon, TrendingUpIcon, ClockIcon, CheckCircleIcon, UsersIcon, XIcon } from 'lucide-react';

interface ProjectManagerDashboardProps {
  projects: Project[];
  userId: string;
}

interface CreateProjectForm {
  name: string;
  description: string;
  requirements: string;
  timeline: string;
  clientId: string;
  designerIds: string[];
}

export default function ProjectManagerDashboard({ projects: initialProjects, userId }: ProjectManagerDashboardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProjectForm>({
    name: '',
    description: '',
    requirements: '',
    timeline: '',
    clientId: '1', // Default client for demo
    designerIds: []
  });

  useEffect(() => {
    loadProjects();
    loadDesigners();
  }, [userId]);

  const loadProjects = async () => {
    try {
      const projectsData = await projectsApi.getByUser(userId, 'project_manager');
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadDesigners = async () => {
    try {
      const designersData = await designersApi.getAll();
      setDesigners(designersData.filter(d => d.status === 'active'));
    } catch (error) {
      console.error('Error loading designers:', error);
    }
  };

  const managedProjects = projects;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const newProject = await projectsApi.create({
        ...formData,
        managerId: userId
      });
      if (newProject) {
        setProjects([newProject, ...projects]);
        setFormData({
          name: '',
          description: '',
          requirements: '',
          timeline: '',
          clientId: '1',
          designerIds: []
        });
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDesigners = async (designerIds: string[]) => {
    if (!selectedProject) return;
    
    try {
      setLoading(true);
      const updatedProject = await projectsApi.update(selectedProject.id, { designerIds });
      if (updatedProject) {
        setProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p));
        setShowAssignModal(false);
        setSelectedProject(null);
      }
    } catch (error) {
      console.error('Error assigning designers:', error);
      alert('Failed to assign designers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    
    try {
      setLoading(true);
      const success = await projectsApi.delete(selectedProject.id);
      if (success) {
        setProjects(projects.filter(p => p.id !== selectedProject.id));
        setShowDeleteModal(false);
        setSelectedProject(null);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = (project: Project) => {
    setSelectedProject(project);
    setShowAssignModal(true);
  };

  const openDeleteModal = (project: Project) => {
    setSelectedProject(project);
    setShowDeleteModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Project Management</h1>
          <p className="text-gray-600 mt-1">Manage and oversee all active projects</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon size={20} />
          <span>Create Project</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUpIcon size={24} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-black">{managedProjects.length}</div>
          <div className="text-sm text-gray-600">Total Projects</div>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <ClockIcon size={24} className="text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-yellow-600">
            {managedProjects.filter(p => p.status === 'in_progress').length}
          </div>
          <div className="text-sm text-gray-600">In Progress</div>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <ClockIcon size={24} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {managedProjects.filter(p => p.status === 'review').length}
          </div>
          <div className="text-sm text-gray-600">In Review</div>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <CheckCircleIcon size={24} className="text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">
            {managedProjects.filter(p => p.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
      </div>

      {/* Active Projects */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-black">Active Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managedProjects.map((project) => (
            <div key={project.id} className="relative group">
              <ProjectCard project={project} />
              
              {/* Action buttons - appear on hover */}
              <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <button
                  onClick={() => openAssignModal(project)}
                  className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200"
                  title="Assign Designers"
                >
                  <UsersIcon size={16} className="text-blue-600" />
                </button>
                <button
                  onClick={() => openDeleteModal(project)}
                  className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200"
                  title="Delete Project"
                >
                  <XIcon size={16} className="text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {managedProjects.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-gray-400 mb-4">
              <PlusIcon size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">No projects yet</h3>
            <p className="text-gray-500">Create your first project to get started.</p>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-black mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                  rows={3}
                  placeholder="Describe the project"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requirements
                </label>
                <textarea
                  required
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                  rows={2}
                  placeholder="List project requirements"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeline
                </label>
                <input
                  type="text"
                  required
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                  placeholder="e.g., 6 weeks"
                />
              </div>
              
              {/* Designer Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Designers (Optional)
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {designers.map((designer) => (
                    <label key={designer.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.designerIds.includes(designer.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              designerIds: [...formData.designerIds, designer.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              designerIds: formData.designerIds.filter(id => id !== designer.id)
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-black focus:ring-black"
                      />
                      <span className="text-sm text-gray-700">{designer.name} - {designer.role}</span>
                    </label>
                  ))}
                  {designers.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">No active designers available</p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  disabled={loading}
                  className="btn-secondary flex-1 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Designers Modal */}
      <AssignDesignersModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedProject(null);
        }}
        onAssign={handleAssignDesigners}
        currentDesignerIds={selectedProject?.designerIds || []}
        projectName={selectedProject?.name || ''}
        loading={loading}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedProject(null);
        }}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${selectedProject?.name}"? This action cannot be undone.`}
        confirmText="Delete Project"
        type="danger"
        loading={loading}
      />
    </div>
  );
}