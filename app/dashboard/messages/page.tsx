'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { designersApi } from '@/lib/api/designers';
import { MessageSquareIcon, UserIcon, SearchIcon } from 'lucide-react';
import IndividualChat from '@/components/chat/IndividualChat';
import { useIndividualMessageCounts } from '@/lib/hooks/useIndividualMessageCounts';

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
  
  // Message counts hook
  const { getUnreadCount, markMessagesAsRead, getTotalUnreadCount } = useIndividualMessageCounts(user);

  // Mock managers data since we don't have a dedicated API
  const mockManagers: Manager[] = [
    {
      id: '2',
      name: 'Manager',
      email: 'manager@example.com',
      role: 'project_manager',
    }
  ];

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        if (user?.role === 'project_manager') {
          // Manager sees all designers
          const designersList = await designersApi.getAll();
          setDesigners(designersList.filter(d => d.status === 'active'));
        } else if (user?.role === 'designer') {
          // Designer sees managers and other designers
          const designersList = await designersApi.getAll();

          setDesigners(designersList.filter(d => d.status === 'active' && d.id !== user.id));
          setManagers(mockManagers);
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

  const handleUserSelect = async (selectedUserData: Designer | Manager) => {
    setSelectedUser(selectedUserData);
    
    // Mark messages from this user as read
    if (user && selectedUserData.id !== user.id) {
      await markMessagesAsRead(selectedUserData.id);
    }
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
        <p className="text-gray-600 mt-1">Chat with team members</p>
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
            {/* For Designers: Show Manager first (highlighted) */}
            {user?.role === 'designer' && filteredManagers.length > 0 && (
              <div className="p-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Project Manager
                </h3>
                {filteredManagers.map((manager) => {
                  const unreadCount = getUnreadCount(manager.id);
                  return (
                    <div
                      key={manager.id}
                      onClick={() => handleUserSelect(manager)}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors mb-2 border-2 border-green-200 bg-green-50 ${selectedUser?.id === manager.id ? 'bg-green-100 border-green-300' : 'hover:bg-green-100'
                        }`}
                    >
                      <div className={`w-10 h-10 ${getAvatarColor(manager.name)} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-medium text-sm">
                          {getInitials(manager.name)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {manager.name}
                          </p>
                          {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ml-2">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          Project Manager
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Designers List */}
            {filteredDesigners.length > 0 && (
              <div className="p-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {user?.role === 'project_manager' ? 'Designers' : 'Team Designers'}
                </h3>
                {filteredDesigners.map((designer) => {
                  const unreadCount = getUnreadCount(designer.id);
                  return (
                    <div
                      key={designer.id}
                      onClick={() => handleUserSelect(designer)}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors mb-2 ${selectedUser?.id === designer.id
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
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {designer.name}
                          </p>
                          {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ml-2">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {designer.role}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* No contacts found */}
            {filteredDesigners.length === 0 && filteredManagers.length === 0 && (
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