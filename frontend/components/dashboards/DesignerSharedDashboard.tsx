'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import ProjectTable from '@/components/ProjectTable';
import { projectsApi } from '@/lib/api/projects';
import { TrendingUpIcon, ClockIcon, CheckCircleIcon, UsersIcon, FolderOpen, BarChart3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DesignerSharedDashboardProps {
  projects: Project[];
  userId: string;
  userRole: string;
}

export default function DesignerSharedDashboard({ projects: initialProjects, userId, userRole }: DesignerSharedDashboardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadProjects();
  }, [userId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // Fetch projects assigned to this designer
      const projectsData = await projectsApi.getByUser(userId, userRole);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Since backend already filters projects for designers, we can use all projects
  const assignedProjects = projects;
  const filteredProjects = assignedProjects.filter((project) => {
    const matchesSearch = project.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) || project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project as any).projectCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project as any).project_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getRoleDisplayName = () => {
    switch (userRole) {
      case 'senior_designer':
        return 'Senior Designer';
      case 'designer':
        return 'Designer';
      case 'professional_engineer':
        return 'Professional Engineer';
      case 'auto_cad_drafter':
        return 'Auto CAD Drafter';
      default:
        return 'Designer';
    }
  };

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-background z-20 pb-4 mb-2 -mx-6 px-6">
        <div className="flex items-center justify-between bg-background pt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Design Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your assigned design projects</p>
          </div>
        </div>
      </div>

      {/* Stats - match PM UI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-blue-500 p-3 rounded-lg">
                <FolderOpen className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Assigned Projects</p>
                <p className="text-2xl font-bold text-foreground">{assignedProjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-gray-500 p-3 rounded-lg">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground">{assignedProjects.filter(p => p.status === 'inactive').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-yellow-500 p-3 rounded-lg">
                <TrendingUpIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-foreground">{assignedProjects.filter(p => p.status === 'in_progress').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-purple-500 p-3 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">In Review</p>
                <p className="text-2xl font-bold text-foreground">{assignedProjects.filter(p => p.status === 'review').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-green-500 p-3 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">{assignedProjects.filter(p => p.status === 'completed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Projects - unified list with filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex gap-4 w-full sm:w-auto">
            <div className="w-48">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="inactive">Pending</SelectItem>
                  <SelectItem value="quotation_submitted">Quotation Submitted</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="onhold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[240px]">
              <Label htmlFor="designer-project-search" className="text-xs">Search</Label>
              <Input
                id="designer-project-search"
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter('all');
                setSearchTerm('');
                loadProjects();
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-foreground">My Assigned Projects</h2>
        {filteredProjects.length > 0 ? (
          <ProjectTable projects={filteredProjects} showActions={true} />
        ) : (
          <Card className="text-center py-12">
            <div className="text-muted-foreground mb-2">
              <UsersIcon size={36} className="mx-auto" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">No projects match your filters</h3>
          </Card>
        )}
      </div>
    </div>
  );
}
