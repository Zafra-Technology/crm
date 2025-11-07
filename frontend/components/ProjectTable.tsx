'use client';

import Link from 'next/link';
import { UsersIcon, ClockIcon, MessageSquare, MoreVertical, XIcon } from 'lucide-react';
import { Project } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils/dateUtils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectTableProps {
  projects: Project[];
  showActions?: boolean;
  onViewFeedback?: (project: Project) => void;
  onQuotationReview?: (project: Project) => void;
  onAssign?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  canDelete?: boolean;
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

export default function ProjectTable({ 
  projects, 
  showActions = true, 
  onViewFeedback, 
  onQuotationReview, 
  onAssign,
  onDelete,
  canDelete = false
}: ProjectTableProps) {
  
  const getTeamCount = (project: Project) => {
    const anyProject = project as any;
    if (anyProject.designerCount && anyProject.designerCount > 0) {
      return anyProject.designerCount;
    }
    if (anyProject.designer_count && anyProject.designer_count > 0) {
      return anyProject.designer_count;
    }
    if (Array.isArray(project.designerIds) && project.designerIds.length > 0) {
      return project.designerIds.length;
    }
    if (Array.isArray(anyProject.designer_ids) && anyProject.designer_ids.length > 0) {
      return anyProject.designer_ids.length;
    }
    if (Array.isArray(anyProject.designers) && anyProject.designers.length > 0) {
      return anyProject.designers.length;
    }
    return 0;
  };

  const getActionButton = (project: Project) => {
    if (!showActions) return null;

    if (project.status === 'rejected' && project.feedbackMessage && onViewFeedback) {
      return (
        <Button
          onClick={() => onViewFeedback(project)}
          variant="ghost"
          size="sm"
          className="text-orange-600 hover:text-orange-700 font-medium"
        >
          <MessageSquare size={14} className="mr-1" />
          View Feedback
        </Button>
      );
    }
    
    if (project.status === 'quotation_submitted' && onQuotationReview) {
      return (
        <Button
          onClick={() => onQuotationReview(project)}
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          <MessageSquare size={14} className="mr-1" />
          Review Quotation
        </Button>
      );
    }
    
    if (project.status !== 'inactive' && project.status !== 'rejected' && project.status !== 'quotation_submitted') {
      return (
        <Link 
          href={`/dashboard/project/${project.id}`}
          className="text-primary hover:underline font-medium text-sm"
        >
          View Details
        </Link>
      );
    }

    return null;
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No projects found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">S.No.</TableHead>
            <TableHead className="w-[120px]">Project Code</TableHead>
            <TableHead className="w-[250px]">Project Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[250px]">Description</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Updated</TableHead>
            {showActions && <TableHead className="w-[150px]">Actions</TableHead>}
            {(onAssign || (canDelete && onDelete)) && <TableHead className="w-[50px]">Assign</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project, index) => {
            const teamCount = getTeamCount(project);
            const hasFeedback = project.feedbackMessage && project.status !== 'rejected' && onViewFeedback;
            
            return (
              <TableRow 
                key={project.id} 
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => window.location.href = `/dashboard/project/${project.id}`}
              >
                <TableCell>
                  <span className="font-medium text-foreground">{index + 1}</span>
                </TableCell>
                <TableCell>
                  <span className="text-foreground font-medium whitespace-nowrap">
                    {(project as any).projectCode || (project as any).project_code || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-foreground">
                    {project.name}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`whitespace-nowrap ${statusStyles[project.status]}`}>
                    {statusLabels[project.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-muted-foreground line-clamp-2 max-w-[250px]">
                    {project.description}
                  </p>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <UsersIcon size={14} />
                    <span>{teamCount} team</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <ClockIcon size={12} />
                    <span>{formatDate(project.updatedAt)}</span>
                  </div>
                </TableCell>
                {showActions && (
                  <TableCell>
                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                      {hasFeedback && (
                        <Button
                          onClick={() => onViewFeedback?.(project)}
                          className="w-full"
                          size="sm"
                          variant="outline"
                        >
                          <MessageSquare size={14} className="mr-1" />
                          View Feedback
                        </Button>
                      )}
                      <div className="flex items-center">
                        {getActionButton(project)}
                      </div>
                    </div>
                  </TableCell>
                )}
                {(onAssign || (canDelete && onDelete)) && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onAssign && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onAssign(project);
                          }}>
                            <UsersIcon size={14} className="mr-2 text-blue-600" />
                            Assign Team Members
                          </DropdownMenuItem>
                        )}
                        {canDelete && onDelete && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(project);
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <XIcon size={14} className="mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

