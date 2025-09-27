'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import ProjectCard from '@/components/ProjectCard';
import { projectsApi } from '@/lib/api/projects';
import { BrushIcon, ClockIcon, AlertCircleIcon, TrendingUpIcon } from 'lucide-react';

interface DesignerDashboardProps {
  projects: Project[];
  userId: string;
}

export default function DesignerDashboard({ projects: initialProjects, userId }: DesignerDashboardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  
  useEffect(() => {
    loadProjects();
  }, [userId]);

  const loadProjects = async () => {
    try {
      const projectsData = await projectsApi.getByUser(userId, 'designer');
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const assignedProjects = projects;
  const urgentProjects = assignedProjects.filter(p => p.status === 'in_progress');
  const reviewProjects = assignedProjects.filter(p => p.status === 'review');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Design Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your assigned projects and tasks</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <BrushIcon size={24} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-black">{assignedProjects.length}</div>
          <div className="text-sm text-gray-600">Assigned Projects</div>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <ClockIcon size={24} className="text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-yellow-600">{urgentProjects.length}</div>
          <div className="text-sm text-gray-600">Active Tasks</div>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <AlertCircleIcon size={24} className="text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-600">{reviewProjects.length}</div>
          <div className="text-sm text-gray-600">Pending Review</div>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUpIcon size={24} className="text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">
            {assignedProjects.filter(p => p.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
      </div>

      {/* Active Projects */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-black">Current Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignedProjects.map((project) => (
            <div key={project.id} className="relative group h-full">
              <ProjectCard project={project} />
              {project.status === 'in_progress' && (
                <div className="absolute top-4 right-4">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-sm"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>


      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold text-black mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 py-2 border-b border-gray-100 last:border-b-0">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Homepage wireframes completed</div>
              <div className="text-xs text-gray-500">E-commerce Website Redesign • 2 hours ago</div>
            </div>
          </div>
          <div className="flex items-center space-x-3 py-2 border-b border-gray-100 last:border-b-0">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Research documents uploaded</div>
              <div className="text-xs text-gray-500">Mobile App Interface • 1 day ago</div>
            </div>
          </div>
          <div className="flex items-center space-x-3 py-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Logo concepts submitted for review</div>
              <div className="text-xs text-gray-500">Brand Identity Package • 2 days ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}