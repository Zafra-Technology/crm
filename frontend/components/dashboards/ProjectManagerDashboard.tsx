'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import { Designer } from '@/types/designer';
import ProjectCard from '@/components/ProjectCard';
import ConfirmModal from '@/components/modals/ConfirmModal';
import AssignDesignersModal from '@/components/modals/AssignDesignersModal';
import FeedbackModal from '@/components/modals/FeedbackModal';
import QuotationModal from '@/components/modals/QuotationModal';
import ProjectDetailsModal from '@/components/modals/ProjectDetailsModal';
import ViewFeedbackModal from '@/components/modals/ViewFeedbackModal';
import { projectsApi } from '@/lib/api/projects';
import { authAPI, User as APIUser } from '@/lib/api/auth';
// Designers fetched via authAPI in AssignDesignersModal and here if needed
import { PlusIcon, TrendingUpIcon, ClockIcon, CheckCircleIcon, UsersIcon, XIcon, PaperclipIcon, FileIcon, DownloadIcon, Check, XCircle, MessageSquare, Eye } from 'lucide-react';

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
  attachments: File[];
}

export default function ProjectManagerDashboard({ projects: initialProjects, userId }: ProjectManagerDashboardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<APIUser[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showProjectDetailsModal, setShowProjectDetailsModal] = useState(false);
  const [showViewFeedbackModal, setShowViewFeedbackModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateProjectForm>({
    name: '',
    description: '',
    requirements: '',
    timeline: '',
    clientId: '',
    designerIds: [],
    attachments: []
  });

  useEffect(() => {
    loadProjects();
    loadDesigners();
    loadClients();
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
      const { authAPI } = await import('@/lib/api/auth');
      const [designers, seniorDesigners, drafters] = await Promise.all([
        authAPI.getUsers('designer'),
        authAPI.getUsers('senior_designer'),
        authAPI.getUsers('auto_cad_drafter')
      ]);
      const merged = [...designers, ...seniorDesigners, ...drafters];
      const uniqueById = Array.from(new Map(merged.map(u => [u.id, u])).values());
      const mapped = uniqueById
        .filter(u => u.is_active)
        .map(u => ({
          id: u.id.toString(),
          name: u.full_name,
          email: u.email,
          phoneNumber: u.mobile_number || '',
          role: u.role_display || u.role,
          status: 'active' as const,
          joinedDate: u.date_of_joining || u.created_at || '',
          projectsCount: 0
        }));
      setDesigners(mapped);
    } catch (error) {
      console.error('Error loading designers:', error);
      setDesigners([]);
    }
  };

  const loadClients = async () => {
    try {
      // Get clients from Django backend (users with role='client')
      const { authAPI } = await import('@/lib/api/auth');
      
      // Load all users for client info lookup
      const allUsersData = await authAPI.getUsers();
      setAllUsers(allUsersData);
      
      // Load clients for the create form
      const usersData = await authAPI.getUsers('client');
      const clientsData = usersData.map(user => ({
        id: user.id.toString(),
        name: user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.email,
        email: user.email,
        phoneNumber: user.mobile_number || '',
        company: user.company_name || '',
        status: user.is_active ? 'active' : 'inactive',
        createdAt: user.created_at
      }));
      setClients(clientsData.filter((c: any) => c.status === 'active'));
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
      setAllUsers([]);
    }
  };

  const managedProjects = projects;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Convert files to base64 for demo storage
      const attachments = await Promise.all(formData.attachments.map(async (file) => {
        const base64 = await convertFileToBase64(file);
        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          url: base64, // Store as base64 for demo
          uploadedAt: new Date().toISOString(),
          uploadedBy: userId
        };
      }));

      const projectData = {
        name: formData.name,
        description: formData.description,
        requirements: formData.requirements,
        timeline: formData.timeline,
        clientId: formData.clientId,
        managerId: userId,
        designerIds: formData.designerIds
        // Note: Attachments will be handled separately after project creation
      };

      const newProject = await projectsApi.create(projectData);
      if (newProject) {
        // Immediately upload attachments via update call
        if (attachments.length > 0) {
          try {
            await projectsApi.update(newProject.id, { attachments });
          } catch (e) {
            console.error('Failed to upload attachments after create:', e);
          }
        }
        // Add the new project to the list
        setProjects([newProject, ...projects]);
        // Reset form data
        setFormData({
          name: '',
          description: '',
          requirements: '',
          timeline: '',
          clientId: '',
          designerIds: [],
          attachments: []
        });
        // Show success message
        setSuccessMessage('Project created successfully!');
        // Close the modal
        setShowCreateForm(false);
        // Reload projects to ensure we have the latest data
        await loadProjects();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        console.error('No project returned from API');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setErrorMessage('Failed to create project. Please try again.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData({
      ...formData,
      attachments: [...formData.attachments, ...files]
    });
  };

  const removeAttachment = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index)
    });
  };

  // Project approval/rejection handlers
  const handleApproveProject = async (project: Project) => {
    setLoading(true);
    try {
      await projectsApi.approveProject(project.id);
      await loadProjects();
      setSuccessMessage('Project approved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error approving project:', error);
      setErrorMessage('Failed to approve project. Please try again.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectProject = async (feedback: string) => {
    if (!selectedProject) return;
    
    setLoading(true);
    try {
      await projectsApi.rejectProject(selectedProject.id, feedback);
      await loadProjects();
      setShowFeedbackModal(false);
      setSelectedProject(null);
      setSuccessMessage('Project rejected with feedback.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error rejecting project:', error);
      setErrorMessage('Failed to reject project. Please try again.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuotation = async (quotationMessage: string, quotationFile?: File) => {
    if (!selectedProject) return;
    
    setLoading(true);
    try {
      await projectsApi.submitQuotation(selectedProject.id, quotationMessage, quotationFile);
      await loadProjects();
      setShowQuotationModal(false);
      setSelectedProject(null);
      setSuccessMessage('Quotation submitted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error submitting quotation:', error);
      setErrorMessage('Failed to submit quotation. Please try again.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const openRejectModal = (project: Project) => {
    setSelectedProject(project);
    setShowFeedbackModal(true);
  };

  const openQuotationModal = (project: Project) => {
    setSelectedProject(project);
    setShowQuotationModal(true);
  };

  const openProjectDetailsModal = (project: Project) => {
    setSelectedProject(project);
    setShowProjectDetailsModal(true);
  };

  const openViewFeedbackModal = (project: Project) => {
    setSelectedProject(project);
    setShowViewFeedbackModal(true);
  };

  const getClientInfo = (clientId: string): APIUser | null => {
    return allUsers.find(user => user.id.toString() === clientId) || null;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
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
      setErrorMessage('Failed to assign designers. Please try again.');
      setTimeout(() => setErrorMessage(null), 5000);
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
      setErrorMessage('Failed to delete project. Please try again.');
      setTimeout(() => setErrorMessage(null), 5000);
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
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}
      
      {/* Sticky Header */}
      <div className="sticky top-0 bg-gray-50 z-20 pb-4 mb-2 -mx-6 px-6">
        <div className="flex items-center justify-between bg-gray-50 pt-2">
          <div>
            <h1 className="text-2xl font-bold text-black">Project Management</h1>
            <p className="text-gray-600 mt-1">Manage and oversee all active projects</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center space-x-2 shadow-md"
          >
            <PlusIcon size={20} />
            <span>Create Project</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUpIcon size={24} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-black">{managedProjects.length}</div>
          <div className="text-sm text-gray-600">Total Projects</div>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <ClockIcon size={24} className="text-gray-600" />
          </div>
          <div className="text-2xl font-bold text-gray-600">
            {managedProjects.filter(p => p.status === 'inactive').length}
          </div>
          <div className="text-sm text-gray-600">Pending</div>
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

      {/* Pending Projects */}
      {managedProjects.filter(p => p.status === 'inactive').length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-black">Pending Project Requests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {managedProjects
              .filter(p => p.status === 'inactive')
              .map((project) => (
                <div key={project.id} className="card p-4 border-l-4 border-orange-500">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                      {project.projectType}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                    <p className="text-xs text-gray-500">
                      <strong>Timeline:</strong> {project.timeline}
                    </p>
                    {project.requirements && (
                      <p className="text-xs text-gray-500">
                        <strong>Requirements:</strong> {project.requirements.substring(0, 100)}...
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openProjectDetailsModal(project)}
                      disabled={loading}
                      className="px-3 py-1 text-sm btn-secondary disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <Eye size={14} />
                      View Details
                    </button>
                    
                    {project.projectType === 'residential' ? (
                      <>
                        <button
                          onClick={() => handleApproveProject(project)}
                          disabled={loading}
                          className="flex-1 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <Check size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => openRejectModal(project)}
                          disabled={loading}
                          className="flex-1 px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => openQuotationModal(project)}
                          disabled={loading}
                          className="flex-1 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <Check size={14} />
                          Accept
                        </button>
                        <button
                          onClick={() => openRejectModal(project)}
                          disabled={loading}
                          className="flex-1 px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}


      {/* All Projects */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-black">All Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managedProjects.map((project) => (
            <div key={project.id} className="relative group">
              <ProjectCard 
                project={project} 
                onViewFeedback={openViewFeedbackModal}
              />
              
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateForm(false);
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-3xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Sticky Modal Header */}
            <div className="sticky top-0 bg-white rounded-t-lg px-6 pt-6 pb-4 border-b border-gray-200 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-black">Create New Project</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XIcon size={20} />
                </button>
              </div>
            </div>
            
            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
            <form onSubmit={handleCreateProject} className="space-y-6">
              {/* Project Name - Full Width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
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

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timeline *
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Client *
                  </label>
                  <select
                    required
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                  >
                    <option value="">Choose a client...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} - {client.company}
                      </option>
                    ))}
                  </select>
                  {clients.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">No active clients available</p>
                  )}
                </div>
              </div>

              {/* Description - Full Width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
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

              {/* Requirements - Full Width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requirements *
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

              {/* File Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Attachments (Optional)
                </label>
                <div className="space-y-3">
                  {/* File Upload */}
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <PaperclipIcon className="w-8 h-8 mb-4 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT (MAX. 10MB)</p>
                      </div>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                      />
                    </label>
                  </div>

                  {/* Uploaded Files List */}
                  {formData.attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
                      {formData.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                          <div className="flex items-center space-x-2">
                            <FileIcon size={16} className="text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <XIcon size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
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

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => {
          setShowFeedbackModal(false);
          setSelectedProject(null);
        }}
        onSubmit={handleRejectProject}
        title="Reject Project"
        placeholder="Please provide feedback for rejecting this project..."
        loading={loading}
      />

      {/* Quotation Modal */}
      <QuotationModal
        isOpen={showQuotationModal}
        onClose={() => {
          setShowQuotationModal(false);
          setSelectedProject(null);
        }}
        onSubmit={handleSubmitQuotation}
        loading={loading}
      />

      {/* Project Details Modal */}
      <ProjectDetailsModal
        isOpen={showProjectDetailsModal}
        onClose={() => {
          setShowProjectDetailsModal(false);
          setSelectedProject(null);
        }}
        project={selectedProject}
        clientInfo={selectedProject ? getClientInfo(selectedProject.clientId) : null}
      />

      {/* View Feedback Modal */}
      <ViewFeedbackModal
        isOpen={showViewFeedbackModal}
        onClose={() => {
          setShowViewFeedbackModal(false);
          setSelectedProject(null);
        }}
        projectName={selectedProject?.name || ''}
        feedbackMessage={selectedProject?.feedbackMessage || ''}
      />
    </div>
  );
}