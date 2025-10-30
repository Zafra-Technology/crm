'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { authAPI, resolveMediaUrl } from '@/lib/api/auth';
import { MessageSquareIcon, UserIcon, SearchIcon } from 'lucide-react';
import IndividualChat from '@/components/chat/IndividualChat';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { groupChatApi } from '@/lib/api/chat-groups';
import GroupChat from '@/components/chat/GroupChat';

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

  // Group chat states (move to top)
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupImage, setNewGroupImage] = useState<File | null>(null);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [groupList, setGroupList] = useState<any[]>([]);
  const [groupChatOpen, setGroupChatOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any|null>(null);

  const [memberOptions, setMemberOptions] = useState<any[]>([]);
  const [memberOptionsLoading, setMemberOptionsLoading] = useState(false);

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

  useEffect(() => {
    const loadMemberOptions = async () => {
      if (!groupModalOpen || !user) return;
      try {
        setMemberOptionsLoading(true);
        const all = await authAPI.getUsers();
        const filtered = (all || [])
          .filter((u: any) => u.is_active)
          .filter((u: any) => u.role !== 'client_team_member')
          .filter((u: any) => String(u.id) !== String(user.id))
          .map((u: any) => ({ id: String(u.id), name: u.full_name, email: u.email, role: u.role }));
        setMemberOptions(filtered);
      } catch (e) {
        console.error('Failed to load member options', e);
        setMemberOptions([]);
      } finally {
        setMemberOptionsLoading(false);
      }
    };
    loadMemberOptions();
  }, [groupModalOpen, user]);

  // Load groups for current user
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const groups = await groupChatApi.listGroups();
        const mapped = (groups || []).map(g => ({
          id: g.id,
          name: g.name,
          image: g.image_url || '',
          members: (g.member_ids || []).map(id => ({ id: String(id) })),
          raw: g,
        }));
        setGroupList(mapped);
      } catch (e) {
        console.error('Failed to load groups', e);
        setGroupList([]);
      }
    };
    loadGroups();
  }, []);

  // Fallback (kept for safety but primary source is memberOptions)
  const allPossibleMembers = (memberOptions && memberOptions.length > 0)
    ? memberOptions
    : [...designers, ...managers].filter(u => u.role !== 'client_team_member' && u.id !== user?.id);

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

  const canCreateGroup = [
    'admin',
    'project_manager',
    'assistant_project_manager',
  ].includes(user?.role || '');

  const sidebarChats = [
    ...[...groupList].reverse().map(group => ({
      type: 'group', id: group.id, name: group.name, image: group.image, members: group.members, data: group
    })),
    ...filteredAdminsOnly.map(contact => ({ type: 'dm', id: contact.id, name: contact.name, contact })),
    ...filteredProjectManagersOnly.map(contact => ({ type: 'dm', id: contact.id, name: contact.name, contact })),
    ...filteredDesigners.map(contact => ({ type: 'dm', id: contact.id, name: contact.name, contact })),
    ...filteredOtherStaff.map(contact => ({ type: 'dm', id: contact.id, name: contact.name, contact })),
  ].filter((item, idx, arr) => arr.findIndex(i=>i.type === item.type && i.id === item.id) === idx); // dedupe if needed

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

      {/* Group Chat Modal */}
      <Dialog open={groupModalOpen} onOpenChange={(open) => {
        setGroupModalOpen(open);
        if (!open) {
          setNewGroupName(''); setNewGroupImage(null); setSelectedGroupMembers([]);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Group Name</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Group Image</label>
              <input
                type="file"
                accept="image/*"
                className="w-full"
                onChange={e => setNewGroupImage(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Select Members</label>
              <div className="max-h-40 overflow-auto border rounded p-2 space-y-2">
                {memberOptionsLoading ? (
                  <span className="text-xs text-gray-400">Loading members...</span>
                ) : allPossibleMembers.length ? allPossibleMembers.map(member => (
                  <label key={member.id} className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={selectedGroupMembers.includes(member.id)}
                      onCheckedChange={checked => {
                        setSelectedGroupMembers(members =>
                          checked ? [...members, member.id] : members.filter(id => id !== member.id)
                        );
                      }}
                    />
                    <span className="text-sm">{member.name} <span className="text-muted-foreground">({member.role})</span></span>
                  </label>
                )) : <span className="text-xs text-gray-400">No available users</span>}
              </div>
              <span className="block text-xs text-muted-foreground mt-1">* Current user is automatically included.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => { setGroupModalOpen(false); }}>
              Cancel
            </Button>
            <Button type="button"
              disabled={!newGroupName || selectedGroupMembers.length < 1}
              onClick={async () => {
                try {
                  // Convert image to base64 if provided
                  let image_base64: string | undefined;
                  if (newGroupImage) {
                    const file = newGroupImage;
                    const toBase64 = (f: File) => new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(String(reader.result));
                      reader.onerror = reject;
                      reader.readAsDataURL(f);
                    });
                    image_base64 = await toBase64(file);
                  }
                  const member_ids = selectedGroupMembers.map(id => Number(id));
                  const created = await groupChatApi.createGroup({ name: newGroupName, member_ids, image_base64 });
                  if (created) {
                    setGroupList(prev => ([...prev, {
                      id: created.id,
                      name: created.name,
                      image: created.image_url || '',
                      members: (created.member_ids || []).map(id => ({ id: String(id) })),
                      raw: created,
                    }]));
                  }
                } catch (e) {
                  console.error('Failed to create group', e);
                } finally {
                  setGroupModalOpen(false); setNewGroupName(''); setNewGroupImage(null); setSelectedGroupMembers([]);
                }
              }}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Left Sidebar - Unified Chats (groups + users) */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-700 text-md">Chats</h3>
            {canCreateGroup && (
              <Button size="sm" onClick={() => setGroupModalOpen(true)}>
                + Create Group
              </Button>
            )}
          </div>
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
          {/* Unified list: Groups and Users */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3">
            {sidebarChats.length ? sidebarChats.map(chat => {
              if (chat.type === 'group') {
                const group = chat as { type: 'group', id: any, name: any, image: any, members: any[], data: any };
                return (
                  <div
                    key={group.id}
                    onClick={() => { setGroupChatOpen(true); setSelectedGroup(group.data); setSelectedUser(null); }}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors mb-2 ${selectedGroup?.id === group.id && groupChatOpen ? 'bg-blue-100 border border-blue-300' : 'hover:bg-blue-50'}`}
                  >
                    {group.image ? (
                      <img src={resolveMediaUrl(group.image)} className="w-10 h-10 rounded-full flex-shrink-0 object-cover" alt="group" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 text-white font-bold">{group.name.charAt(0).toUpperCase()}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{group.name}</p>
                      <p className="text-xs text-gray-500 truncate">{Array.isArray(group.members) ? group.members.map((m: any)=>m.name).slice(0,2).join(', ') : ''}{Array.isArray(group.members) && group.members.length > 2 ? ', ...': ''}</p>
                    </div>
                    <span className="ml-2 px-2 py-1 text-xs rounded bg-blue-50 text-blue-500">Group</span>
                  </div>
                );
              } else {
                const dm = chat as { type: 'dm', id: string, name: string, contact: any };
                return (
                  <div
                    key={dm.id}
                    onClick={() => { setSelectedUser(dm.contact); setGroupChatOpen(false); setSelectedGroup(null); }}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors mb-2 ${selectedUser?.id === dm.id && !groupChatOpen ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-50'}`}
                  >
                    {dm.contact?.profile_pic || dm.contact?.avatar ? (
                      <img src={resolveMediaUrl(dm.contact.profile_pic || dm.contact.avatar)} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className={`w-10 h-10 ${getAvatarColor(dm.name)} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-medium text-sm">{getInitials(dm.name)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{dm.name}</p>
                      <p className="text-xs text-gray-500 truncate">{dm.contact?.role?.charAt(0).toUpperCase() + dm.contact?.role?.slice(1)}</p>
                    </div>
                  </div>
                );
              }
            }) : (
              <div className="p-8 text-center text-gray-500">
                <MessageSquareIcon size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No chats found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Chat Area */}
        <div className="lg:col-span-2 h-full overflow-y-auto">
          {(groupChatOpen && selectedGroup) ? (
            <GroupChat
              groupId={String(selectedGroup.id)}
              groupName={selectedGroup.name}
              groupImage={selectedGroup.image}
              members={(selectedGroup.members || []).map((m:any)=>({ id: String(m.id), name: m.name }))}
              currentUser={user!}
            />
          ) : selectedUser ? (
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