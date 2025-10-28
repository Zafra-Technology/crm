'use client';

import { useState } from 'react';
import { XIcon, DownloadIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { ProjectAttachment } from '@/types';
import { resolveMediaUrl } from '@/lib/api/auth';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: ProjectAttachment | null;
}

export default function FileViewerModal({ isOpen, onClose, attachment }: FileViewerModalProps) {
  const [zoom, setZoom] = useState(100);

  if (!isOpen || !attachment) return null;

  const isImage = attachment.type.startsWith('image/');
  const isPdf = attachment.type === 'application/pdf';
  const isText = attachment.type.startsWith('text/');
  const isOfficeDoc = attachment.type.includes('word') || 
                     attachment.type.includes('document') ||
                     attachment.type.includes('spreadsheet') ||
                     attachment.type.includes('presentation');

  // Validate base64 URL
  const isValidBase64Url = (url: string) => {
    if (!url) return false;
    if (url.startsWith('data:')) {
      const base64Part = url.split(',')[1];
      if (!base64Part) return false;
      // Check if it's valid base64
      try {
        atob(base64Part);
        return true;
      } catch (e) {
        return false;
      }
    }
    return true; // Assume other URLs are valid
  };

  const handleDownload = () => {
    const validUrl = getValidImageUrl(attachment.url);
    const link = document.createElement('a');
    link.href = validUrl;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  // Use the existing media URL resolution function but ensure it points to Django media
  const getValidImageUrl = (url: string) => {
    if (!url) return url;
    
    // If it's already a full URL or base64, return as is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    
    // For media files, we need to point directly to Django backend
    // Django serves media files at http://localhost:8000/media/...
    const djangoBaseUrl = 'http://localhost:8000';
    const resolvedUrl = url.startsWith('/') ? `${djangoBaseUrl}${url}` : `${djangoBaseUrl}/${url}`;
    
    console.log('Resolving media URL:', {
      originalUrl: url,
      resolvedUrl: resolvedUrl,
      djangoBaseUrl: djangoBaseUrl
    });
    
    return resolvedUrl;
  };

  const renderFileContent = () => {
    if (isImage) {
      const validUrl = getValidImageUrl(attachment.url);
      
      // Check if the URL is valid
      if (!isValidBase64Url(validUrl) && !validUrl.startsWith('http')) {
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🖼️</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Invalid Image URL</h3>
              <p className="text-gray-600 mb-4">
                The image URL appears to be invalid or inaccessible.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                URL: {attachment.url}
              </p>
              <button
                onClick={handleDownload}
                className="btn-primary flex items-center space-x-2 mx-auto"
              >
                <DownloadIcon size={16} />
                <span>Download File</span>
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center justify-center h-full overflow-auto">
          <img
            src={validUrl}
            alt={attachment.name}
            style={{ transform: `scale(${zoom / 100})` }}
            className="max-w-full max-h-full object-contain transition-transform"
            onError={(e) => {
              // Hide the image and show error message
              const img = e.currentTarget;
              img.style.display = 'none';
              const parent = img.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="flex items-center justify-center h-full">
                    <div class="text-center">
                      <div class="text-6xl mb-4">🖼️</div>
                      <h3 class="text-lg font-semibold text-gray-800 mb-2">Image Failed to Load</h3>
                      <p class="text-gray-600 mb-4">The image could not be displayed.</p>
                      <button onclick="this.parentElement.parentElement.parentElement.querySelector('button[onclick*=\"handleDownload\"]').click()" class="btn-primary flex items-center space-x-2 mx-auto">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        <span>Download File</span>
                      </button>
                    </div>
                  </div>
                `;
              }
            }}
            onLoad={() => {
              // Image loaded successfully
            }}
          />
        </div>
      );
    }

    if (isPdf) {
      const validUrl = getValidImageUrl(attachment.url);
      return (
        <iframe
          src={validUrl}
          className="w-full h-full border-0"
          title={attachment.name}
        />
      );
    }

    if (isText) {
      return (
        <div className="h-full overflow-auto bg-gray-50 p-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
            {/* Note: In a real app, you'd fetch and display the text content */}
            Loading text content...
          </pre>
        </div>
      );
    }

    if (isOfficeDoc) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{attachment.name}</h3>
            <p className="text-gray-600 mb-4">
              This file type cannot be previewed in the browser.
            </p>
            <button
              onClick={handleDownload}
              className="btn-primary flex items-center space-x-2 mx-auto"
            >
              <DownloadIcon size={16} />
              <span>Download to View</span>
            </button>
          </div>
        </div>
      );
    }

    // Default case for unknown file types
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{attachment.name}</h3>
          <p className="text-gray-600 mb-4">
            Preview not available for this file type.
          </p>
          <button
            onClick={handleDownload}
            className="btn-primary flex items-center space-x-2 mx-auto"
          >
            <DownloadIcon size={16} />
            <span>Download File</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}>
      <div className="bg-white rounded-lg w-full h-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-lg">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-black truncate">{attachment.name}</h3>
            <p className="text-sm text-gray-500">
              {(attachment.size / 1024 / 1024).toFixed(2)} MB • {attachment.type}
            </p>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {/* Zoom controls for images */}
            {isImage && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOutIcon size={20} />
                </button>
                <span className="text-sm text-gray-600 min-w-[4rem] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Zoom In"
                >
                  <ZoomInIcon size={20} />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
              </>
            )}

            <button
              onClick={handleDownload}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Download"
            >
              <DownloadIcon size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Close"
            >
              <XIcon size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          {renderFileContent()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Uploaded on {new Date(attachment.uploadedAt).toLocaleDateString()} at{' '}
              {new Date(attachment.uploadedAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleDownload}
                className="btn-secondary text-sm"
              >
                Download File
              </button>
              <button
                onClick={onClose}
                className="btn-primary text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}