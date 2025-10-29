'use client';

import { useState, useEffect } from 'react';
import { User, Project } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { projectsApi } from '@/lib/api/projects';
import { tasksApi } from '@/lib/api/tasks';
import { FolderIcon, CalendarIcon, UserIcon, PlusIcon, LayoutGridIcon, TableIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authAPI } from '@/lib/api/auth';
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
  const [loadingTaskCounts, setLoadingTaskCounts] = useState(false);
  const [designers, setDesigners] = useState<any[]>([]);
  const [loadingDesigners, setLoadingDesigners] = useState(true);

  useEffect(() => {
    (async () => {
      const currentUser = await getCurrentUser();
      console.log('Tasks page - Current user:', currentUser);
      setUser(currentUser);
    })();
  }, []);

  // Load designers when page loads
  useEffect(() => {
    const loadDesigners = async () => {
      try {
        setLoadingDesigners(true);
        console.log('🔍 Tasks page: Loading designers...');
        
        // Fetch designers by role directly from DB via users API
        const [designers, seniorDesigners, drafters] = await Promise.all([
          authAPI.getUsers('designer'),
          authAPI.getUsers('senior_designer'),
          authAPI.getUsers('auto_cad_drafter')
        ]);

        // Merge and de-duplicate by id
        const merged = [...designers, ...seniorDesigners, ...drafters];
        const uniqueById = Array.from(new Map(merged.map(u => [u.id, u])).values());

        const activeDesigners = uniqueById
          .filter(u => u.is_active)
          .map(u => ({
            id: u.id.toString(),
            name: u.full_name,
            email: u.email,
            phoneNumber: u.mobile_number || '',
            company: u.company_name || '',
            role: u.role_display || u.role,
            status: 'active' as const,
            joinedDate: u.date_of_joining || u.created_at || '',
            projectsCount: 0
          }));
        
        console.log('📋 Tasks page: Designers loaded:', activeDesigners.length);
        console.log('🎯 Tasks page: Designer details:', activeDesigners.map(d => ({ id: d.id, name: d.name, role: d.role })));
        setDesigners(activeDesigners);
      } catch (error) {
        console.error('❌ Tasks page: Error loading designers:', error);
        // Use fallback designers if API fails
        const fallbackDesigners = [
          { id: '3', name: 'Mike Designer', role: 'designer', status: 'active' }
        ];
        setDesigners(fallbackDesigners);
      } finally {
        setLoadingDesigners(false);
      }
    };

    loadDesigners();
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
      setLoadingTaskCounts(true);
      console.log('🚀 Loading task counts using bulk endpoint...');
      
      // Use bulk endpoint for much better performance
      let allTasks;
      if (user?.role === 'designer') {
        // For designers, get all their tasks at once
        allTasks = await tasksApi.getByAssignee(user.id);
        console.log('📊 Designer tasks loaded:', allTasks.length);
      } else {
        // For managers, get all tasks across all projects
        allTasks = await tasksApi.getByAssignee(user?.id || ''); // This will get all tasks for managers
        console.log('📊 Manager tasks loaded:', allTasks.length);
      }
      
      // Group tasks by project ID
      const tasksByProject: Record<string, any[]> = {};
      allTasks.forEach(task => {
        if (!tasksByProject[task.projectId]) {
          tasksByProject[task.projectId] = [];
        }
        tasksByProject[task.projectId].push(task);
      });
      
      // Calculate counts for each project
      projectsList.forEach(project => {
        const projectTasks = tasksByProject[project.id] || [];
        const total = projectTasks.length;
        const completed = projectTasks.filter(task => task.status === 'completed').length;
        counts[project.id] = { total, completed };
      });
      
      console.log('✅ Task counts calculated:', counts);
      setProjectTaskCounts(counts);
    } catch (error) {
      console.error('❌ Error loading project task counts:', error);
      // Set default counts for all projects
      projectsList.forEach(project => {
        counts[project.id] = { total: 0, completed: 0 };
      });
      setProjectTaskCounts(counts);
    } finally {
      setLoadingTaskCounts(false);
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
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div>
          <div className="h-8 bg-muted rounded w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded w-96"></div>
        </div>
        
        {/* Projects Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-muted rounded-lg"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-32"></div>
                      <div className="h-3 bg-muted rounded w-48"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-2 bg-muted rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (selectedProject) {
    return (
      <div className="space-y-6">
        {/* Project Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              onClick={() => setSelectedProject(null)}
              className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1"
            >
              ← Back to Projects
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{selectedProject.name}</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="flex items-center space-x-2"
              >
                <LayoutGridIcon size={16} />
                <span>Kanban</span>
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="flex items-center space-x-2"
              >
                <TableIcon size={16} />
                <span>Table</span>
              </Button>
            </div>

          {(user?.role === 'project_manager' || user?.role === 'admin' || user?.role === 'team_head' || user?.role === 'team_lead') && (
              <Button
                onClick={() => setShowCreateTask(true)}
                className="flex items-center space-x-2"
              >
                <PlusIcon size={16} />
                <span>Create Task</span>
              </Button>
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
            key={`kanban-${selectedProject.id}`}
            project={selectedProject}
            currentUser={user!}
            designers={designers}
            loadingDesigners={loadingDesigners}
            onTaskCreated={() => {
              console.log('🔄 Task created, refreshing view...');
              setSelectedProject({ ...selectedProject });
            }}
          />
        ) : (
          <TaskTable
            key={`table-${selectedProject.id}`}
            project={selectedProject}
            currentUser={user!}
            designers={designers}
            loadingDesigners={loadingDesigners}
            onTaskUpdated={() => {
              console.log('🔄 Task updated, refreshing view...');
              setSelectedProject({ ...selectedProject });
            }}
          />
        )}

        {/* Create Task Modal */}
        {showCreateTask && (
          <CreateTaskModal
            project={selectedProject}
            currentUser={user!}
            designers={designers}
            loadingDesigners={loadingDesigners}
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
        <h1 className="text-2xl font-bold text-foreground">Task Management</h1>
        <p className="text-muted-foreground mt-1">
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
            <Card
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FolderIcon size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{project.name}</h3>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {project.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {getProjectStatusLabel(project.status)}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <CalendarIcon size={14} />
                    <span>{project.timeline}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <UserIcon size={14} />
                    <span>{(project.designerIds?.length || 0) + 1} members</span>
                  </div>

                  {/* Task Counts */}
                  <div className="flex items-center justify-between text-sm">
                    {loadingTaskCounts ? (
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-muted rounded-full animate-pulse"></div>
                          <span className="text-muted-foreground">
                            Total: <span className="font-medium text-foreground">-</span>
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-muted rounded-full animate-pulse"></div>
                          <span className="text-muted-foreground">
                            Done: <span className="font-medium text-green-600">-</span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-muted-foreground">
                            Total: <span className="font-medium text-foreground">{taskCount.total}</span>
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-muted-foreground">
                            Done: <span className="font-medium text-green-600">{taskCount.completed}</span>
                          </span>
                        </div>
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {loadingTaskCounts ? '-' : `${completionPercentage}%`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-sm text-primary font-medium hover:text-primary/80">
                    View Tasks →
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {projects.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <FolderIcon size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Projects Found</h3>
            <p className="text-muted-foreground">
              {(user?.role === 'project_manager' || user?.role === 'admin') 
                ? 'Create your first project to start managing tasks'
                : 'You have not been assigned to any projects yet'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}