'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
// Projects API - using existing implementation
import { User, Project } from '@/types';
import ClientDashboard from '@/components/dashboards/ClientDashboard';
import ProjectManagerDashboard from '@/components/dashboards/ProjectManagerDashboard';
import DesignerDashboard from '@/components/dashboards/DesignerDashboard';
import DesignerSharedDashboard from '@/components/dashboards/DesignerSharedDashboard';
import DigitalMarketingDashboard from '@/components/dashboards/DigitalMarketingDashboard';
import WelcomeDashboard from '@/components/dashboards/WelcomeDashboard';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      loadProjects(currentUser);
    }
  }, []);

  const loadProjects = async (currentUser: User) => {
    try {
      setLoading(true);
      // Import projects API dynamically to avoid circular dependencies
      const { projectsApi } = await import('@/lib/api/projects');
      const projectsData = await projectsApi.getByUser(currentUser.id, currentUser.role);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (user.role) {
      case 'client':
        return <ClientDashboard projects={projects} userId={user.id} />;
      case 'client_team_member':
        return <ClientDashboard projects={projects} userId={user.id} />;
      case 'project_manager':
        return <ProjectManagerDashboard projects={projects} userId={user.id} />;
      case 'assistant_project_manager':
        return <ProjectManagerDashboard projects={projects} userId={user.id} />;
      case 'designer':
        return <DesignerSharedDashboard projects={projects} userId={user.id} userRole={user.role} />;
      case 'senior_designer':
        return <DesignerSharedDashboard projects={projects} userId={user.id} userRole={user.role} />;
      case 'professional_engineer':
        return <DesignerSharedDashboard projects={projects} userId={user.id} userRole={user.role} />;
      case 'auto_cad_drafter':
        return <DesignerSharedDashboard projects={projects} userId={user.id} userRole={user.role} />;
      case 'admin':
        return <ProjectManagerDashboard projects={projects} userId={user.id} />;
      case 'team_head':
      case 'team_lead':
      case 'hr_manager':
      case 'accountant':
      case 'sales_manager':
      case 'operation_manager':
        return <WelcomeDashboard user={user} />;
      case 'digital_marketing':
        return <DigitalMarketingDashboard user={user} />;
      default:
        return <div>Unknown role</div>;
    }
  };

  return renderDashboard();
}