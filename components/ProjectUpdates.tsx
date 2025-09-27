'use client';

import { useState } from 'react';
import { FileIcon, MessageSquareIcon, ImageIcon, PlusIcon } from 'lucide-react';
import { ProjectUpdate, User } from '@/types';

interface ProjectUpdatesProps {
  projectId: string;
  updates: ProjectUpdate[];
  currentUser: User;
  canEdit: boolean;
  onUpdateAdded?: () => void;
}

export default function ProjectUpdates({ projectId, updates, currentUser, canEdit, onUpdateAdded }: ProjectUpdatesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newUpdate, setNewUpdate] = useState({
    type: 'design' as ProjectUpdate['type'],
    title: '',
    description: '',
  });

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const updateData = {
        projectId,
        userId: currentUser.id,
        type: newUpdate.type,
        title: newUpdate.title,
        description: newUpdate.description,
      };

      const response = await fetch('/api/project-updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        setShowAddForm(false);
        setNewUpdate({ type: 'design', title: '', description: '' });
        if (onUpdateAdded) {
          onUpdateAdded(); // Refresh the project data
        }
      } else {
        throw new Error('Failed to add update');
      }
    } catch (error) {
      console.error('Error adding update:', error);
      alert('Failed to add update. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getUpdateIcon = (type: ProjectUpdate['type']) => {
    switch (type) {
      case 'design':
        return <ImageIcon size={16} className="text-purple-600" />;
      case 'file':
        return <FileIcon size={16} className="text-blue-600" />;
      case 'comment':
        return <MessageSquareIcon size={16} className="text-green-600" />;
    }
  };

  const getUpdateTypeLabel = (type: ProjectUpdate['type']) => {
    switch (type) {
      case 'design':
        return 'Design Update';
      case 'file':
        return 'File Upload';
      case 'comment':
        return 'Comment';
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-black">Project Updates</h3>
        {canEdit && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-secondary flex items-center space-x-2 text-sm"
          >
            <PlusIcon size={16} />
            <span>Add Update</span>
          </button>
        )}
      </div>

      {/* Updates List */}
      <div className="space-y-4">
        {updates.map((update) => (
          <div key={update.id} className="border-l-2 border-gray-200 pl-4 pb-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getUpdateIcon(update.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">{update.title}</span>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {getUpdateTypeLabel(update.type)}
                  </span>
                </div>
                {update.description && (
                  <p className="text-sm text-gray-600 mb-2">{update.description}</p>
                )}
                {update.fileUrl && (
                  <a 
                    href={update.fileUrl}
                    className="text-sm text-blue-600 hover:underline flex items-center space-x-1"
                  >
                    <FileIcon size={14} />
                    <span>Download File</span>
                  </a>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(update.createdAt).toLocaleDateString()} at{' '}
                  {new Date(update.createdAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {updates.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <ImageIcon size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No updates yet</p>
            <p className="text-sm">Project updates will appear here</p>
          </div>
        )}
      </div>

      {/* Add Update Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}>
          <div className="bg-white rounded-lg max-w-md w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-black mb-4">Add Project Update</h3>
            <form onSubmit={handleAddUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Update Type
                </label>
                <select
                  value={newUpdate.type}
                  onChange={(e) => setNewUpdate({ ...newUpdate, type: e.target.value as ProjectUpdate['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                >
                  <option value="design">Design Update</option>
                  <option value="file">File Upload</option>
                  <option value="comment">Comment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={newUpdate.title}
                  onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                  placeholder="Update title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newUpdate.description}
                  onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                  rows={3}
                  placeholder="Describe the update"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  disabled={loading}
                  className="btn-secondary flex-1 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}