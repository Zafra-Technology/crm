'use client';

import { useEffect, useRef, useState } from 'react';
import { SendIcon, PaperclipIcon, DownloadIcon, EyeIcon, UserMinus, X, Search, Users, MoreVertical, Forward, CheckSquare, Pencil, Trash2, Image as ImageIcon, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { User } from '@/types';
import { authAPI, resolveMediaUrl, getBackendOrigin } from '@/lib/api/auth';
import { useChatWebSocket } from '@/lib/hooks/useChatWebSocket';
import ChatFilePreviewModal from '@/components/modals/ChatFilePreviewModal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import ShareMessageModal from '@/components/modals/ShareMessageModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { groupChatApi } from '@/lib/api/chat-groups';
import { individualChatApi } from '@/lib/api/individual-chat';
import { formatChatDate, isDifferentDay } from '@/lib/utils/dateUtils';

interface GroupChatProps {
  groupId: string;
  groupName: string;
  groupImage?: string;
  members?: Array<{ id: string; name: string }>;
  currentUser: User;
  onNewMessage?: () => void;
}

interface GroupMessage {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  userAvatar?: string;
  message: string;
  messageType?: 'text' | 'file' | 'image';
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

export default function GroupChat({ groupId, groupName, groupImage, members = [], currentUser, onNewMessage }: GroupChatProps) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{open: boolean; url: string; name: string; type: string; size?: number}>({ open: false, url: '', name: '', type: '', size: undefined });
  const [infoOpen, setInfoOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState<Array<{ id: string; name: string }>>(members);
  const [memberOptions, setMemberOptions] = useState<Array<{ id: string; name: string; role: string; avatar?: string }>>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [userMeta, setUserMeta] = useState<Record<string, { name: string; role: string; avatar?: string }>>({});
  const [confirmRemove, setConfirmRemove] = useState<{ open: boolean; userId?: string; userName?: string }>({ open: false });
  const [memberSearch, setMemberSearch] = useState('');
  const { toast } = useToast();
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ message?: string; fileUrl?: string; fileName?: string; fileSize?: number; fileType?: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id?: string; timestamp?: string }>({ open: false });
  const [editingFileData, setEditingFileData] = useState<{ fileUrl: string; fileName: string; fileSize: number; fileType: string; messageType: 'file'|'image' } | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  const { isConnected, send } = useChatWebSocket(
    groupId ? `group-${groupId}` : undefined,
    async (payload) => {
      // On any event, refresh member list (covers servers that only emit generic messages)
      try {
        const token = authAPI.getToken();
        const res = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/`, {
          headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          credentials: 'include',
        });
        if (res.ok) {
          const g = await res.json();
          if (Array.isArray(g.members) && g.members.length) {
            const meta: Record<string, { name: string; role: string; avatar?: string }> = {};
            const members = g.members.map((u:any) => {
              const id = String(u.id);
              meta[id] = { name: u.name, role: u.role || 'user', avatar: resolveMediaUrl(u.avatar) || undefined };
              return { id, name: u.name };
            });
            setUserMeta(prev => ({ ...prev, ...meta }));
            setGroupMembers(members);
          }
        }
      } catch (_) {}
      if (payload?.type === 'chat_message' || payload?.type === 'connection_established') {
        // If this event came from self, skip refetch to avoid flicker
        if (payload?.sender && String(payload.sender) === String(currentUser?.id)) {
          return;
        }
        try {
          const token = authAPI.getToken();
          const res = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/messages/`, {
            headers: {
              'Accept': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            credentials: 'include',
          });
          if (res.ok) {
          const latest = await res.json();
            const mapped: GroupMessage[] = (latest || []).map((m: any) => ({
              id: String(m.id),
              userId: String(m.user_id),
              userName: m.user_name,
              userRole: m.user_role,
              userAvatar: m.user_avatar ? resolveMediaUrl(m.user_avatar) : undefined,
              message: m.message,
              messageType: m.message_type,
              timestamp: m.timestamp,
            fileUrl: resolveMediaUrl(m.file_url) || undefined,
              fileName: m.file_name || undefined,
              fileSize: m.file_size || undefined,
              fileType: m.file_type || undefined,
            }));
            // Replace with latest snapshot so edits/deletes reflect immediately
            setMessages(mapped);
            setUserMeta(prev => {
              const next = { ...prev } as Record<string, { name: string; role: string; avatar?: string }>;
              for (const m of mapped) {
                const id = String(m.userId);
                if (!next[id]) next[id] = { name: m.userName, role: m.userRole || 'user', avatar: m.userAvatar };
                else {
                  if (!next[id].name) next[id].name = m.userName;
                  if (!next[id].role) next[id].role = m.userRole || 'user';
                  if (!next[id].avatar && m.userAvatar) next[id].avatar = m.userAvatar;
                }
              }
              return next;
            });
            scrollToBottom();
            // Notify parent to refresh unread counts
            if (onNewMessage) {
              onNewMessage();
            }
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

  useEffect(() => {
    const load = async () => {
      try {
        const token = authAPI.getToken();
        const res = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/messages/`, {
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          const mapped: GroupMessage[] = (data || []).map((m: any) => ({
            id: String(m.id),
            userId: String(m.user_id),
            userName: m.user_name,
            userRole: m.user_role,
            userAvatar: m.user_avatar ? resolveMediaUrl(m.user_avatar) : undefined,
            message: m.message,
            messageType: m.message_type,
            timestamp: m.timestamp,
            fileUrl: resolveMediaUrl(m.file_url) || undefined,
            fileName: m.file_name || undefined,
            fileSize: m.file_size || undefined,
            fileType: m.file_type || undefined,
          }));
          setMessages(mapped);
          // Build name map from messages so clients show actual names
          setUserMeta(prev => {
            const next = { ...prev } as Record<string, { name: string; role: string; avatar?: string }>;
            for (const m of mapped) {
              const id = String(m.userId);
              if (!next[id]) next[id] = { name: m.userName, role: m.userRole || 'user', avatar: m.userAvatar };
              else {
                if (!next[id].name) next[id].name = m.userName;
                if (!next[id].role) next[id].role = m.userRole || 'user';
                if (!next[id].avatar && m.userAvatar) next[id].avatar = m.userAvatar;
              }
            }
            return next;
          });
          scrollToBottom();
        }
      } catch (e) {
        // silent
      }
    };
    load();
  }, [groupId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Ensure header shows member names immediately and cache user meta
  useEffect(() => {
    const ensureMemberNames = async () => {
      try {
        const token = authAPI.getToken();
        const res = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/`, {
          headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          credentials: 'include',
        });
        if (res.ok) {
          const g = await res.json();
          // Prefer enriched members from backend if available
          if (Array.isArray(g.members) && g.members.length) {
            const meta: Record<string, { name: string; role: string; avatar?: string }> = {};
            const members = g.members.map((u:any) => {
              const id = String(u.id);
              meta[id] = { name: u.name, role: u.role || 'user', avatar: resolveMediaUrl(u.avatar) || undefined };
              return { id, name: u.name };
            });
            setUserMeta(prev => ({ ...meta, ...prev }));
            setGroupMembers(members);
          } else {
            // Fallback: use global users
            const allUsers = await authAPI.getUsers();
            const idToName = new Map(allUsers.map((u:any) => [String(u.id), u.full_name]));
            const meta: Record<string, { name: string; role: string; avatar?: string }> = {};
            for (const u of allUsers) {
              meta[String(u.id)] = { name: u.full_name, role: u.role, avatar: resolveMediaUrl(u.profile_pic) || undefined };
            }
            setUserMeta(prev => ({ ...meta, ...prev }));
            setGroupMembers((g.member_ids || []).map((id: number) => ({ id: String(id), name: idToName.get(String(id)) || 'User' })));
          }
        }
      } catch (_) {}
    };
    ensureMemberNames();
  }, [groupId]);

  // Load latest members when opening info sheet or add modal
  useEffect(() => {
    const fetchMembers = async () => {
      if (!infoOpen && !addModalOpen) return;
      try {
        setLoadingMembers(true);
        const token = authAPI.getToken();
        const res = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/`, {
          headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          credentials: 'include',
        });
        if (res.ok) {
          const g = await res.json();
          // We need names; fetch users as needed and map ids to names
          const existing = new Set((g.member_ids || []).map((i:number)=>String(i)));

          if (currentUser.role === 'client') {
            // Clients can only add their team members
            const teamMembers = await authAPI.getTeamMembersByClient(currentUser.id);
            // Map group members with names
            const idToName = new Map(teamMembers.map((u:any) => [String(u.id), u.full_name]));
            setGroupMembers((g.member_ids || []).map((id: number) => ({ id: String(id), name: idToName.get(String(id)) || String(id) })));
            const options = (teamMembers || [])
              .filter((u:any) => u.is_active)
              .filter((u:any) => !existing.has(String(u.id)))
              .map((u:any) => ({ id: String(u.id), name: u.full_name, role: 'client_team_member', avatar: resolveMediaUrl(u.profile_pic) || undefined }));
            setMemberOptions(options);
          } else {
            const allUsers = await authAPI.getUsers();
            const idToName = new Map(allUsers.map((u:any) => [String(u.id), u.full_name]));
            setGroupMembers((g.member_ids || []).map((id: number) => ({ id: String(id), name: idToName.get(String(id)) || 'User' })));
            const options = (allUsers || [])
              .filter((u:any) => u.is_active)
              .filter((u:any) => u.role !== 'client_team_member')
              .filter((u:any) => !existing.has(String(u.id)))
              .map((u:any) => ({ id: String(u.id), name: u.full_name, role: u.role, avatar: resolveMediaUrl(u.profile_pic) || undefined }));
            setMemberOptions(options);
          }
        }
      } finally {
        setLoadingMembers(false);
        setSelectedToAdd([]);
      }
    };
    fetchMembers();
  }, [infoOpen, addModalOpen, groupId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    await sendMessage(newMessage.trim(), 'text');
  };

  const sendMessage = async (content: string, messageType: 'text' | 'file' | 'image', fileData?: any) => {
    const optimistic: GroupMessage = {
      id: `temp-${Date.now()}`,
      userId: String(currentUser.id),
      userName: currentUser.name,
      userRole: currentUser.role,
      message: content,
      messageType,
      timestamp: new Date().toISOString(),
      ...fileData,
    };
    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');

    try {
      const token = authAPI.getToken();
      const res = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/messages/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          message: content,
          message_type: messageType,
          file_name: fileData?.fileName || null,
          file_size: fileData?.fileSize || null,
          file_type: fileData?.fileType || null,
          file_url: fileData?.fileUrl || null,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        const mapped: GroupMessage = {
          id: String(saved.id),
          userId: String(saved.user_id),
          userName: saved.user_name,
          userRole: saved.user_role,
          message: saved.message,
          messageType: saved.message_type,
          timestamp: saved.timestamp,
          fileUrl: resolveMediaUrl(saved.file_url) || undefined,
          fileName: saved.file_name || undefined,
          fileSize: saved.file_size || undefined,
          fileType: saved.file_type || undefined,
        };
        setMessages(prev => prev.map(m => m.id === optimistic.id ? mapped : m));
        if (isConnected) {
          send({ message: saved.message, sender: String(saved.user_id) });
        }
        // Notify parent to refresh counts after sending message
        if (onNewMessage) {
          onNewMessage();
        }
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        if (messageType === 'text') setNewMessage(content);
      }
    } catch (_) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      if (messageType === 'text') setNewMessage(content);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('File too large'); return; }
    setUploadingFile(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileUrl = event.target?.result as string;
      const messageType = file.type.startsWith('image/') ? 'image' : 'file';
      const fileData = { fileUrl, fileName: file.name, fileSize: file.size, fileType: file.type };
      const msgText = messageType === 'image' ? `📷 Shared an image: ${file.name}` : `📎 Shared a file: ${file.name}`;
      await sendMessage(msgText, messageType, fileData);
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag & drop like ProjectChat
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
      const fakeEvent = ({ target: { files: [file] } } as unknown) as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(fakeEvent);
    }
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const openPreview = (url?: string, name?: string, type?: string, size?: number) => {
    if (!url) return; setPreview({ open: true, url, name: name || 'file', type: type || 'application/octet-stream', size });
  };
  const closePreview = () => setPreview(prev => ({ ...prev, open: false }));

  const downloadViaBlob = async (url?: string, name?: string) => {
    if (!url) return;
    // If the URL is a data URL (base64), download directly without fetch
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
      // Fallback navigation
      const link = document.createElement('a');
      link.href = url;
      link.download = name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const canEdit = (m: GroupMessage) => {
    if (String(m.userId) !== String(currentUser.id)) return false;
    const dt = new Date(m.timestamp).getTime();
    return Date.now() - dt <= 24 * 3600 * 1000;
  };
  const canDeleteEveryone = (m: GroupMessage) => {
    if (String(m.userId) !== String(currentUser.id)) return false;
    const dt = new Date(m.timestamp).getTime();
    return Date.now() - dt <= 1 * 3600 * 1000;
  };

  const handleEditSave = async (m: GroupMessage) => {
    const ok = await groupChatApi.editMessage(Number(groupId), Number(m.id), { message: editingText });
    if (ok) {
      setMessages(prev => prev.map(mm => mm.id === m.id ? { ...mm, message: editingText } : mm));
      setEditingId(null); setEditingText('');
    } else {
      toast({ title: 'Edit failed', description: 'Unable to edit message', variant: 'destructive' as any });
    }
  };

  const performDelete = async (scope: 'me' | 'everyone') => {
    if (!deleteDialog.id) return;
    const ok = await groupChatApi.deleteMessage(Number(groupId), Number(deleteDialog.id), scope);
    if (ok) {
      if (scope === 'me') {
        setMessages(prev => prev.filter(m => String(m.id) !== String(deleteDialog.id)));
      } else {
        setMessages(prev => prev.map(m => String(m.id) === String(deleteDialog.id) ? { ...m, message: 'this message has been deleted', messageType: 'text', fileUrl: undefined, fileName: undefined, fileSize: undefined, fileType: undefined } : m));
        if (isConnected) send({ type: 'chat_message', sender: String(currentUser.id) });
      }
    } else {
      toast({ title: 'Delete failed', description: 'Unable to delete message', variant: 'destructive' as any });
    }
    setDeleteDialog({ open: false });
  };

  const getRoleBadgeClasses = (role?: string) => {
    const key = (role || 'user').toLowerCase();
    if (key.includes('admin')) return 'bg-red-50 text-red-700 border-red-200';
    if (key.includes('project_manager')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (key.includes('assistant_project_manager')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (key.includes('senior')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (key.includes('team_head')) return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
    if (key.includes('team_lead')) return 'bg-violet-50 text-violet-700 border-violet-200';
    if (key.includes('professional_engineer')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (key.includes('designer')) return 'bg-teal-50 text-teal-700 border-teal-200';
    if (key.includes('client')) return 'bg-slate-50 text-slate-700 border-slate-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div 
      className={`card h-full flex flex-col relative ${dragOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-4xl mb-2">📎</div>
            <p className="text-blue-600 font-medium">Drop file to share</p>
          </div>
        </div>
      )}
      <div className="flex items-center space-x-3 p-4 border-b border-gray-200 cursor-pointer" onClick={() => setInfoOpen(true)}>
        {groupImage ? (
          <img src={resolveMediaUrl(groupImage)} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">{groupName?.charAt(0)?.toUpperCase() || 'G'}</div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{groupName}</h3>
          <p className="text-xs text-gray-500">{groupMembers.map(m => (userMeta[String(m.id)]?.name || m.name)).slice(0,3).join(', ')}{groupMembers.length > 3 ? ', ...' : ''}</p>
        </div>
      </div>

      {isSelectMode ? (
        <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">{selectedMessageIds.size} selected</div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              className="h-8 px-3"
              disabled={selectedMessageIds.size === 0}
              onClick={() => setShareOpen(true)}
            >
              <Forward size={14} className="mr-1" /> Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={() => { setSelectedMessageIds(new Set()); setIsSelectMode(false); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, index) => {
          const own = String(m.userId) === String(currentUser.id);
          const meta = userMeta[String(m.userId)] || { name: m.userName, role: m.userRole || 'user', avatar: undefined };
          
          // Check if we need to show a date separator
          const showDateSeparator = index === 0 || isDifferentDay(m.timestamp, messages[index - 1].timestamp);
          
          return (
            <div key={m.id}>
              {showDateSeparator && (
                <div className="flex justify-center my-4">
                  <span className="bg-gray-300 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full">
                    {formatChatDate(m.timestamp)}
                  </span>
                </div>
              )}
              <div className={`flex items-start space-x-3 ${own ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {meta.avatar ? (
                <img src={meta.avatar} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className={`w-8 h-8 ${own ? 'bg-gray-400' : 'bg-gray-300'} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-medium text-xs">{(meta.name || 'U').charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div className={`flex-1 max-w-sm ${own ? 'text-right' : ''}`}>
                <div className={`flex items-center space-x-2 mb-1 ${own ? 'justify-end' : ''}`}>
                  {isSelectMode && (
                    <Checkbox
                      checked={selectedMessageIds.has(String(m.id))}
                      onCheckedChange={() => setSelectedMessageIds(prev => { const n = new Set(prev); const id = String(m.id); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                      className="mr-1"
                    />
                  )}
                  {!own && (
                    <>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{meta.name}</span>
                      <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {(meta.role || 'user').replace(/_/g,' ').replace(/\b\w/g, (c)=>c.toUpperCase())}
                      </span>
                    </>
                  )}
                  <span className="text-xs text-gray-500">{formatTime(m.timestamp)}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-gray-600 hover:bg-gray-200 p-1 rounded" title="More">
                        <MoreVertical size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={own ? 'start' : 'end'} className="w-40">
                      <DropdownMenuItem onClick={() => { 
                        if (m.fileUrl) {
                          setShareTarget({
                            fileUrl: m.fileUrl,
                            fileName: m.fileName,
                            fileSize: m.fileSize,
                            fileType: m.fileType,
                          });
                        } else {
                          setShareTarget({ message: m.message });
                        }
                        setShareOpen(true);
                      }}>
                        <span className="inline-flex items-center gap-2">
                          <Forward size={14} />
                          <span>Share</span>
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setIsSelectMode(true); setSelectedMessageIds(prev => new Set(prev).add(String(m.id))); }}>
                        <span className="inline-flex items-center gap-2">
                          <CheckSquare size={14} />
                          <span>Select</span>
                        </span>
                      </DropdownMenuItem>
                      {own && canEdit(m) && (
                        <DropdownMenuItem onClick={() => { setEditingId(String(m.id)); setEditingText(m.message); setEditingFileData(null); }}>
                          <span className="inline-flex items-center gap-2"><Pencil size={14} /><span>Edit</span></span>
                        </DropdownMenuItem>
                      )}
                      {own && (
                        <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, id: String(m.id), timestamp: m.timestamp })}>
                          <span className="inline-flex items-center gap-2"><Trash2 size={14} /><span>Delete</span></span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className={`inline-block text-sm break-all ${own ? 'bg-gray-300 text-black rounded-l-xl rounded-tr-xl rounded-br-sm px-3 py-2' : 'bg-gray-100 text-gray-900 rounded-r-xl rounded-tl-xl rounded-bl-sm px-3 py-2'}`}>
                {editingId === String(m.id) ? (
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
                        const ok = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/messages/${m.id}/edit`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(authAPI.getToken() ? { 'Authorization': `Bearer ${authAPI.getToken()}` } : {}) },
                          credentials: 'include',
                          body: JSON.stringify(payload),
                        }).then(r=>r.ok);
                        if (ok) {
                          setMessages(prev => prev.map(mm => mm.id === m.id ? { ...mm, message: editingText + ' (edited)', fileUrl: editingFileData?.fileUrl || mm.fileUrl, fileName: editingFileData?.fileName || mm.fileName, fileSize: (editingFileData?.fileSize ?? mm.fileSize), fileType: editingFileData?.fileType || mm.fileType, messageType: editingFileData?.messageType || mm.messageType } : mm));
                          setEditingId(null); setEditingText(''); setEditingFileData(null);
                          if (isConnected) send({ type: 'chat_message', sender: String(currentUser.id) });
                        } else {
                          toast({ title: 'Edit failed', description: 'Unable to edit message', variant: 'destructive' as any });
                        }
                      }}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditingText(''); setEditingFileData(null); }}>Cancel</Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="file" className="hidden" id={`edit-file-${m.id}`} onChange={(e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const reader = new FileReader(); reader.onload = () => {
                          const fileUrl = String(reader.result);
                          const messageType = f.type.startsWith('image/') ? 'image' : 'file';
                          setEditingFileData({ fileUrl, fileName: f.name, fileSize: f.size, fileType: f.type, messageType });
                        }; reader.readAsDataURL(f);
                      }} />
                      <Button size="sm" variant="secondary" onClick={() => document.getElementById(`edit-file-${m.id}`)?.click() as any}>Change attachment</Button>
                      {editingFileData && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 truncate max-w-[160px]">
                          {editingFileData.messageType === 'image' ? <ImageIcon size={12} /> : <FileText size={12} />}
                          {editingFileData.fileName}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  m.message && <div className="text-sm whitespace-pre-line">{m.message}</div>
                )}
                {m.fileUrl && (
                  <div className="mt-2">
                    {m.messageType === 'image' ? (
                      <div className="relative group inline-block">
                        <img
                          src={m.fileUrl}
                          alt={m.fileName || 'image'}
                          className="max-w-xs max-h-48 rounded cursor-pointer"
                          onClick={() => openPreview(m.fileUrl, m.fileName, m.fileType, m.fileSize)}
                        />
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); openPreview(m.fileUrl, m.fileName, m.fileType, m.fileSize); }}
                            className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full"
                            title="View"
                          >
                            <EyeIcon size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadViaBlob(m.fileUrl, m.fileName); }}
                            className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full"
                            title="Download"
                          >
                            <DownloadIcon size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                        <div className={`flex items-center space-x-2 p-2 rounded border ${own ? 'bg-gray-200 border-gray-300' : 'bg-white border-gray-200'}`}>
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate text-gray-700`}>{m.fileName || 'Attachment'}</p>
                        </div>
                          <button className="text-gray-600 hover:bg-gray-300 p-1 rounded" onClick={() => openPreview(m.fileUrl, m.fileName, m.fileType, m.fileSize)} title="View"><EyeIcon size={14} /></button>
                          <button className="text-gray-600 hover:bg-gray-300 p-1 rounded" onClick={() => downloadViaBlob(m.fileUrl, m.fileName)} title="Download"><DownloadIcon size={14} /></button>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-gray-200">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx" />
        <div className="flex space-x-2">
          <div className="flex-1 flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-blue-500 focus-within:border-blue-500">
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your message..." className="flex-1 outline-none text-sm" disabled={uploadingFile} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} className="text-gray-500 hover:text-gray-700 disabled:opacity-50"><PaperclipIcon size={16} /></button>
          </div>
          <button type="submit" disabled={!newMessage.trim() || uploadingFile} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50">
            {uploadingFile ? 'Uploading...' : <SendIcon size={16} />}
          </button>
        </div>
      </form>

      <ChatFilePreviewModal isOpen={preview.open} onClose={closePreview} fileUrl={preview.url} fileName={preview.name} fileType={preview.type} fileSize={preview.size} />

  {deleteDialog.open && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-md shadow-lg p-4 w-[320px]">
        <div className="text-sm font-medium mb-2">Delete message</div>
        <div className="text-xs text-gray-600 mb-4">Choose how you want to delete this message.</div>
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={() => performDelete('me')}>Delete for me</Button>
          {(() => {
            const msg = messages.find(mm => String(mm.id) === String(deleteDialog.id));
            return (msg && canDeleteEveryone(msg)) ? (
              <Button variant="destructive" onClick={() => performDelete('everyone')}>Delete for everyone</Button>
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
            const res = await fetch(msg.fileUrl, { credentials: 'include' });
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
                const origin = getBackendOrigin() || 'http://localhost:8000';
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
                const origin = getBackendOrigin() || 'http://localhost:8000';
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

      {/* In-chat right panel (non-portal) */}
      {infoOpen && (
        <>
          <div className="absolute inset-0 bg-black/10" onClick={() => setInfoOpen(false)}></div>
          <div className="absolute right-0 top-0 h-full w-[360px] sm:w-[420px] bg-white border-l shadow-lg p-0 overflow-y-auto">
            <div className="p-5 border-b bg-gradient-to-r from-blue-50 via-white to-purple-50 relative">
              <button
                aria-label="Close group info"
                title="Close"
                className="absolute right-3 top-3 inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                onClick={() => setInfoOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex flex-col items-center">
                <div className="relative">
                  {groupImage ? (
                    <img src={resolveMediaUrl(groupImage)} className="w-20 h-20 rounded-full object-cover ring-2 ring-white shadow" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold ring-2 ring-white shadow">{groupName?.charAt(0)?.toUpperCase() || 'G'}</div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow">
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                </div>
                <div className="font-semibold text-gray-900 mt-3 text-center truncate w-full px-4">{groupName}</div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-[11px]">{groupMembers.length} {groupMembers.length === 1 ? 'member' : 'members'}</Badge>
                </div>
                <div className="mt-3">
                  <Button size="sm" onClick={() => setAddModalOpen(true)} className="shadow-sm">Add members</Button>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Members</div>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search members"
                    className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-gray-400"
                  />
                </div>
              </div>
              <div className="space-y-2">
                {groupMembers
                  .filter(m => {
                    const nm = (userMeta[String(m.id)]?.name || m.name || '').toLowerCase();
                    const q = memberSearch.toLowerCase().trim();
                    return !q || nm.includes(q);
                  })
                  .map(m => {
                  const meta = userMeta[String(m.id)];
                  const canRemove = String(m.id) !== String(currentUser.id) && (
                    ['admin','project_manager','assistant_project_manager'].includes(currentUser.role) ||
                    (currentUser.role === 'client' && (meta?.role === 'client_team_member'))
                  );
                  return (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                      <div className="flex items-center gap-3 min-w-0">
                        {meta?.avatar ? (
                          <img src={meta.avatar} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-semibold">
                            {(meta?.name || m.name).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{meta?.name || m.name}</div>
                          {meta?.role && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 mt-0.5 rounded-full text-[10px] border align-middle ${getRoleBadgeClasses(meta.role)}`}>
                              {meta.role.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                      {canRemove && (
                        <button
                          aria-label="Remove member"
                          className="p-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => setConfirmRemove({ open: true, userId: String(m.id), userName: userMeta[String(m.id)]?.name || m.name })}
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {!groupMembers.length && (
                  <div className="text-xs text-gray-500">No members</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Members Popup Modal (in-chat, not full page) */}
      {addModalOpen && (
        <>
          <div className="absolute inset-0 bg-black/20" onClick={() => setAddModalOpen(false)}></div>
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-lg border shadow-lg p-4">
              <div className="text-lg font-semibold mb-1">Add members</div>
              {loadingMembers ? (
                <div className="text-xs text-gray-400">Loading...</div>
              ) : (
                <div className="space-y-2 border rounded p-3">
                  {memberOptions.length ? memberOptions.map(opt => (
                    <label key={opt.id} className="flex items-center space-x-2 text-sm">
                      <Checkbox
                        checked={selectedToAdd.includes(opt.id)}
                        onCheckedChange={(checked) => setSelectedToAdd(prev => checked ? [...prev, opt.id] : prev.filter(id => id !== opt.id))}
                      />
                      <span className="truncate">{opt.name} <span className="text-gray-400">({opt.role})</span></span>
                    </label>
                  )) : (
                    <div className="text-xs text-gray-400">No users to add</div>
                  )}
                </div>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setAddModalOpen(false)}>Cancel</Button>
                <Button
                  size="sm"
                  disabled={!selectedToAdd.length}
                  onClick={async () => {
                    try {
                      const token = authAPI.getToken();
                      await Promise.all(selectedToAdd.map(uid => (
                        fetch(`${API_BASE_URL}/chat/groups/${groupId}/add_member/`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                          },
                          credentials: 'include',
                          body: JSON.stringify({ user_id: Number(uid) }),
                        })
                      )));
                      const addSet = new Set(selectedToAdd);
                      const toAddOpts = memberOptions.filter(o => addSet.has(o.id));
                      const toAdd = toAddOpts.map(o => ({ id: o.id, name: o.name }));
                      setGroupMembers(prev => [...prev, ...toAdd]);
                      // update meta so avatar/name/role appear without refresh
                      setUserMeta(prev => {
                        const next = { ...prev } as Record<string, { name: string; role: string; avatar?: string }>;
                        for (const o of toAddOpts) {
                          next[o.id] = { name: o.name, role: o.role || 'user', avatar: o.avatar };
                        }
                        return next;
                      });
                      setMemberOptions(prev => prev.filter(o => !addSet.has(o.id)));
                      setSelectedToAdd([]);
                      setAddModalOpen(false);
                      // Notify others via websocket
                      if (isConnected) {
                        send({ type: 'group_members_changed', sender: String(currentUser.id) });
                      }
                    } catch (_) {}
                  }}
                >Add Selected</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirm Remove Modal */}
      {confirmRemove.open && (
        <>
          <div className="absolute inset-0 bg-black/30" onClick={() => setConfirmRemove({ open: false })}></div>
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-lg border shadow-lg p-5">
              <div className="text-lg font-semibold mb-1">Remove member</div>
              <div className="text-sm text-gray-600 mb-4">Are you sure you want to remove {confirmRemove.userName || 'this member'} from the group?</div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmRemove({ open: false })}>Cancel</Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    try {
                      const token = authAPI.getToken();
                      const res = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/remove_member/`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Accept': 'application/json',
                          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        credentials: 'include',
                        body: JSON.stringify({ user_id: Number(confirmRemove.userId) }),
                      });
                      if (!res.ok) {
                        alert('Failed to remove member');
                        return;
                      }
                      setGroupMembers(prev => prev.filter(x => String(x.id) !== String(confirmRemove.userId)));
                      const meta = userMeta[String(confirmRemove.userId || '')];
                      if (confirmRemove.userId) {
                        setMemberOptions(prev => {
                          const exists = prev.some(o => String(o.id) === String(confirmRemove.userId));
                          if (exists) return prev;
                          return [...prev, { id: String(confirmRemove.userId), name: meta?.name || confirmRemove.userName || 'User', role: meta?.role || 'user' }];
                        });
                      }
                      // Notify others via websocket
                      if (isConnected) {
                        send({ type: 'group_members_changed', sender: String(currentUser.id) });
                      }
                    } catch (_) {}
                    finally {
                      setConfirmRemove({ open: false });
                    }
                  }}
                >Remove</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


