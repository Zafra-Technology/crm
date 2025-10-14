'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import ProjectCard from '@/components/ProjectCard';
import { projectsApi } from '@/lib/api/projects';
import { PlusIcon, MessageSquare } from 'lucide-react';
import CreateProjectModal from '@/components/modals/CreateProjectModal';
import QuotationReviewModal from '@/components/modals/QuotationReviewModal';
import ViewFeedbackModal from '@/components/modals/ViewFeedbackModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ClientDashboardProps {
  projects: Project[];
  userId: string;
}

export default function ClientDashboard({ projects: initialProjects, userId }: ClientDashboardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showViewFeedbackModal, setShowViewFeedbackModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Project | null>(null);
  const [selectedFeedbackProject, setSelectedFeedbackProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  useEffect(() => {
    loadProjects();
  }, [userId]);

  const loadProjects = async () => {
    try {
      const projectsData = await projectsApi.getByUser(userId, 'client');
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="text-center p-6">
            <div className="text-2xl font-bold text-foreground">{clientProjects.length}</div>
            <div className="text-sm text-muted-foreground">Total Projects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center p-6">
            <div className="text-2xl font-bold text-muted-foreground">
              {clientProjects.filter(p => p.status === 'inactive').length}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center p-6">
            <div className="text-2xl font-bold text-yellow-600">
              {clientProjects.filter(p => p.status === 'in_progress').length}
            </div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center p-6">
            <div className="text-2xl font-bold text-purple-600">
              {clientProjects.filter(p => p.status === 'review').length}
            </div>
            <div className="text-sm text-muted-foreground">In Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center p-6">
            <div className="text-2xl font-bold text-green-600">
              {clientProjects.filter(p => p.status === 'completed').length}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
      </div>



      {/* Projects Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">All Projects</h2>
        {clientProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientProjects.map((project) => (
              <div key={project.id} className="h-full">
                <ProjectCard 
                  project={project} 
                  onViewFeedback={openViewFeedback}
                  onQuotationReview={openQuotationReview}
                />
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <PlusIcon size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No projects yet</h3>
              <p className="text-muted-foreground">Create your first project to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>

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