'use client';

import { useState, useEffect } from 'react';
import { User, Project } from '@/types';
import { tasksApi } from '@/lib/api/tasks';
import { CalendarIcon, UserIcon, ArrowUpIcon, ArrowDownIcon, ChevronDownIcon } from 'lucide-react';
import { Task } from './KanbanBoard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils/dateUtils';

interface TaskTableProps {
  project: Project;
  currentUser: User;
  designers: any[];
  loadingDesigners: boolean;
  onTaskUpdated: () => void;
}

export default function TaskTable({ project, currentUser, designers, loadingDesigners, onTaskUpdated }: TaskTableProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'title' | 'assigneeName' | 'status' | 'priority' | 'dueDate'>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadTasks();
  }, [project.id, project]);

  const loadTasks = async () => {
    try {
      if (['designer', 'senior_designer', 'auto_cad_drafter'].includes(currentUser.role)) {
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

  // Designers are now loaded at the page level and passed as props

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

  const formatTaskDate = (dateString?: string) => {
    if (!dateString) return '-';
    return formatDate(dateString);
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
        <div className="text-muted-foreground">Loading tasks...</div>
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
    <Card className="h-[calc(100vh-12rem)] flex flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-lg font-semibold text-foreground">
          Tasks Overview ({sortedTasks.length} tasks)
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">S.No</TableHead>
              <TableHead 
                className="w-1/3 cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center">
                  Task
                  <SortIcon field="title" />
                </div>
              </TableHead>
              <TableHead className="w-1/6">Project</TableHead>
              <TableHead 
                className="w-1/6 cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('assigneeName')}
              >
                <div className="flex items-center">
                  Designer
                  <SortIcon field="assigneeName" />
                </div>
              </TableHead>
              <TableHead 
                className="w-1/8 cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  <SortIcon field="status" />
                </div>
              </TableHead>
              <TableHead 
                className="w-1/8 cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center">
                  Priority
                  <SortIcon field="priority" />
                </div>
              </TableHead>
              <TableHead 
                className="w-1/8 cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('dueDate')}
              >
                <div className="flex items-center">
                  Due Date
                  <SortIcon field="dueDate" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
                formatDate={formatTaskDate}
                statusOptions={statusOptions}
                serialNumber={index + 1}
              />
            ))}
          </TableBody>
        </Table>

        {sortedTasks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground">No tasks found for this project</div>
          </div>
        )}
      </CardContent>
    </Card>
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
    <TableRow>
      <TableCell className="text-center">
        <span className="text-sm font-medium text-muted-foreground">{serialNumber}</span>
      </TableCell>
      <TableCell>
        <div>
          <div className="text-sm font-medium text-foreground line-clamp-1">{task.title}</div>
          {task.description && (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-foreground line-clamp-1">{project.name}</div>
      </TableCell>
      <TableCell>
        <div className="flex items-center">
          <div className="w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center mr-2">
            <span className="text-white font-medium text-xs">
              {designerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div className="text-sm text-foreground truncate">{designerName}</div>
        </div>
      </TableCell>
      <TableCell>
        {canUpdate ? (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="inline-flex items-center text-xs h-6"
            >
              {getStatusLabel(task.status)}
              <ChevronDownIcon size={12} className="ml-1" />
            </Button>

            {showStatusMenu && (
              <div className="fixed z-50 mt-1 w-48 bg-background border border-border rounded-md shadow-lg" 
                   style={{
                     top: '100%',
                     left: '0',
                     position: 'absolute'
                   }}>
                {statusOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant="ghost"
                    onClick={() => {
                      onStatusUpdate(task.id, option.value as Task['status']);
                      setShowStatusMenu(false);
                    }}
                    className={`w-full justify-start text-xs h-8 ${
                      task.status === option.value ? 'bg-accent text-accent-foreground font-medium' : ''
                    }`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Badge variant="secondary" className="text-xs">
            {getStatusLabel(task.status)}
          </Badge>
        )}

        {showStatusMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowStatusMenu(false)}
          />
        )}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">
          {task.priority}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm text-foreground">{formatDate(task.dueDate)}</div>
      </TableCell>
    </TableRow>
  );
}