'use client';

import { useState, useRef } from 'react';
import { Upload, Paperclip } from 'lucide-react';
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

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (quotationMessage: string, quotationFile?: File) => void;
  loading?: boolean;
}

export default function QuotationModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  loading = false 
}: QuotationModalProps) {
  const [quotationMessage, setQuotationMessage] = useState('');
  const [quotationFile, setQuotationFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quotationMessage.trim()) {
      onSubmit(quotationMessage.trim(), quotationFile || undefined);
      setQuotationMessage('');
      setQuotationFile(null);
    }
  };

  const handleClose = () => {
    setQuotationMessage('');
    setQuotationFile(null);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size too large. Please select a file smaller than 10MB.');
        return;
      }
      setQuotationFile(file);
    }
  };

  const removeFile = () => {
    setQuotationFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Accept Project & Submit Quotation</DialogTitle>
          <DialogDescription>
            Provide quotation details for this commercial project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quotation-message">Quotation Message *</Label>
            <Textarea
              id="quotation-message"
              value={quotationMessage}
              onChange={(e) => setQuotationMessage(e.target.value)}
              required
              rows={4}
              placeholder="Please provide your quotation details..."
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Quotation File (Optional)</Label>
            <div className="space-y-3">
              {!quotationFile ? (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-3 pb-4">
                      <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> quotation file
                      </p>
                      <p className="text-xs text-muted-foreground">PDF, DOC, etc. (MAX. 10MB)</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                    />
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div className="flex items-center space-x-2">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{quotationFile.name}</span>
                    <span className="text-xs text-muted-foreground">({formatFileSize(quotationFile.size)})</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    ×
                  </Button>
                </div>
              )}
            </div>
          </div>

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
              type="submit"
              disabled={loading || !quotationMessage.trim()}
            >
              {loading ? 'Submitting...' : 'Accept & Submit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
