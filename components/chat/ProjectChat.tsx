'use client';

import { useState, useRef, useEffect } from 'react';
import { SendIcon, UserIcon, PaperclipIcon, ImageIcon, FileIcon, DownloadIcon } from 'lucide-react';
import { ChatMessage, User } from '@/types';
import { useSocket } from '@/lib/hooks/useSocket';

interface ProjectChatProps {
  projectId: string;
  currentUser: User;
  messages: ChatMessage[];
}

export default function ProjectChat({ projectId, currentUser, messages }: ProjectChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(messages);
  const [isTyping, setIsTyping] = useState<{userId: string, userName: string}[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { socket, isConnected } = useSocket(projectId);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    socket.on('new-message', (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    // Listen for typing indicators
    socket.on('user-typing', (data: {userId: string, userName: string, isTyping: boolean}) => {
      if (data.userId === currentUser?.id) return; // Don't show own typing
      
      setIsTyping(prev => {
        if (data.isTyping) {
          // Add user to typing list if not already there
          const exists = prev.find(u => u.userId === data.userId);
          if (!exists) {
            return [...prev, {userId: data.userId, userName: data.userName}];
          }
          return prev;
        } else {
          // Remove user from typing list
          return prev.filter(u => u.userId !== data.userId);
        }
      });
    });

    return () => {
      socket.off('new-message');
      socket.off('user-typing');
    };
  }, [socket, currentUser?.id]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages]);

  // Load messages when component mounts or projectId changes
  useEffect(() => {
    const loadMessages = async () => {
      try {
        console.log('🔄 Loading chat history for project:', projectId);
        const response = await fetch(`/api/chat/${projectId}`);
        if (response.ok) {
          const projectMessages = await response.json();
          console.log('💬 Loaded conversation history:', projectMessages.length, 'messages');
          setChatMessages(projectMessages);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    loadMessages();
  }, [projectId]);

  // Polling for new messages every 3 seconds (since Socket.IO isn't working)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/chat/${projectId}`);
        if (response.ok) {
          const latestMessages = await response.json();
          if (latestMessages.length !== chatMessages.length) {
            console.log('🔄 New messages detected, updating chat');
            setChatMessages(latestMessages);
          }
        }
      } catch (error) {
        console.error('Error polling for messages:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [projectId, chatMessages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) {
      console.log('Send blocked:', { 
        hasMessage: !!newMessage.trim(), 
        hasUser: !!currentUser 
      });
      return;
    }

    await sendMessage(newMessage.trim(), 'text');
  };

  const sendMessage = async (content: string, messageType: 'text' | 'file' | 'image', fileData?: any) => {
    const messageData = {
      projectId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      message: content,
      messageType,
      timestamp: new Date().toISOString(),
      ...fileData,
    };

    // Optimistically add message to UI first
    const tempMessage = {
      ...messageData,
      id: `temp-${Date.now()}`,
    };
    setChatMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      console.log('Calling API:', `/api/chat/${projectId}`);
      
      // Save message to database
      const response = await fetch(`/api/chat/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      console.log('API Response:', response.status, response.ok);

      if (response.ok) {
        const savedMessage = await response.json();
        console.log('Message saved:', savedMessage);
        
        // Replace temp message with real one
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id ? savedMessage : msg
          )
        );
        
        // Emit message via socket for real-time updates
        if (socket && isConnected) {
          console.log('Emitting via socket');
          socket.emit('send-message', {
            projectId,
            message: savedMessage,
          });
        } else {
          console.log('Socket not connected:', { socket: !!socket, isConnected });
        }
      } else {
        console.error('API Error:', await response.text());
        // Remove temp message on error
        setChatMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        if (messageType === 'text') setNewMessage(messageData.message); // Restore text message
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setChatMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      if (messageType === 'text') setNewMessage(messageData.message); // Restore text message
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File upload started:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size too large. Please select a file smaller than 10MB.');
      return;
    }

    setUploadingFile(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const fileUrl = event.target?.result as string;
          const messageType = file.type.startsWith('image/') ? 'image' : 'file';
          
          console.log('File converted to base64, size:', fileUrl.length);
          
          const fileData = {
            fileUrl,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          };

          const messageText = messageType === 'image' 
            ? `[Image: ${file.name}]`
            : `📎 Shared a file: ${file.name}`;

          await sendMessage(messageText, messageType, fileData);
          console.log('File upload completed successfully');
          setUploadingFile(false);
        } catch (error) {
          console.error('Error processing file:', error);
          alert('Error processing file. Please try again.');
          setUploadingFile(false);
        }
      };

      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        alert('Error reading file. Please try again.');
        setUploadingFile(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
      setUploadingFile(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      console.log('File dropped:', file.name);
      
      // Simulate file input change event
      const fakeEvent = {
        target: { files: [file] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleFileUpload(fakeEvent);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getRoleTag = (role: string) => {
    const roleConfig = {
      client: { label: 'Client', color: 'bg-blue-100 text-blue-800' },
      project_manager: { label: 'Manager', color: 'bg-green-100 text-green-800' },
      designer: { label: 'Designer', color: 'bg-purple-100 text-purple-800' },
    };
    return roleConfig[role as keyof typeof roleConfig] || { label: 'User', color: 'bg-gray-100 text-gray-800' };
  };

  const getRoleAvatar = (role: string) => {
    const colors = {
      client: 'bg-blue-500',
      project_manager: 'bg-green-500', 
      designer: 'bg-purple-500',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-500';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImageFile = (fileType?: string) => {
    return fileType && fileType.startsWith('image/');
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <FileIcon size={16} />;
    if (fileType.startsWith('image/')) return <ImageIcon size={16} />;
    if (fileType.includes('pdf')) return <FileIcon size={16} className="text-red-500" />;
    if (fileType.includes('word') || fileType.includes('doc')) return <FileIcon size={16} className="text-blue-500" />;
    if (fileType.includes('excel') || fileType.includes('sheet')) return <FileIcon size={16} className="text-green-500" />;
    return <FileIcon size={16} />;
  };

  return (
    <div 
      className={`card h-full flex flex-col relative ${dragOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-4xl mb-2">📎</div>
            <p className="text-blue-600 font-medium">Drop file to share</p>
          </div>
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-black mb-4 pb-3 border-b border-gray-200 flex-shrink-0">
        Project Chat
      </h3>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0">
        {chatMessages.map((message) => {
          const roleTag = getRoleTag(message.userRole || 'user');
          const isOwnMessage = message.userId === currentUser.id;
          
          return (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div className={`w-8 h-8 ${getRoleAvatar(message.userRole || 'user')} rounded-full flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-medium text-xs">
                  {message.userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className={`flex-1 max-w-sm ${isOwnMessage ? 'text-right' : ''}`}>
                <div className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                  {!isOwnMessage && (
                    <>
                      <span className="text-sm font-medium text-gray-900">
                        {message.userName}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${roleTag.color}`}>
                        {roleTag.label}
                      </span>
                    </>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <div
                  className={`inline-block text-sm break-all ${
                    (message.message && 
                     !message.message.startsWith('📷 Shared an image:') && 
                     !message.message.startsWith('[Image:')) ? (
                      isOwnMessage
                        ? 'bg-gray-300 text-black rounded-l-xl rounded-tr-xl rounded-br-sm px-3 py-2'
                        : 'bg-gray-100 text-gray-900 rounded-r-xl rounded-tl-xl rounded-bl-sm px-3 py-2'
                    ) : ''
                  }`}
                >
                  {/* Text message */}
                  {message.message && 
                   !message.message.startsWith('📷 Shared an image:') && 
                   !message.message.startsWith('[Image:') && (
                    <div className="mb-2">
                      {message.message}
                    </div>
                  )}

                  {/* File attachment */}
                  {message.fileUrl && (
                    <div className={`${(message.message && 
                     !message.message.startsWith('📷 Shared an image:') && 
                     !message.message.startsWith('[Image:')) ? 'mt-2' : ''}`}>
                      {/* Image preview */}
                      {(message.messageType === 'image' || isImageFile(message.fileType)) ? (
                        <div className="relative group">
                          <img
                            src={message.fileUrl}
                            alt="Shared image"
                            className="max-w-xs max-h-48 rounded cursor-pointer"
                            onError={(e) => {
                              console.error('Image failed to load:', message.fileName);
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = document.createElement('a');
                              link.href = message.fileUrl!;
                              link.download = message.fileName || 'download';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Download"
                          >
                            <DownloadIcon size={14} />
                          </button>
                        </div>
                      ) : (
                        /* File info for non-images */
                        <div 
                          className={`flex items-center space-x-2 p-2 rounded border ${
                            isOwnMessage 
                              ? 'bg-gray-200 border-gray-300' 
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          {getFileIcon(message.fileType)}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate text-gray-700">
                              {message.fileName || 'Unknown file'}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = document.createElement('a');
                              link.href = message.fileUrl!;
                              link.download = message.fileName || 'download';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="text-gray-600 hover:bg-gray-300 p-1 rounded transition-colors"
                            title="Download"
                          >
                            <DownloadIcon size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Typing indicators */}
        {isTyping.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500 italic">
            <span>{isTyping.map(u => u.userName).join(', ')} {isTyping.length === 1 ? 'is' : 'are'} typing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="flex space-x-2 flex-shrink-0">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
        />
        
        <div className="flex-1 flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md focus-within:ring-black focus-within:border-black">
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
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
            title="Attach file"
          >
            <PaperclipIcon size={16} />
          </button>
        </div>
        
        <button
          type="submit"
          disabled={!newMessage.trim() || !currentUser || uploadingFile}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
        >
          {uploadingFile ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Uploading...</span>
            </>
          ) : (
            <>
              <SendIcon size={16} />
              <span className="text-xs">Send</span>
            </>
          )}
        </button>
      </form>

    </div>
  );
}