'use client';

import { useState, useEffect } from 'react';
import { User, Project } from '@/types';
import { tasksApi } from '@/lib/api/tasks';
import { designersApi } from '@/lib/api/designers';
import { CalendarIcon, UserIcon, ArrowUpIcon, ArrowDownIcon, ChevronDownIcon } from 'lucide-react';
import { Task } from './KanbanBoard';

interface TaskTableProps {
  project: Project;
  currentUser: User;
  onTaskUpdated: () => void;
}

export default function TaskTable({ project, currentUser, onTaskUpdated }: TaskTableProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [designers, setDesigners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'title' | 'assigneeName' | 'status' | 'priority' | 'dueDate'>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadTasks();
    loadDesigners();
  }, [project.id, project]);

  const loadTasks = async () => {
    try {
      if (currentUser.role === 'designer') {
        const userTasks = await tasksApi.getByAssignee(currentUser.id);
        const projectUserTasks = userTasks.filter(task => task.projectId === project.id);
        setTasks(projectUserTasks);
      } else {
        const projectTasks = await tasksApi.getByProject(project.id);
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
      setDesigners(designersList);
    } catch (error) {
      console.error('Error loading designers:', error);
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: Task['status']) => {
    try {
      await tasksApi.updateStatus(taskId, newStatus);
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
            : task
        )
      );
      onTaskUpdated();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getDesignerName = (assigneeId: string) => {
    const designer = designers.find(d => d.id === assigneeId);
    return designer?.name || 'Unknown Designer';
  };

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
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'assigneeName') {
      aValue = getDesignerName(a.assigneeId);
      bValue = getDesignerName(b.assigneeId);
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const canUpdateStatus = (task: Task) => {
    return currentUser.role === 'project_manager' || task.assigneeId === currentUser.id;
  };

  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'completed', label: 'Completed' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ArrowUpIcon size={12} className="ml-1" /> : 
      <ArrowDownIcon size={12} className="ml-1" />;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-[calc(100vh-12rem)] flex flex-col overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900">
          Tasks Overview ({sortedTasks.length} tasks)
        </h3>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full table-fixed border-collapse">
          <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0">
            <tr className="divide-x divide-gray-200">
              <th className="w-16 px-3 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                S.No
              </th>
              <th 
                className="w-1/3 px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-gray-200"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center">
                  Task
                  <SortIcon field="title" />
                </div>
              </th>
              <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                Project
              </th>
              <th 
                className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-gray-200"
                onClick={() => handleSort('assigneeName')}
              >
                <div className="flex items-center">
                  Designer
                  <SortIcon field="assigneeName" />
                </div>
              </th>
              <th 
                className="w-1/8 px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-gray-200"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  <SortIcon field="status" />
                </div>
              </th>
              <th 
                className="w-1/8 px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-gray-200"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center">
                  Priority
                  <SortIcon field="priority" />
                </div>
              </th>
              <th 
                className="w-1/8 px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('dueDate')}
              >
                <div className="flex items-center">
                  Due Date
                  <SortIcon field="dueDate" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 border-b border-gray-200">
            {sortedTasks.map((task, index) => (
              <TaskRow
                key={task.id}
                task={task}
                project={project}
                designerName={getDesignerName(task.assigneeId)}
                onStatusUpdate={handleStatusUpdate}
                canUpdate={canUpdateStatus(task)}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
                formatDate={formatDate}
                statusOptions={statusOptions}
                serialNumber={index + 1}
              />
            ))}
          </tbody>
        </table>

        {sortedTasks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">No tasks found for this project</div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  project: Project;
  designerName: string;
  onStatusUpdate: (taskId: string, status: Task['status']) => void;
  canUpdate: boolean;
  getPriorityColor: (priority: string) => string;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  formatDate: (date?: string) => string;
  statusOptions: { value: string; label: string }[];
  serialNumber: number;
}

function TaskRow({
  task,
  project,
  designerName,
  onStatusUpdate,
  canUpdate,
  getPriorityColor,
  getStatusColor,
  getStatusLabel,
  formatDate,
  statusOptions,
  serialNumber
}: TaskRowProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100">
      <td className="px-3 py-4 border-r border-gray-200 text-center">
        <span className="text-sm font-medium text-gray-600">{serialNumber}</span>
      </td>
      <td className="px-4 py-4 border-r border-gray-200">
        <div>
          <div className="text-sm font-medium text-gray-900 line-clamp-1">{task.title}</div>
          {task.description && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
              {task.description}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-4 border-r border-gray-200">
        <div className="text-sm text-gray-900 line-clamp-1">{project.name}</div>
      </td>
      <td className="px-4 py-4 border-r border-gray-200">
        <div className="flex items-center">
          <div className="w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center mr-2">
            <span className="text-white font-medium text-xs">
              {designerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div className="text-sm text-gray-900 truncate">{designerName}</div>
        </div>
      </td>
      <td className="px-4 py-4 border-r border-gray-200">
        {canUpdate ? (
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)} hover:opacity-80 transition-opacity`}
            >
              {getStatusLabel(task.status)}
              <ChevronDownIcon size={12} className="ml-1" />
            </button>

            {showStatusMenu && (
              <div className="fixed z-50 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg" 
                   style={{
                     top: '100%',
                     left: '0',
                     position: 'absolute'
                   }}>
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onStatusUpdate(task.id, option.value as Task['status']);
                      setShowStatusMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      task.status === option.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
            {getStatusLabel(task.status)}
          </span>
        )}

        {showStatusMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowStatusMenu(false)}
          />
        )}
      </td>
      <td className="px-4 py-4 border-r border-gray-200">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm text-gray-900">{formatDate(task.dueDate)}</div>
      </td>
    </tr>
  );
}