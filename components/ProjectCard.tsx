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
  planning: 'outline',
  in_progress: 'secondary', 
  review: 'destructive',
  completed: 'default',
} as const;

const statusStyles = {
  planning: 'bg-slate-100 text-slate-800 hover:bg-slate-100 border-slate-300',
  in_progress: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300',
  review: 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300',
  completed: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-300',
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
          <Badge variant="outline" className={`whitespace-nowrap ${statusStyles[project.status]}`}>
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