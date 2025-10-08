'use client';

import { useState } from 'react';
import { FileIcon, MessageSquareIcon, ImageIcon, PlusIcon, UploadIcon, XIcon, EyeIcon, DownloadIcon, PaperclipIcon } from 'lucide-react';
import { ProjectUpdate, User } from '@/types';
import { ProjectAttachment } from '@/types';
import FileViewerModal from '@/components/modals/FileViewerModal';

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
  const [showViewer, setShowViewer] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ProjectAttachment | null>(null);
  const [newUpdate, setNewUpdate] = useState({
    type: 'design' as ProjectUpdate['type'],
    title: '',
    description: '',
    file: null as File | null,
  });

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      let fileUrl = '';
      
      // Handle file upload if file is selected
      if (newUpdate.file) {
        // Convert file to base64 for demo storage
        fileUrl = await convertFileToBase64(newUpdate.file);
      }
      
      const updateData = {
        projectId,
        userId: currentUser.id,
        type: newUpdate.type,
        title: newUpdate.title,
        description: newUpdate.description,
        fileUrl: fileUrl || undefined,
        fileName: newUpdate.file?.name || undefined,
        fileSize: newUpdate.file?.size || undefined,
        fileType: newUpdate.file?.type || undefined,
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
        setNewUpdate({ type: 'design', title: '', description: '', file: null });
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNewUpdate({ ...newUpdate, file });
  };

  const removeFile = () => {
    setNewUpdate({ ...newUpdate, file: null });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleViewFile = (update: ProjectUpdate) => {
    if (update.fileUrl) {
      // Convert project update file to ProjectAttachment format for the modal
      const attachment: ProjectAttachment = {
        id: update.id,
        name: update.fileName || 'Update File',
        size: update.fileSize || 0,
        type: update.fileType || 'application/octet-stream',
        url: update.fileUrl,
        uploadedAt: update.createdAt,
        uploadedBy: update.userId
      };
      setSelectedFile(attachment);
      setShowViewer(true);
    }
  };

  const closeViewer = () => {
    setShowViewer(false);
    setSelectedFile(null);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
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
        {updates && updates.length > 0 ? (
          updates.map((update) => (
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
                  <div className="mt-2 flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md cursor-pointer hover:bg-blue-100 transition-colors"
                         onClick={() => handleViewFile(update)}>
                      <FileIcon size={14} />
                      <span>
                        {update.fileName || 'Attached File'}
                        {update.fileSize && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({formatFileSize(update.fileSize)})
                          </span>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={() => handleViewFile(update)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="View file"
                    >
                      <EyeIcon size={14} />
                    </button>
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = update.fileUrl!;
                        link.download = update.fileName || 'download';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Download file"
                    >
                      <DownloadIcon size={14} />
                    </button>
                  </div>
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
          ))
        ) : (
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

              {/* File Upload (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attach File (Optional)
                </label>
                <div className="space-y-3">
                  {/* File Upload Area */}
                  {!newUpdate.file ? (
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <UploadIcon className="w-8 h-8 mb-4 text-gray-500" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PDF, DOC, Images, etc. (MAX. 10MB)</p>
                        </div>
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                        />
                      </label>
                    </div>
                  ) : (
                    /* Selected File Display */
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <FileIcon size={20} className="text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{newUpdate.file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(newUpdate.file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <XIcon size={16} />
                      </button>
                    </div>
                  )}
                </div>
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

      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={showViewer}
        onClose={closeViewer}
        attachment={selectedFile}
      />
    </div>
  );
}