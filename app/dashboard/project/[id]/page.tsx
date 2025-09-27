'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { mockProjects, mockUpdates, mockChatMessages } from '@/lib/data/mockData';
import { User, Project, ProjectUpdate, ChatMessage } from '@/types';
import ProjectChat from '@/components/chat/ProjectChat';
import ProjectUpdates from '@/components/ProjectUpdates';
import { CalendarIcon, UsersIcon, EditIcon } from 'lucide-react';

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isEditing, setIsEditing] = useState(false);
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

    const foundProject = mockProjects.find(p => p.id === projectId);
    if (foundProject) {
      setProject(foundProject);
      setEditForm({
        name: foundProject.name,
        description: foundProject.description,
        requirements: foundProject.requirements,
        timeline: foundProject.timeline,
        status: foundProject.status
      });
    }

    const projectUpdates = mockUpdates.filter(u => u.projectId === projectId);
    setUpdates(projectUpdates);

    const projectMessages = mockChatMessages.filter(m => m.projectId === projectId);
    setChatMessages(projectMessages);
  }, [projectId]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (project) {
      const updatedProject = { ...project, ...editForm };
      setProject(updatedProject);
      setIsEditing(false);
    }
  };

  if (!user || !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const canEdit = user.role === 'project_manager';
  const canAddUpdates = user.role === 'designer' || user.role === 'project_manager';

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
          <h1 className="text-2xl font-bold text-black">Project Details</h1>
          <p className="text-gray-600 mt-1">Manage project information and collaboration</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <EditIcon size={16} />
            <span>Edit Project</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Project Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">Project Information</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
                {statusLabels[project.status]}
              </span>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-black mb-1">{project.name}</h4>
                <p className="text-sm text-gray-600">{project.description}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-black mb-1">Requirements</h4>
                <p className="text-sm text-gray-600">{project.requirements}</p>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-1 text-gray-500">
                  <CalendarIcon size={14} />
                  <span>{project.timeline}</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-500">
                  <UsersIcon size={14} />
                  <span>{project.designerIds.length} designer{project.designerIds.length > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column - Updates */}
        <div className="lg:col-span-1">
          <ProjectUpdates 
            projectId={projectId}
            updates={updates}
            currentUser={user}
            canEdit={canAddUpdates}
          />
        </div>

        {/* Right Column - Chat */}
        <div className="lg:col-span-1">
          <ProjectChat 
            projectId={projectId}
            currentUser={user}
            messages={chatMessages}
          />
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
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