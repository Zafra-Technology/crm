'use client';

import { useState } from 'react';
import { ahjApi } from '@/lib/api/ahj';
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

interface CreateAhjModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateAhjModal({ isOpen, onClose, onCreated }: CreateAhjModalProps) {
  const [ahjName, setAhjName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!ahjName.trim()) {
        setError('Please enter AHJ name');
        return;
      }
      await ahjApi.create({ ahj: ahjName.trim() });
      onCreated();
      onClose();
      setAhjName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create AHJ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Project AHJ</DialogTitle>
          <DialogDescription>Provide the AHJ name to add a new entry.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ahj">Project AHJ Name *</Label>
            <Input
              id="ahj"
              name="ahj"
              type="text"
              value={ahjName}
              onChange={(e) => setAhjName(e.target.value)}
              placeholder="Enter AHJ name"
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

 