'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { User, Project } from '@/types';
import { projectsApi } from '@/lib/api/projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ClockIcon, 
  UserIcon, 
  CalendarIcon, 
  BuildingIcon,
  FileTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import ProjectDetailsModal from '@/components/modals/ProjectDetailsModal';
import FeedbackModal from '@/components/modals/FeedbackModal';
import QuotationModal from '@/components/modals/QuotationModal';

export default function PendingRequestsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const router = useRouter();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/');
      return;
    }
    setUser(currentUser);
    loadPendingProjects();
  }, [router]);

  const loadPendingProjects = async () => {
    try {
      setLoading(true);
      const pending = await projectsApi.getPending();
      setPendingProjects(pending);
    } catch (error) {
      console.error('Error loading pending projects:', error);
      toast({
        title: "Error",
        description: "Failed to load pending projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProject = async (projectId: string) => {
    try {
      await projectsApi.approveProject(projectId);
      toast({
        title: "Success",
        description: "Project approved successfully",
      });
      loadPendingProjects();
    } catch (error) {
      console.error('Error approving project:', error);
      toast({
        title: "Error",
        description: "Failed to approve project",
        variant: "destructive",
      });
    }
  };

  const handleSubmitQuotation = async (quotationMessage: string, quotationFile?: File) => {
    if (!selectedProject) return;
    
    try {
      await projectsApi.submitQuotation(selectedProject.id, quotationMessage, quotationFile);
      toast({
        title: "Success",
        description: "Quotation submitted successfully",
      });
      setShowQuotationModal(false);
      setSelectedProject(null);
      loadPendingProjects();
    } catch (error) {
      console.error('Error submitting quotation:', error);
      toast({
        title: "Error",
        description: "Failed to submit quotation",
        variant: "destructive",
      });
    }
  };

  const handleRejectProject = async (feedbackMessage: string) => {
    if (!selectedProject) return;
    
    try {
      await projectsApi.rejectProject(selectedProject.id, feedbackMessage);
      toast({
        title: "Success",
        description: "Project rejected successfully",
      });
      setShowFeedbackModal(false);
      setSelectedProject(null);
      loadPendingProjects();
    } catch (error) {
      console.error('Error rejecting project:', error);
      toast({
        title: "Error",
        description: "Failed to reject project",
        variant: "destructive",
      });
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

  const handleViewProject = (project: Project) => {
    setSelectedProject(project);
    setShowProjectModal(true);
  };

  const handleCloseModal = () => {
    setShowProjectModal(false);
    setSelectedProject(null);
  };

  const handleCloseFeedbackModal = () => {
    setShowFeedbackModal(false);
    setSelectedProject(null);
  };

  const handleCloseQuotationModal = () => {
    setShowQuotationModal(false);
    setSelectedProject(null);
  };

  if (!user) {
    return null;
  }

  // Only show this page to project managers, assistant project managers, and admins
  if (!['project_manager', 'assistant_project_manager', 'admin'].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view pending requests.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading pending requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pending Project Requests</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage project requests awaiting approval
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {pendingProjects.length} pending
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pending</p>
                <p className="text-2xl font-bold">{pendingProjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BuildingIcon className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Residential</p>
                <p className="text-2xl font-bold">
                  {pendingProjects.filter(p => p.projectType === 'residential').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BuildingIcon className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commercial</p>
                <p className="text-2xl font-bold">
                  {pendingProjects.filter(p => p.projectType === 'commercial').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Projects Grid */}
      {pendingProjects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ClockIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Pending Requests</h3>
            <p className="text-muted-foreground">
              There are currently no project requests awaiting approval.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow h-full flex flex-col border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-foreground line-clamp-2 flex-1 mr-2">
                    {project.name}
                  </h3>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 whitespace-nowrap">
                    Pending Review
                  </Badge>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center space-x-1">
                    <BuildingIcon className="h-4 w-4" />
                    <span className="capitalize">{project.projectType}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                {/* Description */}
                <div className="mb-4 flex-1">
                  <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
                    {project.description}
                  </p>
                </div>
                
                {/* Requirements */}
                {project.requirements && (
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Requirements:</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 pl-6">
                      {project.requirements}
                    </p>
                  </div>
                )}
                
                {/* Timeline */}
                {project.timeline && (
                  <div className="flex items-center space-x-2 mb-4 text-sm text-muted-foreground">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="font-medium">Timeline:</span>
                    <span>{project.timeline}</span>
                  </div>
                )}
                
                {/* Project info */}
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4 py-2 border-t border-border">
                  <div className="flex items-center space-x-1">
                    <UserIcon className="h-4 w-4" />
                    <span className="truncate">Client ID: {project.clientId}</span>
                  </div>
                </div>

                {/* Footer with actions */}
                <div className="mt-auto">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="h-3 w-3" />
                      <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewProject(project)}
                      className="w-full"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    
                    {/* Only show approve/reject buttons for inactive projects */}
                    {project.status === 'inactive' && (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRejectModal(project)}
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        
                        {/* Different flow for residential vs commercial projects */}
                        {project.projectType === 'residential' ? (
                          <Button
                            size="sm"
                            onClick={() => handleApproveProject(project.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => openQuotationModal(project)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {/* Show status for non-inactive projects */}
                    {project.status !== 'inactive' && (
                      <Badge 
                        variant={project.status === 'rejected' ? 'destructive' : 'secondary'}
                        className="w-full justify-center"
                      >
                        {project.status === 'rejected' ? 'Rejected' : 
                         project.status === 'planning' ? 'Approved' :
                         project.status === 'in_progress' ? 'In Progress' :
                         project.status === 'completed' ? 'Completed' :
                         project.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Project Details Modal */}
      <ProjectDetailsModal
        isOpen={showProjectModal}
        onClose={handleCloseModal}
        project={selectedProject}
        clientInfo={null}
      />

      {/* Feedback Modal for Rejection */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={handleCloseFeedbackModal}
        onSubmit={handleRejectProject}
        title="Reject Project"
        placeholder="Please provide feedback for rejecting this project..."
        loading={loading}
      />

      {/* Quotation Modal for Commercial Projects */}
      <QuotationModal
        isOpen={showQuotationModal}
        onClose={handleCloseQuotationModal}
        onSubmit={handleSubmitQuotation}
        loading={loading}
      />
    </div>
  );
}
