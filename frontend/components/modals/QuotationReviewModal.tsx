'use client';

import { useState } from 'react';
import { Check, XCircle, Download, FileText, Eye, Paperclip } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/api/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import FileViewerModal from '@/components/modals/FileViewerModal';
import { ProjectAttachment } from '@/types';

interface QuotationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onReject: (feedback: string) => void;
  quotationMessage: string;
  quotationFile?: string;
  loading?: boolean;
}

export default function QuotationReviewModal({ 
  isOpen, 
  onClose, 
  onAccept, 
  onReject, 
  quotationMessage,
  quotationFile,
  loading = false 
}: QuotationReviewModalProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [fileViewerAttachment, setFileViewerAttachment] = useState<ProjectAttachment | null>(null);

  const handleAccept = () => {
    onAccept();
    onClose();
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (rejectFeedback.trim()) {
      onReject(rejectFeedback.trim());
      setRejectFeedback('');
      setShowRejectForm(false);
      onClose();
    }
  };

  const handleClose = () => {
    setShowRejectForm(false);
    setRejectFeedback('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quotation Review</DialogTitle>
          <DialogDescription>
            Review the quotation details and decide whether to accept or reject.
          </DialogDescription>
        </DialogHeader>

        {!showRejectForm ? (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quotation Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{quotationMessage}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quotation File</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {quotationFile ? (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Paperclip className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {quotationFile.split('/').pop() || 'Quotation File'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Quotation document
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const fileName = quotationFile.split('/').pop() || 'Quotation File';
                          const fileUrl = resolveMediaUrl(quotationFile);
                          
                          // Create a ProjectAttachment-like object for the file viewer
                          const attachment: ProjectAttachment = {
                            id: 'quotation-file',
                            name: fileName,
                            size: 0, // Size unknown from URL
                            type: fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 
                                  fileName.toLowerCase().endsWith('.doc') || fileName.toLowerCase().endsWith('.docx') ? 'application/msword' :
                                  fileName.toLowerCase().endsWith('.xls') || fileName.toLowerCase().endsWith('.xlsx') ? 'application/vnd.ms-excel' :
                                  'application/octet-stream',
                            url: fileUrl,
                            uploadedAt: new Date().toISOString(),
                            uploadedBy: ''
                          };
                          
                          setFileViewerAttachment(attachment);
                          setShowFileViewer(true);
                        }}
                        className="h-8 w-8 p-0"
                        title="Preview file"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const url = resolveMediaUrl(quotationFile);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = quotationFile.split('/').pop() || 'quotation';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="h-8 w-8 p-0"
                        title="Download file"
                      >
                        <Download size={16} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-md border-2 border-dashed border-muted-foreground/25">
                    <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                      <FileText size={16} />
                      <span className="text-sm">No quotation file attached</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowRejectForm(true)}
                disabled={loading}
              >
                <XCircle size={16} className="mr-2" />
                Reject
              </Button>
              <Button
                type="button"
                onClick={handleAccept}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check size={16} className="mr-2" />
                Accept
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleReject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-feedback">Rejection Feedback *</Label>
              <Textarea
                id="reject-feedback"
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                required
                rows={4}
                placeholder="Please provide your feedback for rejecting this quotation..."
                className="resize-none"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRejectForm(false)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={loading || !rejectFeedback.trim()}
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
      
      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={showFileViewer}
        onClose={() => {
          setShowFileViewer(false);
          setFileViewerAttachment(null);
        }}
        attachment={fileViewerAttachment}
      />
    </Dialog>
  );
}
