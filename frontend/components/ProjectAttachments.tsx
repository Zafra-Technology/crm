'use client';

import { useState } from 'react';
import { ProjectAttachment } from '@/types';
import FileViewerModal from '@/components/modals/FileViewerModal';
import { FileIcon, DownloadIcon, PaperclipIcon, XIcon, EyeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils/dateUtils';
import { resolveMediaUrl } from '@/lib/api/auth';
import { getAuthToken } from '@/lib/auth';

interface ProjectAttachmentsProps {
  attachments: ProjectAttachment[];
  canEdit: boolean;
  canRemove?: boolean; // Separate permission for removing files
  onAddAttachment?: (files: File[]) => void;
  onRemoveAttachment?: (attachmentId: string) => void;
  title?: string;
}

export default function ProjectAttachments({ 
  attachments, 
  canEdit, 
  canRemove = true, // Default to true for backward compatibility
  onAddAttachment, 
  onRemoveAttachment,
  title = 'Project Attachments',
}: ProjectAttachmentsProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<ProjectAttachment | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📈';
    if (type.includes('text')) return '📝';
    if (type.includes('video')) return '🎥';
    if (type.includes('audio')) return '🎵';
    return '📁';
  };

  // Check if base64 URL is valid
  const isValidBase64Url = (url: string) => {
    if (!url) return false;
    if (url.startsWith('data:')) {
      const base64Part = url.split(',')[1];
      if (!base64Part) return false;
      try {
        atob(base64Part);
        return true;
      } catch (e) {
        return false;
      }
    }
    return true;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onAddAttachment) {
      onAddAttachment(files);
      setShowUpload(false);
    }
  };

  const handleDownload = async (attachment: ProjectAttachment) => {
    if (!attachment.url) {
      alert('File URL is not available.');
      return;
    }
    
    try {
      // If it's a data URL (base64), download directly
      if (attachment.url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      
      // If it's already a blob URL, download directly (these are temporary client-side URLs)
      if (attachment.url.startsWith('blob:')) {
        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      
      // For remote URLs (backend URLs), fetch as blob to handle CORS and authentication
      const fileUrl = resolveMediaUrl(attachment.url);
      
      // Skip if URL is empty or invalid
      if (!fileUrl || fileUrl === attachment.url) {
        // If resolveMediaUrl didn't change the URL and it's not a valid URL, try direct download
        if (!attachment.url.startsWith('http://') && !attachment.url.startsWith('https://')) {
          alert('Invalid file URL. Cannot download.');
          return;
        }
      }
      
      const token = await getAuthToken();
      const headers: HeadersInit = {
        'Accept': '*/*',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(fileUrl, { 
        credentials: 'include',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Clean up the blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback: try direct download for data URLs or valid HTTP URLs
      try {
        if (attachment.url.startsWith('data:') || attachment.url.startsWith('http://') || attachment.url.startsWith('https://')) {
          const link = document.createElement('a');
          link.href = attachment.url;
          link.download = attachment.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          alert(`Unable to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } catch (fallbackError) {
        console.error('Fallback download error:', fallbackError);
        alert('Unable to download file. Please try again later.');
      }
    }
  };

  const handleView = (attachment: ProjectAttachment) => {
    setSelectedAttachment(attachment);
    setShowViewer(true);
  };

  const closeViewer = () => {
    setShowViewer(false);
    setSelectedAttachment(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {canEdit && (
            <Button
              onClick={() => setShowUpload(!showUpload)}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <PaperclipIcon size={16} />
              <span>Add Files</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>

        {/* Upload Section */}
        {showUpload && canEdit && (
          <div className="mb-4 p-4 border-2 border-dashed border-input rounded-lg">
            <label className="flex flex-col items-center justify-center cursor-pointer">
              <PaperclipIcon className="w-8 h-8 mb-2 text-muted-foreground" />
              <span className="text-sm text-foreground">Click to upload files</span>
              <span className="text-xs text-muted-foreground mt-1">PDF, DOC, Images, etc.</span>
              <Input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
              />
            </label>
          </div>
        )}

        {/* Attachments List */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {attachments && attachments.length > 0 ? (
            attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">{getFileIcon(attachment.type)}</span>
                  </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{attachment.name}</p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(attachment.size)}</span>
                    <span>•</span>
                    <span>Uploaded {formatDate(attachment.uploadedAt)}</span>
                    {attachment.type.includes('image') && !isValidBase64Url(attachment.url) && (
                      <span className="text-orange-600 font-medium">⚠️ Invalid image data</span>
                    )}
                  </div>
                </div>
                </div>
                
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Button
                    onClick={() => handleView(attachment)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="View file"
                  >
                    <EyeIcon size={16} />
                  </Button>
                  <Button
                    onClick={() => handleDownload(attachment)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Download file"
                  >
                    <DownloadIcon size={16} />
                  </Button>
                  {canRemove && onRemoveAttachment && (
                    <Button
                      onClick={() => onRemoveAttachment(attachment.id)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Remove file"
                    >
                      <XIcon size={16} />
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <PaperclipIcon size={48} className="mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-sm">No attachments yet</p>
              <p className="text-xs">Project files will appear here</p>
            </div>
          )}
        </div>

        {/* File Viewer Modal */}
        <FileViewerModal
          isOpen={showViewer}
          onClose={closeViewer}
          attachment={selectedAttachment}
        />
      </CardContent>
    </Card>
  );
}