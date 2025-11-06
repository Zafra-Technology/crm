'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/types';
import { ClientRequirement } from '@/types';
import { clientRequirementsApi } from '@/lib/api/client-requirements';
import CreateClientRequirementModal from '@/components/modals/CreateClientRequirementModal';
import ClientRequirementCard from '@/components/ClientRequirementCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { PlusIcon, FileTextIcon, TrashIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils/dateUtils';
import { useToast } from '@/hooks/use-toast';

export default function ClientRequirementsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [requirements, setRequirements] = useState<ClientRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<ClientRequirement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/');
        return;
      }
      setUser(currentUser);
      loadRequirements();
    };
    init();
  }, [router]);

  const loadRequirements = async () => {
    try {
      setLoading(true);
      const data = await clientRequirementsApi.list();
      setRequirements(data);
    } catch (error) {
      console.error('Failed to load client requirements:', error);
      setRequirements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequirementCreated = () => {
    loadRequirements();
  };

  const handleViewDetails = (requirement: ClientRequirement) => {
    router.push(`/dashboard/client-requirements/${requirement.id}`);
  };

  const handleDeleteRequirement = async () => {
    if (!selectedRequirement) return;

    try {
      setLoading(true);
      const success = await clientRequirementsApi.delete(selectedRequirement.id);
      if (success) {
        toast({
          title: 'Success',
          description: 'Client requirement deleted successfully',
        });
        setShowDeleteModal(false);
        setSelectedRequirement(null);
        loadRequirements();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete client requirement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const getStats = () => {
    const totalFiles = requirements.reduce((sum, req) => sum + (req.file_count || 0), 0);
    return [
      {
        title: 'Total Requirements',
        value: requirements.length,
        icon: FileTextIcon,
        color: 'bg-blue-500',
      },
      {
        title: 'Total Files',
        value: totalFiles,
        icon: FileTextIcon,
        color: 'bg-green-500',
      },
    ];
  };

  // Filter requirements
  const filteredRequirements = requirements.filter((requirement) => {
    const matchesSearch = (requirement.client_name || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stats = getStats();

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client Requirements</h1>
          <p className="text-muted-foreground">Manage client requirements and files</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 shadow-md"
        >
          <PlusIcon size={18} />
          <span>Create Client Requirement</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map((stat, index) => {
          const StatIcon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <StatIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex gap-4 w-full sm:w-auto flex-wrap">
              <div className="min-w-[240px] flex-1">
                <Label htmlFor="requirement-search" className="text-xs">Search</Label>
                <Input
                  id="requirement-search"
                  type="text"
                  placeholder="Search by client name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading requirements...</div>
        </div>
      ) : filteredRequirements.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              {requirements.length === 0
                ? 'No client requirements found. Create your first one!'
                : 'No requirements match your search.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRequirements.map((requirement) => (
            <ClientRequirementCard
              key={requirement.id}
              requirement={requirement}
              onViewDetails={handleViewDetails}
              onDelete={(requirement) => {
                setSelectedRequirement(requirement);
                setShowDeleteModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateClientRequirementModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleRequirementCreated}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal && !!selectedRequirement} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Client Requirement</DialogTitle>
            <DialogDescription>Confirm client requirement deletion</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <FileTextIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">
                  {selectedRequirement?.client_name || 'Unnamed Client'}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {selectedRequirement?.file_count || 0} {selectedRequirement?.file_count === 1 ? 'file' : 'files'}
                </p>
              </div>
            </div>
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm">
              Are you sure you want to delete "{selectedRequirement?.client_name || 'this client requirement'}"? This action
              cannot be undone.
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedRequirement(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteRequirement}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

