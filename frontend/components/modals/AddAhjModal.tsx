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
import { Checkbox } from '@/components/ui/checkbox';
import { ahjApi, ProjectAhj } from '@/lib/api/ahj';
import { SearchIcon } from 'lucide-react';

interface AddAhjModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAhjsAdded: () => void;
  projectId: number;
}

export default function AddAhjModal({
  isOpen,
  onClose,
  onAhjsAdded,
  projectId,
}: AddAhjModalProps) {
  const [allAhjs, setAllAhjs] = useState<ProjectAhj[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAhjs();
    }
  }, [isOpen]);

  const loadAhjs = async () => {
    try {
      setFetching(true);
      // Get all AHJs
      const ahjs = await ahjApi.list();
      // Get already added AHJs for this project
      const projectAhjs = await ahjApi.getProjectAhjs(projectId);
      const projectAhjIds = new Set(projectAhjs.map(a => a.id));
      
      // Filter out already added AHJs
      const availableAhjs = ahjs.filter(a => !projectAhjIds.has(a.id));
      setAllAhjs(availableAhjs);
    } catch (err: any) {
      console.error('Error loading AHJs:', err);
      setError(err.message || 'Failed to load AHJs');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      setError('Please select at least one AHJ');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await ahjApi.addToProject(projectId, selectedIds);
      setSelectedIds([]);
      setSearchTerm('');
      onAhjsAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add AHJs');
      console.error('Error adding AHJs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedIds([]);
      setSearchTerm('');
      setError(null);
      onClose();
    }
  };

  const filteredAhjs = allAhjs.filter((ahj) =>
    `${ahj.ahj || ''} ${ahj.us_state || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAhjs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAhjs.map((a) => a.id));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Project AHJ</DialogTitle>
          <DialogDescription>
            Select AHJs to add to this project. You can select multiple AHJs at once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search */}
          <div className="relative">
            <SearchIcon
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="Search AHJs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
              {error}
            </div>
          )}

          {/* AHJs List */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {fetching ? (
              <div className="p-8 text-center text-muted-foreground">Loading AHJs...</div>
            ) : filteredAhjs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {allAhjs.length === 0
                  ? 'No AHJs available. Add AHJs from the AHJ page first.'
                  : 'No AHJs match your search.'}
              </div>
            ) : (
              <div className="p-2">
                {/* Select All */}
                <div className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md mb-1">
                  <Checkbox
                    id="select-all"
                    checked={
                      filteredAhjs.length > 0 &&
                      selectedIds.length === filteredAhjs.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-medium cursor-pointer flex-1"
                  >
                    Select All ({filteredAhjs.length})
                  </label>
                  {selectedIds.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {selectedIds.length} selected
                    </span>
                  )}
                </div>

                {/* AHJs List */}
                <div className="space-y-1">
                  {filteredAhjs.map((ahj) => (
                    <div
                      key={ahj.id}
                      className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                      onClick={() => toggleSelection(ahj.id)}
                    >
                      <Checkbox
                        id={`ahj-${ahj.id}`}
                        checked={selectedIds.includes(ahj.id)}
                        onCheckedChange={() => toggleSelection(ahj.id)}
                      />
                      <label
                        htmlFor={`ahj-${ahj.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {ahj.ahj || 'Unnamed AHJ'}
                        {ahj.us_state && (
                          <span className="text-muted-foreground ml-2">({ahj.us_state})</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
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
            type="button"
            onClick={handleSubmit}
            disabled={loading || selectedIds.length === 0}
          >
            {loading ? 'Adding...' : `Add ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

