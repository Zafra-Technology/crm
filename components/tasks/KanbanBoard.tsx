'use client';

import { useState, useEffect } from 'react';
import { User, Project } from '@/types';
import { tasksApi } from '@/lib/api/tasks';
import { designersApi } from '@/lib/api/designers';
import { CalendarIcon, UserIcon, MessageSquareIcon, PaperclipIcon } from 'lucide-react';
import TaskCard from './TaskCard';
import { NotificationService } from '@/lib/services/notificationService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

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
  onTaskCreated: () => void;
}

// Add key prop to force re-render when tasks change
let taskRefreshKey = 0;

const COLUMNS = [
  { id: 'todo', title: 'To Do', variant: 'secondary' },
  { id: 'in_progress', title: 'In Progress', variant: 'default' },
  { id: 'review', title: 'Review', variant: 'outline' },
  { id: 'completed', title: 'Completed', variant: 'default' },
];

export default function KanbanBoard({ project, currentUser, onTaskCreated }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [designers, setDesigners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔄 KanbanBoard useEffect triggered for project:', project.id);
    loadTasks();
    loadDesigners();
  }, [project.id, project]);

  const loadTasks = async () => {
    try {
      if (currentUser.role === 'designer') {
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

  const loadDesigners = async () => {
    try {
      const designersList = await designersApi.getAll();
      console.log('🎨 Designers from API:', designersList.length);
      
      setDesigners(designersList);
    } catch (error) {
      console.error('Error loading designers:', error);
      // Use fallback designers if API fails
      const fallbackDesigners = [
        { id: '3', name: 'Mike Designer', role: 'designer', status: 'active' }
      ];
      setDesigners(fallbackDesigners);
    }
  };

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

      // Send individual message to the designer
      const response = await fetch('/api/messages/individual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderId: currentUser.id,
          senderName: currentUser.name,
          receiverId: task.assigneeId,
          message: taskDetails,
          messageType: 'task_tag'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Create notification for task tagging
      await NotificationService.createTaskTaggedNotification(
        task.assigneeId,
        task.title,
        project.name,
        currentUser.name,
        message.substring(0, 100) + (message.length > 100 ? '...' : '')
      );

      toast({
        title: "Message sent successfully",
        description: `Your message has been sent to ${assignee.name}`,
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
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
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full">
        {COLUMNS.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          
          return (
            <Card key={column.id} className="flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{column.title}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {columnTasks.length}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto space-y-3 pt-0">
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