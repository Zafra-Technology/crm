'use client';

import { useState, useRef, useEffect } from 'react';
import { SendIcon, UserIcon } from 'lucide-react';
import { ChatMessage, User } from '@/types';

interface ProjectChatProps {
  projectId: string;
  currentUser: User;
  messages: ChatMessage[];
}

export default function ProjectChat({ projectId, currentUser, messages }: ProjectChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      projectId,
      userId: currentUser.id,
      userName: currentUser.name,
      message: newMessage,
      timestamp: new Date().toISOString(),
    };

    setChatMessages([...chatMessages, message]);
    setNewMessage('');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="card h-full flex flex-col">
      <h3 className="text-lg font-semibold text-black mb-4 pb-3 border-b border-gray-200 flex-shrink-0">
        Project Chat
      </h3>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0">
        {chatMessages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
              message.userId === currentUser.id ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
              <UserIcon size={16} className="text-gray-600" />
            </div>
            <div className={`flex-1 ${message.userId === currentUser.id ? 'text-right' : ''}`}>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {message.userName}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <div
                className={`inline-block px-3 py-2 rounded-lg text-sm ${
                  message.userId === currentUser.id
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.message}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="flex space-x-2 flex-shrink-0">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black text-sm"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="btn-primary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SendIcon size={16} />
        </button>
      </form>
    </div>
  );
}