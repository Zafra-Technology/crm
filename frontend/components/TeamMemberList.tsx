'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX, 
  Mail, 
  Phone,
  MapPin,
  Calendar
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authAPI, resolveMediaUrl } from '@/lib/api/auth';
import ConfirmModal from '@/components/modals/ConfirmModal';

interface TeamMember {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  mobile_number: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  role: string;
  is_active: boolean;
  created_at: string;
  date_of_joining?: string;
  date_of_exit?: string;
  profile_pic?: string | null;
  client_id: string | number;
}

interface TeamMemberListProps {
  clientId: string;
  onEditMember: (member: TeamMember) => void;
  onDeleteMember: (memberId: number) => void;
  reloadKey?: number;
}

export default function TeamMemberList({ 
  clientId, 
  onEditMember, 
  onDeleteMember,
  reloadKey
}: TeamMemberListProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadTeamMembers();
  }, [clientId, reloadKey]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get team members for this specific client
      const teamMembers = await authAPI.getTeamMembersByClient(clientId);
      // Map User[] to TeamMember[] and ensure client_id is set
      const mappedTeamMembers = teamMembers.map(member => ({
        ...member,
        client_id: member.client_id || clientId
      }));
      setTeamMembers(mappedTeamMembers);
    } catch (err) {
      console.error('Error loading team members:', err);
      setError('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (memberId: number, currentStatus: boolean) => {
    try {
      await authAPI.updateTeamMember(memberId, { is_active: !currentStatus });
      loadTeamMembers(); // Reload to get updated data
    } catch (err) {
      console.error('Error updating member status:', err);
    }
  };

  const handleDeleteClick = (member: TeamMember) => {
    setMemberToDelete(member);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return;
    
    try {
      setDeleteLoading(true);
      await authAPI.deleteTeamMember(memberToDelete.id);
      setShowDeleteModal(false);
      setMemberToDelete(null);
      onDeleteMember(memberToDelete.id);
      loadTeamMembers(); // Reload the list
    } catch (err) {
      console.error('Error deleting team member:', err);
      alert('Failed to delete team member. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Loading team members...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Team Members ({teamMembers.length})</h3>
      </div>

      {teamMembers.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team members yet</p>
              <p className="text-sm">Add team members to help manage your projects</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member) => (
            <Card key={member.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      {member.profile_pic ? (
                        <AvatarImage src={resolveMediaUrl(member.profile_pic)} alt={`${member.first_name} ${member.last_name}`} />
                      ) : null}
                      <AvatarFallback>
                        {getInitials(member.first_name, member.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {member.first_name} {member.last_name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={member.is_active ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditMember(member)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleToggleStatus(member.id, member.is_active)}
                      >
                        {member.is_active ? (
                          <>
                            <UserX className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteClick(member)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  
                  {member.mobile_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{member.mobile_number}</span>
                    </div>
                  )}
                  
                  {(member.city || member.state) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">
                        {[member.city, member.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Joined {formatDate(member.date_of_joining ||'')}
                      {member.date_of_exit ? ` · Exit ${formatDate(member.date_of_exit)}` : ''}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMemberToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Team Member"
        message={`Are you sure you want to delete ${memberToDelete?.first_name} ${memberToDelete?.last_name}? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
