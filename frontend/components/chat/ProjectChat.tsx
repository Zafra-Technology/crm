'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { SendIcon, UserIcon, PaperclipIcon, ImageIcon, FileIcon, DownloadIcon, EyeIcon, Users, Building2, MessageSquare, ChevronRight, Wrench } from 'lucide-react';
import { MoreVertical } from 'lucide-react';
import { Forward } from 'lucide-react';
import { CheckSquare } from 'lucide-react';
import { Pencil, Trash2 } from 'lucide-react';
import { ChatMessage, User } from '@/types';
import { resolveMediaUrl, getBackendOrigin } from '@/lib/api/auth';
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
import { formatChatDate, isDifferentDay } from '@/lib/utils/dateUtils';
import { LinkifiedText } from '@/lib/utils/linkUtils';
import MentionInput from '@/components/chat/MentionInput';
import { projectsApi } from '@/lib/api/projects';
import { projectChatApi } from '@/lib/api/project-chat';

interface ProjectChatProps {
  projectId: string;
  currentUser: User;
  messages: ChatMessage[];
  isAssignedMember?: boolean; // Optional prop to indicate if user is an assigned member
  isModal?: boolean; // Optional prop to indicate if component is used in a modal (removes card styling)
  onCountsChange?: (counts: { client: number; team: number; professional_engineer: number }) => void;
  unreadCounts?: { client: number; team: number; professional_engineer: number }; // Optional prop to receive unread counts
  initialChatType?: 'client' | 'team' | 'professional_engineer' | null; // Optional prop to set initial chat type
}

type ChatType = 'client' | 'team' | 'professional_engineer' | null;

// Utility function to truncate filename to 10 characters + extension
const truncateFileName = (filename: string) => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // No extension, just truncate to 10 chars
    return filename.length > 10 ? filename.substring(0, 10) + '...' : filename;
  }
  const name = filename.substring(0, lastDotIndex);
  const extension = filename.substring(lastDotIndex);
  return name.length > 10 ? name.substring(0, 10) + '...' + extension : filename;
};

