'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Project } from '@/types';
import { Designer } from '@/types/designer';
import ProjectCard from '@/components/ProjectCard';
import ProjectTable from '@/components/ProjectTable';
import ConfirmModal from '@/components/modals/ConfirmModal';
import AssignDesignersModal from '@/components/modals/AssignDesignersModal';
import FeedbackModal from '@/components/modals/FeedbackModal';
import QuotationModal from '@/components/modals/QuotationModal';
import ProjectDetailsModal from '@/components/modals/ProjectDetailsModal';
import ViewFeedbackModal from '@/components/modals/ViewFeedbackModal';
import { projectsApi } from '@/lib/api/projects';
import { authAPI, User as APIUser } from '@/lib/api/auth';
// Designers fetched via authAPI in AssignDesignersModal and here if needed
import { PlusIcon, TrendingUpIcon, ClockIcon, CheckCircleIcon, UsersIcon, XIcon, PaperclipIcon, FileIcon, DownloadIcon, Check, XCircle, MessageSquare, Eye, FolderOpen, BarChart3, SearchIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProjectManagerDashboardProps {
  projects: Project[];
  userId: string;
  userRole?: string;
}

interface CreateProjectForm {
  name: string;
  projectCode: string;
  description: string;
  requirements: string;
  clientId: string;
  designerIds: string[];
  projectType: 'residential' | 'commercial' | '';
  projectAddress: string;
  projectLocationUrl: string;
  attachments: File[];
}

export default function ProjectManagerDashboard({ projects: initialProjects, userId, userRole }: ProjectManagerDashboardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const searchParams = useSearchParams();
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<CreateProjectForm>({
    name: '',
    projectCode: '',
    description: '',
    requirements: '',
    clientId: '',
    designerIds: [],
    projectType: '',
    projectAddress: '',
    projectLocationUrl: '',
    attachments: []
  });

  useEffect(() => {
    loadProjects();
    loadDesigners();
    loadClients();
  }, [userId, searchParams]);

  const loadProjects = async () => {
    try {
      const clientFilter = searchParams?.get('client') || undefined;
      const projectsData = await projectsApi.getByUser(userId, 'project_manager', clientFilter ? { clientId: clientFilter } : undefined);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadDesigners = async () => {
    try {
      const { authAPI } = await import('@/lib/api/auth');
      const [designers, seniorDesigners, professionalEngineers, drafters] = await Promise.all([
        authAPI.getUsers('designer'),
        authAPI.getUsers('senior_designer'),
        authAPI.getUsers('professional_engineer'),
        authAPI.getUsers('auto_cad_drafter')
      ]);
      const merged = [...designers, ...seniorDesigners, ...professionalEngineers, ...drafters];
      const uniqueById = Array.from(new Map(merged.map(u => [u.id, u])).values());
      const mapped = uniqueById
        .filter(u => u.is_active)
        .map(u => ({
          id: u.id.toString(),
          name: u.full_name,
          email: u.email,
          phoneNumber: u.mobile_number || '',
          company: u.company_name || '',
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

  const isTeamRole = userRole === 'team_head' || userRole === 'team_lead';
  const canManage = !userRole || ['project_manager', 'assistant_project_manager', 'admin'].includes(userRole);
  const canCreate = canManage; // Team roles cannot create
  const canDelete = canManage; // Team roles cannot delete

  const visibleStatusesForTeam = ['planning', 'in_progress', 'review', 'completed'];
  const managedProjects = isTeamRole
    ? projects.filter(p => visibleStatusesForTeam.includes(p.status as any))
    : projects;

  // Filter projects based on search term, status, and client
  const filteredProjects = managedProjects.filter((project) => {
    const matchesSearch = project.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project as any).projectCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesClient = clientFilter === 'all' || project.clientId === clientFilter;
    return matchesSearch && matchesStatus && matchesClient;
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Project name is required';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }

    if (!formData.requirements.trim()) {
      errors.requirements = 'Requirements are required';
    }

    if (!formData.projectType) {
      errors.projectType = 'Project type is required';
    }

    if (!formData.clientId) {
      errors.clientId = 'Client selection is required';
    }

    if (!formData.projectAddress.trim()) {
      errors.projectAddress = 'Project address is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setValidationErrors({});

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

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
        projectCode: formData.projectCode || undefined,
        description: formData.description,
        requirements: formData.requirements,
        projectType: formData.projectType,
        projectAddress: formData.projectAddress || undefined,
        projectLocationUrl: formData.projectLocationUrl || undefined,
        clientId: formData.clientId,
        managerId: userId,
        designerIds: formData.designerIds
        // Note: Attachments will be handled separately after project creation
      };

      const newProject = await projectsApi.create(projectData);
      if (newProject) {
        // Immediately upload attachments via update call
        const finalAttachments = attachments;
        if (finalAttachments.length > 0) {
          try {
            await projectsApi.update(newProject.id, { attachments: finalAttachments });
          } catch (e) {
            console.error('Failed to upload attachments after create:', e);
          }
        }
        // Add the new project to the list
        setProjects([newProject, ...projects]);
        // Reset form data
        setFormData({
          name: '',
          projectCode: '',
          description: '',
          requirements: '',
          clientId: '',
          designerIds: [],
          projectType: '',
          projectAddress: '',
          projectLocationUrl: '',
          attachments: []
        });
        setValidationErrors({});
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
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Management</h1>
          <p className="text-muted-foreground">Manage and oversee all active projects</p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 shadow-md"
          >
            <PlusIcon size={18} />
            <span>Create Project</span>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-blue-500 p-3 rounded-lg">
                <FolderOpen className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold text-foreground">{managedProjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-gray-500 p-3 rounded-lg">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground">
                  {managedProjects.filter(p => p.status === 'inactive').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-yellow-500 p-3 rounded-lg">
                <TrendingUpIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-foreground">
                  {managedProjects.filter(p => p.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-purple-500 p-3 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">In Review</p>
                <p className="text-2xl font-bold text-foreground">
                  {managedProjects.filter(p => p.status === 'review').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-green-500 p-3 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">
                  {managedProjects.filter(p => p.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Project Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex gap-4 w-full sm:w-auto">
              <div className="w-48">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="inactive">Pending</SelectItem>
                    <SelectItem value="quotation_submitted">Quotation Submitted</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">In Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="onhold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Label className="text-xs">Client</Label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {Array.from(new Set(managedProjects.map(p => p.clientId))).map((clientId) => {
                      const client = allUsers.find(u => u.id.toString() === clientId);
                      return (
                        <SelectItem key={clientId} value={clientId}>
                          {client?.full_name || client?.email || `Client ${clientId}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[240px]">
                <Label htmlFor="project-search" className="text-xs">Search</Label>
                <Input
                  id="project-search"
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadProjects}>Apply</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('all');
                  setClientFilter('all');
                  setSearchTerm('');
                  loadProjects();
                }}
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading projects...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {managedProjects.length === 0
                  ? 'No projects found. Create your first project to get started.'
                  : 'No projects match your filters.'}
              </div>
            ) : (
              <ProjectTable
                projects={filteredProjects}
                showActions={true}
                onViewFeedback={openViewFeedbackModal}
                onAssign={openAssignModal}
                onDelete={openDeleteModal}
                canDelete={canDelete}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Project Modal */}
      {canCreate && (
      <Dialog open={showCreateForm} onOpenChange={(open) => {
        setShowCreateForm(open);
        if (!open) {
          setValidationErrors({});
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Fill in the project details to create a new project
            </DialogDescription>
          </DialogHeader>
            
            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
            <form onSubmit={handleCreateProject} className="space-y-6">
              {/* Project Name - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (validationErrors.name) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.name;
                        return newErrors;
                      });
                    }
                  }}
                  placeholder="Enter project name"
                  className={validationErrors.name ? 'border-destructive' : ''}
                />
                {validationErrors.name && (
                  <p className="text-sm text-destructive">{validationErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectCode">Project Code</Label>
                <Input
                  id="projectCode"
                  type="text"
                  value={formData.projectCode}
                  onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                  placeholder="Enter project code"
                />
              </div>

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectType">Project Type *</Label>
                  <Select
                    value={formData.projectType}
                    required
                    onValueChange={(value) => {
                      setFormData({ ...formData, projectType: value as 'residential' | 'commercial' });
                      if (validationErrors.projectType) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.projectType;
                          return newErrors;
                        });
                      }
                    }}
                  >
                    <SelectTrigger className={validationErrors.projectType ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select *" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.projectType && (
                    <p className="text-sm text-destructive">{validationErrors.projectType}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Select Client *</Label>
                  <Select
                    required
                    value={formData.clientId}
                    onValueChange={(value) => {
                      setFormData({ ...formData, clientId: value });
                      if (validationErrors.clientId) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.clientId;
                          return newErrors;
                        });
                      }
                    }}
                  >
                    <SelectTrigger className={validationErrors.clientId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Choose a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.clientId && (
                    <p className="text-sm text-destructive">{validationErrors.clientId}</p>
                  )}
                  {clients.length === 0 && !validationErrors.clientId && (
                    <p className="text-sm text-muted-foreground mt-1">No active clients available</p>
                  )}
                </div>
              </div>

              {/* Description - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (validationErrors.description) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.description;
                        return newErrors;
                      });
                    }
                  }}
                  rows={3}
                  placeholder="Describe the project"
                  className={validationErrors.description ? 'border-destructive' : ''}
                />
                {validationErrors.description && (
                  <p className="text-sm text-destructive">{validationErrors.description}</p>
                )}
              </div>

              {/* Requirements - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements *</Label>
                <Textarea
                  id="requirements"
                  required
                  value={formData.requirements}
                  onChange={(e) => {
                    setFormData({ ...formData, requirements: e.target.value });
                    if (validationErrors.requirements) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.requirements;
                        return newErrors;
                      });
                    }
                  }}
                  rows={2}
                  placeholder="List project requirements"
                  className={validationErrors.requirements ? 'border-destructive' : ''}
                />
                {validationErrors.requirements && (
                  <p className="text-sm text-destructive">{validationErrors.requirements}</p>
                )}
              </div>

              {/* Project Address - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="projectAddress">
                  <span className="text-destructive mr-1">*</span>Project Address
                </Label>
                <Textarea
                  id="projectAddress"
                  required
                  value={formData.projectAddress}
                  onChange={(e) => {
                    setFormData({ ...formData, projectAddress: e.target.value });
                    if (validationErrors.projectAddress) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.projectAddress;
                        return newErrors;
                      });
                    }
                  }}
                  rows={2}
                  placeholder="Enter project address"
                  className={validationErrors.projectAddress ? 'border-destructive' : ''}
                />
                {validationErrors.projectAddress && (
                  <p className="text-sm text-destructive">{validationErrors.projectAddress}</p>
                )}
              </div>

              {/* Location URL - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="projectLocationUrl">Location URL</Label>
                <Input
                  id="projectLocationUrl"
                  type="url"
                  value={formData.projectLocationUrl}
                  onChange={(e) => setFormData({ ...formData, projectLocationUrl: e.target.value })}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Optional:</strong> Paste any Google Maps URL (embed URL or regular link). Both formats are accepted and will work.
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Tip:</strong> For embed URL, click "Share" → "Embed a map" in Google Maps. Regular links will be automatically converted.
                </p>
              </div>
              
              {/* Team Member Selection */}
              <div className="space-y-2">
                <Label>Assign Team Members (Optional)</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-border rounded-md p-2">
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
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">{designer.name} - {designer.role}</span>
                    </label>
                  ))}
                  {designers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No active team members available</p>
                  )}
                </div>
              </div>

              {/* File Attachments */}
              <div className="space-y-2">
                <Label>Project Attachments (Optional)</Label>
                <div className="space-y-3">
                  {/* File Upload */}
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <PaperclipIcon className="w-8 h-8 mb-4 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT (MAX. 10MB)</p>
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
                      <p className="text-sm font-medium text-foreground">Uploaded Files:</p>
                      {formData.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div className="flex items-center space-x-2">
                            <FileIcon size={16} className="text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <XIcon size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </form>
            </div>

            <DialogFooter className="flex space-x-3">
              <Button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setValidationErrors({});
                }}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={handleCreateProject}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
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
        designers={designers}
        currentDesigners={(selectedProject as any)?.designers || []}
      />

      {/* Delete Confirmation Modal */}
      {canDelete && (
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
      )}

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