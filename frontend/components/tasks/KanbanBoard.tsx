'use client';

import { useState, useEffect } from 'react';
import { User, Project } from '@/types';
import { tasksApi } from '@/lib/api/tasks';
import { CalendarIcon, UserIcon, MessageSquareIcon, PaperclipIcon } from 'lucide-react';
import TaskCard from './TaskCard';
import { NotificationService } from '@/lib/services/notificationService';
import { authAPI } from '@/lib/api/auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  createdBy: string;
  createdByName: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  attachments?: any[];
  comments?: any[];
}

interface KanbanBoardProps {
  project: Project;
  currentUser: User;
  designers: any[];
  loadingDesigners: boolean;
  onTaskCreated: () => void;
}

// Add key prop to force re-render when tasks change
let taskRefreshKey = 0;

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-muted/30 border-border' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50/50 border-blue-200' },
  { id: 'review', title: 'Review', color: 'bg-yellow-50/50 border-yellow-200' },
  { id: 'completed', title: 'Completed', color: 'bg-green-50/50 border-green-200' },
];

export default function KanbanBoard({ project, currentUser, designers, loadingDesigners, onTaskCreated }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔄 KanbanBoard useEffect triggered for project:', project.id);
    loadTasks();
  }, [project.id, project]);

  const loadTasks = async () => {
    try {
      if (['designer', 'senior_designer', 'auto_cad_drafter'].includes(currentUser.role)) {
        // Designers only see tasks assigned to them across all projects
        const userTasks = await tasksApi.getByAssignee(currentUser.id);
        // Filter by current project
        const projectUserTasks = userTasks.filter(task => task.projectId === project.id);
        console.log('Designer tasks for project:', projectUserTasks.length);
        setTasks(projectUserTasks);
      } else {
        // Managers see all tasks for the project
        const projectTasks = await tasksApi.getByProject(project.id);
        console.log('Manager tasks for project:', projectTasks.length);
        setTasks(projectTasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Designers are now loaded at the page level and passed as props

  const handleStatusUpdate = async (taskId: string, newStatus: Task['status']) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const oldStatus = task.status;
      
      await tasksApi.updateStatus(taskId, newStatus);
      
      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
            : task
        )
      );

      // Create notifications based on status change
      if (oldStatus !== newStatus) {
        // If task moved to review by designer, notify manager
        if (newStatus === 'review' && currentUser.role === 'designer') {
          await NotificationService.createTaskReviewNotification(
            taskId,
            task.title,
            project.managerId,
            project.name,
            currentUser.name
          );
        }

        // If task completed by manager, notify assignee
        if (newStatus === 'completed' && currentUser.role === 'project_manager') {
          await NotificationService.createTaskCompletedNotification(
            taskId,
            task.title,
            task.assigneeId,
            project.name,
            currentUser.name
          );
        }
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await tasksApi.delete(taskId);
      
      // Remove from local state
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      
      console.log('Task deleted successfully');
      // Notify parent to refresh stats
      onTaskCreated();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const handleTagInMessage = async (task: Task, message: string) => {
    try {
      // Get the assignee (designer) details
      const assignee = designers.find(d => d.id === task.assigneeId);
      
      if (!assignee) {
        alert('Designer not found');
        return;
      }

      // Create the message with task details
      const taskDetails = `Task: ${task.title}
Project: ${project.name}
Status: ${task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}

${message}`;

      // Show immediate feedback while sending
      const pendingToast = toast({
        title: 'Sending message…',
        description: `Tagging ${assignee.name} on "${task.title}"…`,
      });

      // Send individual message to the designer via backend API
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const token = authAPI.getToken();
      const response = await fetch(`${API_BASE_URL}/chat/individual/${task.assigneeId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          message: taskDetails,
          message_type: 'task_tag',
          file_name: null,
          file_size: null,
          file_type: null,
          file_url: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Update toast to success immediately after message saved
      pendingToast.update({
        title: 'Message sent',
        description: `Tagged ${assignee.name} on "${task.title}" in ${project.name}.`,
      } as any);

      // Create notification for task tagging
      await NotificationService.createTaskTaggedNotification(
        task.assigneeId,
        task.title,
        project.name,
        currentUser.name,
        message.substring(0, 100) + (message.length > 100 ? '...' : '')
      );
      
    } catch (error) {
      console.error('Error sending message:', error);
      // If we showed a pending toast earlier, try to update it to error
      try {
        // This will no-op if no pending toast exists in this scope
        // @ts-ignore - safe: update exists on returned object from toast()
        pendingToast?.update?.({
          title: 'Failed to send message',
          description: 'Please try again.',
          variant: 'destructive',
        });
      } catch (_) {
        toast({
          title: 'Failed to send message',
          description: 'Please try again.',
        });
      }
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getAssigneeName = (assigneeId: string) => {
    const designer = designers.find(d => d.id === assigneeId);
    return designer?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full">
        {COLUMNS.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          
          return (
            <Card key={column.id} className={`${column.color} h-full flex flex-col`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground">{column.title}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {columnTasks.length}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto space-y-3 p-4 pt-0">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusUpdate={handleStatusUpdate}
                    onDelete={handleDeleteTask}
                    onTagInMessage={handleTagInMessage}
                    currentUser={currentUser}
                    designers={designers}
                  />
                ))}
                
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-sm">No tasks</div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}