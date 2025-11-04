'use client';

import { useState } from 'react';
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
import { utilitiesApi, CreateUtilityData } from '@/lib/api/utilities';

interface AddUtilitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUtilityCreated: () => void;
}

export default function AddUtilitiesModal({
  isOpen,
  onClose,
  onUtilityCreated,
}: AddUtilitiesModalProps) {
  const [formData, setFormData] = useState<CreateUtilityData>({
    model_name: '',
    category: 'Inventor',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.model_name.trim()) {
      setError('Model name is required');
      return;
    }

    try {
      setLoading(true);
      await utilitiesApi.create(formData);
      setFormData({ model_name: '', category: 'Inventor' });
      onUtilityCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create utility');
      console.error('Error creating utility:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ model_name: '', category: 'Inventor' });
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Utility</DialogTitle>
          <DialogDescription>
            Create a new utility with model name and category
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
              onValueChange={(value: 'Inventor' | 'Module' | 'Mounting' | 'Battery') =>
                setFormData({ ...formData, category: value })
              }
              disabled={loading}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inventor">Inventor</SelectItem>
                <SelectItem value="Module">Module</SelectItem>
                <SelectItem value="Mounting">Mounting</SelectItem>
                <SelectItem value="Battery">Battery</SelectItem>
              </SelectContent>
            </Select>
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
              {loading ? 'Creating...' : 'Add Utility'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

