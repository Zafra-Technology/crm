'use client';

import Link from 'next/link';
import { CalendarIcon, UsersIcon, ClockIcon } from 'lucide-react';
import { Project } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProjectCardProps {
  project: Project;
  showActions?: boolean;
}

const statusColors = {
  planning: 'default',
  in_progress: 'secondary', 
  review: 'outline',
  completed: 'default',
} as const;

const statusLabels = {
  planning: 'Planning',
  in_progress: 'In Progress',
  review: 'In Review',
  completed: 'Completed',
};

export default function ProjectCard({ project, showActions = true }: ProjectCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2 flex-1 mr-2">{project.name}</CardTitle>
          <Badge variant={statusColors[project.status]} className="whitespace-nowrap">
            {statusLabels[project.status]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pt-0">
        <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">{project.description}</p>
        
        {/* Project info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mt-4 pt-2 border-t">
          <div className="flex items-center space-x-1">
            <CalendarIcon size={14} />
            <span className="truncate">{project.timeline}</span>
          </div>
          <div className="flex items-center space-x-1">
            <UsersIcon size={14} />
            <span className="whitespace-nowrap">{project.designerIds?.length || 0} team</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 mt-auto">
        <div className="flex items-center justify-between text-xs text-muted-foreground w-full">
          <div className="flex items-center space-x-1 flex-1 min-w-0">
            <ClockIcon size={12} />
            <span className="truncate">Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
          {showActions && (
            <Link 
              href={`/dashboard/project/${project.id}`}
              className="text-primary hover:underline font-medium whitespace-nowrap ml-2 flex-shrink-0"
            >
              View Details
            </Link>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}