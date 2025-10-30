'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { authAPI } from '@/lib/api/auth';
import { MessageSquareIcon, UserIcon, SearchIcon } from 'lucide-react';
import IndividualChat from '@/components/chat/IndividualChat';

interface Designer {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

interface Manager {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function MessagesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedUser, setSelectedUser] = useState<Designer | Manager | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Define role groups
  const designerRoles = ['designer', 'senior_designer', 'auto_cad_drafter', 'team_head', 'team_lead'];

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        if (!user) return;

        // For clients, load their team members and also project managers/admins
        if (user.role === 'client') {
          try {
            // Load team members
            const teamMembers = await authAPI.getTeamMembersByClient(user.id);
            const teamMembersFormatted = teamMembers.map(member => ({
              id: member.id.toString(),
              name: member.full_name,
              email: member.email,
              role: 'Team Member',
              status: (member.is_active ? 'active' : 'inactive') as 'active' | 'inactive'
            }));
            setDesigners(teamMembersFormatted);

            // Also load project managers and admins for clients to chat with
            const allUsers = await authAPI.getUsers();
            const managerRoles = ['project_manager', 'assistant_project_manager'];
            
            const projectManagers = allUsers
              .filter(u => managerRoles.includes(u.role) && u.is_active)
              .map(u => ({
                id: u.id.toString(),
                name: u.full_name,
                email: u.email,
                role: u.role
              }));

            const admins = allUsers
              .filter(u => u.role === 'admin' && u.is_active)
              .map(u => ({
                id: u.id.toString(),
                name: u.full_name,
                email: u.email,
                role: u.role
              }));

            setManagers([...projectManagers, ...admins]);
          } catch (error) {
            console.error('Error loading team members:', error);
            setDesigners([]);
            setManagers([]);
          }
        } else if (user.role === 'client_team_member') {
          try {
            // For client team members, load their client and other team members
            const allUsers = await authAPI.getUsers();
            
            // Find the main client (the client this team member belongs to)
            const mainClient = allUsers.find(u => 
              u.id.toString() === user.client_id?.toString() && u.role === 'client'
            );
            
            // Find other team members from the same client
            const otherTeamMembers = allUsers.filter(u => 
              u.role === 'client_team_member' && 
              u.client_id?.toString() === user.client_id?.toString() && 
              u.id.toString() !== user.id
            );

            // Combine client and team members
            const teamContacts = [];
            if (mainClient) {
              teamContacts.push({
                id: mainClient.id.toString(),
                name: mainClient.full_name,
                email: mainClient.email,
                role: 'Client',
                status: (mainClient.is_active ? 'active' : 'inactive') as 'active' | 'inactive'
              });
            }

            const teamMembersFormatted = otherTeamMembers.map(member => ({
              id: member.id.toString(),
              name: member.full_name,
              email: member.email,
              role: 'Team Member',
              status: (member.is_active ? 'active' : 'inactive') as 'active' | 'inactive'
            }));

            teamContacts.push(...teamMembersFormatted);
            setDesigners(teamContacts);

            // Also load project managers and admins for team members to chat with
            const managerRoles = ['project_manager', 'assistant_project_manager'];
            
            const projectManagers = allUsers
              .filter(u => managerRoles.includes(u.role) && u.is_active)
              .map(u => ({
                id: u.id.toString(),
                name: u.full_name,
                email: u.email,
                role: u.role
              }));

            const admins = allUsers
              .filter(u => u.role === 'admin' && u.is_active)
              .map(u => ({
                id: u.id.toString(),
                name: u.full_name,
                email: u.email,
                role: u.role
              }));

            setManagers([...projectManagers, ...admins]);
          } catch (error) {
            console.error('Error loading team contacts:', error);
            setDesigners([]);
            setManagers([]);
          }
        } else {
          // Fetch all users once for non-client users
          const allUsers = await authAPI.getUsers();

          // Derive managers from roles
          const managerRoles = ['project_manager', 'assistant_project_manager'];

          const allDesigners = allUsers
            .filter(u => designerRoles.includes(u.role) && u.is_active)
            .map(u => ({
              id: u.id.toString(),
              name: u.full_name,
              email: u.email,
              role: u.role_display || u.role,
              status: (u.is_active ? 'active' : 'inactive') as 'active' | 'inactive'
            }));

          const allManagers = allUsers
            .filter(u => managerRoles.includes(u.role) && u.is_active)
            .map(u => ({
              id: u.id.toString(),
              name: u.full_name,
              email: u.email,
              role: u.role
            }));

          const allAdmins = allUsers
            .filter(u => u.role === 'admin' && u.is_active)
            .map(u => ({
              id: u.id.toString(),
              name: u.full_name,
              email: u.email,
              role: u.role
            }));

          if (user.role === 'project_manager' || user.role === 'assistant_project_manager') {
            // Managers see all active designers and admins; exclude self from managers list
            setDesigners(allDesigners);
            setManagers([
              ...allManagers.filter(m => m.id !== user.id),
              ...allAdmins
            ]);
          } else if (designerRoles.includes(user.role)) {
            // Designers see all staff members as team members except clients and client team members
            // Filter out clients and client team members
            const excludedRoles = ['client', 'client_team_member'];
            const allTeamMembers = allUsers
              .filter(u => !excludedRoles.includes(u.role) && u.is_active && u.id.toString() !== user.id)
              .map(u => ({
                id: u.id.toString(),
                name: u.full_name,
                email: u.email,
                role: u.role_display || u.role,
                status: (u.is_active ? 'active' : 'inactive') as 'active' | 'inactive'
              }));
            
            // Set all team members in the designers list (they'll be displayed as "Team Members")
            setDesigners(allTeamMembers);
            // Keep managers empty as we're showing everyone as team members
            setManagers([]);
          } else if (user.role === 'admin') {
            // Admins can see all staff (designers listed, managers & admins in managers section excluding self)
            setDesigners(allDesigners);
            setManagers([...allManagers, ...allAdmins.filter(a => a.id !== user.id)]);
          } else {
            // Default: show designers
            setDesigners(allDesigners);
            setManagers([...allManagers, ...allAdmins]);
          }
        }
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadUsers();
    }
  }, [user]);

  const filteredDesigners = designers.filter(designer =>
    designer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    designer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredManagers = managers.filter(manager =>
    manager.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    manager.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredAdminsOnly = filteredManagers.filter(m => m.role === 'admin');
  const filteredProjectManagersOnly = filteredManagers.filter(m => m.role === 'project_manager' || m.role === 'assistant_project_manager');
  const filteredOtherStaff = filteredManagers.filter(m => 
    m.role !== 'admin' && 
    m.role !== 'project_manager' && 
    m.role !== 'assistant_project_manager'
  );

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-black">Messages</h1>
        <p className="text-gray-600 mt-1">
          {user?.role === 'client' ? 'Chat with your team members' : 
           user?.role === 'client_team_member' ? 'Chat with your company contacts' :
           user?.role === 'designer' || user?.role === 'senior_designer' || user?.role === 'professional_engineer' || user?.role === 'auto_cad_drafter' ? 'Chat with all team members' :
           'Chat with team members'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Left Sidebar - Contacts */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black text-sm"
              />
            </div>
          </div>

          {/* Contacts List */}
          <div className="overflow-y-auto h-[calc(100vh-16rem)]">
            {/* Admins Section (for non-designers) */}
            {!designerRoles.includes(user?.role || '') && filteredAdminsOnly.length > 0 && (
              <div className="p-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {(user?.role === 'client' || user?.role === 'client_team_member') ? 'Admin Contacts' : 'Admins'}
                </h3>
                {filteredAdminsOnly.map((manager) => (
                  <div
                    key={manager.id}
                    onClick={() => setSelectedUser(manager)}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                      (user?.role === 'client' || user?.role === 'client_team_member')
                        ? selectedUser?.id === manager.id
                          ? 'bg-purple-100 border border-purple-300'
                          : 'hover:bg-purple-50'
                        : selectedUser?.id === manager.id
                          ? 'bg-blue-100 border border-blue-300'
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 ${getAvatarColor(manager.name)} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white font-medium text-sm">
                        {getInitials(manager.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {manager.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {manager.role.charAt(0).toUpperCase() + manager.role.slice(1)}
                      </p>
                    </div>
                    <div className={`w-2 h-2 ${(user?.role === 'client' || user?.role === 'client_team_member') ? 'bg-purple-500' : 'bg-blue-500'} rounded-full`}></div>
                  </div>
                ))}
              </div>
            )}

            {/* Project Managers Section (for non-designers) */}
            {!designerRoles.includes(user?.role || '') && filteredProjectManagersOnly.length > 0 && (
              <div className="p-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {(user?.role === 'client' || user?.role === 'client_team_member') ? 'Project Manager Contacts' : 'Project Managers'}
                </h3>
                {filteredProjectManagersOnly.map((manager) => (
                  <div
                    key={manager.id}
                    onClick={() => setSelectedUser(manager)}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                      (user?.role === 'client' || user?.role === 'client_team_member')
                        ? selectedUser?.id === manager.id
                          ? 'bg-purple-100 border border-purple-300'
                          : 'hover:bg-purple-50'
                        : selectedUser?.id === manager.id
                          ? 'bg-blue-100 border border-blue-300'
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 ${getAvatarColor(manager.name)} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white font-medium text-sm">
                        {getInitials(manager.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {manager.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {manager.role.charAt(0).toUpperCase() + manager.role.slice(1)}
                      </p>
                    </div>
                    <div className={`w-2 h-2 ${(user?.role === 'client' || user?.role === 'client_team_member') ? 'bg-purple-500' : 'bg-blue-500'} rounded-full`}></div>
                  </div>
                ))}
              </div>
            )}

            {/* Team Members List / Designers List */}
            {filteredDesigners.length > 0 && (
              <div className="p-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {user?.role === 'client' ? 'Team Members' : 
                   user?.role === 'client_team_member' ? 'Team Contacts' :
                   designerRoles.includes(user?.role || '') ? 'Team Members' :
                   user?.role === 'project_manager' || user?.role === 'assistant_project_manager' ? 'Designers' : 'Team Designers'}
                </h3>
                {filteredDesigners.map((designer) => (
                  <div
                    key={designer.id}
                    onClick={() => setSelectedUser(designer)}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                      (user?.role === 'client' || user?.role === 'client_team_member')
                        ? selectedUser?.id === designer.id 
                          ? 'bg-purple-100 border border-purple-300' 
                          : 'hover:bg-purple-50'
                        : selectedUser?.id === designer.id 
                          ? 'bg-blue-100 border border-blue-300' 
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 ${getAvatarColor(designer.name)} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white font-medium text-sm">
                        {getInitials(designer.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {designer.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {designer.role.charAt(0).toUpperCase() + designer.role.slice(1)}
                      </p>
                    </div>
                    <div className={`w-2 h-2 ${(user?.role === 'client' || user?.role === 'client_team_member') ? 'bg-purple-500' : 'bg-blue-500'} rounded-full`}></div>
                  </div>
                ))}
              </div>
            )}

            {/* Other Staff Section (for non-designers only) */}
            {!designerRoles.includes(user?.role || '') && filteredOtherStaff.length > 0 && (
              <div className="p-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Other Staff
                </h3>
                {filteredOtherStaff.map((staff) => (
                  <div
                    key={staff.id}
                    onClick={() => setSelectedUser(staff)}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                      selectedUser?.id === staff.id 
                        ? 'bg-orange-100 border border-orange-300' 
                        : 'hover:bg-orange-50'
                    }`}
                  >
                    <div className={`w-10 h-10 ${getAvatarColor(staff.name)} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white font-medium text-sm">
                        {getInitials(staff.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {staff.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  </div>
                ))}
              </div>
            )}

            {/* No contacts found */}
            {(designerRoles.includes(user?.role || '') 
              ? filteredDesigners.length === 0 
              : filteredDesigners.length === 0 && filteredManagers.length === 0 && filteredOtherStaff.length === 0
            ) && (
              <div className="p-8 text-center text-gray-500">
                <MessageSquareIcon size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No contacts found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Chat Area */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <IndividualChat
              currentUser={user!}
              targetUser={selectedUser}
              onBack={() => setSelectedUser(null)}
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageSquareIcon size={64} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a contact</h3>
                <p>Choose someone from your contacts to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}