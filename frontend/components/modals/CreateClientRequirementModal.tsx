'use client';

import { useState } from 'react';
import { clientRequirementsApi } from '@/lib/api/client-requirements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Paperclip, X } from 'lucide-react';

interface CreateClientRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateClientRequirementModal({ isOpen, onClose, onCreated }: CreateClientRequirementModalProps) {
  const [clientName, setClientName] = useState('');
  const [other, setOther] = useState('');
  const [layout, setLayout] = useState('');
  const [structural, setStructural] = useState('');
  const [electrical, setElectrical] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!clientName.trim()) {
        setError('Please enter client name');
        setLoading(false);
        return;
      }
      await clientRequirementsApi.create({ 
        client_name: clientName.trim(),
        other: other.trim() || undefined,
        layout: layout.trim() || undefined,
        structural: structural.trim() || undefined,
        electrical: electrical.trim() || undefined,
        files: files.length > 0 ? files : undefined,
      });
      onCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client requirement');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setClientName('');
      setOther('');
      setLayout('');
      setStructural('');
      setElectrical('');
      setFiles([]);
      setError('');
      onClose();
    }
  };

  const handleAddFiles = async (newFiles: File[]) => {
    const fileList = await Promise.all(newFiles.map(f => new Promise<any>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: f.name, size: f.size, type: f.type, url: String(reader.result) });
      reader.onerror = reject;
      reader.readAsDataURL(f);
    })));
    setFiles(prev => [...prev, ...fileList]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      handleAddFiles(selectedFiles);
    }
    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleAddFiles(droppedFiles);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Client Requirement</DialogTitle>
          <DialogDescription>Enter the client requirement details to create a new client requirement.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Client Name */}
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                name="clientName"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
                required
                disabled={loading}
              />
            </div>

            {/* Other */}
            <div className="space-y-2">
              <Label htmlFor="other">Other</Label>
              <Textarea
                id="other"
                name="other"
                value={other}
                onChange={(e) => setOther(e.target.value)}
                rows={4}
                placeholder="Enter other requirements"
                disabled={loading}
              />
            </div>

            {/* Layout */}
            <div className="space-y-2">
              <Label htmlFor="layout">Layout</Label>
              <Textarea
                id="layout"
                name="layout"
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
                rows={4}
                placeholder="Enter layout requirements"
                disabled={loading}
              />
            </div>

            {/* Structural */}
            <div className="space-y-2">
              <Label htmlFor="structural">Structural</Label>
              <Textarea
                id="structural"
                name="structural"
                value={structural}
                onChange={(e) => setStructural(e.target.value)}
                rows={4}
                placeholder="Enter structural requirements"
                disabled={loading}
              />
            </div>

            {/* Electrical */}
            <div className="space-y-2">
              <Label htmlFor="electrical">Electrical</Label>
              <Textarea
                id="electrical"
                name="electrical"
                value={electrical}
                onChange={(e) => setElectrical(e.target.value)}
                rows={4}
                placeholder="Enter electrical requirements"
                disabled={loading}
              />
            </div>
          </div>

          <Separator />

          {/* Files Section */}
          <div className="space-y-3">
            <Label>Client Requirements Files</Label>
            
            {/* File Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/10'
                  : 'border-input bg-background hover:bg-accent/50'
              }`}
            >
              <label className="flex flex-col items-center justify-center w-full py-8 cursor-pointer">
                <div className="flex flex-col items-center justify-center">
                  <Paperclip className="w-8 h-8 mb-3 text-muted-foreground" />
                  <p className="mb-1 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
                  </p>
                </div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                />
              </label>
            </div>

            {/* Uploaded Files List */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                      title="Remove file"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex gap-3">
            <Button type="button" onClick={handleClose} variant="outline" className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleSubmit} disabled={loading || !clientName.trim()} className="flex-1">
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

