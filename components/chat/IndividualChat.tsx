'use client';

import { useState, useRef, useEffect } from 'react';
import { SendIcon, ArrowLeftIcon, PaperclipIcon, DownloadIcon } from 'lucide-react';
import { User } from '@/types';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  message: string;
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  messageType?: 'text' | 'file' | 'image';
}

interface IndividualChatProps {
  currentUser: User;
  targetUser: any;
  onBack: () => void;
}

export default function IndividualChat({ currentUser, targetUser, onBack }: IndividualChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load messages for this conversation
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/messages/individual?user1=${currentUser.id}&user2=${targetUser.id}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [currentUser.id, targetUser.id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await sendMessage(newMessage.trim(), 'text');
  };

  const sendMessage = async (content: string, messageType: 'text' | 'file' | 'image', fileData?: any) => {
    const messageData = {
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: targetUser.id,
      message: content,
      messageType,
      timestamp: new Date().toISOString(),
      ...fileData,
    };

    // Optimistically add message
    const tempMessage = {
      ...messageData,
      id: `temp-${Date.now()}`,
    };
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      const response = await fetch('/api/messages/individual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const savedMessage = await response.json();
        setMessages(prev => 
          prev.map(msg => msg.id === tempMessage.id ? savedMessage : msg)
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      if (messageType === 'text') setNewMessage(messageData.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size too large. Please select a file smaller than 10MB.');
      return;
    }

    setUploadingFile(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileUrl = event.target?.result as string;
        const messageType = file.type.startsWith('image/') ? 'image' : 'file';
        
        const fileData = {
          fileUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        };

        const messageText = messageType === 'image' 
          ? `📷 Shared an image: ${file.name}`
          : `📎 Shared a file: ${file.name}`;

        await sendMessage(messageText, messageType, fileData);
        setUploadingFile(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadingFile(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center space-x-3 p-4 border-b border-gray-200">
        <button
          onClick={onBack}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeftIcon size={20} />
        </button>
        
        <div className={`w-10 h-10 ${getAvatarColor(targetUser.name)} rounded-full flex items-center justify-center`}>
          <span className="text-white font-medium text-sm">
            {getInitials(targetUser.name)}
          </span>
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{targetUser.name}</h3>
          <p className="text-sm text-gray-500">
            {targetUser.role === 'project_manager' ? 'Project Manager' : targetUser.role}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="h-[calc(100vh-20rem)] overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwnMessage = message.senderId === currentUser.id;
          
          return (
            <div
              key={message.id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isOwnMessage
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <div className="text-sm">
                  {message.message}
                </div>
                
                {/* File attachment */}
                {message.fileUrl && (
                  <div className="mt-2">
                    {/* Image preview */}
                    {message.messageType === 'image' && message.fileType?.startsWith('image/') && (
                      <div className="mb-2">
                        <img
                          src={message.fileUrl}
                          alt={message.fileName || 'Shared image'}
                          className="max-w-full rounded border"
                        />
                      </div>
                    )}

                    {/* File info */}
                    <div className={`flex items-center space-x-2 p-2 rounded border ${
                      isOwnMessage ? 'bg-blue-600 border-blue-400' : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${
                          isOwnMessage ? 'text-blue-100' : 'text-gray-700'
                        }`}>
                          {message.fileName || 'Unknown file'}
                        </p>
                        {message.fileSize && (
                          <p className={`text-xs ${
                            isOwnMessage ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            {formatFileSize(message.fileSize)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = message.fileUrl!;
                          link.download = message.fileName || 'download';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className={`p-1 rounded ${
                          isOwnMessage 
                            ? 'text-blue-200 hover:bg-blue-500' 
                            : 'text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <DownloadIcon size={12} />
                      </button>
                    </div>
                  </div>
                )}
                
                <div className={`text-xs mt-1 ${
                  isOwnMessage ? 'text-blue-200' : 'text-gray-500'
                }`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
        />
        
        <div className="flex space-x-2">
          <div className="flex-1 flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-blue-500 focus-within:border-blue-500">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 outline-none text-sm"
              disabled={uploadingFile}
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <PaperclipIcon size={16} />
            </button>
          </div>
          
          <button
            type="submit"
            disabled={!newMessage.trim() || uploadingFile}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            {uploadingFile ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <SendIcon size={16} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}