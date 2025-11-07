'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { equipmentsApi, CreateEquipmentData } from '@/lib/api/equipments';
import { FileIcon, PaperclipIcon } from 'lucide-react';

interface AddEquipmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEquipmentCreated: () => void;
}

export default function AddEquipmentsModal({
  isOpen,
  onClose,
  onEquipmentCreated,
}: AddEquipmentsModalProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateEquipmentData>({
    model_name: '',
    category: '',
  });
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const cats = await equipmentsApi.getCategories();
      setCategories(cats);
      if (cats.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: cats[0] }));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Don't set fallback categories - let the API provide them
      setCategories([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setNewFiles((prev) => [...prev, ...files]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeNewFile = (idx: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.model_name.trim()) {
      setError('Model name is required');
      return;
    }

    try {
      setLoading(true);
      // Create equipment first
      const newEquipment = await equipmentsApi.create(formData);
      
      // Upload files if any
      if (newEquipment && newFiles.length > 0) {
        await equipmentsApi.uploadFiles(newEquipment.id, newFiles);
      }
      
      setFormData({ model_name: '', category: categories[0] || '' });
      setNewFiles([]);
      onEquipmentCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create equipment');
      console.error('Error creating equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ model_name: '', category: categories[0] || '' });
      setNewFiles([]);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Equipment</DialogTitle>
          <DialogDescription>
            Create a new equipment with model name and category
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model_name">Model Name *</Label>
            <Input
              id="model_name"
              type="text"
              value={formData.model_name}
              onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
              placeholder="Enter model name"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value: string) =>
                setFormData({ ...formData, category: value })
              }
              disabled={loading}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload Section */}
          <div className="space-y-2">
            <Label>Equipment Files (Optional)</Label>
            <div className="p-4 border-2 border-dashed border-input rounded-lg">
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <PaperclipIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                <span className="text-sm text-foreground">Click to upload files</span>
                <span className="text-xs text-muted-foreground mt-1">PDF, DOC, Images, etc.</span>
                <Input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                  disabled={loading}
                />
              </label>
            </div>
            
            {/* Show pending files */}
            {newFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Files to Upload ({newFiles.length} files)</p>
                <div className="grid gap-2">
                  {newFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                    >
                      <div className="flex items-center gap-2">
                        <FileIcon size={16} className="text-amber-600" />
                        <div>
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNewFile(idx)}
                        className="text-destructive hover:text-destructive"
                        disabled={loading}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Add Equipment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

