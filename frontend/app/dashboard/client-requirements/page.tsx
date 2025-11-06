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
import { PlusIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils/dateUtils';

export default function ClientRequirementsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [requirements, setRequirements] = useState<ClientRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

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
    // Navigate to detail page - we'll create this later if needed
    // For now, just show an alert or navigate
    router.push(`/dashboard/client-requirements/${requirement.id}`);
  };

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

      {/* Requirements Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading requirements...</div>
        </div>
      ) : requirements.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No client requirements found. Create your first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requirements.map((requirement) => (
            <ClientRequirementCard
              key={requirement.id}
              requirement={requirement}
              onViewDetails={handleViewDetails}
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
    </div>
  );
}

