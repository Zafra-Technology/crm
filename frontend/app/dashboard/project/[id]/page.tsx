'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { projectsApi } from '@/lib/api/projects';
import { authAPI, resolveMediaUrl } from '@/lib/api/auth';
import { projectUpdatesApi } from '@/lib/api/project-updates';
import { getCookie } from '@/lib/cookies';
import { mockChatMessages } from '@/lib/data/mockData';
import { User, Project, ProjectUpdate, ChatMessage, ProjectAttachment } from '@/types';
import { Client } from '@/types/client';
import { Designer } from '@/types/designer';
import ProjectChat from '@/components/chat/ProjectChat';
import ProjectUpdates from '@/components/ProjectUpdates';
import ProjectAttachments from '@/components/ProjectAttachments';
import FileViewerModal from '@/components/modals/FileViewerModal';
import { CalendarIcon, UsersIcon, EditIcon, BuildingIcon, UserIcon, ArrowLeft, Check, UploadIcon, FileIcon, XIcon, EyeIcon, DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState<{
    name: string;
    description: string;
    requirements: string;
    timeline: string;
    status: Project['status'];
    projectAddress: string;
    projectAhj: string;
  }>({
    name: '',
    description: '',
    requirements: '',
    timeline: '',
    status: 'planning',
    projectAddress: '',
    projectAhj: ''
  });
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationUrl, setLocationUrl] = useState<string>('');
  const [isEditingErrors, setIsEditingErrors] = useState(false);
  const [errorsForm, setErrorsForm] = useState({
    numberOfErrors: 0,
    numberOfErrorsTeamLead: 0,
    numberOfErrorsDrafter: 0
  });
  const [isEditingFinalOutput, setIsEditingFinalOutput] = useState(false);
  const [isEditingStampedFiles, setIsEditingStampedFiles] = useState(false);
  const [finalOutputFiles, setFinalOutputFiles] = useState<File[]>([]);
  const [stampedFiles, setStampedFiles] = useState<File[]>([]);
  const [dragOverFinalOutput, setDragOverFinalOutput] = useState(false);
  const [dragOverStampedFiles, setDragOverStampedFiles] = useState(false);
  const [showFinalOutputViewer, setShowFinalOutputViewer] = useState(false);
  const [showStampedFilesViewer, setShowStampedFilesViewer] = useState(false);
  const [selectedFinalOutputFile, setSelectedFinalOutputFile] = useState<ProjectAttachment | null>(null);
  const [selectedStampedFile, setSelectedStampedFile] = useState<ProjectAttachment | null>(null);

  useEffect(() => {
    (async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      await loadProjectData();
    })();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      
      // Load project details
      const foundProject = await projectsApi.getById(projectId);
      if (foundProject) {
        // Map backend snake_case fields to camelCase for frontend
        const mappedProject = {
          ...foundProject,
          clientName: foundProject.clientName || (foundProject as any).client_name,
          clientCompany: foundProject.clientCompany || (foundProject as any).client_company,
          // fallback: preserve other fields unchanged
        };
        // Debug: Log project report and errors values from API response
        console.log('Raw API response:', {
          project_report: (foundProject as any).project_report,
          projectReport: (foundProject as any).projectReport,
          number_of_errors: (foundProject as any).number_of_errors,
          numberOfErrors: (foundProject as any).numberOfErrors
        });
        console.log('Mapped project data:', {
          projectReport: mappedProject.projectReport,
          numberOfErrors: mappedProject.numberOfErrors,
          numberOfErrorsTeamLead: mappedProject.numberOfErrorsTeamLead,
          numberOfErrorsDrafter: mappedProject.numberOfErrorsDrafter
        });
        setProject(mappedProject);
        setEditForm({
          name: mappedProject.name,
          description: mappedProject.description,
          requirements: mappedProject.requirements,
          timeline: mappedProject.timeline,
          status: mappedProject.status,
          projectAddress: mappedProject.projectAddress || '',
          projectAhj: mappedProject.projectAhj || ''
          // NO clientName or clientCompany in editForm
          // Services and Wetstamp are edited directly on the page, not in this modal
        });
        setLocationUrl(mappedProject.projectLocationUrl || '');
        setErrorsForm({
          numberOfErrors: mappedProject.numberOfErrors || 0,
          numberOfErrorsTeamLead: mappedProject.numberOfErrorsTeamLead || 0,
          numberOfErrorsDrafter: mappedProject.numberOfErrorsDrafter || 0
        });

        try {
          // Fetch all users once and derive client, designers, and manager
          const allUsers = await authAPI.getUsers();

          // Load client details
          if (foundProject.clientId) {
            const clientUser = allUsers.find(user => user.id.toString() === foundProject.clientId.toString());
            if (clientUser) {
              setClient({
                id: clientUser.id.toString(),
                full_name: clientUser.full_name,
                email: clientUser.email,
                first_name: clientUser.first_name,
                last_name: clientUser.last_name,
                mobile_number: clientUser.mobile_number || '',
                address: clientUser.address || '',
                city: clientUser.city || '',
                state: clientUser.state || '',
                country: clientUser.country || '',
                pincode: clientUser.pincode || '',
                aadhar_number: clientUser.aadhar_number,
                pan_number: undefined,
                company_name: clientUser.company_name || '',
                role: clientUser.role,
                role_display: clientUser.role_display,
                is_active: clientUser.is_active,
                date_of_birth: clientUser.date_of_birth,
                profile_pic: clientUser.profile_pic,
                date_of_joining: clientUser.date_of_joining,
                date_of_exit: clientUser.date_of_exit,
                created_at: clientUser.created_at,
                updated_at: clientUser.updated_at,
                projectsCount: 0
              });
            } else if ((foundProject as any).clientName) {
              // Fallback: build client from backend-provided display fields
              setClient({
                id: foundProject.clientId.toString(),
                full_name: (foundProject as any).clientName,
                email: (foundProject as any).clientEmail || '',
                first_name: '',
                last_name: '',
                mobile_number: '',
                address: '',
                city: '',
                state: '',
                country: '',
                pincode: '',
                aadhar_number: undefined,
                pan_number: undefined,
                company_name: (foundProject as any).clientCompany || '',
                role: 'client',
                role_display: 'Client',
                is_active: true,
                date_of_birth: undefined,
                profile_pic: undefined,
                date_of_joining: undefined,
                date_of_exit: undefined,
                created_at: '',
                updated_at: '',
                projectsCount: 0
              });
            }
          }

          // Load assigned designers
          const apiDesigners = (foundProject as any).designers as Array<any> | undefined;
          if (Array.isArray(apiDesigners) && apiDesigners.length > 0) {
            const mapped = apiDesigners.map(d => ({
              id: String(d.id),
              name: String(d.full_name || d.name || ''),
              email: String(d.email || ''),
              phoneNumber: '',
              company: '',
              role: String(d.role || ''),
              status: 'active' as const,
              joinedDate: '',
              projectsCount: 0,
              avatar: d.profile_pic,
            }));
            setDesigners(mapped);
            if (typeof window !== 'undefined') {
              // eslint-disable-next-line no-console
              console.log('Assigned designers (from API):', mapped);
            }
          } else if (foundProject.designerIds && foundProject.designerIds.length > 0) {
            const wantedIds = foundProject.designerIds.map(id => id.toString());
            const designerUsers = allUsers.filter(user => 
              [
                'designer',
                'senior_designer',
                'team_lead',
                'team_head',
                'project_manager',
                'assistant_project_manager',
                'professional_engineer',
                'auto_cad_drafter'
              ].includes(user.role) &&
              wantedIds.includes(user.id.toString())
            );
            const assignedDesigners = designerUsers.map(user => ({
              id: user.id.toString(),
              name: user.full_name,
              email: user.email,
              phoneNumber: user.mobile_number || '',
              company: user.company_name || '',
              role: user.role_display || user.role,
              status: (user.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
              joinedDate: user.date_of_joining || user.created_at || '',
              projectsCount: 0,
              avatar: user.profile_pic
            }));
            setDesigners(assignedDesigners);
            if (typeof window !== 'undefined') {
              // eslint-disable-next-line no-console
              console.log('Assigned designers (resolved via IDs):', assignedDesigners);
            }
          } else {
            setDesigners([]);
            if (typeof window !== 'undefined') {
              // eslint-disable-next-line no-console
              console.log('Assigned designers: none');
            }
          }

        } catch (error) {
          console.error('Error loading users for client/designers/manager:', error);
        }
      }

      // Fetch project updates from API
      try {
        const fetchedUpdates = await projectUpdatesApi.getByProjectId({ projectId });
        setUpdates(fetchedUpdates);
      } catch (err) {
        setUpdates([]);
      }

      // Load chat messages from backend API (ProjectChat also loads; this is initial hydration)
      try {
        console.log('🔄 Loading chat messages for project:', projectId);
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const token = authAPI.getToken();
        const chatResponse = await fetch(`${API_BASE_URL}/chat/project/${projectId}/messages`, {
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });
        if (chatResponse.ok) {
          const projectMessages = await chatResponse.json();
          console.log('💬 Loaded chat messages:', projectMessages.length);
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
        } else {
          console.error('Chat API error:', chatResponse.status);
          setChatMessages([]);
        }
      } catch (error) {
        console.error('Error loading chat messages:', error);
        setChatMessages([]);
      }

    } catch (error) {
      console.error('Error loading project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (project) {
      try {
        const updatedProject = await projectsApi.update(project.id, {
          ...editForm
        });
        if (updatedProject) {
          setProject(updatedProject);
          setIsEditing(false);
        }
      } catch (error) {
        console.error('Error updating project:', error);
        alert('Failed to update project. Please try again.');
      }
    }
  };

  const handleAddAttachment = async (files: File[]) => {
    if (!project) return;
    
    try {
      // Convert files to base64 for storage (fallback approach)
      const newAttachments = await Promise.all(files.map(async (file) => {
        const base64 = await convertFileToBase64(file);
        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          url: base64,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user?.id || ''
        };
      }));

      // Add new attachments to existing ones
      const updatedAttachments = [...(project.attachments || []), ...newAttachments];
      
      // Update project with new attachments using existing API
      const updatedProject = await projectsApi.update(project.id, { attachments: updatedAttachments });
      
      if (updatedProject) {
        // Check if the updated project has the attachments
        if (updatedProject.attachments && updatedProject.attachments.length > 0) {
          setProject(updatedProject);
        } else {
          // If the backend didn't return attachments, manually update the local state
          const projectWithAttachments = {
            ...updatedProject,
            attachments: updatedAttachments
          };
          setProject(projectWithAttachments);
        }
      } else {
        // Fallback: update local state directly
        const projectWithAttachments = {
          ...project,
          attachments: updatedAttachments
        };
        setProject(projectWithAttachments);
      }
    } catch (error) {
      console.error('Error adding attachments:', error);
      alert('Failed to add attachments. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFinalOutputFileUpload = async () => {
    if (!project || finalOutputFiles.length === 0) return;
    
    try {
      // Convert files to base64 for storage
      const newFiles = await Promise.all(finalOutputFiles.map(async (file) => {
        const base64 = await convertFileToBase64(file);
        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          url: base64,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user?.id || ''
        };
      }));

      // Add new files to existing ones
      const updatedFiles = [...(project.finalOutputFiles || []), ...newFiles];
      
      // Update project
      const updatedProject = await projectsApi.update(project.id, { finalOutputFiles: updatedFiles });
      
      if (updatedProject) {
        const mappedProject = {
          ...updatedProject,
          clientName: updatedProject.clientName || (updatedProject as any).client_name,
          clientCompany: updatedProject.clientCompany || (updatedProject as any).client_company,
          finalOutputFiles: updatedProject.finalOutputFiles || updatedFiles
        };
        setProject(mappedProject);
        setFinalOutputFiles([]);
        setIsEditingFinalOutput(false);
      }
    } catch (error) {
      console.error('Error uploading final output files:', error);
      alert('Failed to upload files. Please try again.');
    }
  };

  const handleStampedFilesUpload = async () => {
    if (!project || stampedFiles.length === 0) return;
    
    try {
      // Convert files to base64 for storage
      const newFiles = await Promise.all(stampedFiles.map(async (file) => {
        const base64 = await convertFileToBase64(file);
        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          url: base64,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user?.id || ''
        };
      }));

      // Add new files to existing ones
      const updatedFiles = [...(project.stampedFiles || []), ...newFiles];
      
      // Update project
      const updatedProject = await projectsApi.update(project.id, { stampedFiles: updatedFiles });
      
      if (updatedProject) {
        const mappedProject = {
          ...updatedProject,
          clientName: updatedProject.clientName || (updatedProject as any).client_name,
          clientCompany: updatedProject.clientCompany || (updatedProject as any).client_company,
          stampedFiles: updatedProject.stampedFiles || updatedFiles
        };
        setProject(mappedProject);
        setStampedFiles([]);
        setIsEditingStampedFiles(false);
      }
    } catch (error) {
      console.error('Error uploading stamped files:', error);
      alert('Failed to upload files. Please try again.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'finalOutput' | 'stamped') => {
    const files = Array.from(e.target.files || []);
    if (type === 'finalOutput') {
      setFinalOutputFiles([...finalOutputFiles, ...files]);
    } else {
      setStampedFiles([...stampedFiles, ...files]);
    }
    // Reset input
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent, type: 'finalOutput' | 'stamped') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'finalOutput') {
      setDragOverFinalOutput(true);
    } else {
      setDragOverStampedFiles(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent, type: 'finalOutput' | 'stamped') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'finalOutput') {
      setDragOverFinalOutput(false);
    } else {
      setDragOverStampedFiles(false);
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'finalOutput' | 'stamped') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'finalOutput') {
      setDragOverFinalOutput(false);
    } else {
      setDragOverStampedFiles(false);
    }

    const files = Array.from(e.dataTransfer.files);
    if (type === 'finalOutput') {
      setFinalOutputFiles([...finalOutputFiles, ...files]);
    } else {
      setStampedFiles([...stampedFiles, ...files]);
    }
  };

  const removeFileFromList = (index: number, type: 'finalOutput' | 'stamped') => {
    if (type === 'finalOutput') {
      setFinalOutputFiles(finalOutputFiles.filter((_, i) => i !== index));
    } else {
      setStampedFiles(stampedFiles.filter((_, i) => i !== index));
    }
  };

  const handleViewFinalOutputFile = (file: ProjectAttachment) => {
    setSelectedFinalOutputFile(file);
    setShowFinalOutputViewer(true);
  };

  const handleViewStampedFile = (file: ProjectAttachment) => {
    setSelectedStampedFile(file);
    setShowStampedFilesViewer(true);
  };

  const handleDownloadFinalOutputFile = async (file: ProjectAttachment) => {
    if (!file.url) return;
    
    try {
      // Resolve the URL properly (handles backend URLs)
      const fileUrl = resolveMediaUrl(file.url);
      
      // If it's a data URL (base64), download directly
      if (fileUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      
      // For remote URLs, fetch as blob to handle CORS and authentication
      const response = await fetch(fileUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch file');
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback to direct link download
      const link = document.createElement('a');
      link.href = resolveMediaUrl(file.url);
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadStampedFile = async (file: ProjectAttachment) => {
    if (!file.url) return;
    
    try {
      // Resolve the URL properly (handles backend URLs)
      const fileUrl = resolveMediaUrl(file.url);
      
      // If it's a data URL (base64), download directly
      if (fileUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      
      // For remote URLs, fetch as blob to handle CORS and authentication
      const response = await fetch(fileUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch file');
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback to direct link download
      const link = document.createElement('a');
      link.href = resolveMediaUrl(file.url);
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRemoveFinalOutputFile = async (fileId: string) => {
    if (!project) return;
    
    try {
      const updatedFiles = (project.finalOutputFiles || []).filter(f => f.id !== fileId);
      const updatedProject = await projectsApi.update(project.id, { finalOutputFiles: updatedFiles });
      
      if (updatedProject) {
        const mappedProject = {
          ...updatedProject,
          clientName: updatedProject.clientName || (updatedProject as any).client_name,
          clientCompany: updatedProject.clientCompany || (updatedProject as any).client_company,
          finalOutputFiles: updatedProject.finalOutputFiles || updatedFiles
        };
        setProject(mappedProject);
      }
    } catch (error) {
      console.error('Error removing final output file:', error);
      alert('Failed to remove file. Please try again.');
    }
  };

  const handleRemoveStampedFile = async (fileId: string) => {
    if (!project) return;
    
    try {
      const updatedFiles = (project.stampedFiles || []).filter(f => f.id !== fileId);
      const updatedProject = await projectsApi.update(project.id, { stampedFiles: updatedFiles });
      
      if (updatedProject) {
        const mappedProject = {
          ...updatedProject,
          clientName: updatedProject.clientName || (updatedProject as any).client_name,
          clientCompany: updatedProject.clientCompany || (updatedProject as any).client_company,
          stampedFiles: updatedProject.stampedFiles || updatedFiles
        };
        setProject(mappedProject);
      }
    } catch (error) {
      console.error('Error removing stamped file:', error);
      alert('Failed to remove file. Please try again.');
    }
  };

  const canRemoveFiles = user && (user.role === 'project_manager' || user.role === 'assistant_project_manager' || user.role === 'admin');

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!project) return;
    
    try {
      // Remove attachment from existing list
      const updatedAttachments = (project.attachments || []).filter(a => a.id !== attachmentId);
      
      // Update project with filtered attachments using existing API
      const updatedProject = await projectsApi.update(project.id, { attachments: updatedAttachments });
      
      if (updatedProject) {
        setProject(updatedProject);
        console.log('Attachment removed successfully');
      }
    } catch (error) {
      console.error('Error removing attachment:', error);
      alert('Failed to remove attachment. Please try again.');
    }
  };


  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Project not found</div>
      </div>
    );
  }

  // Project managers and assistant project managers can edit project details
  const canEdit = user.role === 'project_manager' || user.role === 'assistant_project_manager' || user.role === 'admin';
  // Services can only be edited by admin, project_manager, and assistant_project_manager
  const canEditServices = user.role === 'admin' || user.role === 'project_manager' || user.role === 'assistant_project_manager';
  // Errors section should not be visible to clients and client team members
  const canViewErrors = user.role !== 'client' && user.role !== 'client_team_member';
  const canAddUpdates =
    user.role === 'designer' ||
    user.role === 'senior_designer' ||
    user.role === 'auto_cad_drafter' ||
    user.role === 'project_manager' ||
    user.role === 'assistant_project_manager' ||
    user.role === 'admin' ||
    user.role === 'client' ||
    user.role === 'team_head' ||
    user.role === 'team_lead';
  const isClient = user.role === 'client';
  const isDesigner = user.role === 'designer';

  const statusColors: Record<Project['status'] | 'inactive' | 'rejected' | 'quotation_submitted', string> = {
    planning: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    review: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    rejected: 'bg-red-100 text-red-800',
    quotation_submitted: 'bg-slate-100 text-slate-800',
    cancelled: 'bg-red-200 text-red-900',
    onhold: 'bg-orange-100 text-orange-800',
  };

  const statusLabels: Record<Project['status'] | 'inactive' | 'rejected' | 'quotation_submitted', string> = {
    planning: 'Planning',
    in_progress: 'In Progress',
    review: 'In Review',
    completed: 'Completed',
    inactive: 'Pending',
    rejected: 'Rejected',
    quotation_submitted: 'Quotation Submitted',
    cancelled: 'Cancelled',
    onhold: 'On Hold',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="icon"
            className="flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-black">{project.name}</h1>
            <p className="text-gray-600 mt-1">Project management and team collaboration</p>
          </div>
        </div>
        {canEdit && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <EditIcon size={16} />
            <span>Edit Project</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Project Content */}
        <div className="lg:col-span-1 space-y-6">
          {/* Project Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Project Overview</CardTitle>
                <Badge variant="outline" className={`${statusColors[project.status]}`}>
                  {statusLabels[project.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-4">
                <div>
                  <p className="text-muted-foreground leading-relaxed">{project.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Client</h4>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <BuildingIcon size={16} />
                      <div className="flex flex-col">
                        <span className="font-medium">{project.clientName || 'Unknown Client'}</span>
                        {project.clientCompany && (
                          <span className="text-sm text-muted-foreground/70">{project.clientCompany}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Timeline</h4>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <CalendarIcon size={16} />
                      <span>{project.timeline}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Team Size</h4>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <UsersIcon size={16} />
                      <span>{designers.length} member{designers.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Requirements */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-foreground mb-4">Project Requirements</h3>
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground leading-relaxed">{project.requirements}</p>
                </div>
              </div>

              {/* Project Address Section */}
              <div className="pt-6 border-t">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    <span className="text-destructive mr-1">*</span>Project Address
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-muted-foreground">
                      {project.projectAddress || 'No address provided'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location Section */}
              <div className="pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Location</h3>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLocationUrl(project.projectLocationUrl || '');
                        setIsEditingLocation(true);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    {project.projectAddress || 'No address provided'}
                  </p>
                  {project.projectLocationUrl ? (() => {
                    // Check if URL is a valid Google Maps embed URL
                    const isEmbedUrl = project.projectLocationUrl.includes('google.com/maps/embed');
                    
                    // Convert regular Google Maps URL to embed format
                    const convertToEmbedUrl = (url: string): string => {
                      if (isEmbedUrl) {
                        return url;
                      }
                      
                      try {
                        const urlObj = new URL(url);
                        
                        // Format: https://www.google.com/maps/place/... or https://maps.google.com/maps?q=...
                        // Extract the query or place information
                        let embedSrc = '';
                        
                        // Check for place URL format
                        if (urlObj.pathname.includes('/place/')) {
                          // Extract place from URL like /maps/place/Place+Name/@lat,lng
                          const placeMatch = urlObj.pathname.match(/\/place\/([^/@]+)/);
                          if (placeMatch) {
                            const place = placeMatch[1].replace(/\+/g, ' ');
                            embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(place)}&output=embed`;
                          }
                        }
                        // Check for query parameter
                        else if (urlObj.searchParams.has('q')) {
                          const query = urlObj.searchParams.get('q');
                          embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(query || '')}&output=embed`;
                        }
                        // Check for coordinates in URL like /maps/@lat,lng,zoom
                        else if (urlObj.pathname.match(/^\/maps\/@/)) {
                          const coords = urlObj.pathname.replace('/maps/@', '').split(',');
                          if (coords.length >= 2) {
                            embedSrc = `https://www.google.com/maps?q=${coords[0]},${coords[1]}&output=embed`;
                          }
                        }
                        // Try to extract from any query or path
                        else {
                          // Last resort: use the full URL with output=embed
                          embedSrc = url.split('?')[0] + (url.includes('?') ? url.split('?')[1] + '&output=embed' : '?output=embed');
                        }
                        
                        return embedSrc || url;
                      } catch (e) {
                        // If URL parsing fails, try to add output=embed parameter
                        const separator = url.includes('?') ? '&' : '?';
                        return `${url}${separator}output=embed`;
                      }
                    };
                    
                    const embedUrl = convertToEmbedUrl(project.projectLocationUrl);
                    
                    return (
                      <div className="w-full border rounded-lg overflow-hidden">
                        <iframe
                          src={embedUrl}
                          width="100%"
                          height="400"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          className="w-full"
                          onError={(e) => {
                            console.error('Error loading map iframe:', e);
                          }}
                        />
                      </div>
                    );
                  })() : (
                    <div className="w-full border rounded-lg bg-muted/30 h-[400px] flex items-center justify-center">
                      <p className="text-muted-foreground">No location map available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Services Section */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Services<span className="text-destructive ml-1">*</span>
                </h3>
                <div className="grid grid-cols-2 gap-2 border rounded-lg bg-muted/30 p-3">
                  {[
                    { code: 'single_line_diagram', label: 'Single Line Diagram' },
                    { code: 'permit_package', label: 'Permit Package' },
                    { code: 'psa', label: 'PSA' },
                    { code: 'pe_stamp_structural', label: 'PE Stamp Structural' },
                    { code: 'pe_stamp_electrical', label: 'PE Stamp Electrical' },
                    { code: 'generator_plan', label: 'Generator Plan' },
                    { code: 'ev_plan', label: 'EV Plan' },
                    { code: 'design_review_quality_check', label: 'Design Review-Quality Check' },
                  ].map((service) => {
                    const isSelected = (project.services || []).includes(service.code as any);
                    return (
                      <label
                        key={service.code}
                        className={`flex items-center gap-3 py-2.5 px-3 rounded-md transition-colors ${
                          !canEditServices ? 'cursor-default opacity-100' : 'cursor-pointer'
                        } ${
                          isSelected 
                            ? 'bg-primary/10' + (canEditServices ? ' hover:bg-primary/15' : '') 
                            : canEditServices ? 'hover:bg-accent' : ''
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={!canEditServices}
                          onCheckedChange={async (checked) => {
                            if (!canEditServices || !project) return;
                            
                            const currentServices = [...(project.services || [])];
                            let updatedServices: string[];
                            
                            if (checked) {
                              updatedServices = [...currentServices, service.code as any];
                            } else {
                              updatedServices = currentServices.filter((s) => s !== service.code);
                            }
                            
                            // Optimistically update UI
                            setProject({ ...project, services: updatedServices as any });
                            
                            // Auto-save to backend
                            try {
                              await projectsApi.update(project.id, {
                                services: updatedServices as any
                              });
                            } catch (error) {
                              console.error('Error saving services:', error);
                              // Revert on error
                              setProject({ ...project, services: currentServices as any });
                              alert('Failed to save services. Please try again.');
                            }
                          }}
                          className="flex-shrink-0"
                        />
                        <span className={`text-sm font-medium flex-1 ${
                          isSelected ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {service.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Project AHJ Section */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-foreground mb-4">Project AHJ</h3>
                <p className="text-muted-foreground">
                  {project.projectAhj || 'No Project AHJ provided'}
                </p>
              </div>

              {/* Project AHJ Type Section */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-foreground mb-4">Project AHJ Type</h3>
                <RadioGroup
                  value={project.projectAhjType || ''}
                  onValueChange={async (value) => {
                    if (!canEditServices || !project) return;
                    const currentValue = project.projectAhjType;
                    setProject({ ...project, projectAhjType: value as Project['projectAhjType'] });
                    try {
                      await projectsApi.update(project.id, {
                        projectAhjType: value as any
                      });
                    } catch (error) {
                      console.error('Error saving project AHJ type:', error);
                      setProject({ ...project, projectAhjType: currentValue });
                      alert('Failed to save project AHJ type. Please try again.');
                    }
                  }}
                  disabled={!canEditServices}
                  className="grid grid-cols-2 gap-3"
                >
                  {[
                    { value: 'pitched_roof', label: 'Pitched Roof' },
                    { value: 'ballast_ground_tilt_kit', label: 'Ballast / Ground / Tilt Kit' },
                    { value: 'p2p', label: 'P2P' },
                    { value: 'battery_generator_ats', label: 'Battery / Generator / ATS' },
                    { value: 'only_generator', label: 'Only Generator' },
                    { value: 'only_ess', label: 'Only ESS' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center space-x-2 p-3 rounded-md border cursor-pointer transition-colors ${
                        project.projectAhjType === option.value
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:bg-accent'
                      } ${!canEditServices ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <RadioGroupItem value={option.value} id={`ahj-type-${option.value}`} disabled={!canEditServices} />
                      <label
                        htmlFor={`ahj-type-${option.value}`}
                        className={`text-sm font-medium flex-1 cursor-pointer ${
                          !canEditServices ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        {option.label}
                      </label>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {/* Ball in Court Section */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-foreground mb-4">Ball in court</h3>
                <RadioGroup
                  value={project.ballInCourt || ''}
                  onValueChange={async (value) => {
                    if (!canEditServices || !project) return;
                    const currentValue = project.ballInCourt;
                    setProject({ ...project, ballInCourt: value as Project['ballInCourt'] });
                    try {
                      await projectsApi.update(project.id, {
                        ballInCourt: value as any
                      });
                    } catch (error) {
                      console.error('Error saving ball in court:', error);
                      setProject({ ...project, ballInCourt: currentValue });
                      alert('Failed to save ball in court. Please try again.');
                    }
                  }}
                  disabled={!canEditServices}
                  className="grid grid-cols-2 gap-3"
                >
                  {[
                    { value: 'check_inputs', label: 'Check Inputs' },
                    { value: 'pm_court', label: 'PM\'s Court' },
                    { value: 'waiting_client_response', label: 'Waiting for Client Response' },
                    { value: 'engg_court', label: 'Engg\'s Court' },
                    { value: 'pe_stamp', label: 'PE Stamp' },
                    { value: 'project_ready', label: 'Project Ready' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'night_revision', label: 'Night Revision' },
                    { value: 'pending_payment', label: 'Pending Payment' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center space-x-2 p-3 rounded-md border cursor-pointer transition-colors ${
                        project.ballInCourt === option.value
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:bg-accent'
                      } ${!canEditServices ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <RadioGroupItem value={option.value} id={`ball-${option.value}`} disabled={!canEditServices} />
                      <label
                        htmlFor={`ball-${option.value}`}
                        className={`text-sm font-medium flex-1 cursor-pointer ${
                          !canEditServices ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        {option.label}
                      </label>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {/* Structural PE Section */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-foreground mb-4">Structural PE</h3>
                <RadioGroup
                  value={project?.structuralPe ?? ''}
                  onValueChange={async (value) => {
                    if (!canEditServices || !project) return;
                    const currentValue = project.structuralPe;
                    try {
                      // Update UI optimistically
                      const optimisticProject = {
                        ...project,
                        structuralPe: value as Project['structuralPe']
                      };
                      setProject(optimisticProject);
                      
                      const updatedProject = await projectsApi.update(project.id, {
                        structuralPe: value as any
                      });
                      
                      if (updatedProject) {
                        // Merge the updated project while preserving the structuralPe value
                        const mappedProject = {
                          ...updatedProject,
                          clientName: updatedProject.clientName || (updatedProject as any).client_name,
                          clientCompany: updatedProject.clientCompany || (updatedProject as any).client_company,
                          // Ensure structuralPe is preserved from the response or use the value we sent
                          structuralPe: updatedProject.structuralPe || (value as Project['structuralPe'])
                        };
                        setProject(mappedProject);
                      }
                    } catch (error) {
                      console.error('Error saving Structural PE:', error);
                      // Revert on error
                      setProject({ ...project, structuralPe: currentValue });
                      alert('Failed to save Structural PE. Please try again.');
                    }
                  }}
                  disabled={!canEditServices}
                  className="grid grid-cols-2 gap-3"
                >
                  {[
                    { value: 'structural_pe', label: 'Structural PE' },
                    { value: 'ev_engineer', label: 'EV Engineer' },
                    { value: 'ahz_engineers', label: 'AHZ Engineers' },
                    { value: 'lwm_engineering', label: 'LWM Engineering' },
                    { value: 'vector', label: 'Vector' },
                    { value: 'pzse', label: 'PZSE' },
                    { value: 'current_renewables', label: 'Current Renewables' },
                    { value: 'aos_structures', label: 'AOS Structures' },
                    { value: 'solar_roof_check', label: 'Solar Roof Check' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center space-x-2 p-3 rounded-md border cursor-pointer transition-colors ${
                        project.structuralPe === option.value
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:bg-accent'
                      } ${!canEditServices ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <RadioGroupItem value={option.value} id={`structural-pe-${option.value}`} disabled={!canEditServices} />
                      <label
                        htmlFor={`structural-pe-${option.value}`}
                        className={`text-sm font-medium flex-1 cursor-pointer ${
                          !canEditServices ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        {option.label}
                      </label>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {/* Structural PE Status Section */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  <span className="text-destructive mr-1">*</span>Structural PE Status
                </h3>
                <RadioGroup
                  value={project?.structuralPeStatus ?? 'new'}
                  onValueChange={async (value) => {
                    if (!canEditServices || !project) return;
                    const currentValue = project.structuralPeStatus;
                    try {
                      // Update UI optimistically
                      const optimisticProject = {
                        ...project,
                        structuralPeStatus: value as Project['structuralPeStatus']
                      };
                      setProject(optimisticProject);
                      
                      const updatedProject = await projectsApi.update(project.id, {
                        structuralPeStatus: value as any
                      });
                      
                      if (updatedProject) {
                        // Merge the updated project while preserving the structuralPeStatus value
                        const mappedProject = {
                          ...updatedProject,
                          clientName: updatedProject.clientName || (updatedProject as any).client_name,
                          clientCompany: updatedProject.clientCompany || (updatedProject as any).client_company,
                          // Ensure structuralPeStatus is preserved from the response or use the value we sent
                          structuralPeStatus: updatedProject.structuralPeStatus || (value as Project['structuralPeStatus'])
                        };
                        setProject(mappedProject);
                      }
                    } catch (error) {
                      console.error('Error saving Structural PE Status:', error);
                      // Revert on error
                      setProject({ ...project, structuralPeStatus: currentValue });
                      alert('Failed to save Structural PE Status. Please try again.');
                    }
                  }}
                  disabled={!canEditServices}
                  className="grid grid-cols-2 gap-3"
                >
                  {[
                    { value: 'new', label: 'New' },
                    { value: 'inprogress', label: 'Inprogress' },
                    { value: 'waiting_for_input', label: 'Waiting for Input' },
                    { value: 'completed', label: 'Completed' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center space-x-2 p-3 rounded-md border cursor-pointer transition-colors ${
                        project.structuralPeStatus === option.value
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:bg-accent'
                      } ${!canEditServices ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <RadioGroupItem value={option.value} id={`structural-pe-status-${option.value}`} disabled={!canEditServices} />
                      <label
                        htmlFor={`structural-pe-status-${option.value}`}
                        className={`text-sm font-medium flex-1 cursor-pointer ${
                          !canEditServices ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        {option.label}
                      </label>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {/* Electrical PE Section */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-foreground mb-4">Electrical PE</h3>
                <RadioGroup
                  value={project?.electricalPe ?? ''}
                  onValueChange={async (value) => {
                    if (!canEditServices || !project) return;
                    const currentValue = project.electricalPe;
                    try {
                      // Update UI optimistically
                      const optimisticProject = {
                        ...project,
                        electricalPe: value as Project['electricalPe']
                      };
                      setProject(optimisticProject);
                      
                      const updatedProject = await projectsApi.update(project.id, {
                        electricalPe: value as any
                      });
                      
                      if (updatedProject) {
                        // Merge the updated project while preserving the electricalPe value
                        const mappedProject = {
                          ...updatedProject,
                          clientName: updatedProject.clientName || (updatedProject as any).client_name,
                          clientCompany: updatedProject.clientCompany || (updatedProject as any).client_company,
                          // Ensure electricalPe is preserved from the response or use the value we sent
                          electricalPe: updatedProject.electricalPe || (value as Project['electricalPe'])
                        };
                        setProject(mappedProject);
                      }
                    } catch (error) {
                      console.error('Error saving Electrical PE:', error);
                      // Revert on error
                      setProject({ ...project, electricalPe: currentValue });
                      alert('Failed to save Electrical PE. Please try again.');
                    }
                  }}
                  disabled={!canEditServices}
                  className="grid grid-cols-2 gap-3"
                >
                  {[
                    { value: 'ev_engineer', label: 'EV Engineer' },
                    { value: 'vector', label: 'Vector' },
                    { value: 'pzse', label: 'PZSE' },
                    { value: 'nola', label: 'NOLA' },
                    { value: 'rivera', label: 'RIVERA' },
                    { value: 'current_renewables', label: 'Current Renewables' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center space-x-2 p-3 rounded-md border cursor-pointer transition-colors ${
                        project.electricalPe === option.value
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:bg-accent'
                      } ${!canEditServices ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <RadioGroupItem value={option.value} id={`electrical-pe-${option.value}`} disabled={!canEditServices} />
                      <label
                        htmlFor={`electrical-pe-${option.value}`}
                        className={`text-sm font-medium flex-1 cursor-pointer ${
                          !canEditServices ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        {option.label}
                      </label>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {/* Electrical PE Status Section */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  <span className="text-destructive mr-1">*</span>Electrical PE Status
                </h3>
                <RadioGroup
                  value={project?.electricalPeStatus ?? 'new'}
                  onValueChange={async (value) => {
                    if (!canEditServices || !project) return;
                    const currentValue = project.electricalPeStatus;
                    try {
                      // Update UI optimistically
                      const optimisticProject = {
                        ...project,
                        electricalPeStatus: value as Project['electricalPeStatus']
                      };
                      setProject(optimisticProject);
                      
                      const updatedProject = await projectsApi.update(project.id, {
                        electricalPeStatus: value as any
                      });
                      
                      if (updatedProject) {
                        // Merge the updated project while preserving the electricalPeStatus value
                        const mappedProject = {
                          ...updatedProject,
                          clientName: updatedProject.clientName || (updatedProject as any).client_name,
                          clientCompany: updatedProject.clientCompany || (updatedProject as any).client_company,
                          // Ensure electricalPeStatus is preserved from the response or use the value we sent
                          electricalPeStatus: updatedProject.electricalPeStatus || (value as Project['electricalPeStatus'])
                        };
                        setProject(mappedProject);
                      }
                    } catch (error) {
                      console.error('Error saving Electrical PE Status:', error);
                      // Revert on error
                      setProject({ ...project, electricalPeStatus: currentValue });
                      alert('Failed to save Electrical PE Status. Please try again.');
                    }
                  }}
                  disabled={!canEditServices}
                  className="grid grid-cols-2 gap-3"
                >
                  {[
                    { value: 'new', label: 'New' },
                    { value: 'active_project', label: 'Active Project' },
                    { value: 'waiting_for_input', label: 'Waiting for Input' },
                    { value: 'completed', label: 'Completed' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center space-x-2 p-3 rounded-md border cursor-pointer transition-colors ${
                        project.electricalPeStatus === option.value
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:bg-accent'
                      } ${!canEditServices ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <RadioGroupItem value={option.value} id={`electrical-pe-status-${option.value}`} disabled={!canEditServices} />
                      <label
                        htmlFor={`electrical-pe-status-${option.value}`}
                        className={`text-sm font-medium flex-1 cursor-pointer ${
                          !canEditServices ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        {option.label}
                      </label>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {/* Priority Section */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-foreground mb-4">Priority</h3>
                <RadioGroup
                  value={project.priority || ''}
                  onValueChange={async (value) => {
                    if (!canEditServices || !project) return;
                    const currentValue = project.priority;
                    setProject({ ...project, priority: value as Project['priority'] });
                    try {
                      await projectsApi.update(project.id, {
                        priority: value as any
                      });
                    } catch (error) {
                      console.error('Error saving priority:', error);
                      setProject({ ...project, priority: currentValue });
                      alert('Failed to save priority. Please try again.');
                    }
                  }}
                  disabled={!canEditServices}
                  className="grid grid-cols-3 gap-3"
                >
                  {[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center space-x-2 p-3 rounded-md border cursor-pointer transition-colors ${
                        project.priority === option.value
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:bg-accent'
                      } ${!canEditServices ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <RadioGroupItem value={option.value} id={`priority-${option.value}`} disabled={!canEditServices} />
                      <label
                        htmlFor={`priority-${option.value}`}
                        className={`text-sm font-medium flex-1 cursor-pointer ${
                          !canEditServices ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        {option.label}
                      </label>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {/* Project Report Section */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-foreground mb-4">Project Report</h3>
                <RadioGroup
                  value={project?.projectReport ?? ''}
                  onValueChange={async (value) => {
                    if (!canEditServices || !project) return;
                    const currentValue = project.projectReport;
                    try {
                      // Update UI optimistically
                      const optimisticProject = {
                        ...project,
                        projectReport: value as Project['projectReport']
                      };
                      setProject(optimisticProject);
                      
                      const updatedProject = await projectsApi.update(project.id, {
                        projectReport: value as any
                      });
                      
                      if (updatedProject) {
                        // Merge the updated project while preserving the projectReport value
                        const mappedProject = {
                          ...updatedProject,
                          clientName: updatedProject.clientName || (updatedProject as any).client_name,
                          clientCompany: updatedProject.clientCompany || (updatedProject as any).client_company,
                          // Ensure projectReport is preserved from the response or use the value we sent
                          projectReport: updatedProject.projectReport || (value as Project['projectReport'])
                        };
                        setProject(mappedProject);
                      }
                    } catch (error) {
                      console.error('Error saving project report:', error);
                      // Revert on error
                      setProject({ ...project, projectReport: currentValue });
                      alert('Failed to save project report. Please try again.');
                    }
                  }}
                  disabled={!canEditServices}
                  className="grid grid-cols-2 gap-3"
                >
                  {[
                    { value: 'ext_rev_ip_change', label: 'Ext.Rev.I/P Change' },
                    { value: 'ext_rev_design_error', label: 'Ext.Rev.Design Error' },
                    { value: 'ahj_utility_rejection', label: 'AHJ/Utility Rejection' },
                    { value: 'good', label: 'Good' },
                    { value: 'better_time_management', label: 'Better time management' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center space-x-2 p-3 rounded-md border cursor-pointer transition-colors ${
                        project.projectReport === option.value
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:bg-accent'
                      } ${!canEditServices ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <RadioGroupItem value={option.value} id={`report-${option.value}`} disabled={!canEditServices} />
                      <label
                        htmlFor={`report-${option.value}`}
                        className={`text-sm font-medium flex-1 cursor-pointer ${
                          !canEditServices ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        {option.label}
                      </label>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {/* Design Status Section */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  <span className="text-destructive mr-1">*</span>Design Status
                </h3>
                <RadioGroup
                  value={project?.designStatus ?? 'new'}
                  onValueChange={async (value) => {
                    if (!canEditServices || !project) return;
                    const currentValue = project.designStatus;
                    try {
                      // Update UI optimistically
                      const optimisticProject = {
                        ...project,
                        designStatus: value as Project['designStatus']
                      };
                      setProject(optimisticProject);
                      
                      const updatedProject = await projectsApi.update(project.id, {
                        designStatus: value as any
                      });
                      
                      if (updatedProject) {
                        // Merge the updated project while preserving the designStatus value
                        const mappedProject = {
                          ...updatedProject,
                          clientName: updatedProject.clientName || (updatedProject as any).client_name,
                          clientCompany: updatedProject.clientCompany || (updatedProject as any).client_company,
                          // Ensure designStatus is preserved from the response or use the value we sent
                          designStatus: updatedProject.designStatus || (value as Project['designStatus'])
                        };
                        setProject(mappedProject);
                      }
                    } catch (error) {
                      console.error('Error saving design status:', error);
                      // Revert on error
                      setProject({ ...project, designStatus: currentValue });
                      alert('Failed to save design status. Please try again.');
                    }
                  }}
                  disabled={!canEditServices}
                  className="grid grid-cols-2 gap-3"
                >
                  {[
                    { value: 'new', label: 'New' },
                    { value: 'in_progress', label: 'In progress' },
                    { value: 'for_review', label: 'For Review' },
                    { value: 'revision', label: 'Revision' },
                    { value: 'final_review', label: 'Final Review' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'on_hold', label: 'On Hold' },
                    { value: 'stop', label: 'Stop' },
                    { value: 'completed_layout', label: 'Completed Layout' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center space-x-2 p-3 rounded-md border cursor-pointer transition-colors ${
                        project.designStatus === option.value
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:bg-accent'
                      } ${!canEditServices ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <RadioGroupItem value={option.value} id={`design-status-${option.value}`} disabled={!canEditServices} />
                      <label
                        htmlFor={`design-status-${option.value}`}
                        className={`text-sm font-medium flex-1 cursor-pointer ${
                          !canEditServices ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        {option.label}
                      </label>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {/* Errors Section */}
              {canViewErrors && (
              <div className="pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Errors</h3>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setErrorsForm({
                          numberOfErrors: project.numberOfErrors || 0,
                          numberOfErrorsTeamLead: project.numberOfErrorsTeamLead || 0,
                          numberOfErrorsDrafter: project.numberOfErrorsDrafter || 0
                        });
                        setIsEditingErrors(true);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-1 block">Number of Errors</Label>
                    <p className="text-foreground">{project?.numberOfErrors !== null && project?.numberOfErrors !== undefined ? project.numberOfErrors : 0}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-1 block">Number of Errors by Team Lead</Label>
                    <p className="text-foreground">{project?.numberOfErrorsTeamLead !== null && project?.numberOfErrorsTeamLead !== undefined ? project.numberOfErrorsTeamLead : 0}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-1 block">Number of Errors by Drafter</Label>
                    <p className="text-foreground">{project?.numberOfErrorsDrafter !== null && project?.numberOfErrorsDrafter !== undefined ? project.numberOfErrorsDrafter : 0}</p>
                  </div>
                </div>
              </div>
              )}

              {/* Post Installation Letter Section */}
              <div className="pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    <span className="text-destructive mr-1">*</span>Post Installation Letter
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={(project.postInstallationLetter ?? false) ? "default" : "outline"}
                      disabled={!canEditServices}
                      onClick={async () => {
                        if (!canEditServices || !project || project.postInstallationLetter === true) return;

                        const currentValue = project.postInstallationLetter ?? false;

                        // Optimistically update UI
                        setProject({ ...project, postInstallationLetter: true });

                        // Auto-save to backend
                        try {
                          await projectsApi.update(project.id, {
                            postInstallationLetter: true
                          });
                        } catch (error) {
                          console.error('Error saving post installation letter:', error);
                          // Revert on error
                          setProject({ ...project, postInstallationLetter: currentValue });
                          alert('Failed to save post installation letter. Please try again.');
                        }
                      }}
                      className={`px-6 py-2 ${
                        (project.postInstallationLetter ?? false)
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-background hover:bg-accent hover:text-accent-foreground'
                      } ${!canEditServices ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      YES
                    </Button>
                    <Button
                      type="button"
                      variant={!(project.postInstallationLetter ?? false) ? "default" : "outline"}
                      disabled={!canEditServices}
                      onClick={async () => {
                        if (!canEditServices || !project || project.postInstallationLetter === false) return;

                        const currentValue = project.postInstallationLetter ?? false;

                        // Optimistically update UI
                        setProject({ ...project, postInstallationLetter: false });

                        // Auto-save to backend
                        try {
                          await projectsApi.update(project.id, {
                            postInstallationLetter: false
                          });
                        } catch (error) {
                          console.error('Error saving post installation letter:', error);
                          // Revert on error
                          setProject({ ...project, postInstallationLetter: currentValue });
                          alert('Failed to save post installation letter. Please try again.');
                        }
                      }}
                      className={`px-6 py-2 ${
                        !project.postInstallationLetter
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-background hover:bg-accent hover:text-accent-foreground'
                      } ${!canEditServices ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      NO
                    </Button>
                  </div>
                </div>
              </div>

              {/* Final Output Section */}
              <div className="pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Final Output</h3>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFinalOutputFiles([]);
                        setIsEditingFinalOutput(true);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {project.finalOutputFiles && project.finalOutputFiles.length > 0 ? (
                    project.finalOutputFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <span className="text-2xl">📄</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <Button
                            onClick={() => handleViewFinalOutputFile(file)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="View file"
                          >
                            <EyeIcon size={16} />
                          </Button>
                          <Button
                            onClick={() => handleDownloadFinalOutputFile(file)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Download file"
                          >
                            <DownloadIcon size={16} />
                          </Button>
                          {canRemoveFiles && (
                            <Button
                              onClick={() => handleRemoveFinalOutputFile(file.id)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Remove file"
                            >
                              <XIcon size={16} />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No final output files</p>
                  )}
                </div>
              </div>

              {/* Stamped Files Section */}
              <div className="pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Stamped Files</h3>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStampedFiles([]);
                        setIsEditingStampedFiles(true);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {project.stampedFiles && project.stampedFiles.length > 0 ? (
                    project.stampedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <span className="text-2xl">📄</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <Button
                            onClick={() => handleViewStampedFile(file)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="View file"
                          >
                            <EyeIcon size={16} />
                          </Button>
                          <Button
                            onClick={() => handleDownloadStampedFile(file)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Download file"
                          >
                            <DownloadIcon size={16} />
                          </Button>
                          {canRemoveFiles && (
                            <Button
                              onClick={() => handleRemoveStampedFile(file.id)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Remove file"
                            >
                              <XIcon size={16} />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No stamped files</p>
                  )}
                </div>
              </div>

              {/* Wetstamp Section */}
              <div className="pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    <span className="text-destructive mr-1">*</span>WETSTAMP
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={(project.wetstamp ?? false) ? "default" : "outline"}
                      disabled={!canEditServices}
                      onClick={async () => {
                        if (!canEditServices || !project || project.wetstamp === true) return;
                        
                        const currentWetstamp = project.wetstamp ?? false;
                        
                        // Optimistically update UI
                        setProject({ ...project, wetstamp: true });
                        
                        // Auto-save to backend
                        try {
                          await projectsApi.update(project.id, {
                            wetstamp: true
                          });
                        } catch (error) {
                          console.error('Error saving wetstamp:', error);
                          // Revert on error
                          setProject({ ...project, wetstamp: currentWetstamp });
                          alert('Failed to save wetstamp. Please try again.');
                        }
                      }}
                      className={`px-6 py-2 ${
                        (project.wetstamp ?? false)
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-background hover:bg-accent hover:text-accent-foreground'
                      } ${!canEditServices ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      YES
                    </Button>
                    <Button
                      type="button"
                      variant={!(project.wetstamp ?? false) ? "default" : "outline"}
                      disabled={!canEditServices}
                      onClick={async () => {
                        if (!canEditServices || !project || project.wetstamp === false) return;
                        
                        const currentWetstamp = project.wetstamp ?? false;
                        
                        // Optimistically update UI
                        setProject({ ...project, wetstamp: false });
                        
                        // Auto-save to backend
                        try {
                          await projectsApi.update(project.id, {
                            wetstamp: false
                          });
                        } catch (error) {
                          console.error('Error saving wetstamp:', error);
                          // Revert on error
                          setProject({ ...project, wetstamp: currentWetstamp });
                          alert('Failed to save wetstamp. Please try again.');
                        }
                      }}
                      className={`px-6 py-2 ${
                        !project.wetstamp
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-background hover:bg-accent hover:text-accent-foreground'
                      } ${!canEditServices ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      NO
                    </Button>
                  </div>
                </div>
              </div>

              {/* Project Attachments */}
              {Array.isArray(project.attachments) && project.attachments.length > 0 && (
                <div className="pt-6 border-t">
                  <ProjectAttachments
                    attachments={project.attachments}
                    canEdit={true}
                    canRemove={user.role === 'project_manager' || user.role === 'assistant_project_manager' || user.role === 'admin'}
                    onAddAttachment={handleAddAttachment}
                    onRemoveAttachment={handleRemoveAttachment}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Updates - All roles can add updates */}
          <ProjectUpdates
            projectId={projectId}
            updates={updates}
            currentUser={user}
            canEdit={canAddUpdates}
            onUpdateAdded={loadProjectData}
          />

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Designers */}
                {designers.map((designer) => (
                  <div key={designer.id} className="flex items-center space-x-3 p-3 bg-accent/50 rounded-lg">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      {designer.avatar ? (
                        <img 
                          src={resolveMediaUrl(designer.avatar)} 
                          alt={designer.name} 
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            console.log('Avatar failed to load:', {
                              originalUrl: designer.avatar,
                              resolvedUrl: resolveMediaUrl(designer.avatar),
                              designerName: designer.name
                            });
                            // Hide the image and show the fallback icon
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = '<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                            }
                          }}
                        />
                      ) : (
                        <UserIcon size={20} className="text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{designer.name}</div>
                      <div className="text-sm text-muted-foreground">{designer.role}</div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {designer.role === 'designer' ? 'Designer' : 
                       designer.role === 'senior_designer' ? 'Senior Designer' : 
                       designer.role === 'team_lead' ? 'Team Lead' : 
                       designer.role === 'team_head' ? 'Team Head' : 
                       designer.role === 'project_manager' ? 'Project Manager' : 
                       designer.role === 'assistant_project_manager' ? 'Assistant Project Manager' : 
                       designer.role === 'professional_engineer' ? 'Professional Engineer' : 
                       designer.role === 'auto_cad_drafter' ? 'Auto CAD Drafter' : 
                       designer.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Team Chat */}
        <div className="lg:col-span-1">
          <div className="h-[calc(100vh-12rem)] sticky top-6">
            <ProjectChat 
              projectId={projectId}
              currentUser={user}
              messages={chatMessages}
              isAssignedMember={
                // Check if current user is in the project's assigned members (designerIds)
                // Also check if user is in the designers array (loaded separately)
                (project?.designerIds?.some(id => String(id) === String(user.id)) ?? false) ||
                designers.some(d => d.id === user.id)
              }
            />
          </div>
        </div>
      </div>

      {/* Edit Project Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the project details below.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-1">
            <form id="edit-project-form" onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Enter project name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-status">Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) => setEditForm({ ...editForm, status: value as Project['status'] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="onhold">On Hold</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    required
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Enter project description"
                    rows={3}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="project-address">
                    <span className="text-destructive mr-1">*</span>Project Address
                  </Label>
                  <Textarea
                    id="project-address"
                    value={editForm.projectAddress}
                    onChange={(e) => setEditForm({ ...editForm, projectAddress: e.target.value })}
                    placeholder="Enter project address"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-ahj">Project AHJ</Label>
                  <Input
                    id="project-ahj"
                    type="text"
                    value={editForm.projectAhj}
                    onChange={(e) => setEditForm({ ...editForm, projectAhj: e.target.value })}
                    placeholder="Add Project AHJ..."
                  />
                </div>
              </div>
            </form>
          </div>

          <DialogFooter className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-project-form"
              className="flex-1"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Location URL Modal */}
      <Dialog open={isEditingLocation} onOpenChange={setIsEditingLocation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Location URL</DialogTitle>
            <DialogDescription>
              Enter the Google Maps embed URL for the project location
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location-url">Location URL</Label>
              <Input
                id="location-url"
                type="url"
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                placeholder="https://www.google.com/maps/embed?pb=..."
              />
              <p className="text-xs text-muted-foreground">
                <strong>Location URL:</strong> You can paste either a Google Maps embed URL or a regular Google Maps link. Both will work.
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> For embed URL, click "Share" → "Embed a map" in Google Maps. Regular links will be automatically converted.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditingLocation(false);
                setLocationUrl(project?.projectLocationUrl || '');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!project) return;
                
                // Accept any Google Maps URL (embed or regular)
                if (locationUrl && !locationUrl.includes('google.com') && !locationUrl.includes('maps.google.com')) {
                  alert('Please enter a valid Google Maps URL (embed URL or regular link).');
                  return;
                }
                
                try {
                  const updatedProject = await projectsApi.update(project.id, {
                    projectLocationUrl: locationUrl || undefined
                  });
                  if (updatedProject) {
                    setProject(updatedProject);
                    setIsEditingLocation(false);
                  }
                } catch (error) {
                  console.error('Error updating location URL:', error);
                  alert('Failed to update location URL. Please try again.');
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Errors Modal */}
      <Dialog open={isEditingErrors} onOpenChange={setIsEditingErrors}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Errors</DialogTitle>
            <DialogDescription>
              Update the number of errors for this project
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="number-of-errors">Number of Errors</Label>
              <Input
                id="number-of-errors"
                type="number"
                min="0"
                value={errorsForm.numberOfErrors}
                onChange={(e) => setErrorsForm({ ...errorsForm, numberOfErrors: parseInt(e.target.value) || 0 })}
                placeholder="Add Number of Errors..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="number-of-errors-team-lead">Number of Errors by Team Lead</Label>
              <Input
                id="number-of-errors-team-lead"
                type="number"
                min="0"
                value={errorsForm.numberOfErrorsTeamLead}
                onChange={(e) => setErrorsForm({ ...errorsForm, numberOfErrorsTeamLead: parseInt(e.target.value) || 0 })}
                placeholder="Add Number of Errors by Team Lead..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="number-of-errors-drafter">Number of Errors by Drafter</Label>
              <Input
                id="number-of-errors-drafter"
                type="number"
                min="0"
                value={errorsForm.numberOfErrorsDrafter}
                onChange={(e) => setErrorsForm({ ...errorsForm, numberOfErrorsDrafter: parseInt(e.target.value) || 0 })}
                placeholder="Add Number of Errors by Drafter..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditingErrors(false);
                setErrorsForm({
                  numberOfErrors: project?.numberOfErrors || 0,
                  numberOfErrorsTeamLead: project?.numberOfErrorsTeamLead || 0,
                  numberOfErrorsDrafter: project?.numberOfErrorsDrafter || 0
                });
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!project) return;
                try {
                  // Update UI optimistically
                  const optimisticProject = {
                    ...project,
                    numberOfErrors: errorsForm.numberOfErrors,
                    numberOfErrorsTeamLead: errorsForm.numberOfErrorsTeamLead,
                    numberOfErrorsDrafter: errorsForm.numberOfErrorsDrafter
                  };
                  setProject(optimisticProject);
                  
                  const updatedProject = await projectsApi.update(project.id, {
                    numberOfErrors: errorsForm.numberOfErrors,
                    numberOfErrorsTeamLead: errorsForm.numberOfErrorsTeamLead,
                    numberOfErrorsDrafter: errorsForm.numberOfErrorsDrafter
                  });
                  
                  if (updatedProject) {
                    // Merge the updated project with all fields
                    const mappedProject = {
                      ...updatedProject,
                      clientName: updatedProject.clientName || (updatedProject as any).client_name,
                      clientCompany: updatedProject.clientCompany || (updatedProject as any).client_company,
                      // Ensure error fields are preserved
                      numberOfErrors: updatedProject.numberOfErrors ?? errorsForm.numberOfErrors,
                      numberOfErrorsTeamLead: updatedProject.numberOfErrorsTeamLead ?? errorsForm.numberOfErrorsTeamLead,
                      numberOfErrorsDrafter: updatedProject.numberOfErrorsDrafter ?? errorsForm.numberOfErrorsDrafter
                    };
                    setProject(mappedProject);
                    setErrorsForm({
                      numberOfErrors: mappedProject.numberOfErrors || 0,
                      numberOfErrorsTeamLead: mappedProject.numberOfErrorsTeamLead || 0,
                      numberOfErrorsDrafter: mappedProject.numberOfErrorsDrafter || 0
                    });
                    setIsEditingErrors(false);
                  }
                } catch (error) {
                  console.error('Error updating errors:', error);
                  // Revert to original project state on error
                  if (project) {
                    setProject(project);
                  }
                  alert('Failed to update errors. Please try again.');
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Final Output Modal */}
      <Dialog open={isEditingFinalOutput} onOpenChange={setIsEditingFinalOutput}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Final Output Files</DialogTitle>
            <DialogDescription>
              Upload final output files for this project. You can drag and drop files or click to select.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Drag and Drop Area */}
            <div
              onDragOver={(e) => handleDragOver(e, 'finalOutput')}
              onDragLeave={(e) => handleDragLeave(e, 'finalOutput')}
              onDrop={(e) => handleDrop(e, 'finalOutput')}
              className={`relative border-2 border-dashed rounded-lg transition-colors ${
                dragOverFinalOutput
                  ? 'border-primary bg-primary/10'
                  : 'border-input bg-accent/50 hover:bg-accent'
              }`}
            >
              <label className="flex flex-col items-center justify-center w-full h-32 cursor-pointer">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadIcon className="w-8 h-8 mb-4 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">PDF, DOC, Images, etc.</p>
                </div>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileInputChange(e, 'finalOutput')}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                />
              </label>
            </div>

            {/* Selected Files List */}
            {finalOutputFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({finalOutputFiles.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {finalOutputFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-accent/50 rounded-md border border-border">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <FileIcon size={20} className="text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => removeFileFromList(index, 'finalOutput')}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <XIcon size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditingFinalOutput(false);
                setFinalOutputFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleFinalOutputFileUpload}
              disabled={finalOutputFiles.length === 0}
            >
              Upload Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stamped Files Modal */}
      <Dialog open={isEditingStampedFiles} onOpenChange={setIsEditingStampedFiles}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Stamped Files</DialogTitle>
            <DialogDescription>
              Upload stamped files for this project. You can drag and drop files or click to select.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Drag and Drop Area */}
            <div
              onDragOver={(e) => handleDragOver(e, 'stamped')}
              onDragLeave={(e) => handleDragLeave(e, 'stamped')}
              onDrop={(e) => handleDrop(e, 'stamped')}
              className={`relative border-2 border-dashed rounded-lg transition-colors ${
                dragOverStampedFiles
                  ? 'border-primary bg-primary/10'
                  : 'border-input bg-accent/50 hover:bg-accent'
              }`}
            >
              <label className="flex flex-col items-center justify-center w-full h-32 cursor-pointer">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadIcon className="w-8 h-8 mb-4 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">PDF, DOC, Images, etc.</p>
                </div>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileInputChange(e, 'stamped')}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                />
              </label>
            </div>

            {/* Selected Files List */}
            {stampedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({stampedFiles.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {stampedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-accent/50 rounded-md border border-border">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <FileIcon size={20} className="text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => removeFileFromList(index, 'stamped')}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <XIcon size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditingStampedFiles(false);
                setStampedFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleStampedFilesUpload}
              disabled={stampedFiles.length === 0}
            >
              Upload Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Viewer Modals */}
      <FileViewerModal
        isOpen={showFinalOutputViewer}
        onClose={() => {
          setShowFinalOutputViewer(false);
          setSelectedFinalOutputFile(null);
        }}
        attachment={selectedFinalOutputFile}
      />
      <FileViewerModal
        isOpen={showStampedFilesViewer}
        onClose={() => {
          setShowStampedFilesViewer(false);
          setSelectedStampedFile(null);
        }}
        attachment={selectedStampedFile}
      />
    </div>
  );
}