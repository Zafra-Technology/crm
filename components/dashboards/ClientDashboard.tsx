'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import ProjectCard from '@/components/ProjectCard';
import { projectsApi } from '@/lib/api/projects';
import { PlusIcon } from 'lucide-react';

interface ClientDashboardProps {
  projects: Project[];
  userId: string;
}

export default function ClientDashboard({ projects: initialProjects, userId }: ClientDashboardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  
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

  const clientProjects = projects;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">My Projects</h1>
          <p className="text-gray-600 mt-1">Track your project progress and updates</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-black">{clientProjects.length}</div>
          <div className="text-sm text-gray-600">Total Projects</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {clientProjects.filter(p => p.status === 'in_progress').length}
          </div>
          <div className="text-sm text-gray-600">In Progress</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">
            {clientProjects.filter(p => p.status === 'review').length}
          </div>
          <div className="text-sm text-gray-600">In Review</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {clientProjects.filter(p => p.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-black">Active Projects</h2>
        {clientProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientProjects.map((project) => (
              <div key={project.id} className="h-full">
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <div className="text-gray-400 mb-4">
              <PlusIcon size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">No projects yet</h3>
            <p className="text-gray-500">Your projects will appear here once they are created.</p>
          </div>
        )}
      </div>
    </div>
  );
}