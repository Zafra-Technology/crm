'use client';

import { useState, useEffect } from 'react';
import { XIcon, UserCheckIcon, UserXIcon } from 'lucide-react';
import { Designer } from '@/types/designer';
import { designersApi } from '@/lib/api/designers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AssignDesignersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (designerIds: string[]) => void;
  currentDesignerIds: string[];
  projectName: string;
  loading?: boolean;
}

export default function AssignDesignersModal({
  isOpen,
  onClose,
  onAssign,
  currentDesignerIds,
  projectName,
  loading = false
}: AssignDesignersModalProps) {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [selectedDesignerIds, setSelectedDesignerIds] = useState<string[]>(currentDesignerIds);
  const [loadingDesigners, setLoadingDesigners] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadDesigners();
      setSelectedDesignerIds(currentDesignerIds);
    }
  }, [isOpen, currentDesignerIds]);

  const loadDesigners = async () => {
    try {
      setLoadingDesigners(true);
      const designersData = await designersApi.getAll();
      const activeDesigners = designersData.filter(d => d.status === 'active');
      setDesigners(activeDesigners);
    } catch (error) {
      console.error('Error loading designers:', error);
    } finally {
      setLoadingDesigners(false);
    }
  };

  const handleDesignerToggle = (designerId: string) => {
    setSelectedDesignerIds(prev => 
      prev.includes(designerId)
        ? prev.filter(id => id !== designerId)
        : [...prev, designerId]
    );
  };

  const handleAssign = () => {
    onAssign(selectedDesignerIds);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Designers</DialogTitle>
          <DialogDescription>
            Select designers to assign to <strong>{projectName}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Designers List */}
        <div className="flex-1 overflow-y-auto mb-4">
          {loadingDesigners ? (
            <div className="text-center py-8 text-muted-foreground">Loading designers...</div>
          ) : designers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No active designers available</div>
          ) : (
            <div className="space-y-2">
              {designers.map((designer) => {
                const isSelected = selectedDesignerIds.includes(designer.id);
                const wasOriginallyAssigned = currentDesignerIds.includes(designer.id);
                
                return (
                  <div
                    key={designer.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-accent'
                        : 'border-input hover:border-border'
                    }`}
                    onClick={() => handleDesignerToggle(designer.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {isSelected ? (
                            <UserCheckIcon size={16} />
                          ) : (
                            <UserXIcon size={16} />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{designer.name}</div>
                          <div className="text-sm text-muted-foreground">{designer.role}</div>
                        </div>
                      </div>
                      {wasOriginallyAssigned && (
                        <Badge variant="secondary">
                          Currently Assigned
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Count */}
        <div className="mb-4 p-3 bg-accent rounded-lg">
          <div className="text-sm text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{selectedDesignerIds.length}</span> designer{selectedDesignerIds.length !== 1 ? 's' : ''}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={loading || loadingDesigners}
            className="flex-1"
          >
            {loading ? 'Assigning...' : 'Assign Designers'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}