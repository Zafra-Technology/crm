'use client';

import { useState, useEffect } from 'react';
import { XIcon, UserCheckIcon, UserXIcon } from 'lucide-react';
import { Designer } from '@/types/designer';
import { designersApi } from '@/lib/api/designers';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-black">Assign Designers</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <XIcon size={20} />
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          Select designers to assign to <strong>{projectName}</strong>
        </p>

        {/* Designers List */}
        <div className="flex-1 overflow-y-auto mb-4">
          {loadingDesigners ? (
            <div className="text-center py-8 text-gray-500">Loading designers...</div>
          ) : designers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No active designers available</div>
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
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleDesignerToggle(designer.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-black text-white' : 'bg-gray-300 text-gray-600'
                        }`}>
                          {isSelected ? (
                            <UserCheckIcon size={16} />
                          ) : (
                            <UserXIcon size={16} />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-black">{designer.name}</div>
                          <div className="text-sm text-gray-600">{designer.role}</div>
                        </div>
                      </div>
                      {wasOriginallyAssigned && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Currently Assigned
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Count */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            Selected: <span className="font-medium text-black">{selectedDesignerIds.length}</span> designer{selectedDesignerIds.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || loadingDesigners}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Assigning...' : 'Assign Designers'}
          </button>
        </div>
      </div>
    </div>
  );
}