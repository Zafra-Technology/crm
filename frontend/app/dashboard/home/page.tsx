'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { User, Project } from '@/types';
import { Task } from '@/components/tasks/KanbanBoard';
import HomeDashboard from '@/components/dashboards/HomeDashboard';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        await Promise.all([
          loadProjects(currentUser),
          loadTasks(currentUser),
        ]);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const loadProjects = async (currentUser: User) => {
    try {
      // Import projects API dynamically to avoid circular dependencies
      const { projectsApi } = await import('@/lib/api/projects');
      const projectsData = await projectsApi.getByUser(currentUser.id, currentUser.role);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    }
  };

  const loadTasks = async (currentUser: User) => {
    try {
      const { tasksApi } = await import('@/lib/api/tasks');
      // Designers fetch tasks assigned to them; others may not have a direct endpoint but bulk gives all
      const data = await tasksApi.getByAssignee(currentUser.id);
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    }
  };

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <HomeDashboard user={user} projects={projects} tasks={tasks} />;
}


