'use client';

import { useState } from 'react';
import { FileIcon, MessageSquareIcon, ImageIcon, PlusIcon, UploadIcon, XIcon, EyeIcon, DownloadIcon, PaperclipIcon } from 'lucide-react';
import { ProjectUpdate, User } from '@/types';
import { ProjectAttachment } from '@/types';
import FileViewerModal from '@/components/modals/FileViewerModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Project Updates</CardTitle>
          {canEdit && (
            <Button
              onClick={() => setShowAddForm(true)}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <PlusIcon size={16} />
              <span>Add Update</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>

        {/* Updates List */}
        <div className="space-y-4">
          {updates && updates.length > 0 ? (
            updates.map((update) => (
              <div key={update.id} className="border-l-2 border-border pl-4 pb-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getUpdateIcon(update.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{update.title}</span>
                    <Badge variant="secondary" className="text-xs">
                      {getUpdateTypeLabel(update.type)}
                    </Badge>
                  </div>
                  {update.description && (
                    <p className="text-sm text-muted-foreground mb-2">{update.description}</p>
                  )}
                  {update.fileUrl && (
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="flex items-center space-x-1 text-sm text-primary bg-primary/10 px-3 py-2 rounded-md cursor-pointer hover:bg-primary/20 transition-colors border border-primary/20"
                           onClick={() => handleViewFile(update)}>
                        <FileIcon size={14} />
                        <span>
                          {update.fileName || 'Attached File'}
                          {update.fileSize && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({formatFileSize(update.fileSize)})
                            </span>
                          )}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleViewFile(update)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="View file"
                      >
                        <EyeIcon size={14} />
                      </Button>
                      <Button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = update.fileUrl!;
                          link.download = update.fileName || 'download';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Download file"
                      >
                        <DownloadIcon size={14} />
                      </Button>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
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
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon size={48} className="mx-auto mb-4 text-muted-foreground/50" />
              <p>No updates yet</p>
              <p className="text-sm">Project updates will appear here</p>
            </div>
          )}
        </div>

        {/* Add Update Form */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Project Update</DialogTitle>
              <DialogDescription>
                Share a new update about this project.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="update-type">Update Type</Label>
                <Select
                  value={newUpdate.type}
                  onValueChange={(value) => setNewUpdate({ ...newUpdate, type: value as ProjectUpdate['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select update type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="design">Design Update</SelectItem>
                    <SelectItem value="file">File Upload</SelectItem>
                    <SelectItem value="comment">Comment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="update-title">Title</Label>
                <Input
                  id="update-title"
                  type="text"
                  required
                  value={newUpdate.title}
                  onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                  placeholder="Update title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="update-description">Description</Label>
                <Textarea
                  id="update-description"
                  value={newUpdate.description}
                  onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                  rows={3}
                  placeholder="Describe the update"
                />
              </div>

                {/* File Upload (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Attach File (Optional)
                  </label>
                  <div className="space-y-3">
                    {/* File Upload Area */}
                    {!newUpdate.file ? (
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-lg cursor-pointer bg-accent/50 hover:bg-accent">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadIcon className="w-8 h-8 mb-4 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">PDF, DOC, Images, etc. (MAX. 10MB)</p>
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
                      <div className="flex items-center justify-between p-3 bg-accent/50 rounded-md border border-border">
                        <div className="flex items-center space-x-3">
                          <FileIcon size={20} className="text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{newUpdate.file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(newUpdate.file.size)}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={removeFile}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <XIcon size={16} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

            </form>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
                onClick={handleAddUpdate}
              >
                {loading ? 'Adding...' : 'Add Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* File Viewer Modal */}
        <FileViewerModal
          isOpen={showViewer}
          onClose={closeViewer}
          attachment={selectedFile}
        />
      </CardContent>
    </Card>
  );
}