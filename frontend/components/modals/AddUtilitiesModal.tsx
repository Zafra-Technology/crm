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
import { utilitiesApi, Utility } from '@/lib/api/utilities';
import { SearchIcon } from 'lucide-react';

interface AddUtilitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUtilitiesAdded: () => void;
  projectId: number;
}

export default function AddUtilitiesModal({
  isOpen,
  onClose,
  onUtilitiesAdded,
  projectId,
}: AddUtilitiesModalProps) {
  const [allUtilities, setAllUtilities] = useState<Utility[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadUtilities();
      setSelectedIds(new Set());
    }
  }, [isOpen, projectId]);

  const loadUtilities = async () => {
    try {
      setFetching(true);
      // Get all utilities
      const utilities = await utilitiesApi.list();
      // Get already added utilities for this project
      const projectUtilities = await utilitiesApi.getProjectUtilities(projectId);
      const projectUtilityIds = new Set(projectUtilities.map(u => u.id));
      
      // Filter out already added utilities
      const availableUtilities = utilities.filter(u => !projectUtilityIds.has(u.id));
      setAllUtilities(availableUtilities);
    } catch (err: any) {
      console.error('Error loading utilities:', err);
      setError(err.message || 'Failed to load utilities');
    } finally {
      setFetching(false);
    }
  };

  const handleToggle = (utilityId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(utilityId)) {
        next.delete(utilityId);
      } else {
        next.add(utilityId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredUtilities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUtilities.map(u => u.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      setError('Please select at least one utility');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await utilitiesApi.addToProject(projectId, Array.from(selectedIds));
      setSelectedIds(new Set());
      setSearchTerm('');
      onUtilitiesAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add utilities');
      console.error('Error adding utilities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedIds(new Set());
      setSearchTerm('');
      setError(null);
      onClose();
    }
  };

  const filteredUtilities = allUtilities.filter((utility) =>
    (utility.utility_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Utilities</DialogTitle>
          <DialogDescription>
            Select one or more utilities to add to this project.
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
              placeholder="Search utilities..."
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

          {/* Utilities List */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {fetching ? (
              <div className="p-8 text-center text-muted-foreground">Loading utilities...</div>
            ) : filteredUtilities.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {allUtilities.length === 0
                  ? 'No utilities available. Add utilities from the Utilities page first.'
                  : 'No utilities match your search.'}
              </div>
            ) : (
              <div className="p-2">
                {/* Select All Header */}
                <div className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md mb-1">
                  <Checkbox
                    checked={selectedIds.size === filteredUtilities.length && filteredUtilities.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label className="text-sm font-medium cursor-pointer flex-1">
                    Select All ({filteredUtilities.length})
                  </label>
                  {selectedIds.size > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {selectedIds.size} selected
                    </span>
                  )}
                </div>

                {/* Utilities List */}
                <div className="space-y-1">
                  {filteredUtilities.map((utility) => (
                    <div
                      key={utility.id}
                      className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                      onClick={() => handleToggle(utility.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(utility.id)}
                        onCheckedChange={() => handleToggle(utility.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label
                        className="text-sm cursor-pointer flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {utility.utility_name || 'Unnamed Utility'}
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
            disabled={loading || selectedIds.size === 0}
          >
            {loading ? 'Adding...' : `Add ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

