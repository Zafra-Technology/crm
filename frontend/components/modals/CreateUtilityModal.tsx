'use client';

import { useState } from 'react';
import { utilitiesApi } from '@/lib/api/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CreateUtilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateUtilityModal({ isOpen, onClose, onCreated }: CreateUtilityModalProps) {
  const [utilityName, setUtilityName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!utilityName.trim()) {
        setError('Please enter utility name');
        return;
      }
      await utilitiesApi.create({ utility_name: utilityName.trim() });
      onCreated();
      onClose();
      setUtilityName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create utility');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Utility</DialogTitle>
          <DialogDescription>Provide the utility name to add a new entry.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="utility_name">Utility Name *</Label>
            <Input
              id="utility_name"
              name="utility_name"
              type="text"
              value={utilityName}
              onChange={(e) => setUtilityName(e.target.value)}
              placeholder="Enter utility name"
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter className="flex gap-3">
          <Button type="button" onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

