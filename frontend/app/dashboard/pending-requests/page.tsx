'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { authAPI } from '@/lib/api/auth';
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
import AgreementModal from '@/components/modals/AgreementModal';
import { convertFileToBase64 } from '@/lib/utils/fileUtils';
import { formatDate } from '@/lib/utils/dateUtils';

export default function PendingRequestsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showManagerRejectModal, setShowManagerRejectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/');
          return;
        }
        if (isMounted) {
          setUser(currentUser);
          loadPendingProjects();
        }
      } catch (e) {
        console.error('Failed to load current user', e);
        router.push('/');
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const loadPendingProjects = async () => {
    try {
      setLoading(true);
      let pending = await projectsApi.getPending();
      // Debug: verify client display fields coming from backend
      if (typeof window !== 'undefined') {
        const missingClientName = pending.filter((p: any) => !p.clientName && !p.clientCompany && !p.clientEmail);
        if (missingClientName.length > 0) {
          // eslint-disable-next-line no-console
          console.warn('[PendingRequests] Missing client display fields for project ids:', missingClientName.map((p: any) => p.id));
        }
      }
      // Fetch details for items missing client display fields and merge
      const toFix = pending.filter((p: any) => !p.clientName && !p.clientCompany && !p.clientEmail);
      if (toFix.length > 0) {
        const details = await Promise.all(
          toFix.map(async (p) => {
            try { return await projectsApi.getById(p.id); } catch { return null; }
          })
        );
        const byId: Record<string, any> = {};
        details.filter(Boolean).forEach((d: any) => { byId[d.id] = d; });
        pending = pending.map((p: any) => byId[p.id] ? { ...p, ...byId[p.id] } : p);
      }

      // Final fallback: resolve client names via users API
      const stillMissing = pending.filter((p: any) => !p.clientName && !p.clientCompany && !p.clientEmail && p.clientId);
      if (stillMissing.length > 0) {
        try {
          const users = await authAPI.getUsers();
          const userById: Record<string, any> = {};
          users.forEach((u: any) => { userById[String(u.id)] = u; });
          pending = pending.map((p: any) => {
            if (!p.clientName && p.clientId && userById[String(p.clientId)]) {
              const u = userById[String(p.clientId)];
              const fullName = u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
              return { ...p, clientName: fullName || u.company_name || u.email || undefined };
            }
            return p;
          });
        } catch (e) {
          // ignore failure; UI will fallback to #id
        }
      }
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

  const handleSendAgreement = async (agreementFile?: File) => {
    if (!selectedProject) return;

    try {
      setLoading(true);
      // Use backend endpoint so server tracks the event
      await projectsApi.sendAgreement(selectedProject.id, '', agreementFile);

      toast({
        title: 'Agreement sent',
        description: 'The agreement has been uploaded and shared with the client.',
      });
      setShowAgreementModal(false);
      setSelectedProject(null);
      await loadPendingProjects();
    } catch (error) {
      console.error('Error sending agreement:', error);
      toast({
        title: 'Error',
        description: 'Failed to send agreement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManagerAcceptAgreement = async (project: Project) => {
    try {
      setLoading(true);
      await projectsApi.managerReviewAgreement(project.id, 'accept');
      if (project.projectType === 'commercial') {
        // Immediately proceed to quotation for commercial projects
        openQuotationModal(project);
      } else {
        // Residential moves to planning and disappears from this list
        await loadPendingProjects();
      }
      toast({ title: 'Agreement accepted', description: 'Proceeding to the next step.' });
    } catch (error) {
      console.error('Error accepting agreement:', error);
      toast({ title: 'Error', description: 'Failed to accept agreement', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleManagerRejectAgreement = async (feedbackMessage: string) => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      await projectsApi.managerReviewAgreement(selectedProject.id, 'reject', feedbackMessage);
      toast({ title: 'Agreement rejected', description: 'Feedback sent to client.' });
      setShowManagerRejectModal(false);
      setSelectedProject(null);
      await loadPendingProjects();
    } catch (error) {
      console.error('Error rejecting agreement:', error);
      toast({ title: 'Error', description: 'Failed to reject agreement', variant: 'destructive' });
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

  const openAgreementModal = (project: Project) => {
    setSelectedProject(project);
    setShowAgreementModal(true);
  };

  const openManagerRejectModal = (project: Project) => {
    setSelectedProject(project);
    setShowManagerRejectModal(true);
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

  const handleCloseAgreementModal = () => {
    setShowAgreementModal(false);
    setSelectedProject(null);
  };

  const handleCloseManagerRejectModal = () => {
    setShowManagerRejectModal(false);
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
                    <span>{formatDate(project.createdAt)}</span>
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
                    <span className="truncate">Client: {((project as any).clientName || (project as any).clientCompany || (project as any).clientEmail || `#${project.clientId}`)}</span>
                  </div>
                </div>

                {/* Footer with actions */}
                <div className="mt-auto">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="h-3 w-3" />
                      <span>Updated {formatDate(project.updatedAt)}</span>
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
                    
                    {/* For the new flow, stage-based actions */}
                    {/* Stage 1: No agreement yet -> Send Agreement / Reject */}
                    {project.status === 'inactive' && !(project.attachments || []).some(a => (a.name || '').toLowerCase().startsWith('agreement')) && (
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
                        <Button
                          size="sm"
                          onClick={() => openAgreementModal(project)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Send Agreement
                        </Button>
                      </div>
                    )}

                    {/* Stage 2: Agreement sent, waiting for client -> just info badge */}
                    {project.status === 'inactive' && (project.attachments || []).some(a => (a.name || '').toLowerCase().startsWith('agreement')) &&
                     !(project.attachments || []).some(a => (a.name || '').toLowerCase().startsWith('signed agreement')) && (
                      <Badge variant="secondary" className="w-full justify-center">Awaiting client signature</Badge>
                    )}

                    {/* Stage 3: Signed agreement received -> Manager Accept/Reject */}
                    {project.status === 'inactive' && (project.attachments || []).some(a => (a.name || '').toLowerCase().startsWith('signed agreement')) && (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManagerRejectModal(project)}
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          Reject Agreement
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleManagerAcceptAgreement(project)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Accept Agreement
                        </Button>
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

      {/* Manager Reject Agreement Modal */}
      <FeedbackModal
        isOpen={showManagerRejectModal}
        onClose={handleCloseManagerRejectModal}
        onSubmit={handleManagerRejectAgreement}
        title="Reject Agreement"
        placeholder="Please provide feedback for rejecting the signed agreement..."
        loading={loading}
      />

      {/* Quotation Modal for Commercial Projects (kept for later step) */}
      <QuotationModal
        isOpen={showQuotationModal}
        onClose={handleCloseQuotationModal}
        onSubmit={handleSubmitQuotation}
        loading={loading}
      />

      {/* Agreement Modal for initial step */}
      <AgreementModal
        isOpen={showAgreementModal}
        onClose={handleCloseAgreementModal}
        onSubmit={handleSendAgreement}
        loading={loading}
      />
    </div>
  );
}
