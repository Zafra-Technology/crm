'use client';

import { FileTextIcon, CalendarIcon, TagIcon, TrashIcon } from 'lucide-react';
import { ClientRequirement } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils/dateUtils';

interface ClientRequirementCardProps {
  requirement: ClientRequirement;
  onViewDetails?: (requirement: ClientRequirement) => void;
  onDelete?: (requirement: ClientRequirement) => void;
}

export default function ClientRequirementCard({ requirement, onViewDetails, onDelete }: ClientRequirementCardProps) {
  const fileCount = requirement.file_count || (Array.isArray(requirement.files) ? requirement.files.length : 0);

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="bg-blue-500 p-3 rounded-lg mb-3">
            <FileTextIcon className="h-6 w-6 text-white" />
          </div>
          <Badge variant="secondary" className="text-xs">
            {fileCount} {fileCount === 1 ? 'file' : 'files'}
          </Badge>
        </div>
        <CardTitle className="text-lg line-clamp-2">
          {requirement.client_name || 'Unnamed Client'}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 pt-0">
        {/* Category Icon and Label */}
        <div className="mb-4 flex items-center space-x-2 text-sm text-muted-foreground">
          <TagIcon size={16} />
          <span>Client Requirement</span>
        </div>

        {/* Created Date and By */}
        <div className="mb-2 flex items-center space-x-2 text-xs text-muted-foreground">
          <CalendarIcon size={12} />
          <span>
            <span className="font-medium">Created:</span> {requirement.created_at ? formatDate(requirement.created_at) : 'N/A'}
            {requirement.created_by && ` - ${requirement.created_by}`}
          </span>
        </div>

        {/* Last Edited Date and By */}
        {requirement.updated_at && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <CalendarIcon size={12} />
            <span>
              <span className="font-medium">Last edited:</span> {formatDate(requirement.updated_at)}
              {requirement.updated_by && ` - ${requirement.updated_by}`}
            </span>
          </div>
        )}
      </CardContent>

      {/* Footer with Actions */}
      <CardFooter className="pt-0 flex gap-2">
        {onViewDetails && (
          <Button
            onClick={() => onViewDetails(requirement)}
            className="flex-1"
            size="sm"
            variant="outline"
          >
            View Details
          </Button>
        )}
        {onDelete && (
          <Button
            onClick={() => onDelete(requirement)}
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
          >
            <TrashIcon size={14} />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

