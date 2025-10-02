'use client';

import { useState, useRef, useEffect } from 'react';
import { SendIcon, ArrowLeftIcon, PaperclipIcon, DownloadIcon, ChevronDownIcon } from 'lucide-react';
import { User } from '@/types';
import { triggerNotificationRefresh } from '@/lib/utils/notificationTrigger';

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
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageCountRef = useRef(0);

  // Load messages for this conversation
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/messages/individual?user1=${currentUser.id}&user2=${targetUser.id}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(prevMessages => {
            // Only update if there are actually new messages
            if (JSON.stringify(prevMessages) !== JSON.stringify(data)) {
              return data;
            }
            return prevMessages;
          });
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();
    
    // Poll for new messages every 5 seconds (reduced frequency)
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [currentUser.id, targetUser.id]);

  // Smart auto-scroll: only scroll to bottom if user was already at bottom or if it's their own message
  useEffect(() => {
    const currentMessageCount = messages.length;
    const hasNewMessages = currentMessageCount > lastMessageCountRef.current;
    
    if (hasNewMessages) {
      const lastMessage = messages[messages.length - 1];
      const isOwnMessage = lastMessage?.senderId === currentUser.id;
      
      // Auto-scroll only if user is at bottom OR if it's their own message
      if (isUserAtBottom || isOwnMessage) {
        scrollToBottom();
      }
    }
    
    lastMessageCountRef.current = currentMessageCount;
  }, [messages, isUserAtBottom, currentUser.id]);

  // Track if user is at the bottom of the chat
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
      setIsUserAtBottom(isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      setIsUserAtBottom(true);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await sendMessage(newMessage.trim(), 'text');
    // Always scroll to bottom when user sends a message
    setTimeout(scrollToBottom, 100);
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
        
        // Trigger immediate notification refresh for the receiver
        triggerNotificationRefresh();
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
      <div className="relative flex-1 overflow-hidden">
        <div ref={messagesContainerRef} className="h-[calc(100vh-20rem)] overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
          const isOwnMessage = message.senderId === currentUser.id;
          const isTaskTagged = (message.messageType as string) === 'task_tag' || message.message.includes('Task:');
          
          return (
            <div
              key={message.id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              {isTaskTagged ? (
                // Task Tagged Card Design
                <div className="max-w-xs lg:max-w-md bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
                  <div className="bg-red-500 text-white px-4 py-2 rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">🏷️ Task Tagged</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-sm text-gray-800 whitespace-pre-line">
                      {message.message}
                    </div>
                    <div className="text-xs text-red-600 mt-2 font-medium">
                      From: {message.senderName} • {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ) : (
                // Regular Message Design
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isOwnMessage
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="text-sm whitespace-pre-line">
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
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Scroll to bottom button */}
      {!isUserAtBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 bg-primary hover:bg-primary/90 text-primary-foreground p-3 rounded-full shadow-lg transition-all duration-200 z-10"
          title="Scroll to bottom"
        >
          <ChevronDownIcon size={20} />
        </button>
      )}
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