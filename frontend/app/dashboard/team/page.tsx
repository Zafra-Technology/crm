'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User as APIUser } from '@/lib/api/auth';
import { authAPI } from '@/lib/api/auth';
import ClientTeamMemberModal from '@/components/modals/ClientTeamMemberModal';
import EditTeamMemberModal from '@/components/modals/EditTeamMemberModal';
import TeamMemberList from '@/components/TeamMemberList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusIcon, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TeamManagementPage() {
  const [user, setUser] = useState<APIUser | null>(null);
  const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [listReloadKey, setListReloadKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await authAPI.getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      
      if (currentUser.role !== 'client') {
        router.push('/dashboard');
        return;
      }
      
      setUser(currentUser);
    };
    
    loadUser();
  }, [router]);

  const handleTeamMemberCreated = () => {
    setSuccessMessage('Team member created successfully!');
    setTimeout(() => setSuccessMessage(null), 5000);
    setListReloadKey((v) => v + 1);
  };

  const handleEditTeamMember = (member: any) => {
    setSelectedMember(member);
    setShowEditModal(true);
  };

  const handleTeamMemberUpdated = () => {
    setSuccessMessage('Team member updated successfully!');
    setTimeout(() => setSuccessMessage(null), 5000);
    setListReloadKey((v) => v + 1);
  };

  const handleDeleteTeamMember = async (memberId: number) => {
    // This is handled by the TeamMemberList component now
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" />
            Team Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your team members
          </p>
        </div>
        <Button
          onClick={() => setShowTeamMemberModal(true)}
          className="flex items-center gap-2"
        >
          <PlusIcon size={20} />
          Add Team Member
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-800">{successMessage}</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium">{errorMessage}</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Team Members Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TeamMemberList
            clientId={user.id.toString()}
            onEditMember={handleEditTeamMember}
            onDeleteMember={handleDeleteTeamMember}
            reloadKey={listReloadKey}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <ClientTeamMemberModal
        isOpen={showTeamMemberModal}
        onClose={() => setShowTeamMemberModal(false)}
        onTeamMemberCreated={handleTeamMemberCreated}
        clientId={user.id.toString()}
      />

      <EditTeamMemberModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedMember(null);
        }}
        onTeamMemberUpdated={handleTeamMemberUpdated}
        member={selectedMember}
      />
    </div>
  );
}
