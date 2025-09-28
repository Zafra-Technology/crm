'use client';

import { useState, useEffect } from 'react';
import { Project, ProjectUpdate } from '@/types';
import ProjectCard from '@/components/ProjectCard';
import { projectsApi } from '@/lib/api/projects';
import { projectUpdatesApi } from '@/lib/api/project-updates';
import { tasksApi } from '@/lib/api/tasks';
import { Task } from '@/components/tasks/KanbanBoard';
import { BrushIcon, ClockIcon, AlertCircleIcon, TrendingUpIcon } from 'lucide-react';

interface DesignerDashboardProps {
  projects: Project[];
  userId: string;
}

export default function DesignerDashboard({ projects: initialProjects, userId }: DesignerDashboardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<ProjectUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadProjects(),
        loadTasks(),
        loadRecentUpdates()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const projectsData = await projectsApi.getByUser(userId, 'designer');
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const tasksData = await tasksApi.getByAssignee(userId);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadRecentUpdates = async () => {
    try {
      const updatesData = await projectUpdatesApi.getByUserId(userId);
      setRecentUpdates(updatesData.slice(0, 5)); // Get latest 5 updates
    } catch (error) {
      console.error('Error loading recent updates:', error);
    }
  };

  // Get recently submitted for review tasks (sorted by updatedAt)
  const getRecentReviewTasks = () => {
    return reviewTasks
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  };

  // Get recently completed tasks (sorted by updatedAt) - these are completed by managers
  const getRecentCompletedTasks = () => {
    return completedTasks
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  };

  // Calculate task statistics
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const reviewTasks = tasks.filter(t => t.status === 'review');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Design Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your assigned projects and tasks</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <BrushIcon size={24} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-black">{tasks.length}</div>
          <div className="text-sm text-gray-600">Total Tasks</div>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <ClockIcon size={24} className="text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-yellow-600">{inProgressTasks.length}</div>
          <div className="text-sm text-gray-600">In Progress</div>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <AlertCircleIcon size={24} className="text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-600">{reviewTasks.length}</div>
          <div className="text-sm text-gray-600">In Review</div>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUpIcon size={24} className="text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
      </div>

      {/* Active Projects */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-black">Current Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="relative group h-full">
              <ProjectCard project={project} />
              {project.status === 'in_progress' && (
                <div className="absolute top-4 right-4">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-sm"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>


      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold text-black mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {(() => {
            const recentReviewTasks = getRecentReviewTasks();
            const recentCompletedTasks = getRecentCompletedTasks();
            const allActivities = [];

            // Add tasks submitted for review (primary activity for designers)
            recentReviewTasks.forEach(task => {
              const project = projects.find(p => p.id === task.projectId);
              allActivities.push({
                id: `review-${task.id}`,
                type: 'submitted_review',
                title: `Submitted for Review: ${task.title}`,
                projectName: project?.name || 'Unknown Project',
                timestamp: task.updatedAt,
                priority: task.priority
              });
            });

            // Add completed tasks (completed by managers)
            recentCompletedTasks.forEach(task => {
              const project = projects.find(p => p.id === task.projectId);
              allActivities.push({
                id: `task-${task.id}`,
                type: 'completed_task',
                title: `Task Approved: ${task.title}`,
                projectName: project?.name || 'Unknown Project',
                timestamp: task.updatedAt,
                priority: task.priority
              });
            });

            // Add recent project updates
            recentUpdates.forEach(update => {
              const project = projects.find(p => p.id === update.projectId);
              allActivities.push({
                id: `update-${update.id}`,
                type: update.type,
                title: update.title,
                projectName: project?.name || 'Unknown Project',
                timestamp: update.createdAt,
                priority: null
              });
            });

            // Sort by timestamp and take top 5
            const sortedActivities = allActivities
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 5);

            const getActivityTypeColor = (type: string) => {
              switch (type) {
                case 'submitted_review': return 'bg-yellow-400';
                case 'completed_task': return 'bg-green-400';
                case 'design': return 'bg-purple-400';
                case 'file': return 'bg-blue-400';
                case 'comment': return 'bg-orange-400';
                default: return 'bg-gray-400';
              }
            };

            const formatTimeAgo = (dateString: string) => {
              const now = new Date();
              const activityDate = new Date(dateString);
              const diffInMs = now.getTime() - activityDate.getTime();
              const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
              const diffInDays = Math.floor(diffInHours / 24);
              
              if (diffInHours < 1) return 'Just now';
              if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
              return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
            };

            const getPriorityBadge = (priority: string | null) => {
              if (!priority) return null;
              const colors = {
                low: 'bg-gray-100 text-gray-700',
                medium: 'bg-yellow-100 text-yellow-700',
                high: 'bg-red-100 text-red-700'
              };
              return (
                <span className={`text-xs px-2 py-1 rounded-full ${colors[priority as keyof typeof colors]}`}>
                  {priority}
                </span>
              );
            };

            return sortedActivities.length > 0 ? (
              sortedActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 py-2 border-b border-gray-100 last:border-b-0">
                  <div className={`w-2 h-2 ${getActivityTypeColor(activity.type)} rounded-full`}></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900">{activity.title}</div>
                      {getPriorityBadge(activity.priority)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {activity.projectName} • {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-sm">No recent activity</div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}