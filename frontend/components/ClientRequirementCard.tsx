'use client';

import { FileTextIcon, ClockIcon, UserIcon, CalendarIcon } from 'lucide-react';
import { ClientRequirement } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils/dateUtils';

interface ClientRequirementCardProps {
  requirement: ClientRequirement;
  onViewDetails?: (requirement: ClientRequirement) => void;
}

export default function ClientRequirementCard({ requirement, onViewDetails }: ClientRequirementCardProps) {
  const fileCount = requirement.file_count || (Array.isArray(requirement.files) ? requirement.files.length : 0);

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-2">
          {requirement.client_name || 'Unnamed Client'}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 pt-0">
        {/* File Count */}
        <div className="mb-4 flex items-center space-x-2 text-sm text-muted-foreground">
          <FileTextIcon size={16} />
          <span>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
        </div>

        {/* Last Edited */}
        <div className="mb-2 flex items-center space-x-2 text-xs text-muted-foreground">
          <ClockIcon size={12} />
          <span>Last edited {formatDate(requirement.updated_at)}</span>
        </div>
        <div className="mb-4 flex items-center space-x-2 text-xs text-muted-foreground pl-4">
          <UserIcon size={12} />
          <span>by {requirement.updated_by || 'Unknown'}</span>
        </div>

        {/* Created */}
        <div className="mb-2 flex items-center space-x-2 text-xs text-muted-foreground border-t pt-2">
          <CalendarIcon size={12} />
          <span>Created {formatDate(requirement.created_at)}</span>
        </div>
        <div className="mb-4 flex items-center space-x-2 text-xs text-muted-foreground pl-4">
          <UserIcon size={12} />
          <span>by {requirement.created_by || 'Unknown'}</span>
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="pt-0">
        {onViewDetails && (
          <Button
            onClick={() => onViewDetails(requirement)}
            className="w-full"
            size="sm"
            variant="outline"
          >
            View Details
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