export default function ProjectChat({ projectId, currentUser, messages, isAssignedMember = false, isModal = false, onCountsChange, unreadCounts, initialChatType }: ProjectChatProps) {
  const [selectedChatType, setSelectedChatType] = useState<ChatType>(null);
  const [userHasSelected, setUserHasSelected] = useState(false); // Track if user explicitly selected
  const lastExplicitSelectionRef = useRef<ChatType>(null);
  const [isLoading, setIsLoading] = useState(false);
  const endpointCacheRef = useRef<{ [key: string]: 'new' | 'fallback' }>({}); // Cache which endpoint format works
  
  // IMPORTANT: selectedChatType should ALWAYS start as null and only be set when user clicks
  
  const [newMessage, setNewMessage] = useState('');
  // Initialize with empty messages - they will be loaded based on selectedChatType
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
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
  const [mentionOptions, setMentionOptions] = useState<Array<{ id: string; name: string; role?: string; avatar?: string }>>([]);
  const [project, setProject] = useState<any>(null);
  const [chatCounts, setChatCounts] = useState<{ client: number; team: number; professional_engineer: number }>({
    client: 0,
    team: 0,
    professional_engineer: 0
  });
  const [hasProfessionalEngineerAssigned, setHasProfessionalEngineerAssigned] = useState(false);
  
  // Check if current user is a professional engineer assigned to this project
  const isProfessionalEngineer = currentUser?.role === 'professional_engineer';
  const isProfessionalEngineerAssigned = isProfessionalEngineer && isAssignedMember;
  
  // Determine which chats to show based on user role
  // For professional engineers assigned to project: only show professional engineer chat
  // For others: show based on role
  const canSeeClientChat = !isProfessionalEngineerAssigned && [
    'admin',
    'project_manager',
    'assistant_project_manager',
    'client',
    'client_team_member'
  ].includes(currentUser?.role || '');

  // Team chat visible to: admin, project_manager, assistant_project_manager, team_head, team_lead, and assigned members (but not professional engineers)
  const canSeeTeamChat = !isProfessionalEngineerAssigned && (
    [
      'admin',
      'project_manager',
      'assistant_project_manager',
      'team_head',
      'team_lead'
    ].includes(currentUser?.role || '') || isAssignedMember
  );
  
  // Professional engineer chat visible to: admin, PM, APM (only if PE is assigned), and professional engineers assigned to project
  const canSeeProfessionalEngineerChat = isProfessionalEngineerAssigned || (
    [
      'admin',
      'project_manager',
      'assistant_project_manager'
    ].includes(currentUser?.role || '') && hasProfessionalEngineerAssigned
  );
  
  // Debug logging for team chat visibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔍 Team Chat Visibility Check:', {
        userRole: currentUser?.role,
        isAssignedMember,
        canSeeTeamChat,
        projectId,
        userId: currentUser?.id
      });
    }
  }, [currentUser?.role, isAssignedMember, canSeeTeamChat, projectId, currentUser?.id]);

  // Determine WebSocket room name based on selected chat type
  const getWebSocketRoom = () => {
    if (!selectedChatType) return undefined;
    return `project-${projectId}-${selectedChatType}-chat`;
  };

  // Get API endpoint based on selected chat type
  // Optimized: Use cached endpoint format to avoid double fetch attempts
  const getChatApiUrl = useCallback((endpoint: 'messages' | 'edit' | 'delete' = 'messages', messageId?: string, useCache: boolean = true) => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const basePath = `${API_BASE_URL}/chat/project/${projectId}`;
    
    if (!selectedChatType) {
      return `${basePath}/messages`;
    }
    
    const cacheKey = `${projectId}-${selectedChatType}`;
    const cachedFormat = endpointCacheRef.current[cacheKey];
    
    // For messages endpoint, use cached format if available, otherwise try fallback first (most likely to work)
    if (endpoint === 'messages') {
      if (useCache && cachedFormat === 'new') {
        return `${basePath}/${selectedChatType}-chat/messages`;
      }
      // Default to query parameter approach (most compatible)
      return `${basePath}/messages?chat_type=${selectedChatType}`;
    } else if (endpoint === 'edit' && messageId) {
      if (useCache && cachedFormat === 'new') {
        return `${basePath}/${selectedChatType}-chat/messages/${messageId}/edit`;
      }
      return `${basePath}/messages/${messageId}/edit?chat_type=${selectedChatType}`;
    } else if (endpoint === 'delete' && messageId) {
      if (useCache && cachedFormat === 'new') {
        return `${basePath}/${selectedChatType}-chat/messages/${messageId}/delete`;
      }
      return `${basePath}/messages/${messageId}/delete?chat_type=${selectedChatType}`;
    }
    
    return `${basePath}/messages`;
  }, [projectId, selectedChatType]);

  const wsRoom = getWebSocketRoom();
  
  // Log WebSocket connection status
  useEffect(() => {
    if (wsRoom) {
      console.log('🔌 WebSocket Room:', wsRoom, 'Chat Type:', selectedChatType);
    }
  }, [wsRoom, selectedChatType]);

  const { isConnected, send } = useChatWebSocket(
    wsRoom,
    async (payload) => {
      if (payload?.type === 'chat_message' || payload?.type === 'connection_established') {
        // If this WS event came from the same user who just sent the message, skip refetch to avoid flicker
        if (payload?.sender && String(payload.sender) === String(currentUser?.id)) {
          return;
        }
        if (!selectedChatType) return;
        try {
          const token = authAPI.getToken();
          const cacheKey = `${projectId}-${selectedChatType}`;
          let url = getChatApiUrl('messages', undefined, true);
          
          let res = await fetch(url, {
            headers: {
              'Accept': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            credentials: 'include',
          });
          
          // If 404, try new endpoint format and cache it
          if (!res.ok && res.status === 404 && !endpointCacheRef.current[cacheKey]) {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
            const newUrl = `${API_BASE_URL}/chat/project/${projectId}/${selectedChatType}-chat/messages`;
            res = await fetch(newUrl, {
              headers: {
                'Accept': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              },
              credentials: 'include',
            });
            if (res.ok) {
              endpointCacheRef.current[cacheKey] = 'new';
            }
          } else if (res.ok && !endpointCacheRef.current[cacheKey]) {
            endpointCacheRef.current[cacheKey] = 'fallback';
          }
          
          if (res.ok) {
            const latest = await res.json();
            // Optimize: Filter and map in single pass
            const mapped = (latest || []).reduce((acc: ChatMessage[], m: any) => {
              if (m.chat_type && m.chat_type !== selectedChatType) return acc;
              if (!m.chat_type && selectedChatType) return acc;
              
              acc.push({
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
                fileUrl: m.file_url ? resolveMediaUrl(m.file_url) : undefined,
              });
              return acc;
            }, []);
            setChatMessages(mapped);
            scrollToBottom();
            
            // Refresh unread counts when new messages arrive via WebSocket
            projectChatApi.getUnreadCounts(projectId).then(counts => {
              setChatCounts(counts);
              if (onCountsChange) {
                onCountsChange(counts);
              }
            }).catch(err => console.error('Error refreshing counts:', err));
          }
        } catch (error) {
          console.error('Error in WebSocket message handler:', error);
        }
      }
    }
  );
  
  // Log WebSocket connection status
  useEffect(() => {
    console.log('🔌 WebSocket Status:', { isConnected, room: wsRoom, chatType: selectedChatType });
  }, [isConnected, wsRoom, selectedChatType]);

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

  // Load project data on mount
  useEffect(() => {
    const loadProject = async () => {
      try {
        const projectData = await projectsApi.getById(projectId);
        setProject(projectData);
        
        // Check if project has any professional engineers assigned
        if (projectData) {
          try {
            const allUsers = await authAPI.getUsers();
            const assignedIds: string[] = Array.isArray((projectData as any).designerIds) && (projectData as any).designerIds.length
              ? (projectData as any).designerIds.map((d: any) => String(d))
              : (Array.isArray((projectData as any).designers)
                ? (projectData as any).designers.map((d: any) => (typeof d === 'object' && d !== null ? String(d.id) : String(d)))
                : []);
            
            // Check if any assigned designer is a professional engineer
            const hasPE = assignedIds.some((id) => {
              const user = allUsers.find((u: any) => String(u.id) === String(id));
              return user && user.role === 'professional_engineer';
            });
            
            setHasProfessionalEngineerAssigned(hasPE);
          } catch (error) {
            console.error('Error checking for professional engineers:', error);
            setHasProfessionalEngineerAssigned(false);
          }
        }
      } catch (error) {
        console.error('Error loading project:', error);
      }
    };
    loadProject();
  }, [projectId]);

  // Load or update unread counts
  useEffect(() => {
    if (unreadCounts) {
      setChatCounts(unreadCounts);
    } else {
      // If counts not provided, fetch them
      const loadCounts = async () => {
        try {
          const counts = await projectChatApi.getUnreadCounts(projectId);
          setChatCounts(counts);
        } catch (error) {
          console.error('Error loading unread counts:', error);
        }
      };
      loadCounts();
      // Poll every 5 seconds
      const interval = setInterval(loadCounts, 5000);
      return () => clearInterval(interval);
    }
  }, [projectId, unreadCounts]);

  // Load chat preference from backend on mount (DO NOT auto-open - user must click explicitly)
  // Preference is only used for remembering last choice, not for auto-opening
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const token = authAPI.getToken();
        const response = await fetch(`${API_BASE_URL}/chat/project/${projectId}/preference`, {
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.chat_type === 'client' || data.chat_type === 'team' || data.chat_type === 'professional_engineer') {
            console.log('📦 Loaded chat preference from backend (preference exists but will not auto-open):', data.chat_type);
            // DO NOT set selectedChatType here - user must explicitly click
            // Preference is stored but conversation won't open automatically
          }
        }
        // Preference loaded - but we DO NOT auto-open conversation
      } catch (error) {
        console.error('Error loading chat preference:', error);
      }
    };
    
    loadPreference();
  }, [projectId]);

  // Load mention options for the active chat type
  useEffect(() => {
    const loadMembers = async () => {
      try {
        if (!selectedChatType) { setMentionOptions([]); return; }
        // Use project from state, or load if not available
        let projectData = project;
        if (!projectData) {
          projectData = await projectsApi.getById(projectId);
          if (projectData) setProject(projectData);
        }
        if (!projectData) { setMentionOptions([]); return; }

        const allUsers = await authAPI.getUsers();
        const idToUser = new Map(allUsers.map((u: any) => [String(u.id), u]));

        const options: Array<{ id: string; name: string; role?: string; avatar?: string }> = [];
        const pushUnique = (u: any) => {
          if (!u) return;
          const id = String(u.id);
          if (!id || id === String(currentUser?.id || '')) return; // skip self
          if (options.some(o => String(o.id) === id)) return;
          options.push({ id, name: u.full_name, role: u.role_display || u.role, avatar: resolveMediaUrl(u.profile_pic) });
        };

        if (selectedChatType === 'client') {
          // Client + client team members + admin/PM/APM
          const clientId = String(projectData.clientId || '');
          if (clientId && idToUser.get(clientId)) pushUnique(idToUser.get(clientId));
          try {
            const team = await authAPI.getTeamMembersByClient(projectData.clientId || '');
            team.filter((u:any)=>u.is_active).forEach((u: any) => pushUnique({ ...u, role: 'client_team_member', role_display: 'Client Team' }));
          } catch (_) {}
          const extraRoles = new Set(['admin','project_manager','assistant_project_manager']);
          (allUsers || []).filter((u:any)=>u.is_active && extraRoles.has(u.role)).forEach(pushUnique);
        } else if (selectedChatType === 'team') {
          // Manager + assigned designers + admin/APM/team_head/team_lead (excluding professional engineers)
          const managerId = String(projectData.managerId || '');
          if (managerId && idToUser.get(managerId)) pushUnique(idToUser.get(managerId));
          // Add assigned designers (fallback to project.designers array if designerIds is missing)
          const assignedIds: string[] = Array.isArray((projectData as any).designerIds) && (projectData as any).designerIds.length
            ? (projectData as any).designerIds.map((d: any) => String(d))
            : (Array.isArray((projectData as any).designers)
              ? (projectData as any).designers.map((d: any) => (typeof d === 'object' && d !== null ? String(d.id) : String(d)))
              : []);
          // Filter out professional engineers from assigned designers
          assignedIds.forEach((id) => {
            const user = idToUser.get(String(id));
            if (user && user.role !== 'professional_engineer') {
              pushUnique(user);
            }
          });
          const extraRoles = new Set(['admin','assistant_project_manager','team_head','team_lead','project_manager']);
          (allUsers || []).filter((u:any)=>u.is_active && extraRoles.has(u.role)).forEach(pushUnique);
        } else if (selectedChatType === 'professional_engineer') {
          // Admin, PM, APM + professional engineers assigned to project
          const extraRoles = new Set(['admin','project_manager','assistant_project_manager']);
          (allUsers || []).filter((u:any)=>u.is_active && extraRoles.has(u.role)).forEach(pushUnique);
          
          // Add professional engineers assigned to this project
          const assignedIds: string[] = Array.isArray((projectData as any).designerIds) && (projectData as any).designerIds.length
            ? (projectData as any).designerIds.map((d: any) => String(d))
            : (Array.isArray((projectData as any).designers)
              ? (projectData as any).designers.map((d: any) => (typeof d === 'object' && d !== null ? String(d.id) : String(d)))
              : []);
          assignedIds.forEach((id) => {
            const user = idToUser.get(String(id));
            if (user && user.role === 'professional_engineer') {
              pushUnique(user);
            }
          });
        }

        // De-duplicate by id
        const me = String(currentUser?.id || '');
        const unique = Array.from(new Map(options.map(o => [o.id, o])).values()).filter(o => String(o.id) !== me);
        setMentionOptions(unique);
      } catch {
        setMentionOptions([]);
      }
    };
    loadMembers();
  }, [selectedChatType, projectId, project]);

  // Handle initial chat type from parent component - auto-select immediately
  useEffect(() => {
    if (initialChatType) {
      setSelectedChatType(initialChatType);
      setUserHasSelected(true);
      lastExplicitSelectionRef.current = initialChatType;
    }
  }, [initialChatType]);

  // Restore last explicit selection from sessionStorage (sticky selection to prevent auto-switch)
  useEffect(() => {
    if (initialChatType) return; // Skip session storage if initial chat type is provided
    try {
      const key = `projectChat:lastSelection:${projectId}`;
      const saved = sessionStorage.getItem(key) as ChatType | null;
      if ((saved === 'client' || saved === 'team' || saved === 'professional_engineer') && !userHasSelected && !selectedChatType) {
        setSelectedChatType(saved);
        setUserHasSelected(true);
        lastExplicitSelectionRef.current = saved;
      }
    } catch (_) {}
  }, [projectId, initialChatType]);

  // Persist explicit selection to sessionStorage
  useEffect(() => {
    try {
      const key = `projectChat:lastSelection:${projectId}`;
      if (userHasSelected && (selectedChatType === 'client' || selectedChatType === 'team' || selectedChatType === 'professional_engineer')) {
        sessionStorage.setItem(key, selectedChatType);
        lastExplicitSelectionRef.current = selectedChatType;
      }
    } catch (_) {}
  }, [projectId, selectedChatType, userHasSelected]);

  // Guard: if some render path accidentally flips the selection, snap back to the last explicit selection
  useEffect(() => {
    if (!userHasSelected) return;
    const explicit = lastExplicitSelectionRef.current;
    if ((explicit === 'client' || explicit === 'team' || explicit === 'professional_engineer') && selectedChatType && selectedChatType !== explicit) {
      setSelectedChatType(explicit);
    }
  }, [selectedChatType, userHasSelected]);
  
  // Save chat preference to backend when user explicitly selects a chat type
  useEffect(() => {
    if (!selectedChatType || !userHasSelected) return;
    
    const savePreference = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const token = authAPI.getToken();
        const response = await fetch(`${API_BASE_URL}/chat/project/${projectId}/preference`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ chat_type: selectedChatType }),
        });
        
        if (response.ok) {
          console.log('💾 Saved chat preference to backend:', selectedChatType);
          // Note: We're NOT setting sessionStorage anymore - conversations should only open on explicit click
        } else {
          console.warn('Failed to save chat preference:', response.status);
        }
      } catch (error) {
        console.error('Error saving chat preference:', error);
      }
    };
    
    // Debounce saves to avoid too many API calls
    const timer = setTimeout(savePreference, 500);
    return () => clearTimeout(timer);
  }, [selectedChatType, projectId, userHasSelected]);

  // Load messages when component mounts, projectId changes, or selectedChatType changes
  // IMPORTANT: Only load if userHasSelected is true - prevents auto-loading
  useEffect(() => {
    if (!selectedChatType) {
      setChatMessages([]);
      return;
    }
    
    // Safety check: Don't load messages unless user explicitly selected a chat type
    if (!userHasSelected) {
      console.log('⚠️ Prevented auto-loading messages - user has not explicitly selected chat type');
      setChatMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const token = authAPI.getToken();
        const cacheKey = `${projectId}-${selectedChatType}`;
        let url = getChatApiUrl('messages', undefined, true);
        let response: Response;
        
        // Fetch using cached or default endpoint
        response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });
        
        // If 404, try new endpoint format and cache it
        if (!response.ok && response.status === 404 && !endpointCacheRef.current[cacheKey]) {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
          const newUrl = `${API_BASE_URL}/chat/project/${projectId}/${selectedChatType}-chat/messages`;
          response = await fetch(newUrl, {
            headers: {
              'Accept': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            credentials: 'include',
          });
          
          // Cache successful endpoint format
          if (response.ok) {
            endpointCacheRef.current[cacheKey] = 'new';
          }
        } else if (response.ok && !endpointCacheRef.current[cacheKey]) {
          // Cache that query parameter format works
          endpointCacheRef.current[cacheKey] = 'fallback';
        }
        
        if (response.ok) {
          const projectMessages = await response.json();
          
          // Optimize: Filter and map in single pass, and batch URL resolution
          const mapped = (projectMessages || []).reduce((acc: ChatMessage[], m: any) => {
            // Filter by chat_type efficiently
            if (m.chat_type && m.chat_type !== selectedChatType) {
              return acc;
            }
            if (!m.chat_type && selectedChatType) {
              return acc;
            }
            
            // Map message with optimized URL resolution
            acc.push({
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
              fileUrl: m.file_url ? resolveMediaUrl(m.file_url) : undefined,
            });
            return acc;
          }, []);
          
          setChatMessages(mapped);
          
          // Mark this chat type as read when messages are loaded
          if (selectedChatType) {
            await projectChatApi.markAsRead(projectId, selectedChatType);
            // Refresh unread counts after marking as read
            const counts = await projectChatApi.getUnreadCounts(projectId);
            setChatCounts(counts);
            if (onCountsChange) {
              onCountsChange(counts);
            }
          }
        } else {
          setChatMessages([]);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        setChatMessages([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [projectId, selectedChatType, getChatApiUrl, onCountsChange]);

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
    if (!selectedChatType) return;

    const messageData = {
      message: content,
      message_type: messageType,
      file_name: fileData?.fileName || null,
      file_size: fileData?.fileSize || null,
      file_type: fileData?.fileType || null,
      file_url: fileData?.fileUrl || null,
      chat_type: selectedChatType, // Include chat type in request body
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
      let apiUrl = getChatApiUrl('messages');
      console.log('Calling API:', apiUrl);
      const token = authAPI.getToken();
      
      // Save message to database
      let response = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(messageData),
      });

      // If 404, try fallback with original endpoint and chat_type in body
      if (!response.ok && response.status === 404) {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        apiUrl = `${API_BASE_URL}/chat/project/${projectId}/messages`;
        console.log('Trying fallback API:', apiUrl);
        response = await fetch(apiUrl, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(messageData),
        });
      }

      console.log('API Response:', response.status, response.ok);

      if (response.ok) {
            const savedMessage = await response.json();
        console.log('Message saved:', savedMessage);
        
        // Verify the saved message has the correct chat_type (safety check)
        if (savedMessage.chat_type && savedMessage.chat_type !== selectedChatType) {
          console.warn('⚠️ Saved message chat_type mismatch. Expected:', selectedChatType, 'Got:', savedMessage.chat_type);
          // Remove temp message as it's for wrong chat type
          setChatMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
          if (messageType === 'text') setNewMessage(content); // Restore text message
          toast({ title: 'Error', description: 'Message saved to wrong chat type', variant: 'destructive' as any });
          return;
        }
        
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
        
        // Replace temp message with real one (only if chat_type matches)
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id ? frontendMessage : msg
          )
        );
        
        // Notify via backend WebSocket (others will refresh on receive)
        if (isConnected) {
          send({ type: 'chat_message', message: savedMessage.message, sender: String(savedMessage.user_id) });
        }
        
        // Refresh unread counts after sending message
        projectChatApi.getUnreadCounts(projectId).then(counts => {
          setChatCounts(counts);
          if (onCountsChange) {
            onCountsChange(counts);
          }
        }).catch(err => console.error('Error refreshing counts:', err));
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

          const truncatedName = truncateFileName(file.name);
          const messageText = messageType === 'image' 
            ? `📷 ${truncatedName}`
            : `📎 ${truncatedName}`;

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
  // Project update notification flow removed from frontend
  
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
    if (!selectedChatType) return;
    
    try {
      const token = authAPI.getToken();
      const body: any = { message: editingText };
      if ((editingFileData as any)?.fileUrl) {
        body.file_url = (editingFileData as any).fileUrl;
        body.file_name = (editingFileData as any).fileName;
        body.file_size = (editingFileData as any).fileSize;
        body.file_type = (editingFileData as any).fileType;
        body.message_type = (editingFileData as any).messageType;
      }
      
      let url = getChatApiUrl('edit', msg.id);
      
      // Try new endpoint first, if 404 then try with query parameter
      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      
      // If 404, try fallback with query parameter
      if (!res.ok && res.status === 404) {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        url = `${API_BASE_URL}/chat/project/${projectId}/messages/${msg.id}/edit?chat_type=${selectedChatType}`;
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          credentials: 'include',
          body: JSON.stringify(body),
        });
      }
      
      if (res.ok) {
        setChatMessages(prev => prev.map(m => m.id === msg.id ? { ...m, message: editingText, edited: true, fileUrl: (editingFileData as any)?.fileUrl || m.fileUrl, fileName: (editingFileData as any)?.fileName || m.fileName, fileSize: (editingFileData as any)?.fileSize ?? m.fileSize, fileType: (editingFileData as any)?.fileType || m.fileType, messageType: (editingFileData as any)?.messageType || m.messageType } : m));
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
    if (!deleteDialog.id || !selectedChatType) return;
    try {
      const token = authAPI.getToken();
      let url = getChatApiUrl('delete', deleteDialog.id);
      
      // Try new endpoint first, if 404 then try with query parameter
      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify({ scope }),
      });
      
      // If 404, try fallback with query parameter
      if (!res.ok && res.status === 404) {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        url = `${API_BASE_URL}/chat/project/${projectId}/messages/${deleteDialog.id}/delete?chat_type=${selectedChatType}`;
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          credentials: 'include',
          body: JSON.stringify({ scope }),
        });
      }
      
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

  // Chat selection view
  if (!selectedChatType) {
    return (
      <div className={`${isModal ? 'h-full' : 'card'} h-full flex flex-col relative`}>
        {!isModal && (
          <div className="flex-shrink-0 px-4 md:px-6 pt-4 pb-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground mb-1">Project Chat</h3>
            <p className="text-sm text-muted-foreground">Select a chat to start conversation</p>
          </div>
        )}
        {isModal && (
          <div className="flex-shrink-0 px-4 md:px-6 pt-2 pb-4 border-b border-border">
            <p className="text-sm text-muted-foreground">Select a chat to start conversation</p>
          </div>
        )}
        
        {/* Chat Options List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
          {canSeeClientChat && (
            <button
              onClick={() => {
                console.log('👆 User clicked Client Chat - explicitly opening');
                setUserHasSelected(true);
                setSelectedChatType('client');
                lastExplicitSelectionRef.current = 'client';
                try { sessionStorage.setItem(`projectChat:lastSelection:${projectId}`, 'client'); } catch(_) {}
              }}
              className="w-full group relative text-left rounded-xl border border-border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 overflow-hidden"
            >
              <div className="p-5 flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-200">
                  <Building2 className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-200" />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                        Client Chat
                      </h4>
                      {chatCounts.client > 0 && (
                        <span className="bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                          {chatCounts.client > 99 ? '99+' : chatCounts.client}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug">
                      Communicate with clients and stakeholders
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all duration-200 group-hover:translate-x-0.5 flex-shrink-0" />
                </div>
              </div>
            </button>
          )}
          
          {canSeeTeamChat && (
            <button
              onClick={() => {
                console.log('👆 User clicked Team Chat - explicitly opening');
                setUserHasSelected(true);
                setSelectedChatType('team');
                lastExplicitSelectionRef.current = 'team';
                try { sessionStorage.setItem(`projectChat:lastSelection:${projectId}`, 'team'); } catch(_) {}
              }}
              className="w-full group relative text-left rounded-xl border border-border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 overflow-hidden"
            >
              <div className="p-5 flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-200">
                  <Users className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-200" />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                        Team Chat
                      </h4>
                      {chatCounts.team > 0 && (
                        <span className="bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                          {chatCounts.team > 99 ? '99+' : chatCounts.team}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug">
                      Internal team communication and collaboration
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all duration-200 group-hover:translate-x-0.5 flex-shrink-0" />
                </div>
              </div>
            </button>
          )}
          
          {canSeeProfessionalEngineerChat && (
            <button
              onClick={() => {
                console.log('👆 User clicked Professional Engineer Chat - explicitly opening');
                setUserHasSelected(true);
                setSelectedChatType('professional_engineer');
                lastExplicitSelectionRef.current = 'professional_engineer';
                try { sessionStorage.setItem(`projectChat:lastSelection:${projectId}`, 'professional_engineer'); } catch(_) {}
              }}
              className="w-full group relative text-left rounded-xl border border-border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 overflow-hidden"
            >
              <div className="p-5 flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-200">
                  <Wrench className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-200" />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                        Professional Engineer Chat
                      </h4>
                      {chatCounts.professional_engineer > 0 && (
                        <span className="bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                          {chatCounts.professional_engineer > 99 ? '99+' : chatCounts.professional_engineer}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug">
                      Collaborate with professional engineers and project managers
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all duration-200 group-hover:translate-x-0.5 flex-shrink-0" />
                </div>
              </div>
            </button>
          )}
          
          {!canSeeClientChat && !canSeeTeamChat && !canSeeProfessionalEngineerChat && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium mb-1">No chats available</p>
                <p className="text-sm text-muted-foreground">Chat options are not available for your role.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${isModal ? 'h-full' : 'card'} h-full flex flex-col relative ${dragOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
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
      
      {!isSelectMode && !isModal && (
        <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => {
              setSelectedChatType(null);
              lastExplicitSelectionRef.current = null;
              try { sessionStorage.removeItem(`projectChat:lastSelection:${projectId}`); } catch(_) {}
              // Don't clear userHasSelected - keep it so preference is still saved
            }}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            title="Back to chat selection"
          >
           
          </button>
          <h3 className="text-lg font-semibold text-black">
            Project Chat
          </h3>
          <span className="text-sm text-gray-500 ml-2">
            {selectedChatType === 'client' ? 'Client Chat' : selectedChatType === 'team' ? 'Team Chat' : 'Professional Engineer Chat'}
          </span>
        </div>
      )}
      {!isSelectMode && isModal && (
        <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => {
              setSelectedChatType(null);
              lastExplicitSelectionRef.current = null;
              try { sessionStorage.removeItem(`projectChat:lastSelection:${projectId}`); } catch(_) {}
              // Don't clear userHasSelected - keep it so preference is still saved
            }}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            title="Back to chat selection"
          >
            
          </button>
          <span className="text-sm text-gray-700 font-medium">
            {selectedChatType === 'client' ? 'Client Chat' : selectedChatType === 'team' ? 'Team Chat' : 'Professional Engineer Chat'}
          </span>
        </div>
      )}
      {isSelectMode && (
        <div className="mb-4 pb-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setSelectedChatType(null);
                lastExplicitSelectionRef.current = null;
                try { sessionStorage.removeItem(`projectChat:lastSelection:${projectId}`); } catch(_) {}
                // Don't clear userHasSelected - keep it so preference is still saved
              }}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              title="Back to chat selection"
            >
            
            </button>
            <div className="text-sm text-gray-700">
              {selectedMessageIds.size} selected
            </div>
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
        {isLoading ? (
          /* Loading state */
          <div className="flex-1 flex items-center justify-center h-full min-h-[300px]">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Loading messages...</p>
            </div>
          </div>
        ) : chatMessages.length === 0 ? (
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
                {selectedChatType === 'client' 
                  ? 'Send a message to begin collaborating with clients. Share updates, ask questions, or upload files to keep everyone in sync.'
                  : selectedChatType === 'team'
                  ? 'Send a message to begin collaborating with your team. Share updates, ask questions, or upload files to keep everyone in sync.'
                  : 'Send a message to begin collaborating with professional engineers and project managers. Share updates, ask questions, or upload files to keep everyone in sync.'
                }
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <PaperclipIcon size={14} />
                <span>You can also drag & drop files or click the attachment icon</span>
              </div>
            </div>
          </div>
        ) : (
          chatMessages.map((message, index) => {
          const roleTag = getRoleTag(message.userRole || 'user');
          const isOwnMessage = String(message.userId) === String(currentUser.id);
          
          // Check if we need to show a date separator
          const showDateSeparator = index === 0 || isDifferentDay(message.timestamp, chatMessages[index - 1].timestamp);
          
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
                    {formatTime(message.timestamp)}{((message as any).edited || /\(edited\)$/i.test(message.message || '')) ? ' • Edited' : ''}
                  </span>
                  {message.message?.toLowerCase() !== 'this message has been deleted' && (
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
                  )}
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
                        <MentionInput value={editingText} onChange={setEditingText} options={mentionOptions} placeholder="Edit message..." className="flex-1 border rounded" innerClassName="px-2 py-1" multiline liveHighlight={false} ceHighlight={true} />
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
                      <LinkifiedText text={(message.message || '').replace(/\s*\(edited\)$/i, '')} />
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
                              {truncateFileName(message.fileName || 'Unknown file')}
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
          <MentionInput
            value={newMessage}
            onChange={setNewMessage}
            options={mentionOptions}
            placeholder="Type your message..."
            disabled={uploadingFile}
            className="flex-1"
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
        currentUserId={currentUser?.id ? Number(currentUser.id) : undefined}
        showProjectChats={true}
        projectId={projectId}
        currentChatType={selectedChatType || undefined}
        userRole={currentUser?.role}
        isAssignedMember={isAssignedMember}
        hasProfessionalEngineerAssigned={hasProfessionalEngineerAssigned}
        onConfirm={async ({ groupIds, userIds, projectChatTypes }) => {
          try {
            setShareLoading(true);
            // Helper to send message to project chat
            const sendToProjectChat = async (sharedMsg: any, chatType: string) => {
              const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
              const token = authAPI.getToken();
              let payload: any;
              
              // Handle both file messages and text messages
              if (sharedMsg.fileUrl) {
                const dataUrl = await urlToDataUrl(sharedMsg.fileUrl);
                const isImg = isImageFile(sharedMsg.fileType);
                const messageType: 'file' | 'image' = isImg ? 'image' : 'file';
                const truncatedName = truncateFileName(sharedMsg.fileName || '');
                const messageText = messageType === 'image' 
                  ? `📷 ${truncatedName}` 
                  : `📎 ${truncatedName}`;
                payload = {
                  message: messageText,
                  message_type: messageType,
                  file_name: sharedMsg.fileName || null,
                  file_size: sharedMsg.fileSize || null,
                  file_type: sharedMsg.fileType || null,
                  file_url: dataUrl,
                  chat_type: chatType,
                };
              } else {
                // Text message sharing
                const messageText = sharedMsg.message || sharedMsg.text || '';
                payload = {
                  message: messageText,
                  message_type: 'text' as const,
                  file_name: null,
                  file_size: null,
                  file_type: null,
                  file_url: null,
                  chat_type: chatType,
                };
              }
              
              // Try new endpoint first, fallback to query parameter
              let apiUrl = `${API_BASE_URL}/chat/project/${projectId}/${chatType}-chat/messages`;
              let response = await fetch(apiUrl, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
              });
              
              if (!response.ok && response.status === 404) {
                // Fallback to query parameter
                apiUrl = `${API_BASE_URL}/chat/project/${projectId}/messages`;
                response = await fetch(apiUrl, {
                  method: 'POST',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify(payload),
                });
              }
              
              if (!response.ok) {
                throw new Error(`Failed to share to ${chatType} chat`);
              }
            };
            
            // Helper to send WebSocket notification for real-time updates
            const notifyRoom = (roomName: string) => {
              try {
                const origin = getBackendOrigin() || 'http://localhost:8000';
                const wsUrl = origin.replace('http://', 'ws://').replace('https://', 'wss://') + `/ws/chat/${encodeURIComponent(roomName)}/`;
                const ws = new WebSocket(wsUrl);
                ws.onopen = () => {
                  ws.send(JSON.stringify({ type: 'chat_message', sender: String(currentUser?.id) }));
                  ws.close();
                };
                ws.onerror = () => ws.close();
                setTimeout(() => ws.close(), 1000);
              } catch (_) {
                // Ignore WebSocket errors
              }
            };
            
            const sendOne = async (msg: any) => {
              if (msg.fileUrl) {
                const dataUrl = await urlToDataUrl(msg.fileUrl);
                const isImg = isImageFile(msg.fileType);
                const messageType: 'file' | 'image' = isImg ? 'image' : 'file';
                const truncatedName = truncateFileName(msg.fileName || '');
                const messageText = messageType === 'image' ? `📷 ${truncatedName}` : `📎 ${truncatedName}`;
                const payload = {
                  message: messageText,
                  message_type: messageType,
                  file_name: msg.fileName || null,
                  file_size: msg.fileSize || null,
                  file_type: msg.fileType || null,
                  file_url: dataUrl,
                };
                
                // Send messages via API
                await Promise.all((groupIds || []).map(gid => groupChatApi.sendMessage(gid, payload)));
                await Promise.all((userIds || []).map(uid => individualChatApi.sendMessage(uid, payload)));
                
                // Send WebSocket notifications for real-time updates
                (groupIds || []).forEach(gid => notifyRoom(`group-${gid}`));
                (userIds || []).forEach(uid => {
                  const minId = Math.min(Number(currentUser?.id || 0), Number(uid));
                  const maxId = Math.max(Number(currentUser?.id || 0), Number(uid));
                  notifyRoom(`dm-${minId}-${maxId}`);
                });
                
                // Send to project chats if selected
                if (projectChatTypes && projectChatTypes.length > 0) {
                  await Promise.all(projectChatTypes.map(chatType => sendToProjectChat(msg, chatType)));
                  // Notify project chat WebSocket rooms
                  projectChatTypes.forEach(chatType => {
                    notifyRoom(`project-${projectId}-${chatType}-chat`);
                  });
                }
              } else {
                const payload = {
                  message: msg.message || '',
                  message_type: 'text' as const,
                  file_name: null,
                  file_size: null,
                  file_type: null,
                  file_url: null,
                };
                
                // Send messages via API
                await Promise.all((groupIds || []).map(gid => groupChatApi.sendMessage(gid, payload)));
                await Promise.all((userIds || []).map(uid => individualChatApi.sendMessage(uid, payload)));
                
                // Send WebSocket notifications for real-time updates
                (groupIds || []).forEach(gid => notifyRoom(`group-${gid}`));
                (userIds || []).forEach(uid => {
                  const minId = Math.min(Number(currentUser?.id || 0), Number(uid));
                  const maxId = Math.max(Number(currentUser?.id || 0), Number(uid));
                  notifyRoom(`dm-${minId}-${maxId}`);
                });
                
                // Send to project chats if selected
                if (projectChatTypes && projectChatTypes.length > 0) {
                  await Promise.all(projectChatTypes.map(chatType => sendToProjectChat(msg, chatType)));
                  // Notify project chat WebSocket rooms
                  projectChatTypes.forEach(chatType => {
                    notifyRoom(`project-${projectId}-${chatType}-chat`);
                  });
                }
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