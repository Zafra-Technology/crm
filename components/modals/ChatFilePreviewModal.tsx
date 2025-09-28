'use client';

import { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

  const isImage = fileType.startsWith('image/');
  const isPDF = fileType.includes('pdf');
  const isText = fileType.includes('text/');

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-full flex flex-col">
        <DialogHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex-1 min-w-0">
            <DialogTitle className="truncate">{fileName}</DialogTitle>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{fileType}</span>
              {fileSize && <span>{formatFileSize(fileSize)}</span>}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            {/* Zoom controls for images */}
            {isImage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoom <= 25}
                  className="h-8 w-8"
                >
                  <ZoomOut size={16} />
                </Button>
                <span className="text-sm text-muted-foreground min-w-[50px] text-center">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  className="h-8 w-8"
                >
                  <ZoomIn size={16} />
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-8 w-8 text-green-600 hover:text-green-600"
              title="Download"
            >
              <Download size={16} />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Image Preview */}
          {isImage && (
            <div className="flex justify-center">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom / 100})` }}
              />
            </div>
          )}

          {/* PDF Preview */}
          {isPDF && (
            <div className="w-full h-96">
              <iframe
                src={fileUrl}
                className="w-full h-full border border-gray-300 rounded"
                title={fileName}
              />
            </div>
          )}

          {/* Text Preview */}
          {isText && (
            <div className="bg-accent p-4 rounded border">
              <iframe
                src={fileUrl}
                className="w-full h-96 border-0"
                title={fileName}
              />
            </div>
          )}

          {/* Other File Types */}
          {!isImage && !isPDF && !isText && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📄</div>
              <h4 className="text-lg font-medium text-foreground mb-2">
                {fileName}
              </h4>
              <p className="text-muted-foreground mb-6">
                Preview not available for this file type
              </p>
              <Button
                onClick={handleDownload}
                className="flex items-center space-x-2 mx-auto"
              >
                <Download size={16} />
                <span>Download File</span>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}