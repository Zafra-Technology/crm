'use client';

import { Calendar, User, FileText, Clock, Building, Home, Mail, Phone } from 'lucide-react';
import { Project } from '@/types';
import { User as APIUser } from '@/lib/api/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import ProjectAttachments from '@/components/ProjectAttachments';
import { formatDate } from '@/lib/utils/dateUtils';

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  clientInfo?: APIUser | null;
}

export default function ProjectDetailsModal({ 
  isOpen, 
  onClose, 
  project,
  clientInfo
}: ProjectDetailsModalProps) {

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const formattedDate = formatDate(dateString);
    const time = date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return `${formattedDate} at ${time}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen || !project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Project Details</DialogTitle>
          <DialogDescription>
            View comprehensive information about this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl">{project.name}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                      {project.projectType === 'commercial' ? (
                        <Building size={16} className="text-blue-600" />
                      ) : (
                        <Home size={16} className="text-green-600" />
                      )}
                      <span className="capitalize">{project.projectType}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={16} className="text-muted-foreground" />
                      <span>Created {formatDateTime(project.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  Pending Review
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Project Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm">{project.timeline || 'Not specified'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {clientInfo ? (
                    <div className="space-y-2">
                      <p className="font-medium">{clientInfo.full_name || `${clientInfo.first_name} ${clientInfo.last_name}`.trim()}</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail size={12} />
                          <span>{clientInfo.email}</span>
                        </div>
                        {clientInfo.mobile_number && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone size={12} />
                            <span>{clientInfo.mobile_number}</span>
                          </div>
                        )}
                        {clientInfo.company_name && (
                          <p className="text-sm text-muted-foreground">{clientInfo.company_name}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Client: {(project as any).clientName || (project as any).clientCompany || (project as any).clientEmail || `#${project.clientId}`}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Project Type
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm capitalize">
                    {project.projectType || 'Not specified'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Last Updated
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm">
                    {formatDateTime(project.updatedAt)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Project Description</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {project.description || 'No description provided'}
              </p>
            </CardContent>
          </Card>

          {/* Requirements */}
          {project.requirements && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Requirements</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {project.requirements}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {project.attachments && project.attachments.length > 0 && (
            <ProjectAttachments
              attachments={project.attachments}
              canEdit={false}
              canRemove={false}
              title="Project Attachments"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
