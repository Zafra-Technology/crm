'use client';

import { useState, useRef } from 'react';
import { Check, XCircle, Download, Eye, Paperclip, Upload } from 'lucide-react';
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

interface AgreementReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (acceptMessage: string, signedFile?: File) => void;
  onReject: (feedback: string) => void;
  agreementFiles: { name: string; url: string }[];
  agreementMessage?: string;
  loading?: boolean;
}

export default function AgreementReviewModal({
  isOpen,
  onClose,
  onAccept,
  onReject,
  agreementFiles,
  agreementMessage,
  loading = false,
}: AgreementReviewModalProps) {
  // Reject does not require message per requirement
  const [acceptMessage, setAcceptMessage] = useState('');
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAccept = (e: React.FormEvent) => {
    e.preventDefault();
    onAccept(acceptMessage.trim(), signedFile || undefined);
    setAcceptMessage('');
    setSignedFile(null);
    onClose();
  };

  const handleReject = () => {
    onReject('');
    onClose();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 15 * 1024 * 1024) {
        alert('Max 15MB');
        return;
      }
      setSignedFile(f);
    }
  };

  const removeFile = () => {
    setSignedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agreement Review</DialogTitle>
          <DialogDescription>
            Review the agreement and choose to accept (optionally upload signed copy) or reject.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
            {agreementMessage && (
              <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                {agreementMessage}
              </div>
            )}

            {/* Files */}
            <div className="space-y-3">
              {agreementFiles && agreementFiles.length > 0 ? (
                agreementFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div className="flex items-center space-x-3">
                      <Paperclip className="w-5 h-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.name || 'Agreement'}</p>
                        <p className="text-xs text-muted-foreground">Agreement document</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(f.url, '_blank', 'noopener,noreferrer')}
                        className="h-8 w-8 p-0"
                        title="Preview file"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = f.url;
                          link.download = f.name || 'agreement';
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
                ))
              ) : (
                <div className="p-3 bg-muted rounded-md">No agreement file attached</div>
              )}
            </div>

            {/* Accept form */}
            <form onSubmit={handleAccept} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accept-message">Message (optional)</Label>
                <Textarea
                  id="accept-message"
                  value={acceptMessage}
                  onChange={(e) => setAcceptMessage(e.target.value)}
                  rows={3}
                  placeholder="Add a note for the manager (optional)"
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Upload Signed Agreement (required to accept)</Label>
                {!signedFile ? (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-3 pb-4">
                      <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> signed copy
                      </p>
                      <p className="text-xs text-muted-foreground">PDF, DOC (MAX. 15MB)</p>
                    </div>
                    <input ref={fileInputRef} type="file" onChange={onFileChange} className="hidden" accept=".pdf,.doc,.docx" />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div className="flex items-center space-x-2">
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{signedFile.name}</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={removeFile} className="h-8 w-8 p-0 text-destructive hover:text-destructive">×</Button>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button type="button" variant="destructive" onClick={handleReject} disabled={loading}>
                  <XCircle size={16} className="mr-2" />
                  Reject
                </Button>
                <Button type="submit" disabled={loading || !signedFile}>
                  <Check size={16} className="mr-2" />
                  Accept
                </Button>
              </DialogFooter>
            </form>
          </div>
      </DialogContent>
    </Dialog>
  );
}



