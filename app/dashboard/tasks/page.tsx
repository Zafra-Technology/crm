'use client';

import { useState, useEffect } from 'react';
import { User, Project } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { projectsApi } from '@/lib/api/projects';
import { tasksApi } from '@/lib/api/tasks';
import { FolderIcon, CalendarIcon, UserIcon, PlusIcon, LayoutGridIcon, TableIcon } from 'lucide-react';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import TaskTable from '@/components/tasks/TaskTable';
import TaskStats from '@/components/tasks/TaskStats';

export default function TasksPage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [loading, setLoading] = useState(true);
  const [taskStats, setTaskStats] = useState({
    completed: 0,
    pending: 0,
    total: 0
  });
  const [projectTaskCounts, setProjectTaskCounts] = useState<Record<string, { total: number; completed: number }>>({});

  useEffect(() => {
    const currentUser = getCurrentUser();
    console.log('Tasks page - Current user:', currentUser);
    setUser(currentUser);
  }, []);

  useEffect(() => {
    const loadProjects = async () => {
      if (!user) return;
      
      try {
        console.log('Loading projects for user:', user.id, user.role);
        const projectsList = await projectsApi.getByUser(user.id, user.role);
        console.log('Loaded projects:', projectsList.length);
        setProjects(projectsList);
        
        // Load task counts for each project
        await loadProjectTaskCounts(projectsList);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjectTaskCounts = async (projectsList: Project[]) => {
    const counts: Record<string, { total: number; completed: number }> = {};
    
    try {
      // Load task counts for each project
      const countPromises = projectsList.map(async (project) => {
        try {
          let tasks;
          if (user?.role === 'designer') {
            // For designers, get their tasks and filter by project
            const userTasks = await tasksApi.getByAssignee(user.id);
            tasks = userTasks.filter(task => task.projectId === project.id);
          } else {
            // For managers, get all project tasks
            tasks = await tasksApi.getByProject(project.id);
          }
          
          const total = tasks.length;
          const completed = tasks.filter(task => task.status === 'completed').length;
          
          counts[project.id] = { total, completed };
        } catch (error) {
          console.error(`Error loading tasks for project ${project.id}:`, error);
          counts[project.id] = { total: 0, completed: 0 };
        }
      });
      
      await Promise.all(countPromises);
      setProjectTaskCounts(counts);
    } catch (error) {
      console.error('Error loading project task counts:', error);
    }
  };

  const getProjectStatusColor = (status: string) => {
    const colors = {
      planning: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      review: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getProjectStatusLabel = (status: string) => {
    const labels = {
      planning: 'Planning',
      in_progress: 'In Progress',
      review: 'In Review',
      completed: 'Completed',
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  if (selectedProject) {
    return (
      <div className="space-y-6">
        {/* Project Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setSelectedProject(null)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
            >
              ← Back to Projects
            </button>
            <div>
              <h1 className="text-2xl font-bold text-black">{selectedProject.name}</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  viewMode === 'kanban' 
                    ? 'bg-white text-black shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGridIcon size={16} />
                <span>Kanban</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-white text-black shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TableIcon size={16} />
                <span>Table</span>
              </button>
            </div>

            {user?.role === 'project_manager' && (
              <button
                onClick={() => setShowCreateTask(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <PlusIcon size={16} />
                <span>Create Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Task Statistics */}
        <TaskStats 
          project={selectedProject}
          currentUser={user!}
          onStatsLoaded={setTaskStats}
        />

        {/* Task Views */}
        {viewMode === 'kanban' ? (
          <KanbanBoard 
            key={`kanban-${selectedProject.id}-${Date.now()}`}
            project={selectedProject}
            currentUser={user!}
            onTaskCreated={() => {
              console.log('🔄 Task created, refreshing view...');
              // Trigger a re-render by updating the selected project
              setSelectedProject(prev => prev ? { ...prev } : null);
            }}
          />
        ) : (
          <TaskTable
            key={`table-${selectedProject.id}-${Date.now()}`}
            project={selectedProject}
            currentUser={user!}
            onTaskUpdated={() => {
              console.log('🔄 Task updated, refreshing view...');
              setSelectedProject({ ...selectedProject, lastUpdated: Date.now() });
            }}
          />
        )}

        {/* Create Task Modal */}
        {showCreateTask && (
          <CreateTaskModal
            project={selectedProject}
            currentUser={user!}
            onClose={() => setShowCreateTask(false)}
            onTaskCreated={() => {
              setShowCreateTask(false);
              console.log('🔄 Task created, refreshing Kanban board...');
              // Force re-render by updating the project state
              setSelectedProject({ ...selectedProject });
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-black">Task Management</h1>
        <p className="text-gray-600 mt-1">
          {user?.role === 'project_manager' 
            ? 'Manage tasks across your projects' 
            : 'View and update your assigned tasks'
          }
        </p>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const taskCount = projectTaskCounts[project.id] || { total: 0, completed: 0 };
          const completionPercentage = taskCount.total > 0 ? Math.round((taskCount.completed / taskCount.total) * 100) : 0;
          
          return (
            <div
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FolderIcon size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500 truncate max-w-[200px]">
                      {project.description}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProjectStatusColor(project.status)}`}>
                  {getProjectStatusLabel(project.status)}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <CalendarIcon size={14} />
                  <span>{project.timeline}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <UserIcon size={14} />
                  <span>{(project.designerIds?.length || 0) + 1} members</span>
                </div>

                {/* Task Counts */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">
                        Total: <span className="font-medium text-gray-900">{taskCount.total}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-600">
                        Done: <span className="font-medium text-green-600">{taskCount.completed}</span>
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {completionPercentage}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-blue-600 font-medium hover:text-blue-800">
                  View Tasks →
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {projects.length === 0 && !loading && (
        <div className="text-center py-12">
          <FolderIcon size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
          <p className="text-gray-500">
            {user?.role === 'project_manager' 
              ? 'Create your first project to start managing tasks'
              : 'You have not been assigned to any projects yet'
            }
          </p>
        </div>
      )}
    </div>
  );
}