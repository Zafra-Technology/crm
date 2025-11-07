'use client';

import { useState, useEffect, useMemo } from 'react';
import { XIcon, UserCheckIcon, UserXIcon, Search } from 'lucide-react';
import { Designer } from '@/types/designer';
import { authAPI } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AssignDesignersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (designerIds: string[]) => void;
  currentDesignerIds: string[];
  projectName: string;
  loading?: boolean;
  designers?: Designer[]; // Preloaded designers
  currentDesigners?: Designer[]; // Current assigned designers (fallback)
}

export default function AssignDesignersModal({
  isOpen,
  onClose,
  onAssign,
  currentDesignerIds,
  projectName,
  loading = false,
  designers: preloadedDesigners = [],
  currentDesigners = []
}: AssignDesignersModalProps) {
  const [designers, setDesigners] = useState<Designer[]>(preloadedDesigners);
  const normalizedCurrentIds = useMemo(() => {
    // First try currentDesignerIds
    if (currentDesignerIds && currentDesignerIds.length > 0) {
      return currentDesignerIds.map(id => String(id));
    }
    // Fallback to currentDesigners array
    if (currentDesigners && currentDesigners.length > 0) {
      return currentDesigners.map(d => String(d.id));
    }
    return [];
  }, [currentDesignerIds, currentDesigners]);
  const [selectedDesignerIds, setSelectedDesignerIds] = useState<string[]>([]);
  const [loadingDesigners, setLoadingDesigners] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Update designers when preloaded designers change
  useEffect(() => {
    if (preloadedDesigners.length > 0) {
      setDesigners(preloadedDesigners);
    }
  }, [preloadedDesigners]);

  // Always load team members when the modal opens; merge with any preloaded
  useEffect(() => {
    if (isOpen) {
      loadDesigners();
    }
  }, [isOpen]);

  // Set selected designers when modal opens or current designer IDs change
  useEffect(() => {
    if (isOpen) {
      setSelectedDesignerIds(normalizedCurrentIds);
    }
  }, [isOpen, normalizedCurrentIds]);

  const loadDesigners = async () => {
    try {
      setLoadingDesigners(true);
      // Allowed designer roles only
      const allowedRoles = new Set(['designer', 'senior_designer', 'auto_cad_drafter', 'professional_engineer']);

      // Fetch only designer roles
      const [designers, seniorDesigners, professionalEngineers, drafters] = await Promise.all([
        authAPI.getUsers('designer'),
        authAPI.getUsers('senior_designer'),
        authAPI.getUsers('professional_engineer'),
        authAPI.getUsers('auto_cad_drafter')
      ]);

      // Merge backend results and preloaded designers, then de-duplicate by id
      const merged = [
        ...designers,
        ...seniorDesigners,
        ...professionalEngineers,
        ...drafters
      ];
      const uniqueById = Array.from(new Map(merged.map(u => [u.id, u])).values());

      const fetchedDesigners: Designer[] = uniqueById
        .filter(u => u.is_active && allowedRoles.has(u.role))
        .map(u => ({
          id: u.id.toString(),
          name: u.full_name,
          email: u.email,
          phoneNumber: u.mobile_number || '',
          company: u.company_name || '',
          role: u.role_display || u.role,
          status: 'active' as const,
          joinedDate: u.date_of_joining || u.created_at || '',
          projectsCount: 0
        }));

      // Merge with any preloaded designers already in state
      // Ensure any preloaded designers also satisfy the role constraint
      const preloadedFiltered = preloadedDesigners.filter(d => {
        const r = String(d.role || '').toLowerCase();
        return allowedRoles.has(r);
      });
      const combined = [...fetchedDesigners, ...preloadedFiltered];
      const deduped = Array.from(new Map(combined.map(d => [d.id, d])).values());
      setDesigners(deduped);
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

  // Filter designers based on selected role and search query
  const filteredDesigners = useMemo(() => {
    let filtered = designers;
    
    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(designer => {
        const designerRole = designer.role.toLowerCase().replace(/\s+/g, '_');
        return designerRole === roleFilter;
      });
    }
    
    // Filter by search query (name or email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(designer =>
        designer.name.toLowerCase().includes(query) ||
        designer.email.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [designers, roleFilter, searchQuery]);

  // Role options for the filter
  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'designer', label: 'Designer' },
    { value: 'senior_designer', label: 'Senior Designer' },
    { value: 'professional_engineer', label: 'Professional Engineer' },
    { value: 'auto_cad_drafter', label: 'AutoCAD Drafter' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Team Members</DialogTitle>
          <DialogDescription>
            Select team members to assign to <strong>{projectName}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="mb-4">
          <label className="text-sm font-medium text-foreground mb-2 block">
            Search Team Members
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Role Filter */}
        <div className="mb-4">
          <label className="text-sm font-medium text-foreground mb-2 block">
            Filter by Role
          </label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Select role to filter" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Designers List */}
        <div className="flex-1 overflow-y-auto mb-4">
          {loadingDesigners ? (
            <div className="text-center py-8 text-muted-foreground">Loading team members...</div>
          ) : filteredDesigners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {designers.length === 0 ? 'No active team members available' : 'No team members found for the selected role'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDesigners.map((designer) => {
                const isSelected = selectedDesignerIds.includes(designer.id);
                const wasOriginallyAssigned = normalizedCurrentIds.includes(designer.id);
                
                return (
                  <div
                    key={designer.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-accent'
                        : 'border-border hover:border-muted-foreground'
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
                        <Badge variant="secondary" className="text-xs">
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
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{selectedDesignerIds.length}</span> member{selectedDesignerIds.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Actions */}
        <DialogFooter className="flex space-x-3">
          <Button
            onClick={onClose}
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={loading || loadingDesigners}
            className="flex-1"
          >
            {loading ? 'Assigning...' : 'Assign Team Members'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}