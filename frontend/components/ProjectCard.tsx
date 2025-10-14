'use client';

import Link from 'next/link';
import { CalendarIcon, UsersIcon, ClockIcon, MessageSquare } from 'lucide-react';
import { Project } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  planning: 'default',
  in_progress: 'secondary',
  review: 'secondary',
  completed: 'default',
} as const;

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
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-foreground line-clamp-2 flex-1 mr-2">{project.name}</h3>
          <Badge variant={statusVariants[project.status]} className="whitespace-nowrap">
            {statusLabels[project.status]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {/* Description - fixed height */}
        <div className="mb-4 flex-1">
          <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">{project.description}</p>
        </div>
        
        {/* Project info - consistent spacing */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4 py-2 border-t border-border">
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
              <span className="truncate">Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
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
                    className="text-foreground hover:underline font-medium whitespace-nowrap ml-2 flex-shrink-0"
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