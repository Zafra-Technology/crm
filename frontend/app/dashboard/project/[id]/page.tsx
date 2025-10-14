'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { projectsApi } from '@/lib/api/projects';
import { authAPI } from '@/lib/api/auth';
import { mockChatMessages } from '@/lib/data/mockData';
import { User, Project, ProjectUpdate, ChatMessage } from '@/types';
import { Client } from '@/types/client';
import { Designer } from '@/types/designer';
import ProjectChat from '@/components/chat/ProjectChat';
import ProjectUpdates from '@/components/ProjectUpdates';
import ProjectAttachments from '@/components/ProjectAttachments';
import { CalendarIcon, UsersIcon, EditIcon, BuildingIcon, UserIcon } from 'lucide-react';

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params?.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [projectManager, setProjectManager] = useState<any>(null);
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
    const currentUser = getCurrentUser();
    setUser(currentUser);
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      
      // Load project details
      const foundProject = await projectsApi.getById(projectId);
      if (foundProject) {
        setProject(foundProject);
        setEditForm({
          name: foundProject.name,
          description: foundProject.description,
          requirements: foundProject.requirements,
          timeline: foundProject.timeline,
          status: foundProject.status
        });
        
        console.log('Project attachments:', foundProject.attachments); // Debug log

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
              ['designer', 'senior_designer', 'auto_cad_drafter'].includes(user.role) &&
              wantedIds.includes(user.id.toString())
            );
            const assignedDesigners = designerUsers.map(user => ({
              id: user.id.toString(),
              name: user.full_name,
              email: user.email,
              phoneNumber: user.mobile_number || '',
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

          // Load project manager dynamically
          if (foundProject.managerId) {
            const pmUser = allUsers.find(user => user.id.toString() === foundProject.managerId.toString());
            if (pmUser) {
              setProjectManager({
                id: pmUser.id.toString(),
                name: pmUser.full_name,
                email: pmUser.email
              });
            } else {
              setProjectManager(null);
            }
          } else {
            setProjectManager(null);
          }
          if (typeof window !== 'undefined') {
            // eslint-disable-next-line no-console
            console.log('Debug IDs', {
              managerId: foundProject.managerId,
              designerIds: foundProject.designerIds,
              usersCount: allUsers.length
            });
          }
        } catch (error) {
          console.error('Error loading users for client/designers/manager:', error);
        }
      }

      // Load project updates and messages (mock for now)
      // TODO: Implement project updates API
      setUpdates([]);

      // Load chat messages from API
      try {
        console.log('🔄 Loading chat messages for project:', projectId);
        const chatResponse = await fetch(`/api/chat/${projectId}`);
        if (chatResponse.ok) {
          const projectMessages = await chatResponse.json();
          console.log('💬 Loaded chat messages:', projectMessages.length);
          setChatMessages(projectMessages);
        } else {
          console.error('Chat API error:', chatResponse.status);
          setChatMessages([]);
        }
      } catch (error) {
        console.error('Error loading chat messages:', error);
        // Fallback to empty array if API fails
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
      // Convert files to base64 for demo storage
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

      const updatedAttachments = [...(project.attachments || []), ...newAttachments];
      const updatedProject = await projectsApi.update(project.id, { attachments: updatedAttachments });
      
      if (updatedProject) {
        setProject(updatedProject);
      }
    } catch (error) {
      console.error('Error adding attachments:', error);
      alert('Failed to add attachments. Please try again.');
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!project) return;
    
    try {
      const updatedAttachments = (project.attachments || []).filter(a => a.id !== attachmentId);
      const updatedProject = await projectsApi.update(project.id, { attachments: updatedAttachments });
      
      if (updatedProject) {
        setProject(updatedProject);
      }
    } catch (error) {
      console.error('Error removing attachment:', error);
      alert('Failed to remove attachment. Please try again.');
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

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Project not found</div>
      </div>
    );
  }

  const canEdit = user.role === 'project_manager';
  const canAddUpdates = user.role === 'designer' || user.role === 'project_manager';
  const isClient = user.role === 'client';
  const isDesigner = user.role === 'designer';

  const statusColors = {
    planning: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    review: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
  };

  const statusLabels = {
    planning: 'Planning',
    in_progress: 'In Progress',
    review: 'In Review',
    completed: 'Completed',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          <p className="text-muted-foreground mt-1">Project management and team collaboration</p>
        </div>
        {canEdit && !isClient && !isDesigner && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <EditIcon size={16} />
            <span>Edit Project</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Project Content */}
        <div className="lg:col-span-1 space-y-6">
          {/* Project Details */}
          <div className="bg-card text-card-foreground rounded-lg shadow-sm border border-border p-6 space-y-6">
            {/* Project Overview */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Project Overview</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[project.status]}`}>
                  {statusLabels[project.status]}
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-muted-foreground leading-relaxed">{project.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Client</h4>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <BuildingIcon size={16} />
                      <div className="flex flex-col">
                        <span className="font-medium">{client?.full_name || 'Unknown Client'}</span>
                        {client?.company_name && (
                          <span className="text-sm text-muted-foreground">{client.company_name}</span>
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
                      <span>{designers.length + 1} members</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Project Requirements */}
            <div className="pt-6 border-t border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Project Requirements</h3>
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground leading-relaxed">{project.requirements}</p>
              </div>
            </div>

            {/* Project Attachments */}
            <div className="pt-6 border-t border-border">
              <ProjectAttachments
                attachments={project.attachments || []}
                canEdit={!isDesigner} // Allow both clients and managers to upload files
                onAddAttachment={handleAddAttachment}
                onRemoveAttachment={!isClient ? handleRemoveAttachment : undefined} // Only managers can remove files
              />
            </div>
          </div>

          {/* Project Updates - Hidden for clients, visible for designers */}
          {!isClient && (
            <ProjectUpdates 
              projectId={projectId}
              updates={updates}
              currentUser={user}
              canEdit={canAddUpdates}
              onUpdateAdded={loadProjectData}
            />
          )}

          {/* 5. Team Members */}
          <div className="bg-card text-card-foreground rounded-lg shadow-sm border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Team Members</h3>
            <div className="space-y-3">
              {/* Project Manager */}
              {projectManager && (
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <UserIcon size={20} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{projectManager.name}</div>
                    <div className="text-sm text-muted-foreground">Project Manager</div>
                  </div>
                  <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">Manager</div>
                </div>
              )}

              {/* Designers */}
              {designers.map((designer) => (
                <div key={designer.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                    <UserIcon size={20} className="text-secondary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{designer.name}</div>
                    <div className="text-sm text-muted-foreground">{designer.role}</div>
                  </div>
                  <div className="text-xs text-secondary-foreground bg-secondary/20 px-2 py-1 rounded">Designer</div>
                </div>
              ))}
            </div>
          </div>
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

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}>
          <div className="bg-background rounded-lg max-w-md w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-foreground mb-4">Edit Project</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-ring focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  required
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-ring focus:border-ring"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Project['status'] })}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-ring focus:border-ring"
                >
                  <option value="planning">Planning</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}