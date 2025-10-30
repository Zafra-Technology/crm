'use client';

import { useState, useRef, useEffect } from 'react';
import { SendIcon, ArrowLeftIcon, PaperclipIcon, DownloadIcon, EyeIcon } from 'lucide-react';
import { User } from '@/types';
import { ProjectAttachment } from '@/types';
import FileViewerModal from '@/components/modals/FileViewerModal';
import { authAPI } from '@/lib/api/auth';
import { useChatWebSocket } from '@/lib/hooks/useChatWebSocket';
import { Button } from '@/components/ui/button';

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

function normalizeMessages(msgs: any[]): Message[] {
  return msgs.map(msg => ({
    ...msg,
    senderId: String(msg.sender_id ?? msg.senderId),
    senderName: msg.sender_name ?? msg.senderName,
    receiverId: String(msg.recipient_id ?? msg.receiverId),
    fileUrl: msg.file_url || msg.fileUrl,
    fileName: msg.file_name || msg.fileName, // fix for showing correct file name
    fileType: msg.file_type || msg.fileType, // NEW: map file type for preview
  }));
}

// Add a small helper to infer mime type from filename when backend doesn't provide it
const guessMimeType = (name?: string): string => {
  if (!name) return '';
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return '';
};

export default function IndividualChat({ currentUser, targetUser, onBack }: IndividualChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roomName = currentUser && targetUser ? `dm-${Math.min(Number(currentUser.id), Number(targetUser.id))}-${Math.max(Number(currentUser.id), Number(targetUser.id))}` : undefined;
  const { isConnected, send } = useChatWebSocket(roomName, async (payload) => {
    if (payload?.type === 'chat_message' || payload?.type === 'connection_established') {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const token = authAPI.getToken();
        const res = await fetch(`${API_BASE_URL}/chat/individual/${targetUser.id}/messages`, {
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(normalizeMessages(data));
        }
      } catch (_) {}
    }
  });

  // Load messages for this conversation
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const token = authAPI.getToken();
        const response = await fetch(`${API_BASE_URL}/chat/individual/${targetUser.id}/messages`, {
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(normalizeMessages(Array.isArray(data) ? data.map(msg => ({
            ...msg,
            senderId: String(msg.sender_id),
            senderName: msg.sender_name,
            receiverId: String(msg.recipient_id),
          })) : []));
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();
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
    const messageData: any = {
      message: content,
      message_type: messageType,
      file_name: fileData?.fileName || null,
      file_size: fileData?.fileSize || null,
      file_type: fileData?.fileType || null,
      file_url: fileData?.fileUrl || null, // <-- pass base64 here
    };

    // Optimistically add message
    const tempMessage = {
      id: `temp-${Date.now()}`,
      senderId: String(currentUser.id),
      senderName: currentUser.name || 'You',
      receiverId: String(targetUser.id),
      message: content,
      messageType,
      timestamp: new Date().toISOString(),
      ...fileData,
    } as Message;
    setMessages(prev => normalizeMessages([...prev, tempMessage]));
    setNewMessage('');

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const token = authAPI.getToken();
      const response = await fetch(`${API_BASE_URL}/chat/individual/${targetUser.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const savedMessage = await response.json();
        const frontendMessage: Message = {
          id: String(savedMessage.id),
          senderId: String(savedMessage.sender_id),
          senderName: savedMessage.sender_name,
          receiverId: String(savedMessage.recipient_id),
          message: savedMessage.message,
          timestamp: savedMessage.timestamp,
          fileName: savedMessage.file_name,
          fileSize: savedMessage.file_size,
          fileType: savedMessage.file_type,
          messageType: savedMessage.message_type,
        };
        setMessages(prev => prev.map(msg => msg.id === tempMessage.id ? frontendMessage : msg));
        if (isConnected) {
          send({ message: savedMessage.message, sender: String(savedMessage.sender_id) });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      if (messageType === 'text') setNewMessage(content);
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
        const fileUrl = event.target?.result as string; // This is the base64 data: URL
        const messageType = file.type.startsWith('image/') ? 'image' : 'file';

        const fileData = {
          fileUrl,               // will become file_url for the API
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

  console.log('DEBUG alignment - messages', messages, 'currentUserId', currentUser.id);

  const messagesReady =
    messages.length === 0 ||
    messages.every(
      msg =>
        typeof msg.senderId === 'string' &&
        typeof msg.receiverId === 'string'
    );

  if (!messagesReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <span>Loading chat...</span>
      </div>
    );
  }

  const getFullFileUrl = (fileUrl: string) => {
    if (!fileUrl) return '';
    if (fileUrl.startsWith('http')) return fileUrl;
    return `http://localhost:8000${fileUrl}`;
  };

  const handleDownload = async (fileUrl: string, fileName?: string) => {
    try {
      const response = await fetch(fileUrl, { credentials: 'include' });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download file.');
    }
  };

  const [showViewer, setShowViewer] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ProjectAttachment | null>(null);

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
          const isOwnMessage = String(message.senderId) === String(currentUser.id);
          const isTaskTagged = message.message.includes('Task:');
          
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
                          type="button"
                          onClick={() => {
                            if (!message.fileUrl) return;
                            const attachment: ProjectAttachment = {
                              id: message.id,
                              name: message.fileName || 'Attachment',
                              size: message.fileSize || 0,
                              type: message.fileType || guessMimeType(message.fileName) || 'application/octet-stream',
                              url: getFullFileUrl(message.fileUrl),
                              uploadedAt: message.timestamp,
                              uploadedBy: message.senderId,
                            };
                            setSelectedFile(attachment);
                            setShowViewer(true);
                          }}
                          className={`text-gray-600 hover:bg-gray-300 p-1 rounded transition-colors${isOwnMessage ? ' ml-1' : ''}`}
                          title="View"
                          disabled={!message.fileUrl}
                        >
                          <EyeIcon size={14} />
                        </button>
                        <Button
                          onClick={() => handleDownload(getFullFileUrl(message.fileUrl), message.fileName)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Download file"
                        >
                          <DownloadIcon size={12} />
                        </Button>
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
      <FileViewerModal
        isOpen={showViewer}
        onClose={() => { setShowViewer(false); setSelectedFile(null); }}
        attachment={selectedFile}
      />
    </div>
  );
}