'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import ProjectCard from '@/components/ProjectCard';
import { projectsApi } from '@/lib/api/projects';
import { PlusIcon, TrendingUpIcon, ClockIcon, CheckCircleIcon, UsersIcon } from 'lucide-react';

interface DesignerSharedDashboardProps {
  projects: Project[];
  userId: string;
  userRole: string;
}

export default function DesignerSharedDashboard({ projects: initialProjects, userId, userRole }: DesignerSharedDashboardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [userId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // Fetch projects assigned to this designer
      const projectsData = await projectsApi.getByUser(userId, userRole);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Since backend already filters projects for designers, we can use all projects
  const assignedProjects = projects;

  const getRoleDisplayName = () => {
    switch (userRole) {
      case 'senior_designer':
        return 'Senior Designer';
      case 'designer':
        return 'Designer';
      case 'auto_cad_drafter':
        return 'Auto CAD Drafter';
      default:
        return 'Designer';
    }
  };

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-background z-20 pb-4 mb-2 -mx-6 px-6">
        <div className="flex items-center justify-between bg-background pt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Design Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your assigned design projects</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUpIcon size={24} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">{assignedProjects.length}</div>
          <div className="text-sm text-muted-foreground">Assigned Projects</div>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <ClockIcon size={24} className="text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-yellow-600">
            {assignedProjects.filter(p => p.status === 'in_progress').length}
          </div>
          <div className="text-sm text-muted-foreground">In Progress</div>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <ClockIcon size={24} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {assignedProjects.filter(p => p.status === 'review').length}
          </div>
          <div className="text-sm text-muted-foreground">In Review</div>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <CheckCircleIcon size={24} className="text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">
            {assignedProjects.filter(p => p.status === 'completed').length}
          </div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </div>
      </div>

      {/* Assigned Projects */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">My Assigned Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignedProjects.map((project) => (
            <div key={project.id} className="relative group">
              <ProjectCard project={project} />
            </div>
          ))}
        </div>

        {assignedProjects.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-muted-foreground mb-4">
              <UsersIcon size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No projects assigned</h3>
            <p className="text-muted-foreground">You haven't been assigned to any projects yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
