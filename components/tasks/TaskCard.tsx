'use client';

import { useState } from 'react';
import { User } from '@/types';
import { Task } from './KanbanBoard';
import { CalendarIcon, UserIcon, MessageSquareIcon, PaperclipIcon, ChevronDownIcon, MoreVerticalIcon, TrashIcon, MessageCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskCardProps {
  task: Task;
  onStatusUpdate: (taskId: string, newStatus: Task['status']) => void;
  onDelete?: (taskId: string) => void;
  onTagInMessage?: (task: Task, message: string) => void;
  currentUser: User;
  designers: any[];
}

export default function TaskCard({ task, onStatusUpdate, onDelete, onTagInMessage, currentUser, designers }: TaskCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');

  const getPriorityVariant = (priority: string) => {
    const variants = {
      low: 'secondary',
      medium: 'outline',
      high: 'destructive',
    };
    return variants[priority as keyof typeof variants] || 'secondary';
  };

  const getStatusVariant = (status: string) => {
    const variants = {
      todo: 'secondary',
      in_progress: 'default',
      review: 'outline',
      completed: 'default',
    };
    return variants[status as keyof typeof variants] || 'secondary';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      todo: 'To Do',
      in_progress: 'In Progress',
      review: 'Review',
      completed: 'Completed',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const getAssigneeName = (assigneeId: string) => {
    const designer = designers.find(d => d.id === assigneeId);
    return designer?.name || 'Unknown';
  };

  const getAssigneeInitials = (assigneeId: string) => {
    const name = getAssigneeName(assigneeId);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAssigneeColor = (assigneeId: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const name = getAssigneeName(assigneeId);
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const getAvailableStatusOptions = () => {
    const baseOptions = [
      { value: 'todo', label: 'To Do' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'review', label: 'Review' },
    ];

    // Only managers can set tasks to completed
    if (currentUser.role === 'project_manager') {
      baseOptions.push({ value: 'completed', label: 'Completed' });
    }

    return baseOptions;
  };

  const canUpdateStatus = () => {
    // Managers can update any task, designers can only update their own tasks
    return currentUser.role === 'project_manager' || task.assigneeId === currentUser.id;
  };

  const canShowActions = () => {
    // Only managers can delete tasks or tag in messages
    return currentUser.role === 'project_manager';
  };

  const handleDelete = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
    }
    setShowActionsMenu(false);
  };

  const handleTagInMessage = () => {
    setShowActionsMenu(false);
    setShowMessageModal(true);
  };

  const handleSendMessage = () => {
    if (onTagInMessage && messageText.trim()) {
      onTagInMessage(task, messageText.trim());
      setMessageText('');
      setShowMessageModal(false);
    }
  };

  const handleCloseModal = () => {
    setShowMessageModal(false);
    setMessageText('');
  };

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-foreground text-sm leading-tight flex-1 mr-2">
            {task.title}
          </h4>
          <div className="flex items-center gap-2">
            <Badge variant={getPriorityVariant(task.priority) as any} className="text-xs">
              {task.priority}
            </Badge>
            {(onTagInMessage || (onDelete && currentUser.role === 'project_manager')) && (
              <DropdownMenu open={showActionsMenu} onOpenChange={setShowActionsMenu}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVerticalIcon size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onTagInMessage && (
                    <DropdownMenuItem onClick={handleTagInMessage}>
                      <MessageCircleIcon size={12} className="mr-2" />
                      Tag in Message
                    </DropdownMenuItem>
                  )}
                  {onDelete && currentUser.role === 'project_manager' && (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <TrashIcon size={12} className="mr-2" />
                      Delete Task
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">

      {/* Task Description */}
      {task.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Task Meta */}
      <div className="space-y-2 mb-3">
        {/* Assignee */}
        <div className="flex items-center space-x-2">
          <div className={`w-6 h-6 ${getAssigneeColor(task.assigneeId)} rounded-full flex items-center justify-center`}>
            <span className="text-white font-medium text-xs">
              {getAssigneeInitials(task.assigneeId)}
            </span>
          </div>
          <span className="text-xs text-gray-600">
            {getAssigneeName(task.assigneeId)}
          </span>
        </div>

        {/* Due Date */}
        {task.dueDate && (
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <CalendarIcon size={12} />
            <span>{formatDate(task.dueDate)}</span>
          </div>
        )}

        {/* Attachments & Comments */}
        <div className="flex items-center space-x-3">
          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <PaperclipIcon size={12} />
              <span>{task.attachments.length}</span>
            </div>
          )}
          
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <MessageSquareIcon size={12} />
              <span>{task.comments.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Update */}
      {canUpdateStatus() && (
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)} hover:opacity-80 transition-opacity`}
          >
            <span>{getStatusLabel(task.status)}</span>
            <ChevronDownIcon size={12} />
          </button>

          {showStatusMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
              {getAvailableStatusOptions().map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onStatusUpdate(task.id, option.value as Task['status']);
                    setShowStatusMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                    task.status === option.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Read-only status for non-editable tasks */}
      {!canUpdateStatus() && (
        <div className={`px-2 py-1 rounded text-xs font-medium text-center ${getStatusColor(task.status)}`}>
          {getStatusLabel(task.status)}
        </div>
      )}

      {/* Click outside to close menus */}
      {(showStatusMenu || showActionsMenu) && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => {
            setShowStatusMenu(false);
            setShowActionsMenu(false);
          }}
        />
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Tag Task in Message
            </h3>
            
            <div className="mb-4">
              <div className="bg-gray-50 p-3 rounded-md mb-3">
                <p className="text-sm font-medium text-gray-900">{task.title}</p>
                <p className="text-xs text-gray-600">
                  Assigned to: {getAssigneeName(task.assigneeId)}
                </p>
                <p className="text-xs text-gray-600">
                  Priority: {task.priority} • Status: {getStatusLabel(task.status)}
                </p>
              </div>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message:
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Enter your message about this task..."
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={4}
                autoFocus
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
      </CardContent>
    </Card>
  );
}