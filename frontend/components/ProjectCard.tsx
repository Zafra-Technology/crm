'use client';

import Link from 'next/link';
import { CalendarIcon, UsersIcon, ClockIcon, MessageSquare } from 'lucide-react';
import { Project } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils/dateUtils';

interface ProjectCardProps {
  project: Project;
  showActions?: boolean;
  onViewFeedback?: (project: Project) => void;
  onQuotationReview?: (project: Project) => void;
}

const statusVariants = {
  inactive: 'secondary',
  rejected: 'destructive',
  quotation_submitted: 'default',
  planning: 'outline',
  in_progress: 'secondary',
  review: 'destructive',
  completed: 'default',
  cancelled: 'destructive',
  onhold: 'secondary',
} as const;

const statusStyles = {
  inactive: 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-300',
  rejected: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-300',
  quotation_submitted: 'bg-slate-100 text-slate-800 hover:bg-slate-100 border-slate-300',
  planning: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-300',
  review: 'bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-300',
  completed: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-300',
  cancelled: 'bg-red-200 text-red-900 hover:bg-red-200 border-red-400',
  onhold: 'bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-300',
} as const;

const statusLabels = {
  inactive: 'Pending',
  rejected: 'Rejected',
  quotation_submitted: 'Quotation Submitted',
  planning: 'Planning',
  in_progress: 'In Progress',
  review: 'In Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
  onhold: 'On Hold',
};

export default function ProjectCard({ project, showActions = true, onViewFeedback, onQuotationReview }: ProjectCardProps) {
  const anyProject = project as any;
  
  // Calculate team count with better logic
  const teamCount = (() => {
    // First try to use the designerCount from backend
    if (anyProject.designerCount && anyProject.designerCount > 0) {
      return anyProject.designerCount;
    }
    if (anyProject.designer_count && anyProject.designer_count > 0) {
      return anyProject.designer_count;
    }
    
    // Fallback to counting designerIds array
    if (Array.isArray(project.designerIds) && project.designerIds.length > 0) {
      return project.designerIds.length;
    }
    if (Array.isArray(anyProject.designer_ids) && anyProject.designer_ids.length > 0) {
      return anyProject.designer_ids.length;
    }
    
    // Fallback to counting designers array
    if (Array.isArray(anyProject.designers) && anyProject.designers.length > 0) {
      return anyProject.designers.length;
    }
    
    return 0;
  })();
  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2 flex-1 mr-2">
            <span className="mr-2 text-foreground font-medium whitespace-nowrap">{(project as any).projectCode || (project as any).project_code || ''}</span>
            {project.name}
          </CardTitle>
          <Badge variant="outline" className={`whitespace-nowrap ${statusStyles[project.status]}`}>
            {statusLabels[project.status]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pt-0">
        {/* Description - fixed height */}
        <div className="mb-4 flex-1">
          <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">{project.description}</p>
        </div>
        
        {/* Project info - consistent spacing */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4 py-2 border-t">
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
              <Button
                onClick={() => onViewFeedback(project)}
                className="w-full"
                size="sm"
              >
                <MessageSquare size={14} />
                View Feedback
              </Button>
            </div>
          )}

          
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <div className="flex items-center space-x-1 flex-1 min-w-0">
              <ClockIcon size={12} />
              <span className="truncate">Updated {formatDate(project.updatedAt)}</span>
            </div>
            {showActions && (
              <>
                {project.status === 'rejected' && project.feedbackMessage && onViewFeedback ? (
                  <Button
                    onClick={() => onViewFeedback(project)}
                    variant="ghost"
                    size="sm"
                    className="text-orange-600 hover:text-orange-700 font-medium whitespace-nowrap ml-2 flex-shrink-0"
                  >
                    <MessageSquare size={12} />
                    View Feedback
                  </Button>
                ) : project.status === 'quotation_submitted' && onQuotationReview ? (
                  <Button
                    onClick={() => onQuotationReview(project)}
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap ml-2 flex-shrink-0"
                  >
                    <MessageSquare size={12} />
                    Review Quotation
                  </Button>
                ) : project.status !== 'inactive' && project.status !== 'rejected' && project.status !== 'quotation_submitted' ? (
                  <Link 
                    href={`/dashboard/project/${project.id}`}
                    className="text-primary hover:underline font-medium whitespace-nowrap ml-2 flex-shrink-0"
                  >
                    View Details
                  </Link>
                ) : null}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}