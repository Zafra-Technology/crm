'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Project } from '@/types';
import ProjectCard from '@/components/ProjectCard';
import ProjectTable from '@/components/ProjectTable';
import { projectsApi } from '@/lib/api/projects';
import { PlusIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderOpen, ClockIcon as Clock, TrendingUpIcon, BarChart3, CheckCircleIcon } from 'lucide-react';
import CreateProjectModal from '@/components/modals/CreateProjectModal';
import QuotationReviewModal from '@/components/modals/QuotationReviewModal';
import ViewFeedbackModal from '@/components/modals/ViewFeedbackModal';
import { Button } from '@/components/ui/button';
import { Card as BaseCard, CardContent as BaseCardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ClientDashboardProps {
  projects: Project[];
  userId: string;
}

export default function ClientDashboard({ projects: initialProjects, userId }: ClientDashboardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const searchParams = useSearchParams();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showViewFeedbackModal, setShowViewFeedbackModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Project | null>(null);
  const [selectedFeedbackProject, setSelectedFeedbackProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  useEffect(() => {
    loadProjects();
  }, [userId, searchParams]);

  const loadProjects = async () => {
    try {
      const clientFilter = searchParams?.get('client') || undefined;
      const projectsData = await projectsApi.getByUser(userId, 'client', clientFilter ? { clientId: clientFilter } : undefined);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleProjectCreated = () => {
    loadProjects();
  };

  const handleAcceptQuotation = async () => {
    if (!selectedQuotation) return;
    
    setLoading(true);
    try {
      await projectsApi.acceptQuotation(selectedQuotation.id);
      await loadProjects();
      setShowQuotationModal(false);
      setSelectedQuotation(null);
      setSuccessMessage('Quotation accepted successfully! Project is now in planning phase.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Error accepting quotation:', error);
      setErrorMessage('Failed to accept quotation. Please try again.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectQuotation = async (feedback: string) => {
    if (!selectedQuotation) return;
    
    setLoading(true);
    try {
      await projectsApi.rejectQuotation(selectedQuotation.id, feedback);
      await loadProjects();
      setShowQuotationModal(false);
      setSelectedQuotation(null);
      setSuccessMessage('Quotation rejected successfully. Feedback has been sent to the project manager.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      setErrorMessage('Failed to reject quotation. Please try again.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const openQuotationReview = (project: Project) => {
    setSelectedQuotation(project);
    setShowQuotationModal(true);
  };

  const openViewFeedback = (project: Project) => {
    setSelectedFeedbackProject(project);
    setShowViewFeedbackModal(true);
  };

  const clientProjects = projects;

  const filteredProjects = clientProjects.filter((project) => {
    const matchesSearch = project.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) || project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project as any).projectCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project as any).project_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Projects</h1>
          <p className="text-muted-foreground mt-1">Track your project progress and updates</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <PlusIcon size={20} />
          Create Project
        </Button>
      </div>

      {/* Stats - match PM UI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-blue-500 p-3 rounded-lg">
                <FolderOpen className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold text-foreground">{clientProjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-gray-500 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground">{clientProjects.filter(p => p.status === 'inactive').length}</p>
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
                <p className="text-2xl font-bold text-foreground">{clientProjects.filter(p => p.status === 'in_progress').length}</p>
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
                <p className="text-2xl font-bold text-foreground">{clientProjects.filter(p => p.status === 'review').length}</p>
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
                <p className="text-2xl font-bold text-foreground">{clientProjects.filter(p => p.status === 'completed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Management - match PM Card layout */}
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
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('all');
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
              <div className="p-8 text-center text-muted-foreground">No projects match your filters.</div>
            ) : (
              <ProjectTable
                projects={filteredProjects}
                showActions={true}
                onViewFeedback={openViewFeedback}
                onQuotationReview={openQuotationReview}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProjectCreated={handleProjectCreated}
        userId={userId}
      />

      {selectedQuotation && (
        <QuotationReviewModal
          isOpen={showQuotationModal}
          onClose={() => {
            setShowQuotationModal(false);
            setSelectedQuotation(null);
          }}
          onAccept={handleAcceptQuotation}
          onReject={handleRejectQuotation}
          quotationMessage={selectedQuotation.quotationMessage || ''}
          quotationFile={selectedQuotation.quotationFile}
          loading={loading}
        />
      )}

      {/* View Feedback Modal */}
      <ViewFeedbackModal
        isOpen={showViewFeedbackModal}
        onClose={() => {
          setShowViewFeedbackModal(false);
          setSelectedFeedbackProject(null);
        }}
        projectName={selectedFeedbackProject?.name || ''}
        feedbackMessage={selectedFeedbackProject?.feedbackMessage || ''}
      />

      {/* Success Message Toast */}
      {successMessage && (
        <Alert className="fixed top-4 right-4 z-50 w-96">
          <AlertDescription className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">{successMessage}</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <Alert variant="destructive" className="fixed top-4 right-4 z-50 w-96">
          <AlertDescription className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium">{errorMessage}</span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
