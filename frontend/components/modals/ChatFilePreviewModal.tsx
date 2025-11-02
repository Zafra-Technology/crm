'use client';

import { useState, useEffect } from 'react';
import { DownloadIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/api/auth';
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

interface ChatFilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
}

export default function ChatFilePreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
  fileSize
}: ChatFilePreviewModalProps) {
  const [zoom, setZoom] = useState(100);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Create blob URL for base64 files (especially large ones) to avoid browser memory issues
  useEffect(() => {
    if (!fileUrl || !isOpen) return;

    // Clean up previous blob URL
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    // If file is base64 (especially for large files), create blob URL for better performance
    if (fileUrl.startsWith('data:')) {
      setIsConverting(true);
      try {
        // Extract base64 data
        const base64Data = fileUrl.split(',')[1];
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
              const blob = new Blob([byteArray], { type: fileType });
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

    // Cleanup on unmount or when fileUrl changes
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fileUrl, isOpen, fileType]);

  if (!isOpen) return null;

  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf' || fileType.includes('pdf');
  const isText = fileType.startsWith('text/');
  const isOfficeDoc = fileType.includes('word') || 
                     fileType.includes('document') ||
                     fileType.includes('spreadsheet') ||
                     fileType.includes('presentation');

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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

  // Get valid image URL with blob handling
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
    
    // Resolve URL using resolveMediaUrl
    return resolveMediaUrl(url);
  };

  const handleDownload = async () => {
    if (!fileUrl) return;
    
    try {
      const validUrl = getValidImageUrl(fileUrl);
      const resolvedUrl = resolveMediaUrl(validUrl);
      
      // If it's a data URL (base64), download directly
      if (resolvedUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = resolvedUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      
      // For remote URLs, fetch as blob to handle CORS and authentication
      const response = await fetch(resolvedUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch file');
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback to direct link download
      const validUrl = getValidImageUrl(fileUrl);
      const link = document.createElement('a');
      link.href = resolveMediaUrl(validUrl);
      link.download = fileName;
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

  const renderFileContent = () => {
    // Show loading state while converting large base64 to blob
    if (isConverting && fileUrl.startsWith('data:')) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center space-y-4 p-8">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <div className="space-y-2">
              <p className="text-foreground">Loading file preview...</p>
              {fileSize && (
                <p className="text-sm text-muted-foreground">
                  Processing large file ({(fileSize / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Show error message only if conversion failed
    if (loadingError && fileUrl.startsWith('data:')) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center space-y-4 p-8">
            <div className="text-6xl mb-4">📄</div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">{fileName}</h3>
              {fileSize && (
                <p className="text-muted-foreground">
                  This file could not be loaded for preview ({(fileSize / 1024 / 1024).toFixed(2)} MB).
                </p>
              )}
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
      const validUrl = getValidImageUrl(fileUrl);
      
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
            alt={fileName}
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
      const validUrl = getValidImageUrl(fileUrl);
      return (
        <div className="w-full h-full min-h-[400px] bg-muted/30">
          <iframe
            src={validUrl}
            className="w-full h-full border-0"
            title={fileName}
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
              <h3 className="text-lg font-semibold text-foreground">{fileName}</h3>
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
            <h3 className="text-lg font-semibold text-foreground">{fileName}</h3>
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] w-full h-full flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <DialogTitle className="truncate">{fileName}</DialogTitle>
              <DialogDescription className="mt-1">
                {fileSize ? formatFileSize(fileSize) : 'Unknown size'} • {fileType}
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
              Chat file preview
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