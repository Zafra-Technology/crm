'use client';

import { useState, useRef, useEffect } from 'react';
import { SendIcon, ArrowLeftIcon, PaperclipIcon, DownloadIcon, EyeIcon, MoreVertical, Forward, CheckSquare, ImageIcon, FileText, Pencil, Trash2 } from 'lucide-react';
import { User } from '@/types';
import { ProjectAttachment } from '@/types';
import FileViewerModal from '@/components/modals/FileViewerModal';
import { authAPI, resolveMediaUrl } from '@/lib/api/auth';
import { useChatWebSocket } from '@/lib/hooks/useChatWebSocket';
import { useUserOnlineStatus } from '@/lib/hooks/useUserOnlineStatus';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ShareMessageModal from '@/components/modals/ShareMessageModal';
import { useToast } from '@/hooks/use-toast';
import { groupChatApi } from '@/lib/api/chat-groups';
import { individualChatApi } from '@/lib/api/individual-chat';
import { formatChatDate, isDifferentDay } from '@/lib/utils/dateUtils';

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
  onNewMessage?: () => void;
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

export default function IndividualChat({ currentUser, targetUser, onBack, onNewMessage }: IndividualChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roomName = currentUser && targetUser ? `dm-${Math.min(Number(currentUser.id), Number(targetUser.id))}-${Math.max(Number(currentUser.id), Number(targetUser.id))}` : undefined;
  
  // Track online status
  const isOnline = useUserOnlineStatus({
    userId: targetUser.id,
    currentUserId: currentUser.id,
  });
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
          // Notify parent to refresh unread counts
          if (onNewMessage) {
            onNewMessage();
          }
        }
      } catch (_) {}
    }
  });
  const { toast } = useToast();
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ message?: string; fileUrl?: string; fileName?: string; fileSize?: number; fileType?: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [editingFileData, setEditingFileData] = useState<{ fileUrl: string; fileName: string; fileSize: number; fileType: string; messageType: 'file'|'image' } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id?: string; timestamp?: string }>({ open: false });
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
        // Notify parent to refresh counts after sending message
        if (onNewMessage) {
          onNewMessage();
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

  const downloadViaBlob = async (url?: string, name?: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = url;
      link.download = name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    try {
      const response = await fetch(url, { credentials: 'include' });
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (_) {
      const link = document.createElement('a');
      link.href = url;
      link.download = name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
        
        {targetUser?.profile_pic || targetUser?.avatar ? (
          <img src={resolveMediaUrl(targetUser.profile_pic || targetUser.avatar)} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className={`w-10 h-10 ${getAvatarColor(targetUser.name)} rounded-full flex items-center justify-center`}>
            <span className="text-white font-medium text-sm">
              {getInitials(targetUser.name)}
            </span>
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{targetUser.name}</h3>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} title={isOnline ? 'Online' : 'Offline'}></div>
          </div>
          <p className="text-sm text-gray-500">
            {isOnline ? 'Online' : 'Offline'} • {targetUser.role === 'project_manager' ? 'Project Manager' : targetUser.role}
          </p>
        </div>
      </div>

      {/* Selection header */}
      {isSelectMode ? (
        <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">{selectedMessageIds.size} selected</div>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" className="h-8 px-3" disabled={selectedMessageIds.size === 0} onClick={() => setShareOpen(true)}>
              <Forward size={14} className="mr-1" /> Share
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => { setSelectedMessageIds(new Set()); setIsSelectMode(false); }}>Cancel</Button>
          </div>
        </div>
      ) : null}

      {/* Messages */}
      <div ref={messagesContainerRef} className="h-[calc(100vh-20rem)] overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const isOwnMessage = String(message.senderId) === String(currentUser.id);
          const isTaskTagged = message.message.includes('Task:');
          
          // Check if we need to show a date separator
          const showDateSeparator = index === 0 || isDifferentDay(message.timestamp, messages[index - 1].timestamp);
          
          return (
            <div key={message.id}>
              {showDateSeparator && (
                <div className="flex justify-center my-4">
                  <span className="bg-gray-300 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full">
                    {formatChatDate(message.timestamp)}
                  </span>
                </div>
              )}
              <div
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
                <div className={`max-w-xs lg:max-w-md inline-block text-sm break-all ${
                  isOwnMessage
                    ? 'bg-gray-300 text-black rounded-l-xl rounded-tr-xl rounded-br-sm px-3 py-2'
                    : 'bg-gray-100 text-gray-900 rounded-r-xl rounded-tl-xl rounded-bl-sm px-3 py-2'
                }`}>
                  {editingId === String(message.id) ? (
                    <div className="mb-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input value={editingText} onChange={(e)=>setEditingText(e.target.value)} className="flex-1 border px-2 py-1 rounded text-black" />
                        <Button size="sm" onClick={async () => {
                          const payload: any = { message: editingText };
                          if (editingFileData) {
                            payload.file_url = editingFileData.fileUrl;
                            payload.file_name = editingFileData.fileName;
                            payload.file_size = editingFileData.fileSize;
                            payload.file_type = editingFileData.fileType;
                            payload.message_type = editingFileData.messageType;
                          }
                          const ok = await individualChatApi.editMessage(Number(targetUser.id), Number(message.id), payload);
                          if (ok) {
                            setMessages(prev => prev.map(m => m.id === message.id ? { ...m, message: editingText + ' (edited)', fileUrl: payload.file_url || m.fileUrl, fileName: payload.file_name || m.fileName, fileSize: (payload.file_size ?? m.fileSize), fileType: payload.file_type || m.fileType, messageType: payload.message_type || m.messageType } as any : m));
                            setEditingId(null); setEditingText(''); setEditingFileData(null);
                            if (isConnected) send({ type: 'chat_message', sender: String(currentUser.id) });
                          } else {
                            toast({ title: 'Edit failed', description: 'Unable to edit message', variant: 'destructive' as any });
                          }
                        }}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditingText(''); setEditingFileData(null); }}>Cancel</Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="file" className="hidden" id={`edit-file-${message.id}`} onChange={(e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          const reader = new FileReader(); reader.onload = () => {
                            const fileUrl = String(reader.result);
                            const messageType = f.type.startsWith('image/') ? 'image' : 'file';
                            setEditingFileData({ fileUrl, fileName: f.name, fileSize: f.size, fileType: f.type, messageType });
                          }; reader.readAsDataURL(f);
                        }} />
                        <Button size="sm" variant="secondary" onClick={() => document.getElementById(`edit-file-${message.id}`)?.click() as any}>Change attachment</Button>
                        {editingFileData && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600 truncate max-w-[160px]">
                            {editingFileData.messageType === 'image' ? <ImageIcon size={12} /> : <FileText size={12} />}
                            {editingFileData.fileName}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-line">
                      {message.message}
                    </div>
                  )}
                
                  {/* File attachment */}
                  {message.fileUrl && (
                    <div className="mt-2">
                      {/* Image preview */}
                      {message.messageType === 'image' && message.fileType?.startsWith('image/') && (
                        <div className="mb-2">
                          <div className="relative group inline-block">
                            <img
                              src={message.fileUrl}
                              alt={message.fileName || 'Shared image'}
                              className="max-w-xs max-h-48 rounded cursor-pointer"
                              onClick={() => {
                                const attachment: ProjectAttachment = {
                                  id: message.id,
                                  name: message.fileName || 'Image',
                                  size: message.fileSize || 0,
                                  type: message.fileType || guessMimeType(message.fileName) || 'image/*',
                                  url: message.fileUrl?.startsWith('data:') ? message.fileUrl : getFullFileUrl(message.fileUrl || ''),
                                  uploadedAt: message.timestamp,
                                  uploadedBy: message.senderId,
                                };
                                setSelectedFile(attachment);
                                setShowViewer(true);
                              }}
                            />
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation();
                                  const attachment: ProjectAttachment = {
                                    id: message.id,
                                    name: message.fileName || 'Image',
                                    size: message.fileSize || 0,
                                    type: message.fileType || guessMimeType(message.fileName) || 'image/*',
                                    url: message.fileUrl?.startsWith('data:') ? message.fileUrl : getFullFileUrl(message.fileUrl || ''),
                                    uploadedAt: message.timestamp,
                                    uploadedBy: message.senderId,
                                  };
                                  setSelectedFile(attachment);
                                  setShowViewer(true);
                                }}
                                className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full"
                                title="View"
                              >
                                <EyeIcon size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); downloadViaBlob(message.fileUrl, message.fileName); }}
                                className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full"
                                title="Download"
                              >
                                <DownloadIcon size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* File info */}
                      <div className={`flex items-center space-x-2 p-2 rounded border ${
                        isOwnMessage ? 'bg-gray-200 border-gray-300' : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate text-gray-700`}>
                            {message.fileName || 'Unknown file'}
                          </p>
                          {message.fileSize && (
                            <p className={`text-xs text-gray-500`}>
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
                        <button
                          className="text-gray-600 hover:bg-gray-300 p-1 rounded"
                          onClick={() => downloadViaBlob(message.fileUrl?.startsWith('data:') ? message.fileUrl : getFullFileUrl(message.fileUrl || ''), message.fileName)}
                          title="Download"
                        >
                          <DownloadIcon size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className={`text-xs mt-1 text-gray-500`}>
                    {formatTime(message.timestamp)}
                    {isSelectMode && (
                      <Checkbox
                        checked={selectedMessageIds.has(String(message.id))}
                        onCheckedChange={() => setSelectedMessageIds(prev => { const n = new Set(prev); const id = String(message.id); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                        className="ml-2 align-middle"
                      />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-gray-600 hover:bg-gray-200 p-1 rounded ml-2" title="More">
                          <MoreVertical size={14} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isOwnMessage ? 'start' : 'end'} className="w-40">
                        <DropdownMenuItem onClick={() => { 
                          if (message.fileUrl) {
                            setShareTarget({
                              fileUrl: message.fileUrl,
                              fileName: message.fileName,
                              fileSize: message.fileSize,
                              fileType: message.fileType,
                            });
                          } else {
                            setShareTarget({ message: message.message });
                          }
                          setShareOpen(true);
                        }}>
                          <span className="inline-flex items-center gap-2">
                            <Forward size={14} />
                            <span>Share</span>
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setIsSelectMode(true); setSelectedMessageIds(prev => new Set(prev).add(String(message.id))); }}>
                          <span className="inline-flex items-center gap-2">
                            <CheckSquare size={14} />
                            <span>Select</span>
                          </span>
                        </DropdownMenuItem>
                        {isOwnMessage && (Date.now() - new Date(message.timestamp).getTime() <= 24*3600*1000) && (
                          <DropdownMenuItem onClick={() => { setEditingId(String(message.id)); setEditingText(message.message); setEditingFileData(null); }}>
                            <span className="inline-flex items-center gap-2"><Pencil size={14} /><span>Edit</span></span>
                          </DropdownMenuItem>
                        )}
                        {isOwnMessage && (
                          <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, id: String(message.id), timestamp: message.timestamp })}>
                            <span className="inline-flex items-center gap-2"><Trash2 size={14} /><span>Delete</span></span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}
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
      <FileViewerModal
        isOpen={showViewer}
        onClose={() => { setShowViewer(false); setSelectedFile(null); }}
        attachment={selectedFile}
      />
  {deleteDialog.open && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-md shadow-lg p-4 w-[320px]">
        <div className="text-sm font-medium mb-2">Delete message</div>
        <div className="text-xs text-gray-600 mb-4">Choose how you want to delete this message.</div>
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={async () => {
            const ok = await individualChatApi.deleteMessage(Number(targetUser.id), Number(deleteDialog.id), 'me');
            if (ok) setMessages(prev => prev.filter(m => String(m.id) !== String(deleteDialog.id)));
            else toast({ title: 'Delete failed', description: 'Unable to delete', variant: 'destructive' as any });
            setDeleteDialog({ open: false });
          }}>Delete for me</Button>
          {(() => {
            const msg = messages.find(mm => String(mm.id) === String(deleteDialog.id));
            const allow = msg && (String(msg.senderId) === String(currentUser.id)) && (Date.now() - new Date(msg.timestamp).getTime() <= 3600*1000);
            return allow ? (
              <Button variant="destructive" onClick={async () => {
                const ok = await individualChatApi.deleteMessage(Number(targetUser.id), Number(deleteDialog.id), 'everyone');
                if (ok) {
                  setMessages(prev => prev.map(m => String(m.id) === String(deleteDialog.id) ? { ...m, message: 'this message has been deleted', messageType: 'text', fileUrl: undefined, fileName: undefined, fileSize: undefined, fileType: undefined } as any : m));
                  if (isConnected) send({ type: 'chat_message', sender: String(currentUser.id) });
                } else {
                  toast({ title: 'Delete failed', description: 'Unable to delete', variant: 'destructive' as any });
                }
                setDeleteDialog({ open: false });
              }}>Delete for everyone</Button>
            ) : null;
          })()}
          <Button variant="ghost" onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
        </div>
      </div>
    </div>
  )}
  <ShareMessageModal
    isOpen={shareOpen}
    onClose={() => setShareOpen(false)}
    loading={shareLoading}
    currentUserId={currentUser?.id ? Number(currentUser.id) : undefined}
    onConfirm={async ({ groupIds, userIds }) => {
      try {
        setShareLoading(true);
        const ids = selectedMessageIds.size > 0 ? selectedMessageIds : new Set<string>();
        const toShare = (ids.size ? messages.filter(mm => ids.has(String(mm.id))) : []);
        const sendOne = async (msg: any) => {
          if (msg.fileUrl) {
            const res = await fetch(getFullFileUrl(msg.fileUrl || ''), { credentials: 'include' });
            const blob = await res.blob();
            const dataUrl: string = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(new Error('read fail'));
              reader.readAsDataURL(blob);
            });
            const isImg = (msg.fileType || '').startsWith('image/');
            const messageType: 'image' | 'file' = isImg ? 'image' : 'file';
            const messageText = isImg ? `📷 Shared an image: ${msg.fileName || ''}` : `📎 Shared a file: ${msg.fileName || ''}`;
            const payload = { message: messageText, message_type: messageType, file_name: msg.fileName || null, file_size: msg.fileSize || null, file_type: msg.fileType || null, file_url: dataUrl };
            await Promise.all((groupIds || []).map(gid => groupChatApi.sendMessage(gid, payload)));
            await Promise.all((userIds || []).map(uid => individualChatApi.sendMessage(uid, payload)));
            // Send WebSocket notifications for real-time updates
            const notifyRoom = (roomName: string) => {
              try {
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
                const origin = API_BASE_URL.replace('/api', '');
                const wsUrl = origin.replace('http://', 'ws://').replace('https://', 'wss://') + `/ws/chat/${encodeURIComponent(roomName)}/`;
                const ws = new WebSocket(wsUrl);
                ws.onopen = () => {
                  ws.send(JSON.stringify({ type: 'chat_message', sender: String(currentUser.id) }));
                  ws.close();
                };
                ws.onerror = () => ws.close();
                setTimeout(() => ws.close(), 1000);
              } catch (_) {}
            };
            // Notify group chats
            (groupIds || []).forEach(gid => notifyRoom(`group-${gid}`));
            // Notify individual chats
            (userIds || []).forEach(uid => {
              const minId = Math.min(Number(currentUser.id), Number(uid));
              const maxId = Math.max(Number(currentUser.id), Number(uid));
              notifyRoom(`dm-${minId}-${maxId}`);
            });
          } else {
            const payload = { message: msg.message || '', message_type: 'text' as const, file_name: null, file_size: null, file_type: null, file_url: null };
            await Promise.all((groupIds || []).map(gid => groupChatApi.sendMessage(gid, payload)));
            await Promise.all((userIds || []).map(uid => individualChatApi.sendMessage(uid, payload)));
            // Send WebSocket notifications for real-time updates
            const notifyRoom = (roomName: string) => {
              try {
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
                const origin = API_BASE_URL.replace('/api', '');
                const wsUrl = origin.replace('http://', 'ws://').replace('https://', 'wss://') + `/ws/chat/${encodeURIComponent(roomName)}/`;
                const ws = new WebSocket(wsUrl);
                ws.onopen = () => {
                  ws.send(JSON.stringify({ type: 'chat_message', sender: String(currentUser.id) }));
                  ws.close();
                };
                ws.onerror = () => ws.close();
                setTimeout(() => ws.close(), 1000);
              } catch (_) {}
            };
            // Notify group chats
            (groupIds || []).forEach(gid => notifyRoom(`group-${gid}`));
            // Notify individual chats
            (userIds || []).forEach(uid => {
              const minId = Math.min(Number(currentUser.id), Number(uid));
              const maxId = Math.max(Number(currentUser.id), Number(uid));
              notifyRoom(`dm-${minId}-${maxId}`);
            });
          }
        };
        if (toShare.length > 0) {
          for (const m of toShare) { // keep order
            // eslint-disable-next-line no-await-in-loop
            await sendOne(m);
          }
        } else if (shareTarget) {
          await sendOne(shareTarget);
        }
        setSelectedMessageIds(new Set());
        setIsSelectMode(false);
        setShareTarget(null);
        toast({ title: 'Shared', description: 'Shared successfully.' });
        setShareOpen(false);
      } catch (e) {
        toast({ title: 'Share failed', description: 'Unable to share.', variant: 'destructive' as any });
      } finally {
        setShareLoading(false);
      }
    }}
  />
    </div>
  );
}