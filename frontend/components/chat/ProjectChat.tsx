'use client';

import { useState, useRef, useEffect } from 'react';
import { SendIcon, UserIcon, PaperclipIcon, ImageIcon, FileIcon, DownloadIcon, EyeIcon } from 'lucide-react';
import { MoreVertical } from 'lucide-react';
import { Forward } from 'lucide-react';
import { CheckSquare } from 'lucide-react';
import { Pencil, Trash2 } from 'lucide-react';
import { ChatMessage, User } from '@/types';
import { resolveMediaUrl } from '@/lib/api/auth';
import { useChatWebSocket } from '@/lib/hooks/useChatWebSocket';
import { authAPI } from '@/lib/api/auth';
import ChatFilePreviewModal from '@/components/modals/ChatFilePreviewModal';
import ShareMessageModal from '@/components/modals/ShareMessageModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { groupChatApi } from '@/lib/api/chat-groups';
import { individualChatApi } from '@/lib/api/individual-chat';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

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
  const [preview, setPreview] = useState<{open: boolean; url: string; name: string; type: string; size?: number}>({ open: false, url: '', name: '', type: '', size: undefined });
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ url?: string; name?: string; type?: string; size?: number; isImage?: boolean; text?: string } | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const { toast } = useToast();
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [editingFileData, setEditingFileData] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id?: string; timestamp?: string }>({ open: false });
  const { isConnected, send } = useChatWebSocket(
    projectId ? `project-${projectId}` : undefined,
    async (payload) => {
      if (payload?.type === 'chat_message' || payload?.type === 'connection_established') {
        // If this WS event came from the same user who just sent the message, skip refetch to avoid flicker
        if (payload?.sender && String(payload.sender) === String(currentUser?.id)) {
          return;
        }
        try {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
          const url = `${API_BASE_URL}/chat/project/${projectId}/messages`;
          const token = authAPI.getToken();
          const res = await fetch(url, {
            headers: {
              'Accept': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            credentials: 'include',
          });
          if (res.ok) {
            const latest = await res.json();
            const mapped = (latest || []).map((m: any) => ({
              id: String(m.id),
              projectId: String(m.project_id),
              userId: String(m.user_id),
              userName: m.user_name,
              userRole: m.user_role,
              message: m.message,
              messageType: m.message_type,
              timestamp: m.timestamp,
              fileName: m.file_name,
              fileSize: m.file_size,
              fileType: m.file_type,
              fileUrl: resolveMediaUrl(m.file_url),
            }));
            // Replace with latest snapshot so edits/deletes reflect immediately
            setChatMessages(mapped);
            scrollToBottom();
          }
        } catch (_) {}
      }
    }
  );

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Typing indicator via WS (best-effort)
  useEffect(() => {
    const typingTimeouts = new Map<string, any>();
    const handleLocalTyping = () => {
      if (!currentUser) return;
      send({ message: `${currentUser.name || currentUser.email || 'User'} is typing...`, sender: String(currentUser.id) });
    };
    // Attach on input change below via handleLocalTyping when needed
    return () => {
      typingTimeouts.forEach((t) => clearTimeout(t));
      typingTimeouts.clear();
    };
  }, [send, currentUser]);

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
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const url = `${API_BASE_URL}/chat/project/${projectId}/messages`;
        const token = authAPI.getToken();
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });
        if (response.ok) {
          const projectMessages = await response.json();
          console.log('💬 Loaded conversation history:', projectMessages.length, 'messages');
          const mapped = (projectMessages || []).map((m: any) => ({
            id: String(m.id),
            projectId: String(m.project_id),
            userId: String(m.user_id),
            userName: m.user_name,
            userRole: m.user_role,
            message: m.message,
            messageType: m.message_type,
            timestamp: m.timestamp,
            fileName: m.file_name,
            fileSize: m.file_size,
            fileType: m.file_type,
            fileUrl: resolveMediaUrl(m.file_url),
          }));
          setChatMessages(mapped);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    loadMessages();
  }, [projectId]);

  // Remove polling: WS will trigger refresh

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
      message: content,
      message_type: messageType,
      file_name: fileData?.fileName || null,
      file_size: fileData?.fileSize || null,
      file_type: fileData?.fileType || null,
      file_url: fileData?.fileUrl || null,
    };

    // Optimistically add message to UI first
    const tempMessage = {
      id: `temp-${Date.now()}`,
      projectId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      message: content,
      messageType,
      timestamp: new Date().toISOString(),
      ...fileData,
    };
    setChatMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const apiUrl = `${API_BASE_URL}/chat/project/${projectId}/messages`;
      console.log('Calling API:', apiUrl);
      const token = authAPI.getToken();
      // Save message to database
      const response = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(messageData),
      });

      console.log('API Response:', response.status, response.ok);

      if (response.ok) {
            const savedMessage = await response.json();
        console.log('Message saved:', savedMessage);
        
        // Convert backend response to frontend format
        const frontendMessage = {
          id: savedMessage.id,
          projectId: savedMessage.project_id,
          userId: savedMessage.user_id,
              userName: savedMessage.user_name,
              userRole: savedMessage.user_role,
          message: savedMessage.message,
          messageType: savedMessage.message_type,
          timestamp: savedMessage.timestamp,
          fileName: savedMessage.file_name,
          fileSize: savedMessage.file_size,
          fileType: savedMessage.file_type,
          fileUrl: resolveMediaUrl(savedMessage.file_url),
        };
        
        // Replace temp message with real one
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id ? frontendMessage : msg
          )
        );
        
        // Notify via backend WebSocket (others will refresh on receive)
        if (isConnected) {
          send({ message: savedMessage.message, sender: String(savedMessage.user_id) });
        }
      } else {
        console.error('API Error:', await response.text());
        // Remove temp message on error
        setChatMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        if (messageType === 'text') setNewMessage(content); // Restore text message
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setChatMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      if (messageType === 'text') setNewMessage(content); // Restore text message
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
            ? `📷 Shared an image: ${file.name}`
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
      const fakeEvent = ({
        target: { files: [file] }
      } as unknown) as React.ChangeEvent<HTMLInputElement>;
      
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
    const roleConfig: Record<string, { label: string; color: string }> = {
      admin: { label: 'Admin', color: 'bg-red-100 text-red-800' },
      client: { label: 'Client', color: 'bg-blue-100 text-blue-800' },
      project_manager: { label: 'Manager', color: 'bg-green-100 text-green-800' },
      assistant_project_manager: { label: 'Asst. PM', color: 'bg-emerald-100 text-emerald-800' },
      designer: { label: 'Designer', color: 'bg-purple-100 text-purple-800' },
      senior_designer: { label: 'Sr. Designer', color: 'bg-purple-100 text-purple-800' },
      team_lead: { label: 'Team Lead', color: 'bg-indigo-100 text-indigo-800' },
      team_head: { label: 'Team Head', color: 'bg-indigo-100 text-indigo-800' },
      professional_engineer: { label: 'Engineer', color: 'bg-amber-100 text-amber-800' },
      auto_cad_drafter: { label: 'Drafter', color: 'bg-amber-100 text-amber-800' },
      operation_manager: { label: 'Ops', color: 'bg-cyan-100 text-cyan-800' },
      hr_manager: { label: 'HR', color: 'bg-pink-100 text-pink-800' },
      accountant: { label: 'Accounts', color: 'bg-slate-100 text-slate-800' },
      sales_manager: { label: 'Sales', color: 'bg-orange-100 text-orange-800' },
      digital_marketing: { label: 'Marketing', color: 'bg-teal-100 text-teal-800' },
      client_team_member: { label: 'Client Team', color: 'bg-blue-100 text-blue-800' },
    };
    return roleConfig[role] || { label: 'User', color: 'bg-muted text-muted-foreground' };
  };

  const getRoleAvatar = (role: string) => {
    const colors = {
      client: 'bg-blue-500',
      project_manager: 'bg-green-500', 
      designer: 'bg-purple-500',
    };
    return colors[role as keyof typeof colors] || 'bg-muted';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImageFile = (fileType?: string) => {
    return !!(fileType && fileType.startsWith('image/'));
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <FileIcon size={16} />;
    if (fileType.startsWith('image/')) return <ImageIcon size={16} />;
    if (fileType.includes('pdf')) return <FileIcon size={16} className="text-red-500" />;
    if (fileType.includes('word') || fileType.includes('doc')) return <FileIcon size={16} className="text-blue-500" />;
    if (fileType.includes('excel') || fileType.includes('sheet')) return <FileIcon size={16} className="text-green-500" />;
    return <FileIcon size={16} />;
  };
  const canEdit = (message: ChatMessage) => {
    if (String(message.userId) !== String(currentUser.id)) return false;
    const dt = new Date(message.timestamp).getTime();
    return Date.now() - dt <= 24 * 3600 * 1000;
  };
  const canDeleteEveryone = (message: ChatMessage) => {
    if (String(message.userId) !== String(currentUser.id)) return false;
    const dt = new Date(message.timestamp).getTime();
    return Date.now() - dt <= 1 * 3600 * 1000;
  };

  const handleEditSave = async (msg: ChatMessage) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const token = authAPI.getToken();
      const body: any = { message: editingText };
      if ((editingFileData as any)?.fileUrl) {
        body.file_url = (editingFileData as any).fileUrl;
        body.file_name = (editingFileData as any).fileName;
        body.file_size = (editingFileData as any).fileSize;
        body.file_type = (editingFileData as any).fileType;
        body.message_type = (editingFileData as any).messageType;
      }
      const res = await fetch(`${API_BASE_URL}/chat/project/${projectId}/messages/${msg.id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setChatMessages(prev => prev.map(m => m.id === msg.id ? { ...m, message: editingText + ' (edited)', fileUrl: (editingFileData as any)?.fileUrl || m.fileUrl, fileName: (editingFileData as any)?.fileName || m.fileName, fileSize: (editingFileData as any)?.fileSize ?? m.fileSize, fileType: (editingFileData as any)?.fileType || m.fileType, messageType: (editingFileData as any)?.messageType || m.messageType } : m));
        setEditingId(null); setEditingText('');
        setEditingFileData(null);
        if (isConnected) {
          send({ type: 'chat_message', sender: String(currentUser.id) });
        }
      } else {
        toast({ title: 'Edit failed', description: 'Unable to edit message', variant: 'destructive' as any });
      }
    } catch (e) {
      toast({ title: 'Edit failed', description: 'Unable to edit message', variant: 'destructive' as any });
    }
  };

  const performDelete = async (scope: 'me' | 'everyone') => {
    if (!deleteDialog.id) return;
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const token = authAPI.getToken();
      const res = await fetch(`${API_BASE_URL}/chat/project/${projectId}/messages/${deleteDialog.id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify({ scope }),
      });
      if (res.ok) {
        if (scope === 'me') {
          setChatMessages(prev => prev.filter(m => String(m.id) !== String(deleteDialog.id)));
        } else {
          setChatMessages(prev => prev.map(m => String(m.id) === String(deleteDialog.id) ? { ...m, message: 'this message has been deleted', messageType: 'text', fileUrl: undefined, fileName: undefined, fileSize: undefined, fileType: undefined } : m));
          if (isConnected) {
            send({ type: 'chat_message', sender: String(currentUser.id) });
          }
        }
      } else {
        toast({ title: 'Delete failed', description: 'Unable to delete message', variant: 'destructive' as any });
      }
    } catch (e) {
      toast({ title: 'Delete failed', description: 'Unable to delete message', variant: 'destructive' as any });
    } finally {
      setDeleteDialog({ open: false });
    }
  };

  const urlToDataUrl = async (url: string): Promise<string> => {
    const res = await fetch(url, { credentials: 'include' });
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(blob);
    });
  };

  const toggleSelect = (messageId: string) => {
    setSelectedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId); else next.add(messageId);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedMessageIds(new Set());
    setIsSelectMode(false);
  };

  const openPreview = (url?: string, name?: string, type?: string, size?: number) => {
    if (!url) return;
    setPreview({ open: true, url, name: name || 'file', type: type || 'application/octet-stream', size });
  };

  const closePreview = () => setPreview(prev => ({ ...prev, open: false }));

  const downloadViaBlob = async (url?: string, name?: string) => {
    if (!url) return;
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
    } catch (e) {
      // Fallback to navigation if blob download fails
      const link = document.createElement('a');
      link.href = url;
      link.download = name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
      
      {!isSelectMode ? (
        <h3 className="text-lg font-semibold text-black mb-4 pb-3 border-b border-gray-200 flex-shrink-0">
          Project Chat
        </h3>
      ) : (
        <div className="mb-4 pb-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {selectedMessageIds.size} selected
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              className="h-8 px-3"
              disabled={selectedMessageIds.size === 0}
              onClick={() => setShareOpen(true)}
              title="Share selected"
            >
              <Forward size={14} className="mr-1" /> Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={clearSelection}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0">
        {chatMessages.length === 0 ? (
          /* Empty state placeholder */
          <div className="flex-1 flex items-center justify-center h-full min-h-[300px]">
            <div className="text-center max-w-md mx-auto px-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <SendIcon size={32} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Start the conversation
              </h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Send a message to begin collaborating with your team. Share updates, ask questions, 
                or upload files to keep everyone in sync.
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <PaperclipIcon size={14} />
                <span>You can also drag & drop files or click the attachment icon</span>
              </div>
            </div>
          </div>
        ) : (
          chatMessages.map((message) => {
          const roleTag = getRoleTag(message.userRole || 'user');
          const isOwnMessage = String(message.userId) === String(currentUser.id);
          
          return (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div className={`w-8 h-8 ${getRoleAvatar(message.userRole || 'user')} rounded-full flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-medium text-xs">
                  {message.userName?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className={`flex-1 max-w-sm ${isOwnMessage ? 'text-right' : ''}`}>
                <div className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                  {isSelectMode && (
                    <Checkbox
                      checked={selectedMessageIds.has(String(message.id))}
                      onCheckedChange={() => toggleSelect(String(message.id))}
                      className="mr-2"
                    />
                  )}
                  {!isOwnMessage && (
                    <>
                      <span className="text-sm font-medium text-gray-900">
                        {message.userName || 'Unknown User'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${roleTag.color}`}>
                        {roleTag.label}
                      </span>
                    </>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatTime(message.timestamp)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-600 hover:bg-gray-200 p-1 rounded transition-colors"
                        title="More"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isOwnMessage ? 'start' : 'end'} className="w-40">
                      <DropdownMenuItem
                        onClick={() => {
                          if (message.fileUrl) {
                            setShareTarget({ url: message.fileUrl, name: message.fileName, type: message.fileType, size: message.fileSize, isImage: isImageFile(message.fileType) });
                          } else {
                            setShareTarget({ text: message.message });
                          }
                          setShareOpen(true);
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Forward size={14} />
                          <span>Share</span>
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setIsSelectMode(true);
                          setSelectedMessageIds(prev => new Set(prev).add(String(message.id)));
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <CheckSquare size={14} />
                          <span>Select</span>
                        </span>
                      </DropdownMenuItem>
                      {isOwnMessage && canEdit(message) && (
                        <DropdownMenuItem onClick={() => { setEditingId(String(message.id)); setEditingText(message.message); }}>
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
                  {/* Text message or editing */}
                  {editingId === String(message.id) ? (
                    <div className="mb-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input value={editingText} onChange={(e)=>setEditingText(e.target.value)} className="flex-1 border px-2 py-1 rounded text-black" />
                        <Button size="sm" onClick={() => handleEditSave(message)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditingText(''); setEditingFileData(null); }}>Cancel</Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="file" className="hidden" onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const fileUrl = String(reader.result);
                            const messageType = f.type.startsWith('image/') ? 'image' : 'file';
                            setEditingFileData({ fileUrl, fileName: f.name, fileSize: f.size, fileType: f.type, messageType });
                          };
                          reader.readAsDataURL(f);
                        }} id={`edit-file-${message.id}`} />
                        <Button size="sm" variant="secondary" onClick={() => document.getElementById(`edit-file-${message.id}`)?.click() as any}>Change attachment</Button>
                        {editingFileData && <span className="text-xs text-gray-600 truncate max-w-[160px]">{editingFileData.fileName}</span>}
                      </div>
                    </div>
                  ) : (
                  message.message && 
                   !message.message.startsWith('📷 Shared an image:') && 
                   !message.message.startsWith('[Image:') && (
                    <div className="mb-2">
                      {message.message}
                    </div>
                  ))}

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
                            onClick={() => openPreview(message.fileUrl, message.fileName, message.fileType, message.fileSize)}
                          />
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); openPreview(message.fileUrl, message.fileName, message.fileType, message.fileSize); }}
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
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); openPreview(message.fileUrl, message.fileName, message.fileType, message.fileSize); }}
                              className="text-gray-600 hover:bg-gray-300 p-1 rounded transition-colors"
                              title="View"
                            >
                              <EyeIcon size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); downloadViaBlob(message.fileUrl, message.fileName); }}
                              className="text-gray-600 hover:bg-gray-300 p-1 rounded transition-colors"
                              title="Download"
                            >
                              <DownloadIcon size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }))}
        
        {/* Typing indicators - only show when there are messages or when someone is typing */}
        {(chatMessages.length > 0 || isTyping.length > 0) && isTyping.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500 italic">
            <span>{isTyping.map(u => u.userName || 'Someone').join(', ')} {isTyping.length === 1 ? 'is' : 'are'} typing...</span>
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

      {/* Preview Modal */}
      <ChatFilePreviewModal
        isOpen={preview.open}
        onClose={closePreview}
        fileUrl={preview.url}
        fileName={preview.name}
        fileType={preview.type}
        fileSize={preview.size}
      />

      {/* Share Modal */}
      <ShareMessageModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        loading={shareLoading}
        onConfirm={async ({ groupIds, userIds }) => {
          try {
            setShareLoading(true);
            const sendOne = async (msg: any) => {
              if (msg.fileUrl) {
                const dataUrl = await urlToDataUrl(msg.fileUrl);
                const isImg = isImageFile(msg.fileType);
                const messageType: 'file' | 'image' = isImg ? 'image' : 'file';
                const messageText = messageType === 'image' ? `📷 Shared an image: ${msg.fileName || ''}` : `📎 Shared a file: ${msg.fileName || ''}`;
                const payload = {
                  message: messageText,
                  message_type: messageType,
                  file_name: msg.fileName || null,
                  file_size: msg.fileSize || null,
                  file_type: msg.fileType || null,
                  file_url: dataUrl,
                };
                await Promise.all((groupIds || []).map(gid => groupChatApi.sendMessage(gid, payload)));
                await Promise.all((userIds || []).map(uid => individualChatApi.sendMessage(uid, payload)));
              } else {
                const payload = {
                  message: msg.message || '',
                  message_type: 'text' as const,
                  file_name: null,
                  file_size: null,
                  file_type: null,
                  file_url: null,
                };
                await Promise.all((groupIds || []).map(gid => groupChatApi.sendMessage(gid, payload)));
                await Promise.all((userIds || []).map(uid => individualChatApi.sendMessage(uid, payload)));
              }
            };

            if (isSelectMode && selectedMessageIds.size > 0) {
              const toShare = chatMessages.filter(m => selectedMessageIds.has(String(m.id)));
              for (const m of toShare) {
                // share sequentially to keep order
                // eslint-disable-next-line no-await-in-loop
                await sendOne(m);
              }
              clearSelection();
            } else if (shareTarget) {
              const single = {
                message: shareTarget.text,
                fileUrl: shareTarget.url,
                fileName: shareTarget.name,
                fileSize: shareTarget.size,
                fileType: shareTarget.type,
              };
              await sendOne(single);
            }
            toast({ title: 'Shared', description: 'File shared successfully.' });
            setShareOpen(false);
          } catch (e) {
            toast({ title: 'Share failed', description: 'Unable to share. Please try again.', variant: 'destructive' as any });
          } finally {
            setShareLoading(false);
          }
        }}
      />

      {/* Delete dialog */}
      {deleteDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-md shadow-lg p-4 w-[320px]">
            <div className="text-sm font-medium mb-2">Delete message</div>
            <div className="text-xs text-gray-600 mb-4">Choose how you want to delete this message.</div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => performDelete('me')}>Delete for me</Button>
              {(() => {
                const msg = chatMessages.find(m => String(m.id) === String(deleteDialog.id));
                return (msg && canDeleteEveryone(msg)) ? (
                  <Button variant="destructive" onClick={() => performDelete('everyone')}>Delete for everyone</Button>
                ) : null;
              })()}
              <Button variant="ghost" onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}