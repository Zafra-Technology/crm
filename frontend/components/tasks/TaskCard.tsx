'use client';

import { useState } from 'react';
import { User } from '@/types';
import { Task } from './KanbanBoard';
import { CalendarIcon, UserIcon, MessageSquareIcon, PaperclipIcon, ChevronDownIcon, MoreVerticalIcon, TrashIcon, MessageCircleIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
      low: 'secondary' as const,
      medium: 'default' as const,
      high: 'destructive' as const,
    };
    return variants[priority as keyof typeof variants] || 'secondary';
  };

  const getStatusVariant = (status: string) => {
    const variants = {
      todo: 'secondary' as const,
      in_progress: 'default' as const,
      review: 'default' as const,
      completed: 'default' as const,
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
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAssigneeColor = (assigneeId: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const name = getAssigneeName(assigneeId);
    const hash = name.split('').reduce((a: number, b: string) => {
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
    // Managers and admins can update any task, designers can only update their own tasks
    return currentUser.role === 'project_manager' || currentUser.role === 'admin' || task.assigneeId === currentUser.id;
  };

  const canShowActions = () => {
    // Only managers and admins can delete tasks or tag in messages
    return currentUser.role === 'project_manager' || currentUser.role === 'admin';
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
      <CardContent className="p-4">
        {/* Task Header */}
        <div className="flex items-start justify-between mb-3">
          <h4 className="font-medium text-foreground text-sm leading-tight flex-1 mr-2">
            {task.title}
          </h4>
          <div className="flex items-center gap-2">
            <Badge variant={getPriorityVariant(task.priority)} className="text-xs">
              {task.priority}
            </Badge>
          {canShowActions() && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="h-6 w-6"
                title="More actions"
              >
                <MoreVerticalIcon size={14} className="text-muted-foreground" />
              </Button>
              
              {showActionsMenu && (
                <div className="absolute top-full right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-20 min-w-[160px] whitespace-nowrap">
                  <Button
                    variant="ghost"
                    onClick={handleTagInMessage}
                    className="w-full justify-start text-xs h-8 px-3"
                  >
                    <MessageCircleIcon size={12} className="mr-2" />
                    Tag in Message
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleDelete}
                    className="w-full justify-start text-xs h-8 px-3 text-destructive hover:text-destructive"
                  >
                    <TrashIcon size={12} className="mr-2" />
                    Delete Task
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
            <span className="text-xs text-muted-foreground">
              {getAssigneeName(task.assigneeId)}
            </span>
          </div>

          {/* Due Date */}
          {task.dueDate && (
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <CalendarIcon size={12} />
              <span>{formatDate(task.dueDate)}</span>
            </div>
          )}

          {/* Attachments & Comments */}
          <div className="flex items-center space-x-3">
            {task.attachments && task.attachments.length > 0 && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <PaperclipIcon size={12} />
                <span>{task.attachments.length}</span>
              </div>
            )}
            
            {task.comments && task.comments.length > 0 && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <MessageSquareIcon size={12} />
                <span>{task.comments.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Update */}
        {canUpdateStatus() && (
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="w-full flex items-center justify-between text-xs h-8"
            >
              <span>{getStatusLabel(task.status)}</span>
              <ChevronDownIcon size={12} />
            </Button>

            {showStatusMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-10">
                {getAvailableStatusOptions().map((option) => (
                  <Button
                    key={option.value}
                    variant="ghost"
                    onClick={() => {
                      onStatusUpdate(task.id, option.value as Task['status']);
                      setShowStatusMenu(false);
                    }}
                    className={`w-full justify-start text-xs h-8 px-3 ${
                      task.status === option.value ? 'bg-accent text-accent-foreground font-medium' : ''
                    }`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Read-only status for non-editable tasks */}
        {!canUpdateStatus() && (
          <Badge variant={getStatusVariant(task.status)} className="w-full text-center text-xs">
            {getStatusLabel(task.status)}
          </Badge>
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
        <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
          <DialogContent className="max-w-lg sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-base">Tag Task in Message</DialogTitle>
              <DialogDescription className="text-xs">Send a quick note referencing this task.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Task summary */}
              <div className="bg-muted/50 border border-border rounded-md p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Assigned: {getAssigneeName(task.assigneeId)}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Priority: {task.priority}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Status: {getStatusLabel(task.status)}</span>
                      {task.dueDate && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span>Due: {formatDate(task.dueDate)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Message field */}
              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs">Message</Label>
                <Textarea
                  id="message"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message..."
                  rows={5}
                  className="resize-y"
                  autoFocus
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-3 justify-end">
              <Button onClick={handleCloseModal} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleSendMessage} disabled={!messageText.trim()}>
                Send Message
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}