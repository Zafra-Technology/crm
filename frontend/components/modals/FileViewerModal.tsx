'use client';

import { useState, useEffect } from 'react';
import { DownloadIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { ProjectAttachment } from '@/types';
import { resolveMediaUrl } from '@/lib/api/auth';
import { formatDate } from '@/lib/utils/dateUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: ProjectAttachment | null;
}

export default function FileViewerModal({ isOpen, onClose, attachment }: FileViewerModalProps) {
  const [zoom, setZoom] = useState(100);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Create blob URL for base64 files (especially large ones) to avoid browser memory issues
  useEffect(() => {
    if (!attachment || !isOpen) return;

    // Clean up previous blob URL
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    // If file is base64 (especially for large files), create blob URL for better performance
    if (attachment.url.startsWith('data:')) {
      setIsConverting(true);
      try {
        // Extract base64 data
        const base64Data = attachment.url.split(',')[1];
        if (base64Data) {
          // Use a more memory-efficient approach for large files
          // Process in chunks to avoid blocking the main thread
          const processBase64 = async () => {
            try {
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              
              // Process in chunks to avoid blocking
              const chunkSize = 8192; // Process 8KB at a time
              for (let i = 0; i < byteCharacters.length; i += chunkSize) {
                const chunk = byteCharacters.slice(i, i + chunkSize);
                const chunkStart = i;
                for (let j = 0; j < chunk.length; j++) {
                  byteNumbers[chunkStart + j] = chunk.charCodeAt(j);
                }
                // Yield to browser between chunks
                if (i % (chunkSize * 10) === 0) {
                  await new Promise(resolve => setTimeout(resolve, 0));
                }
              }
              
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: attachment.type });
              const url = URL.createObjectURL(blob);
              setBlobUrl(url);
              setIsConverting(false);
            } catch (error) {
              console.error('Error creating blob URL:', error);
              setLoadingError(true);
              setIsConverting(false);
            }
          };
          
          processBase64();
        }
      } catch (error) {
        console.error('Error processing base64:', error);
        setLoadingError(true);
        setIsConverting(false);
      }
    } else {
      setIsConverting(false);
    }

    // Cleanup on unmount or when attachment changes
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [attachment, isOpen]);

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

  const handleDownload = async () => {
    if (!attachment || !attachment.url) return;
    
    try {
      const validUrl = getValidImageUrl(attachment.url);
      const fileUrl = resolveMediaUrl(validUrl);
      
      // If it's a data URL (base64), download directly
      if (fileUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      
      // For remote URLs, fetch as blob to handle CORS and authentication
      const response = await fetch(fileUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch file');
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback to direct link download
      const validUrl = getValidImageUrl(attachment.url);
      const link = document.createElement('a');
      link.href = resolveMediaUrl(validUrl);
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
    
    // If blob URL exists, use it (better performance for large base64 files)
    if (blobUrl) {
      return blobUrl;
    }
    
    // If still converting, return original URL (will fallback if needed)
    if (isConverting && url.startsWith('data:')) {
      return url;
    }
    
    // If it's already a full URL or base64, return as is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    
    // For media files, we need to point directly to Django backend
    // Django serves media files at http://localhost:8000/media/...
    const djangoBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';
    const resolvedUrl = url.startsWith('/') ? `${djangoBaseUrl}${url}` : `${djangoBaseUrl}/${url}`;
    
    console.log('Resolving media URL:', {
      originalUrl: url,
      resolvedUrl: resolvedUrl,
      djangoBaseUrl: djangoBaseUrl
    });
    
    return resolvedUrl;
  };

  const renderFileContent = () => {
    // Show loading state while converting large base64 to blob
    if (isConverting && attachment.url.startsWith('data:')) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center space-y-4 p-8">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <div className="space-y-2">
              <p className="text-foreground">Loading file preview...</p>
              <p className="text-sm text-muted-foreground">
                Processing large file ({(attachment.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Show error message only if conversion failed
    if (loadingError && attachment.url.startsWith('data:')) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center space-y-4 p-8">
            <div className="text-6xl mb-4">📄</div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">{attachment.name}</h3>
              <p className="text-muted-foreground">
                This file could not be loaded for preview ({(attachment.size / 1024 / 1024).toFixed(2)} MB).
              </p>
              <p className="text-sm text-muted-foreground">
                Please download the file to view it on your device.
              </p>
            </div>
            <Button
              onClick={handleDownload}
              className="mt-4"
            >
              <DownloadIcon className="mr-2 h-4 w-4" />
              Download File
            </Button>
          </div>
        </div>
      );
    }

    if (isImage) {
      const validUrl = getValidImageUrl(attachment.url);
      
      // Check if the URL is valid
      if (!isValidBase64Url(validUrl) && !validUrl.startsWith('http') && !validUrl.startsWith('blob:')) {
        return (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center space-y-4 p-8">
              <div className="text-6xl mb-4">🖼️</div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Invalid Image URL</h3>
                <p className="text-muted-foreground">
                  The image URL appears to be invalid or inaccessible.
                </p>
                <p className="text-sm text-muted-foreground">
                  URL: {attachment.url.substring(0, 100)}...
                </p>
              </div>
              <Button
                onClick={handleDownload}
                className="mt-4"
              >
                <DownloadIcon className="mr-2 h-4 w-4" />
                Download File
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center justify-center h-full min-h-[400px] overflow-auto bg-muted/30">
          <img
            src={validUrl}
            alt={attachment.name}
            style={{ transform: `scale(${zoom / 100})` }}
            className="max-w-full max-h-full object-contain transition-transform"
            onError={(e) => {
              setLoadingError(true);
              const img = e.currentTarget;
              img.style.display = 'none';
            }}
            onLoad={() => {
              setLoadingError(false);
            }}
          />
        </div>
      );
    }

    if (isPdf) {
      const validUrl = getValidImageUrl(attachment.url);
      return (
        <div className="w-full h-full min-h-[400px] bg-muted/30">
          <iframe
            src={validUrl}
            className="w-full h-full border-0"
            title={attachment.name}
            onError={() => {
              setLoadingError(true);
            }}
            onLoad={() => {
              setLoadingError(false);
            }}
          />
        </div>
      );
    }

    if (isText) {
      return (
        <div className="h-full min-h-[400px] overflow-auto bg-muted/30 p-4">
          <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">
            {/* Note: In a real app, you'd fetch and display the text content */}
            Loading text content...
          </pre>
        </div>
      );
    }

    if (isOfficeDoc) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center space-y-4 p-8">
            <div className="text-6xl mb-4">📄</div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">{attachment.name}</h3>
              <p className="text-muted-foreground">
                This file type cannot be previewed in the browser.
              </p>
            </div>
            <Button
              onClick={handleDownload}
              className="mt-4"
            >
              <DownloadIcon className="mr-2 h-4 w-4" />
              Download to View
            </Button>
          </div>
        </div>
      );
    }

    // Default case for unknown file types
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-4 p-8">
          <div className="text-6xl mb-4">📁</div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">{attachment.name}</h3>
            <p className="text-muted-foreground">
              Preview not available for this file type.
            </p>
          </div>
          <Button
            onClick={handleDownload}
            className="mt-4"
          >
            <DownloadIcon className="mr-2 h-4 w-4" />
            Download File
          </Button>
        </div>
      </div>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] w-full h-full flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <DialogTitle className="truncate">{attachment.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {formatFileSize(attachment.size)} • {attachment.type}
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              {/* Zoom controls for images */}
              {isImage && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                    title="Zoom Out"
                    disabled={zoom <= 50}
                  >
                    <ZoomOutIcon className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomIn}
                    title="Zoom In"
                    disabled={zoom >= 200}
                  >
                    <ZoomInIcon className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-6 bg-border mx-2"></div>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                title="Download"
              >
                <DownloadIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderFileContent()}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t">
          <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
            <div>
              Uploaded on {formatDate(attachment.uploadedAt)} at{' '}
              {new Date(attachment.uploadedAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <DownloadIcon className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}