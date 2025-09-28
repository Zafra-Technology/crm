'use client';

import { useState, useEffect } from 'react';
import { User, Project } from '@/types';
import { tasksApi } from '@/lib/api/tasks';
import { designersApi } from '@/lib/api/designers';
import { CalendarIcon, UserIcon, MessageSquareIcon, PaperclipIcon } from 'lucide-react';
import TaskCard from './TaskCard';

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
  { id: 'todo', title: 'To Do', color: 'bg-gray-50 border-gray-200' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50 border-blue-200' },
  { id: 'review', title: 'Review', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'completed', title: 'Completed', color: 'bg-green-50 border-green-200' },
];

export default function KanbanBoard({ project, currentUser, onTaskCreated }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [designers, setDesigners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

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
      await tasksApi.updateStatus(taskId, newStatus);
      
      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
            : task
        )
      );
    } catch (error) {
      console.error('Error updating task status:', error);
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
            <div key={column.id} className={`rounded-lg border-2 ${column.color} p-4 flex flex-col`}>
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{column.title}</h3>
                <span className="bg-white text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusUpdate={handleStatusUpdate}
                    currentUser={currentUser}
                    designers={designers}
                  />
                ))}
                
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-sm">No tasks</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}