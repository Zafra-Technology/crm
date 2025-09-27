'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { mockProjects, mockChatMessages } from '@/lib/data/mockData';
import { User, Project, ChatMessage } from '@/types';
import { MessageSquareIcon, UserIcon, SearchIcon } from 'lucide-react';

export default function MessagesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);

    if (currentUser) {
      // Filter projects based on user role
      let userProjects: Project[] = [];
      switch (currentUser.role) {
        case 'client':
          userProjects = mockProjects.filter(p => p.clientId === currentUser.id);
          break;
        case 'project_manager':
          userProjects = mockProjects.filter(p => p.managerId === currentUser.id);
          break;
        case 'designer':
          userProjects = mockProjects.filter(p => p.designerIds.includes(currentUser.id));
          break;
      }
      setProjects(userProjects);
      
      if (userProjects.length > 0) {
        setSelectedProject(userProjects[0]);
        setMessages(mockChatMessages.filter(m => m.projectId === userProjects[0].id));
      }
    }
  }, []);

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setMessages(mockChatMessages.filter(m => m.projectId === project.id));
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black">Messages</h1>
        <p className="text-gray-600 mt-1">Communicate with your project teams</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
        {/* Project List */}
        <div className="lg:col-span-1 card">
          <div className="mb-4">
            <div className="relative">
              <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto">
            {filteredProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleProjectSelect(project)}
                className={`w-full text-left p-3 rounded-md transition-colors ${
                  selectedProject?.id === project.id
                    ? 'bg-gray-100 border border-gray-300'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-sm text-black mb-1">{project.name}</div>
                <div className="text-xs text-gray-500 truncate">{project.description}</div>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Active</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3 card">
          {selectedProject ? (
            <div className="flex flex-col h-full">
              <div className="border-b border-gray-200 pb-3 mb-4">
                <h3 className="font-semibold text-black">{selectedProject.name}</h3>
                <p className="text-sm text-gray-600">Project Team Chat</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      message.userId === user.id ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserIcon size={16} className="text-gray-600" />
                    </div>
                    <div className={`flex-1 ${message.userId === user.id ? 'text-right' : ''}`}>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {message.userName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div
                        className={`inline-block px-3 py-2 rounded-lg text-sm ${
                          message.userId === user.id
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {message.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black text-sm"
                />
                <button className="btn-primary px-4 py-2">Send</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquareIcon size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Select a project to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}