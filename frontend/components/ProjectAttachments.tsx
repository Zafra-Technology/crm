'use client';

import { useState } from 'react';
import { ProjectAttachment } from '@/types';
import FileViewerModal from '@/components/modals/FileViewerModal';
import { FileIcon, DownloadIcon, PaperclipIcon, XIcon, EyeIcon } from 'lucide-react';

interface ProjectAttachmentsProps {
  attachments: ProjectAttachment[];
  canEdit: boolean;
  onAddAttachment?: (files: File[]) => void;
  onRemoveAttachment?: (attachmentId: string) => void;
}

export default function ProjectAttachments({ 
  attachments, 
  canEdit, 
  onAddAttachment, 
  onRemoveAttachment 
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onAddAttachment) {
      onAddAttachment(files);
      setShowUpload(false);
    }
  };

  const handleDownload = (attachment: ProjectAttachment) => {
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-black">Project Attachments</h3>
        {canEdit && (
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="btn-secondary text-sm flex items-center space-x-2"
          >
            <PaperclipIcon size={16} />
            <span>Add Files</span>
          </button>
        )}
      </div>

      {/* Upload Section */}
      {showUpload && canEdit && (
        <div className="mb-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
          <label className="flex flex-col items-center justify-center cursor-pointer">
            <PaperclipIcon className="w-8 h-8 mb-2 text-gray-400" />
            <span className="text-sm text-gray-600">Click to upload files</span>
            <span className="text-xs text-gray-500 mt-1">PDF, DOC, Images, etc.</span>
            <input
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
      <div className="space-y-3">
        {attachments && attachments.length > 0 ? (
          attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <span className="text-2xl">{getFileIcon(attachment.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{formatFileSize(attachment.size)}</span>
                    <span>•</span>
                    <span>Uploaded {new Date(attachment.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => handleView(attachment)}
                  className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                  title="View file"
                >
                  <EyeIcon size={16} />
                </button>
                <button
                  onClick={() => handleDownload(attachment)}
                  className="p-1 text-gray-500 hover:text-green-600 transition-colors"
                  title="Download file"
                >
                  <DownloadIcon size={16} />
                </button>
                {canEdit && onRemoveAttachment && (
                  <button
                    onClick={() => onRemoveAttachment(attachment.id)}
                    className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                    title="Remove file"
                  >
                    <XIcon size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <PaperclipIcon size={48} className="mx-auto mb-4 text-gray-300" />
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
    </div>
  );
}