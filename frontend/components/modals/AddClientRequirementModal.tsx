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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { clientRequirementsApi, ClientRequirement } from '@/lib/api/client-requirements';
import { SearchIcon } from 'lucide-react';

interface AddClientRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequirementAdded: (updatedProject?: any) => void;
  projectId: number;
  currentRequirementId?: number | null;
}

export default function AddClientRequirementModal({
  isOpen,
  onClose,
  onRequirementAdded,
  projectId,
  currentRequirementId,
}: AddClientRequirementModalProps) {
  const [allRequirements, setAllRequirements] = useState<ClientRequirement[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(currentRequirementId || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadRequirements();
      setSelectedId(currentRequirementId || null);
    }
  }, [isOpen, currentRequirementId]);

  const loadRequirements = async () => {
    try {
      setFetching(true);
      const requirements = await clientRequirementsApi.list();
      setAllRequirements(requirements);
    } catch (err: any) {
      console.error('Error loading client requirements:', err);
      setError(err.message || 'Failed to load client requirements');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      const updatedProject = await clientRequirementsApi.linkToProject(projectId, selectedId);
      setSelectedId(null);
      setSearchTerm('');
      // Pass the updated project data to the callback
      onRequirementAdded(updatedProject);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add client requirement');
      console.error('Error adding client requirement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedId(currentRequirementId || null);
      setSearchTerm('');
      setError(null);
      onClose();
    }
  };

  const filteredRequirements = allRequirements.filter((req) =>
    `${req.client_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Client Requirement</DialogTitle>
          <DialogDescription>
            Select a client requirement to link to this project.
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
              placeholder="Search client requirements..."
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

          {/* Requirements List */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {fetching ? (
              <div className="p-8 text-center text-muted-foreground">Loading client requirements...</div>
            ) : filteredRequirements.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {allRequirements.length === 0
                  ? 'No client requirements available. Add client requirements from the Client Requirements page first.'
                  : 'No client requirements match your search.'}
              </div>
            ) : (
              <div className="p-2">
                <RadioGroup
                  value={selectedId ? String(selectedId) : 'none'}
                  onValueChange={(value) => setSelectedId(value === 'none' ? null : parseInt(value))}
                >
                  {/* Total Count Header - Similar to Select All */}
                  <div className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md mb-1">
                    <div className="w-4 h-4" />
                    <label className="text-sm font-medium cursor-pointer flex-1">
                      Total Available ({filteredRequirements.length})
                    </label>
                    {selectedId && (
                      <span className="text-xs text-muted-foreground">
                        1 selected
                      </span>
                    )}
                  </div>

                  {/* None option */}
                  <div className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md mb-1">
                    <RadioGroupItem value="none" id="req-none" />
                    <label
                      htmlFor="req-none"
                      className="text-sm cursor-pointer flex-1"
                    >
                      None (Remove requirement)
                    </label>
                  </div>

                  {/* Requirements List */}
                  <div className="space-y-1">
                    {filteredRequirements.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                        onClick={() => setSelectedId(req.id)}
                      >
                        <RadioGroupItem
                          value={String(req.id)}
                          id={`req-${req.id}`}
                        />
                        <label
                          htmlFor={`req-${req.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {req.client_name || 'Unnamed Client Requirement'}
                          {req.file_count && req.file_count > 0 && (
                            <span className="text-muted-foreground ml-2">
                              ({req.file_count} {req.file_count === 1 ? 'file' : 'files'})
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
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
            disabled={loading}
          >
            {loading ? 'Adding...' : `Add ${selectedId !== null ? '(1)' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


