'use client';

import Link from 'next/link';
import { CalendarIcon, UsersIcon, ClockIcon, MessageSquare } from 'lucide-react';
import { Project } from '@/types';

interface ProjectCardProps {
  project: Project;
  showActions?: boolean;
  onViewFeedback?: (project: Project) => void;
  onQuotationReview?: (project: Project) => void;
}

const statusColors = {
  inactive: 'bg-gray-100 text-gray-800',
  rejected: 'bg-red-100 text-red-800',
  quotation_submitted: 'bg-blue-100 text-blue-800',
  planning: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  review: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
};

const statusLabels = {
  inactive: 'Pending',
  rejected: 'Rejected',
  quotation_submitted: 'Quotation Submitted',
  planning: 'Planning',
  in_progress: 'In Progress',
  review: 'In Review',
  completed: 'Completed',
};

export default function ProjectCard({ project, showActions = true, onViewFeedback, onQuotationReview }: ProjectCardProps) {
  const anyProject = project as any;
  const teamCount = (
    (Array.isArray(project.designerIds) && project.designerIds.length) ||
    (Array.isArray(anyProject.designer_ids) && anyProject.designer_ids.length) ||
    Number(anyProject.designerCount || anyProject.designer_count || 0)
  );
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
          <span className="whitespace-nowrap">{teamCount} team</span>
        </div>
      </div>

      {/* Footer - always at bottom with proper spacing */}
      <div className="mt-auto">
        {/* View Feedback Button - show if project has feedback message and is not rejected (rejected projects show it in footer) */}
        {project.feedbackMessage && onViewFeedback && project.status !== 'rejected' && (
          <div className="mb-2">
            <button
              onClick={() => onViewFeedback(project)}
              className="w-full px-3 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center justify-center gap-2"
            >
              <MessageSquare size={14} />
              View Feedback
            </button>
          </div>
        )}

        
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <div className="flex items-center space-x-1 flex-1 min-w-0">
            <ClockIcon size={12} />
            <span className="truncate">Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
          {showActions && (
            <>
              {project.status === 'rejected' && project.feedbackMessage && onViewFeedback ? (
                <button
                  onClick={() => onViewFeedback(project)}
                  className="text-orange-600 hover:text-orange-700 font-medium whitespace-nowrap ml-2 flex-shrink-0 flex items-center gap-1"
                >
                  <MessageSquare size={12} />
                  View Feedback
                </button>
              ) : project.status === 'quotation_submitted' && onQuotationReview ? (
                <button
                  onClick={() => onQuotationReview(project)}
                  className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap ml-2 flex-shrink-0 flex items-center gap-1"
                >
                  <MessageSquare size={12} />
                  Review Quotation
                </button>
              ) : project.status !== 'inactive' && project.status !== 'rejected' && project.status !== 'quotation_submitted' ? (
                <Link 
                  href={`/dashboard/project/${project.id}`}
                  className="text-black hover:underline font-medium whitespace-nowrap ml-2 flex-shrink-0"
                >
                  View Details
                </Link>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}