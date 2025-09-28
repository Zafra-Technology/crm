'use client';

import { useState } from 'react';
import { User } from '@/types';
import { Task } from './KanbanBoard';
import { CalendarIcon, UserIcon, MessageSquareIcon, PaperclipIcon, ChevronDownIcon } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onStatusUpdate: (taskId: string, newStatus: Task['status']) => void;
  currentUser: User;
  designers: any[];
}

export default function TaskCard({ task, onStatusUpdate, currentUser, designers }: TaskCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      review: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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

  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'completed', label: 'Completed' },
  ];

  const canUpdateStatus = () => {
    // Managers can update any task, designers can only update their own tasks
    return currentUser.role === 'project_manager' || task.assigneeId === currentUser.id;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      {/* Task Header */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-gray-900 text-sm leading-tight">
          {task.title}
        </h4>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
      </div>

      {/* Task Description */}
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
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
              {statusOptions.map((option) => (
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

      {/* Click outside to close menu */}
      {showStatusMenu && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowStatusMenu(false)}
        />
      )}
    </div>
  );
}