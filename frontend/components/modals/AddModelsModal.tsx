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
import { equipmentsApi, Equipment } from '@/lib/api/equipments';
import { SearchIcon } from 'lucide-react';

interface AddModelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModelsAdded: () => void;
  projectId: number;
  category: string;
}

export default function AddModelsModal({
  isOpen,
  onClose,
  onModelsAdded,
  projectId,
  category,
}: AddModelsModalProps) {
  const [allEquipments, setAllEquipments] = useState<Equipment[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && category) {
      loadEquipments();
    }
  }, [isOpen, category]);

  const loadEquipments = async () => {
    try {
      setFetching(true);
      // Get all equipments for this category
      const equipments = await equipmentsApi.getByCategory(category);
      // Get already added equipments for this project
      const projectEquipments = await equipmentsApi.getProjectEquipments(projectId, category);
      const projectEquipmentIds = new Set(projectEquipments.map(e => e.id));
      
      // Filter out already added equipments
      const availableEquipments = equipments.filter(e => !projectEquipmentIds.has(e.id));
      setAllEquipments(availableEquipments);
    } catch (err: any) {
      console.error('Error loading equipments:', err);
      setError(err.message || 'Failed to load equipments');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      setError('Please select at least one model');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await equipmentsApi.addToProject(projectId, selectedIds);
      setSelectedIds([]);
      setSearchTerm('');
      onModelsAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add models');
      console.error('Error adding models:', err);
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

  const filteredEquipments = allEquipments.filter((equipment) =>
    equipment.model_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEquipments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEquipments.map((e) => e.id));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add {category} Models</DialogTitle>
          <DialogDescription>
            Select models to add to this project. You can select multiple models at once.
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
              placeholder="Search models..."
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

          {/* Equipments List */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {fetching ? (
              <div className="p-8 text-center text-muted-foreground">Loading models...</div>
            ) : filteredEquipments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {allEquipments.length === 0
                  ? `No ${category} models available. Add models from the Equipments page first.`
                  : 'No models match your search.'}
              </div>
            ) : (
              <div className="p-2">
                {/* Select All */}
                <div className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md mb-1">
                  <Checkbox
                    id="select-all"
                    checked={
                      filteredEquipments.length > 0 &&
                      selectedIds.length === filteredEquipments.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-medium cursor-pointer flex-1"
                  >
                    Select All ({filteredEquipments.length})
                  </label>
                  {selectedIds.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {selectedIds.length} selected
                    </span>
                  )}
                </div>

                {/* Equipments List */}
                <div className="space-y-1">
                  {filteredEquipments.map((equipment) => (
                    <div
                      key={equipment.id}
                      className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                      onClick={() => toggleSelection(equipment.id)}
                    >
                      <Checkbox
                        id={`equipment-${equipment.id}`}
                        checked={selectedIds.includes(equipment.id)}
                        onCheckedChange={() => toggleSelection(equipment.id)}
                      />
                      <label
                        htmlFor={`equipment-${equipment.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {equipment.model_name}
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

