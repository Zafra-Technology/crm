'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { projectsApi } from '@/lib/api/projects';
import { clientsApi } from '@/lib/api/clients';
import { designersApi } from '@/lib/api/designers';
import { projectUpdatesApi } from '@/lib/api/project-updates';
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

        // Load client details
        if (foundProject.clientId) {
          const clientData = await clientsApi.getById(foundProject.clientId);
          setClient(clientData);
        }

        // Load assigned designers
        if (foundProject.designerIds && foundProject.designerIds.length > 0) {
          const allDesigners = await designersApi.getAll();
          const assignedDesigners = allDesigners.filter(d => 
            foundProject.designerIds.includes(d.id)
          );
          setDesigners(assignedDesigners);
        }

        // Mock project manager data (in real app, would fetch from users API)
        setProjectManager({
          id: foundProject.managerId,
          name: 'Sarah Manager',
          email: 'sarah@company.com'
        });
      }

      // Load project updates and messages
      const projectUpdates = await projectUpdatesApi.getByProjectId(projectId);
      setUpdates(projectUpdates);

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
          <h1 className="text-2xl font-bold text-black">{project.name}</h1>
          <p className="text-gray-600 mt-1">Project management and team collaboration</p>
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
          <div className="card space-y-6">
            {/* Project Overview */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-black">Project Overview</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[project.status]}`}>
                  {statusLabels[project.status]}
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 leading-relaxed">{project.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <h4 className="font-medium text-black mb-2">Client</h4>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <BuildingIcon size={16} />
                      <div className="flex flex-col">
                        <span className="font-medium">{client?.name || 'Unknown Client'}</span>
                        {client?.company && (
                          <span className="text-sm text-gray-500">{client.company}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-black mb-2">Timeline</h4>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <CalendarIcon size={16} />
                      <span>{project.timeline}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-black mb-2">Team Size</h4>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <UsersIcon size={16} />
                      <span>{designers.length + 1} members</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Project Requirements */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-black mb-4">Project Requirements</h3>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-600 leading-relaxed">{project.requirements}</p>
              </div>
            </div>

            {/* Project Attachments */}
            <div className="pt-6 border-t border-gray-200">
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
          <div className="card">
            <h3 className="text-lg font-semibold text-black mb-4">Team Members</h3>
            <div className="space-y-3">
              {/* Project Manager */}
              {projectManager && (
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <UserIcon size={20} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-black">{projectManager.name}</div>
                    <div className="text-sm text-gray-600">Project Manager</div>
                  </div>
                  <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Manager</div>
                </div>
              )}

              {/* Designers */}
              {designers.map((designer) => (
                <div key={designer.id} className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <UserIcon size={20} className="text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-black">{designer.name}</div>
                    <div className="text-sm text-gray-600">{designer.role}</div>
                  </div>
                  <div className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">Designer</div>
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
          <div className="bg-white rounded-lg max-w-md w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-black mb-4">Edit Project</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  required
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Project['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
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