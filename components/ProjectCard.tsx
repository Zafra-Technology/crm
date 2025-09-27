'use client';

import Link from 'next/link';
import { CalendarIcon, UsersIcon, ClockIcon } from 'lucide-react';
import { Project } from '@/types';

interface ProjectCardProps {
  project: Project;
  showActions?: boolean;
}

const statusColors = {
  planning: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  review: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
};

const statusLabels = {
  planning: 'Planning',
  in_progress: 'In Progress',
  review: 'In Review',
  completed: 'Completed',
};

export default function ProjectCard({ project, showActions = true }: ProjectCardProps) {
  return (
    <div className="card hover:shadow-md transition-shadow h-full flex flex-col">
      {/* Header with title and status */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-black line-clamp-2 flex-1 mr-2">{project.name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[project.status]}`}>
          {statusLabels[project.status]}
        </span>
      </div>
      
      {/* Description - fixed height */}
      <div className="mb-4 flex-1">
        <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">{project.description}</p>
      </div>
      
      {/* Project info - consistent spacing */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4 py-2 border-t border-gray-100">
        <div className="flex items-center space-x-1">
          <CalendarIcon size={14} />
          <span className="truncate">{project.timeline}</span>
        </div>
        <div className="flex items-center space-x-1">
          <UsersIcon size={14} />
          <span className="whitespace-nowrap">{project.designerIds?.length || 0} designer{(project.designerIds?.length || 0) !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Footer - always at bottom with proper spacing */}
      <div className="mt-auto">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <div className="flex items-center space-x-1 flex-1 min-w-0">
            <ClockIcon size={12} />
            <span className="truncate">Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
          {showActions && (
            <Link 
              href={`/dashboard/project/${project.id}`}
              className="text-black hover:underline font-medium whitespace-nowrap ml-2 flex-shrink-0"
            >
              View Details
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}