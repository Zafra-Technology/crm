'use client';

import { useState, useEffect } from 'react';
import { User, Project } from '@/types';
import { tasksApi } from '@/lib/api/tasks';
import { CheckCircleIcon, ClockIcon, ListIcon, UserIcon } from 'lucide-react';
import { Task } from './KanbanBoard';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface TaskStatsProps {
  project: Project;
  currentUser: User;
  onStatsLoaded: (stats: { completed: number; pending: number; total: number }) => void;
}

export default function TaskStats({ project, currentUser, onStatsLoaded }: TaskStatsProps) {
  const [stats, setStats] = useState({
    completed: 0,
    pending: 0,
    total: 0,
    inProgress: 0,
    todo: 0,
    review: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTaskStats();
  }, [project.id, currentUser]);

  const loadTaskStats = async () => {
    try {
      let tasks: Task[] = [];
      
      if (currentUser.role === 'designer') {
        // Designers see only their tasks across all projects (but we filter by current project)
        const userTasks = await tasksApi.getByAssignee(currentUser.id);
        tasks = userTasks.filter(task => task.projectId === project.id);
      } else {
        // Managers see all tasks for the project
        tasks = await tasksApi.getByProject(project.id);
      }

      const completed = tasks.filter(task => task.status === 'completed').length;
      const pending = tasks.filter(task => task.status !== 'completed').length;
      const inProgress = tasks.filter(task => task.status === 'in_progress').length;
      const todo = tasks.filter(task => task.status === 'todo').length;
      const review = tasks.filter(task => task.status === 'review').length;
      const total = tasks.length;

      const newStats = {
        completed,
        pending,
        total,
        inProgress,
        todo,
        review
      };

      setStats(newStats);
      onStatsLoaded({ completed, pending, total });
    } catch (error) {
      console.error('Error loading task stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getCompletionPercentage = () => {
    if (stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* Total Tasks */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {currentUser.role === 'designer' ? 'My Tasks' : 'Total Tasks'}
              </p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              {currentUser.role === 'designer' ? (
                <UserIcon size={20} className="text-blue-600" />
              ) : (
                <ListIcon size={20} className="text-blue-600" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completed Tasks */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">{getCompletionPercentage()}% done</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircleIcon size={20} className="text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Tasks */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">To do + In progress + Review</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <ClockIcon size={20} className="text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* In Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">Currently working</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}