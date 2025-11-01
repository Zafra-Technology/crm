'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { projectsApi } from '@/lib/api/projects';
import { authAPI, resolveMediaUrl } from '@/lib/api/auth';
import { projectUpdatesApi } from '@/lib/api/project-updates';
import { getCookie } from '@/lib/cookies';
import { mockChatMessages } from '@/lib/data/mockData';
import { User, Project, ProjectUpdate, ChatMessage } from '@/types';
import { Client } from '@/types/client';
import { Designer } from '@/types/designer';
import ProjectChat from '@/components/chat/ProjectChat';
import ProjectUpdates from '@/components/ProjectUpdates';
import ProjectAttachments from '@/components/ProjectAttachments';
import { CalendarIcon, UsersIcon, EditIcon, BuildingIcon, UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params?.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    requirements: '',
    timeline: '',
    status: 'planning' as Project['status']
  });

  useEffect(() => {
    (async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      await loadProjectData();
    })();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      
      // Load project details
      const foundProject = await projectsApi.getById(projectId);
      if (foundProject) {
        // Map backend snake_case fields to camelCase for frontend
        const mappedProject = {
          ...foundProject,
          clientName: foundProject.clientName || (foundProject as any).client_name,
          clientCompany: foundProject.clientCompany || (foundProject as any).client_company,
          // fallback: preserve other fields unchanged
        };
        setProject(mappedProject);
        setEditForm({
          name: mappedProject.name,
          description: mappedProject.description,
          requirements: mappedProject.requirements,
          timeline: mappedProject.timeline,
          status: mappedProject.status
          // NO clientName or clientCompany in editForm
        });

        try {
          // Fetch all users once and derive client, designers, and manager
          const allUsers = await authAPI.getUsers();

          // Load client details
          if (foundProject.clientId) {
            const clientUser = allUsers.find(user => user.id.toString() === foundProject.clientId.toString());
            if (clientUser) {
              setClient({
                id: clientUser.id.toString(),
                full_name: clientUser.full_name,
                email: clientUser.email,
                first_name: clientUser.first_name,
                last_name: clientUser.last_name,
                mobile_number: clientUser.mobile_number || '',
                address: clientUser.address || '',
                city: clientUser.city || '',
                state: clientUser.state || '',
                country: clientUser.country || '',
                pincode: clientUser.pincode || '',
                aadhar_number: clientUser.aadhar_number,
                pan_number: undefined,
                company_name: clientUser.company_name || '',
                role: clientUser.role,
                role_display: clientUser.role_display,
                is_active: clientUser.is_active,
                date_of_birth: clientUser.date_of_birth,
                profile_pic: clientUser.profile_pic,
                date_of_joining: clientUser.date_of_joining,
                date_of_exit: clientUser.date_of_exit,
                created_at: clientUser.created_at,
                updated_at: clientUser.updated_at,
                projectsCount: 0
              });
            } else if ((foundProject as any).clientName) {
              // Fallback: build client from backend-provided display fields
              setClient({
                id: foundProject.clientId.toString(),
                full_name: (foundProject as any).clientName,
                email: (foundProject as any).clientEmail || '',
                first_name: '',
                last_name: '',
                mobile_number: '',
                address: '',
                city: '',
                state: '',
                country: '',
                pincode: '',
                aadhar_number: undefined,
                pan_number: undefined,
                company_name: (foundProject as any).clientCompany || '',
                role: 'client',
                role_display: 'Client',
                is_active: true,
                date_of_birth: undefined,
                profile_pic: undefined,
                date_of_joining: undefined,
                date_of_exit: undefined,
                created_at: '',
                updated_at: '',
                projectsCount: 0
              });
            }
          }

          // Load assigned designers
          const apiDesigners = (foundProject as any).designers as Array<any> | undefined;
          if (Array.isArray(apiDesigners) && apiDesigners.length > 0) {
            const mapped = apiDesigners.map(d => ({
              id: String(d.id),
              name: String(d.full_name || d.name || ''),
              email: String(d.email || ''),
              phoneNumber: '',
              company: '',
              role: String(d.role || ''),
              status: 'active' as const,
              joinedDate: '',
              projectsCount: 0,
              avatar: d.profile_pic,
            }));
            setDesigners(mapped);
            if (typeof window !== 'undefined') {
              // eslint-disable-next-line no-console
              console.log('Assigned designers (from API):', mapped);
            }
          } else if (foundProject.designerIds && foundProject.designerIds.length > 0) {
            const wantedIds = foundProject.designerIds.map(id => id.toString());
            const designerUsers = allUsers.filter(user => 
              [
                'designer',
                'senior_designer',
                'team_lead',
                'team_head',
                'project_manager',
                'assistant_project_manager',
                'professional_engineer',
                'auto_cad_drafter'
              ].includes(user.role) &&
              wantedIds.includes(user.id.toString())
            );
            const assignedDesigners = designerUsers.map(user => ({
              id: user.id.toString(),
              name: user.full_name,
              email: user.email,
              phoneNumber: user.mobile_number || '',
              company: user.company_name || '',
              role: user.role_display || user.role,
              status: (user.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
              joinedDate: user.date_of_joining || user.created_at || '',
              projectsCount: 0,
              avatar: user.profile_pic
            }));
            setDesigners(assignedDesigners);
            if (typeof window !== 'undefined') {
              // eslint-disable-next-line no-console
              console.log('Assigned designers (resolved via IDs):', assignedDesigners);
            }
          } else {
            setDesigners([]);
            if (typeof window !== 'undefined') {
              // eslint-disable-next-line no-console
              console.log('Assigned designers: none');
            }
          }

        } catch (error) {
          console.error('Error loading users for client/designers/manager:', error);
        }
      }

      // Fetch project updates from API
      try {
        const fetchedUpdates = await projectUpdatesApi.getByProjectId({ projectId });
        setUpdates(fetchedUpdates);
      } catch (err) {
        setUpdates([]);
      }

      // Load chat messages from backend API (ProjectChat also loads; this is initial hydration)
      try {
        console.log('🔄 Loading chat messages for project:', projectId);
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const token = authAPI.getToken();
        const chatResponse = await fetch(`${API_BASE_URL}/chat/project/${projectId}/messages`, {
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });
        if (chatResponse.ok) {
          const projectMessages = await chatResponse.json();
          console.log('💬 Loaded chat messages:', projectMessages.length);
          const mapped = (projectMessages || []).map((m: any) => ({
            id: String(m.id),
            projectId: String(m.project_id),
            userId: String(m.user_id),
            userName: m.user_name,
            userRole: m.user_role,
            message: m.message,
            messageType: m.message_type,
            timestamp: m.timestamp,
            fileName: m.file_name,
            fileSize: m.file_size,
            fileType: m.file_type,
            fileUrl: resolveMediaUrl(m.file_url),
          }));
          setChatMessages(mapped);
        } else {
          console.error('Chat API error:', chatResponse.status);
          setChatMessages([]);
        }
      } catch (error) {
        console.error('Error loading chat messages:', error);
        setChatMessages([]);
      }

    } catch (error) {
      console.error('Error loading project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (project) {
      try {
        const updatedProject = await projectsApi.update(project.id, editForm);
        if (updatedProject) {
          setProject(updatedProject);
          setIsEditing(false);
        }
      } catch (error) {
        console.error('Error updating project:', error);
        alert('Failed to update project. Please try again.');
      }
    }
  };

  const handleAddAttachment = async (files: File[]) => {
    if (!project) return;
    
    try {
      // Convert files to base64 for storage (fallback approach)
      const newAttachments = await Promise.all(files.map(async (file) => {
        const base64 = await convertFileToBase64(file);
        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          url: base64,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user?.id || ''
        };
      }));

      // Add new attachments to existing ones
      const updatedAttachments = [...(project.attachments || []), ...newAttachments];
      
      // Update project with new attachments using existing API
      const updatedProject = await projectsApi.update(project.id, { attachments: updatedAttachments });
      
      if (updatedProject) {
        // Check if the updated project has the attachments
        if (updatedProject.attachments && updatedProject.attachments.length > 0) {
          setProject(updatedProject);
        } else {
          // If the backend didn't return attachments, manually update the local state
          const projectWithAttachments = {
            ...updatedProject,
            attachments: updatedAttachments
          };
          setProject(projectWithAttachments);
        }
      } else {
        // Fallback: update local state directly
        const projectWithAttachments = {
          ...project,
          attachments: updatedAttachments
        };
        setProject(projectWithAttachments);
      }
    } catch (error) {
      console.error('Error adding attachments:', error);
      alert('Failed to add attachments. Please try again.');
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!project) return;
    
    try {
      // Remove attachment from existing list
      const updatedAttachments = (project.attachments || []).filter(a => a.id !== attachmentId);
      
      // Update project with filtered attachments using existing API
      const updatedProject = await projectsApi.update(project.id, { attachments: updatedAttachments });
      
      if (updatedProject) {
        setProject(updatedProject);
        console.log('Attachment removed successfully');
      }
    } catch (error) {
      console.error('Error removing attachment:', error);
      alert('Failed to remove attachment. Please try again.');
    }
  };


  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Project not found</div>
      </div>
    );
  }

  const canEdit = user.role === 'project_manager' || user.role === 'assistant_project_manager' || user.role === 'admin' || user.role === 'designer';
  const canAddUpdates =
    user.role === 'designer' ||
    user.role === 'senior_designer' ||
    user.role === 'auto_cad_drafter' ||
    user.role === 'project_manager' ||
    user.role === 'assistant_project_manager' ||
    user.role === 'admin' ||
    user.role === 'client' ||
    user.role === 'team_head' ||
    user.role === 'team_lead';
  const isClient = user.role === 'client';
  const isDesigner = user.role === 'designer';

  const statusColors: Record<Project['status'] | 'inactive' | 'rejected' | 'quotation_submitted', string> = {
    planning: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    review: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    rejected: 'bg-red-100 text-red-800',
    quotation_submitted: 'bg-slate-100 text-slate-800',
  };

  const statusLabels: Record<Project['status'] | 'inactive' | 'rejected' | 'quotation_submitted', string> = {
    planning: 'Planning',
    in_progress: 'In Progress',
    review: 'In Review',
    completed: 'Completed',
    inactive: 'Pending',
    rejected: 'Rejected',
    quotation_submitted: 'Quotation Submitted',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">{project.name}</h1>
          <p className="text-gray-600 mt-1">Project management and team collaboration</p>
        </div>
        {canEdit && !isClient && !isDesigner && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <EditIcon size={16} />
            <span>Edit Project</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Project Content */}
        <div className="lg:col-span-1 space-y-6">
          {/* Project Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Project Overview</CardTitle>
                <Badge variant="outline" className={`${statusColors[project.status]}`}>
                  {statusLabels[project.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-4">
                <div>
                  <p className="text-muted-foreground leading-relaxed">{project.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Client</h4>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <BuildingIcon size={16} />
                      <div className="flex flex-col">
                        <span className="font-medium">{project.clientName || 'Unknown Client'}</span>
                        {project.clientCompany && (
                          <span className="text-sm text-muted-foreground/70">{project.clientCompany}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Timeline</h4>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <CalendarIcon size={16} />
                      <span>{project.timeline}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Team Size</h4>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <UsersIcon size={16} />
                      <span>{designers.length} member{designers.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Requirements */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-foreground mb-4">Project Requirements</h3>
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground leading-relaxed">{project.requirements}</p>
                </div>
              </div>

              {/* Agreement Attachments */}
              {Array.isArray(project.attachments) && project.attachments.length > 0 && (() => {
                const isAgreement = (name?: string) => !!name && (name.toLowerCase().startsWith('agreement') || name.toLowerCase().startsWith('signed agreement'));
                const agreementAttachments = project.attachments.filter(a => isAgreement(a.name));
                const otherAttachments = project.attachments.filter(a => !isAgreement(a.name));
                return (
                  <>
                    {agreementAttachments.length > 0 && (
                      <div className="pt-6 border-t">
                        <ProjectAttachments
                          attachments={agreementAttachments}
                          canEdit={false}
                          canRemove={false}
                          title="Agreement Attachments"
                        />
                      </div>
                    )}

                    {/* Project Attachments */}
                    <div className="pt-6 border-t">
                      <ProjectAttachments
                        attachments={otherAttachments}
                        canEdit={true}
                        canRemove={user.role === 'project_manager' || user.role === 'assistant_project_manager' || user.role === 'admin'}
                        onAddAttachment={handleAddAttachment}
                        onRemoveAttachment={handleRemoveAttachment}
                      />
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Project Updates - All roles can add updates */}
          <ProjectUpdates
            projectId={projectId}
            updates={updates}
            currentUser={user}
            canEdit={canAddUpdates}
            onUpdateAdded={loadProjectData}
          />

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Designers */}
                {designers.map((designer) => (
                  <div key={designer.id} className="flex items-center space-x-3 p-3 bg-accent/50 rounded-lg">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      {designer.avatar ? (
                        <img 
                          src={resolveMediaUrl(designer.avatar)} 
                          alt={designer.name} 
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            console.log('Avatar failed to load:', {
                              originalUrl: designer.avatar,
                              resolvedUrl: resolveMediaUrl(designer.avatar),
                              designerName: designer.name
                            });
                            // Hide the image and show the fallback icon
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = '<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                            }
                          }}
                        />
                      ) : (
                        <UserIcon size={20} className="text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{designer.name}</div>
                      <div className="text-sm text-muted-foreground">{designer.role}</div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {designer.role === 'designer' ? 'Designer' : 
                       designer.role === 'senior_designer' ? 'Senior Designer' : 
                       designer.role === 'team_lead' ? 'Team Lead' : 
                       designer.role === 'team_head' ? 'Team Head' : 
                       designer.role === 'project_manager' ? 'Project Manager' : 
                       designer.role === 'assistant_project_manager' ? 'Assistant Project Manager' : 
                       designer.role === 'professional_engineer' ? 'Professional Engineer' : 
                       designer.role === 'auto_cad_drafter' ? 'Auto CAD Drafter' : 
                       designer.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Team Chat */}
        <div className="lg:col-span-1">
          <div className="h-[calc(100vh-12rem)] sticky top-6">
            <ProjectChat 
              projectId={projectId}
              currentUser={user}
              messages={chatMessages}
            />
          </div>
        </div>
      </div>

      {/* Edit Project Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the project details below.
            </DialogDescription>
          </DialogHeader>

          <form id="edit-project-form" onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter project name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                required
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Enter project description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value as Project['status'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>

          <DialogFooter className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-project-form"
              className="flex-1"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}