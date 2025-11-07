'use client';

import React, { useMemo } from 'react';
import { User, Project } from '@/types';
import { Task } from '@/components/tasks/KanbanBoard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import ProjectCard from '@/components/ProjectCard';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ActivityIcon,
  BarChart3Icon,
  BriefcaseIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  ClockIcon,
  LayersIcon,
  LineChartIcon,
  UsersIcon,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/dateUtils';

interface HomeDashboardProps {
  user: User;
  projects: Project[];
  tasks: Task[];
}

export default function HomeDashboard({ user, projects, tasks }: HomeDashboardProps) {
  const projectMetrics = useMemo(() => {
    const total = projects.length;
    const activeStatuses = new Set(['planning', 'in_progress', 'review']);
    const pendingStatuses = new Set(['inactive', 'quotation_submitted']);
    const completed = projects.filter(p => p.status === 'completed').length;
    const active = projects.filter(p => activeStatuses.has(p.status)).length;
    const pending = projects.filter(p => pendingStatuses.has(p.status)).length;
    const pendingRequests = projects.filter(p => p.status === 'inactive').length;
    const inReview = projects.filter(p => p.status === 'review').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Simple timeseries by month based on createdAt (fallback to updatedAt)
    const byMonth = new Array(6).fill(0);
    const byMonthDetails: Array<{ total: number; active: number; pending: number; completed: number }> =
      new Array(6).fill(null).map(() => ({ total: 0, active: 0, pending: 0, completed: 0 }));
    const now = new Date();
    const getValidDate = (iso?: string) => {
      if (!iso) return null;
      const d = new Date(iso);
      return isNaN(d.getTime()) ? null : d;
    };
    projects.forEach(p => {
      const d = getValidDate(p.createdAt) || getValidDate((p as any).created_at) || getValidDate(p.updatedAt) || getValidDate((p as any).updated_at);
      if (!d) return;
      let monthsDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthsDiff < 0) return; // future date, ignore
      if (monthsDiff >= 6) monthsDiff = 5; // clamp into oldest bucket
      const idx = 5 - monthsDiff;
      byMonth[idx] += 1;
      byMonthDetails[idx].total += 1;
      if (p.status === 'completed') byMonthDetails[idx].completed += 1;
      else if (activeStatuses.has(p.status)) byMonthDetails[idx].active += 1;
      else if (pendingStatuses.has(p.status)) byMonthDetails[idx].pending += 1;
    });

    // Fallback: if all buckets are zero but we have projects, distribute evenly to avoid empty chart
    if (byMonth.every(v => v === 0) && total > 0) {
      const filled = new Array(6).fill(0);
      for (let i = 0; i < total; i++) {
        filled[5 - (i % 6)] += 1;
      }
      // Distribute breakdown proportionally per bucket based on overall ratios
      const ratios = {
        active: total ? active / total : 0,
        pending: total ? pending / total : 0,
        completed: total ? completed / total : 0,
      };
      const details = filled.map(bucketTotal => {
        const a = Math.round(bucketTotal * ratios.active);
        const pnd = Math.round(bucketTotal * ratios.pending);
        let comp = Math.round(bucketTotal * ratios.completed);
        // Adjust rounding to match total
        let sum = a + pnd + comp;
        if (sum !== bucketTotal) comp += (bucketTotal - sum);
        return { total: bucketTotal, active: a, pending: pnd, completed: comp };
      });
      return { total, active, pending, completed, completionRate, byMonth: filled, byMonthDetails: details };
    }

    return { total, active, pending, completed, completionRate, pendingRequests, inReview, byMonth, byMonthDetails };
  }, [projects]);

  const taskMetrics = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const review = tasks.filter(t => t.status === 'review').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, todo, inProgress, review, completed, completionRate };
  }, [tasks]);

  const roleExtras = useMemo(() => {
    switch (user.role) {
      case 'client':
      case 'client_team_member':
        return [
          { label: 'Quotations Submitted', value: projects.filter(p => p.status === 'quotation_submitted').length, icon: ClipboardListIcon },
          { label: 'Active Projects', value: projectMetrics.active, icon: ActivityIcon },
        ];
      case 'project_manager':
      case 'assistant_project_manager':
      case 'team_head':
      case 'team_lead':
      case 'admin':
        return [
          { label: 'Pending Requests', value: projects.filter(p => p.status === 'inactive').length, icon: ClockIcon },
          { label: 'In Review', value: projects.filter(p => p.status === 'review').length, icon: LayersIcon },
        ];
      case 'designer':
      case 'senior_designer':
      case 'professional_engineer':
      case 'auto_cad_drafter':
        return [
          { label: 'My Tasks (Today)', value: tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString()).length, icon: ClipboardListIcon },
          { label: 'In Progress', value: taskMetrics.inProgress, icon: ActivityIcon },
        ];
      case 'digital_marketing':
        return [
          { label: 'Campaigns (placeholder)', value: 3, icon: BarChart3Icon },
          { label: 'Leads (placeholder)', value: 12, icon: UsersIcon },
        ];
      default:
        return [
          { label: 'Profile Completeness', value: 80, icon: UsersIcon },
          { label: 'System Notices', value: 2, icon: ClipboardListIcon },
        ];
    }
  }, [user.role, projects, tasks, projectMetrics.active, taskMetrics.inProgress]);

  const renderRoleSections = () => {
    const toDate = (v?: string) => {
      if (!v) return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };

    const daysAgo = (d: Date) => Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));

    const projectsAtRisk = [...projects]
      .filter(p => ['review', 'inactive'].includes(p.status))
      .sort((a, b) => {
        const da = toDate(a.updatedAt) || toDate((a as any).updated_at) || new Date(0);
        const db = toDate(b.updatedAt) || toDate((b as any).updated_at) || new Date(0);
        return db.getTime() - da.getTime();
      })
      .slice(0, 6);

    const statusCounts = (['inactive','planning','in_progress','review','completed'] as const).map(s => ({
      status: s,
      count: projects.filter(p => p.status === s).length,
    }));

    const upcomingTasks = tasks
      .filter(t => t.dueDate)
      .map(t => ({ ...t, due: toDate(t.dueDate!) }))
      .filter(t => t.due && t.due.getTime() >= Date.now() - 24*60*60*1000) // today or future
      .sort((a, b) => (a.due!.getTime() - b.due!.getTime()))
      .slice(0, 8);

    const recentlyUpdated = [...projects]
      .map(p => ({ p, d: toDate(p.updatedAt) || toDate((p as any).updated_at) || new Date(0) }))
      .sort((a, b) => b.d.getTime() - a.d.getTime())
      .slice(0, 6)
      .map(x => x.p);

    const SectionHeader = ({ title, href }: { title: string; href?: string }) => (
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {href && <Link href={href} className="text-sm text-primary hover:underline">View all</Link>}
      </div>
    );

    const StatusBadge = ({ s }: { s: string }) => (
      <Badge variant="secondary" className="text-xs capitalize">{s.replace('_',' ')}</Badge>
    );

    if (['project_manager','assistant_project_manager','team_head','team_lead','admin'].includes(user.role)) {
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <SectionHeader title="Projects at risk" href="/dashboard/pending-requests" />
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-0">
                {projectsAtRisk.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No projects at risk.</div>
                ) : (
                  <div className="divide-y">
                    {projectsAtRisk.map(p => {
                      const ud = toDate(p.updatedAt) || toDate((p as any).updated_at);
                      return (
                        <div key={p.id} className="p-4 flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{ud ? `${daysAgo(ud)} days ago` : '—'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge s={p.status} />
                            <Link href={`/dashboard/project/${p.id}`} className="text-sm text-primary hover:underline">Open</Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <SectionHeader title="Pipeline overview" />
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-3">
                  {statusCounts.map(row => (
                    <div key={row.status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{row.status.replace('_',' ')}</span>
                        <Badge variant="secondary">{row.count}</Badge>
                      </div>
                      <div className="w-full h-2 rounded bg-accent overflow-hidden">
                        <div className="h-2 bg-primary" style={{ width: `${projects.length ? Math.min(100, Math.round((row.count / Math.max(1, projects.length)) * 100)) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (['designer','senior_designer','professional_engineer','auto_cad_drafter'].includes(user.role)) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="hover:shadow-sm transition-shadow">
            <CardHeader><CardTitle className="text-base">Upcoming deadlines</CardTitle></CardHeader>
            <CardContent className="p-0">
              {upcomingTasks.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No upcoming tasks.</div>
              ) : (
                <div className="divide-y">
                  {upcomingTasks.map(t => (
                    <div key={t.id} className="p-4 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{t.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">Due {formatDate(t.dueDate!)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs capitalize">{t.priority}</Badge>
                        <Badge className="text-xs capitalize">{t.status.replace('_',' ')}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-shadow">
            <CardHeader><CardTitle className="text-base">Recently updated projects</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentlyUpdated.slice(0, 4).map(p => (
                  <ProjectCard key={p.id} project={p} showActions={false} />
                ))}
                {recentlyUpdated.length === 0 && (
                  <div className="text-sm text-muted-foreground">No recent updates.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (['client','client_team_member'].includes(user.role)) {
      const quotationProjects = projects.filter(p => ['quotation_submitted','inactive'].includes(p.status)).slice(0, 6);
      const activeProjects = projects.filter(p => ['planning','in_progress','review'].includes(p.status)).slice(0, 6);
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <SectionHeader title="Quotations & pending" href="/dashboard" />
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-0">
                {quotationProjects.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No pending quotations.</div>
                ) : (
                  <div className="divide-y">
                    {quotationProjects.map(p => (
                      <div key={p.id} className="p-4 flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">{p.projectType}</div>
                        </div>
                        <StatusBadge s={p.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <SectionHeader title="Active projects" href="/dashboard" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeProjects.map(p => (
                <ProjectCard key={p.id} project={p} showActions={false} />
              ))}
              {activeProjects.length === 0 && (
                <Card><CardContent className="p-6 text-sm text-muted-foreground">No active projects.</CardContent></Card>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Other roles: simple helpful blocks
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader><CardTitle className="text-base">System notices</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">No new notices.</CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader><CardTitle className="text-base">Quick links</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/dashboard"><Button variant="default">Projects</Button></Link>
            <Link href="/dashboard/messages"><Button variant="secondary">Messages</Button></Link>
            <Link href="/dashboard/profile"><Button variant="outline">Profile</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Multi-role dashboard - Admin, Designer, Team Lead, Project Manager, Team Head
  if (['admin', 'designer', 'senior_designer', 'auto_cad_drafter', 'team_lead', 'team_head', 'project_manager'].includes(user.role)) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <Card className="border bg-primary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
                <p className="opacity-90 text-sm mt-1">
                  {user.role === 'admin' ? 'Admin Dashboard Overview' :
                   user.role === 'project_manager' ? 'Project Manager Dashboard' :
                   user.role === 'team_lead' ? 'Team Lead Dashboard' :
                   ['designer', 'senior_designer', 'auto_cad_drafter'].includes(user.role) ? 'Designer Dashboard' :
                   'Dashboard Overview'}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Badge variant="secondary" className="capitalize bg-primary-foreground/15 text-primary-foreground border-none">
                  {user.role.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Single-line small cards for admin */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Projects Card */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground mb-1">Projects</div>
                <div className="text-2xl font-bold text-foreground">{projectMetrics.total}</div>
              </div>
            </CardContent>
          </Card>

          {/* Active Card */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground mb-1">Active</div>
                <div className="text-2xl font-bold text-foreground">{projectMetrics.active}</div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Card */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground mb-1">Pending</div>
                <div className="text-2xl font-bold text-foreground">{projectMetrics.pending}</div>
              </div>
            </CardContent>
          </Card>

          {/* Completed Card */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground mb-1">Completed</div>
                <div className="text-2xl font-bold text-foreground">{projectMetrics.completed}</div>
                <div className="text-xs text-muted-foreground mt-1">{projectMetrics.completionRate}% completion rate</div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Requests Card */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground mb-1">Pending Requests</div>
                <div className="text-2xl font-bold text-foreground">{projectMetrics.pendingRequests}</div>
              </div>
            </CardContent>
          </Card>

          {/* In Review Card */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground mb-1">In Review</div>
                <div className="text-2xl font-bold text-foreground">{projectMetrics.inReview}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's Projects</CardTitle>
            <p className="text-sm text-muted-foreground">Projects created today</p>
          </CardHeader>
          <CardContent>
            {(() => {
              const today = new Date().toDateString();
              const todayProjects = projects.filter(p => {
                const projectDate = p.createdAt ? new Date(p.createdAt).toDateString() : 
                                   (p as any).created_at ? new Date((p as any).created_at).toDateString() : null;
                return projectDate === today;
              });

              if (todayProjects.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    No projects created today
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-border bg-muted/50">
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[60px]">
                          S.No
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[180px]">
                          Project Title
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[120px]">
                          Project Status
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[100px]">
                          Priority
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[140px]">
                          Services
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[200px]">
                          Project Address
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[80px]">
                          State
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[120px]">
                          Project Type
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[120px]">
                          Number of<br />Errors
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[120px]">
                          Team Lead
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[120px]">
                          Designer
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[120px]">
                          Revision by
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[120px]">
                          Design Status
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[130px]">
                          Client<br />Requirement
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[130px]">
                          Module Data<br />Sheet
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[130px]">
                          Inverter Data<br />Sheet
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[130px]">
                          Mounting Data<br />Sheet
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayProjects.map((project, index) => (
                        <tr key={project.id} className="border-b hover:bg-accent/30 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-center">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <Link href={`/dashboard/project/${project.id}`} className="text-primary hover:underline font-medium">
                              {project.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <Badge variant="secondary" className="capitalize text-xs">
                              {project.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <Badge 
                              variant={project.priority === 'high' ? 'destructive' : 
                                      project.priority === 'medium' ? 'default' : 'secondary'} 
                              className="capitalize text-xs"
                            >
                              {project.priority || 'Normal'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <div className="max-w-[140px] truncate mx-auto" title={project.services?.join(', ')}>
                              {project.services?.join(', ') || '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <div className="max-w-[200px] truncate mx-auto" title={project.address}>
                              {project.address || '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {project.state || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-center capitalize">
                            {project.type || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent text-foreground font-medium">
                              {project.errorCount || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {project.teamLead || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {project.designer || project.assignedDesigner || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {project.revisionBy || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <Badge variant="outline" className="capitalize text-xs">
                              {project.designStatus || 'Not Started'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {project.clientRequirement ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground text-lg">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {project.moduleDataSheet ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground text-lg">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {project.inverterDataSheet ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground text-lg">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {project.mountingDataSheet ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground text-lg">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Reports Section - Hidden for Designers */}
        {!['designer', 'senior_designer', 'auto_cad_drafter'].includes(user.role) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reports</CardTitle>
            <p className="text-sm text-muted-foreground">Generate performance reports by time period</p>
          </CardHeader>
          <CardContent>
            {(() => {
              const [selectedReportType, setSelectedReportType] = React.useState<'overall' | 'monthly' | 'quarterly' | 'yearly'>('overall');
              const [selectedYear, setSelectedYear] = React.useState<string>('');
              const [selectedMonth, setSelectedMonth] = React.useState<string>('');
              const [selectedQuarter, setSelectedQuarter] = React.useState<string>('');
              const [reportData, setReportData] = React.useState<any[]>([]);
              const [chartData, setChartData] = React.useState<any[]>([]);
              const [isLoading, setIsLoading] = React.useState(false);

              const quarters = [
                { value: 'Q1', label: 'Q1 (July - September)', months: [7, 8, 9] },
                { value: 'Q2', label: 'Q2 (October - December)', months: [10, 11, 12] },
                { value: 'Q3', label: 'Q3 (January - March)', months: [1, 2, 3] },
                { value: 'Q4', label: 'Q4 (April - June)', months: [4, 5, 6] }
              ];

              const months = [
                { value: '1', label: 'January' }, { value: '2', label: 'February' }, { value: '3', label: 'March' },
                { value: '4', label: 'April' }, { value: '5', label: 'May' }, { value: '6', label: 'June' },
                { value: '7', label: 'July' }, { value: '8', label: 'August' }, { value: '9', label: 'September' },
                { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' }
              ];

              const years = Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return { value: year.toString(), label: year.toString() };
              });

              const handleReportTypeChange = (type: 'overall' | 'monthly' | 'quarterly' | 'yearly') => {
                // Toggle functionality - if same card clicked, reset to overall
                if (selectedReportType === type && type !== 'overall') {
                  setSelectedReportType('overall');
                  setSelectedYear('');
                  setSelectedMonth('');
                  setSelectedQuarter('');
                  fetchReportData('overall', '', '');
                } else {
                  setSelectedReportType(type);
                  if (type === 'overall') {
                    setSelectedYear('');
                    setSelectedMonth('');
                    setSelectedQuarter('');
                    fetchReportData(type, '', '');
                  } else {
                    // Reset filters when switching report types
                    setSelectedYear('');
                    setSelectedMonth('');
                    setSelectedQuarter('');
                  }
                }
              };

              const handleYearChange = (year: string) => {
                setSelectedYear(year);
              };

              const handleMonthChange = (month: string) => {
                setSelectedMonth(month);
              };

              const handleQuarterChange = (quarter: string) => {
                setSelectedQuarter(quarter);
              };

              const generateReport = () => {
                if (selectedReportType === 'overall') {
                  fetchReportData('overall', '', '');
                } else if (selectedReportType === 'monthly' && selectedYear && selectedMonth) {
                  fetchReportData('monthly', selectedYear, selectedMonth);
                } else if (selectedReportType === 'quarterly' && selectedYear && selectedQuarter) {
                  fetchReportData('quarterly', selectedYear, selectedQuarter);
                } else if (selectedReportType === 'yearly' && selectedYear) {
                  fetchReportData('yearly', selectedYear, '');
                }
              };

              // Fetch report data from backend
              const fetchReportData = async (reportType: string, year: string, period: string) => {
                setIsLoading(true);
                try {
                  const params = new URLSearchParams();
                  params.append('type', reportType);
                  
                  if (reportType === 'monthly' && year && period) {
                    params.append('year', year);
                    params.append('period', period); // month number
                  } else if (reportType === 'quarterly' && year && period) {
                    params.append('year', year);
                    params.append('period', period); // quarter (Q1, Q2, etc.)
                  } else if (reportType === 'yearly' && year) {
                    params.append('period', year); // year
                  }

                  const response = await fetch(`http://localhost:8000/api/projects/reports/designer-performance?${params}`, {
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`,
                      'Content-Type': 'application/json',
                    },
                  });

                  if (response.ok) {
                    const data = await response.json();
                    setReportData(data.designers || []);
                    
                    // Also fetch chart data
                    const chartResponse = await fetch(`http://localhost:8000/api/projects/reports/chart-data?${params}`, {
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                      },
                    });
                    
                    if (chartResponse.ok) {
                      const chartData = await chartResponse.json();
                      setChartData(chartData.periods || []);
                    } else {
                      // Fallback: generate chart data from projects
                      generateChartDataFromProjects(reportType, year, period);
                    }
                  } else {
                    console.error('Failed to fetch report data');
                    setReportData([]);
                  }
                } catch (error) {
                  console.error('Error fetching report data:', error);
                  setReportData([]);
                } finally {
                  setIsLoading(false);
                }
              };

              // Generate chart data from projects as fallback
              const generateChartDataFromProjects = (reportType: string, year: string, period: string) => {
                // Calculate project counts for 4 periods based on report type
                const currentProjects = projects.length; // Using available projects data
                
                // Generate sample data based on report type - replace with real calculation
                let chartPeriods = [];
                
                if (reportType === 'overall') {
                  // For overall, show last 4 days
                  chartPeriods = [
                    { label: 'Day 1', value: Math.floor(currentProjects * 0.2) },
                    { label: 'Day 2', value: Math.floor(currentProjects * 0.4) },
                    { label: 'Day 3', value: Math.floor(currentProjects * 0.7) },
                    { label: 'Day 4', value: currentProjects }
                  ];
                } else if (reportType === 'monthly') {
                  // For monthly, show 4 weeks
                  chartPeriods = [
                    { label: 'Week 1', value: Math.floor(currentProjects * 0.15) },
                    { label: 'Week 2', value: Math.floor(currentProjects * 0.35) },
                    { label: 'Week 3', value: Math.floor(currentProjects * 0.65) },
                    { label: 'Week 4', value: currentProjects }
                  ];
                } else if (reportType === 'quarterly') {
                  // For quarterly, show 3 months + current
                  chartPeriods = [
                    { label: 'Month 1', value: Math.floor(currentProjects * 0.25) },
                    { label: 'Month 2', value: Math.floor(currentProjects * 0.5) },
                    { label: 'Month 3', value: Math.floor(currentProjects * 0.75) },
                    { label: 'Month 4', value: currentProjects }
                  ];
                } else if (reportType === 'yearly') {
                  // For yearly, show 4 quarters
                  chartPeriods = [
                    { label: 'Quarter 1', value: Math.floor(currentProjects * 0.2) },
                    { label: 'Quarter 2', value: Math.floor(currentProjects * 0.45) },
                    { label: 'Quarter 3', value: Math.floor(currentProjects * 0.7) },
                    { label: 'Quarter 4', value: currentProjects }
                  ];
                }
                
                setChartData(chartPeriods);
              };

              // Load overall data on component mount
              React.useEffect(() => {
                fetchReportData('overall', '', '');
              }, []);

              return (
                <div className="space-y-6">
                  {/* Report Type Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className={`cursor-pointer transition-all ${selectedReportType === 'overall' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/50'}`} 
                          onClick={() => handleReportTypeChange('overall')}>
                      <CardContent className="p-4 text-center">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Overall Report</div>
                        <div className="text-lg font-semibold">All Time</div>
                      </CardContent>
                    </Card>

                    <Card className={`cursor-pointer transition-all ${selectedReportType === 'monthly' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/50'}`} 
                          onClick={() => handleReportTypeChange('monthly')}>
                      <CardContent className="p-4 text-center">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Monthly Report</div>
                        <div className="text-lg font-semibold">Select Month</div>
                      </CardContent>
                    </Card>

                    <Card className={`cursor-pointer transition-all ${selectedReportType === 'quarterly' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/50'}`} 
                          onClick={() => handleReportTypeChange('quarterly')}>
                      <CardContent className="p-4 text-center">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Quarter Report</div>
                        <div className="text-lg font-semibold">Select Quarter</div>
                      </CardContent>
                    </Card>

                    <Card className={`cursor-pointer transition-all ${selectedReportType === 'yearly' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/50'}`} 
                          onClick={() => handleReportTypeChange('yearly')}>
                      <CardContent className="p-4 text-center">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Yearly Report</div>
                        <div className="text-lg font-semibold">Select Year</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Period Selection Dropdowns */}
                  {selectedReportType !== 'overall' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        {/* Year Selection - Required for all non-overall reports */}
                        <div className="flex-1">
                          <label className="block text-sm font-medium mb-2">Select Year</label>
                          <select 
                            value={selectedYear} 
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="w-full p-3 border border-border rounded-md bg-background text-foreground"
                          >
                            <option value="">Select Year</option>
                            {years.map(year => (
                              <option key={year.value} value={year.value}>{year.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Month Selection - Only for monthly reports */}
                        {selectedReportType === 'monthly' && (
                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-2">Select Month</label>
                            <select 
                              value={selectedMonth} 
                              onChange={(e) => handleMonthChange(e.target.value)}
                              className="w-full p-3 border border-border rounded-md bg-background text-foreground"
                              disabled={!selectedYear}
                            >
                              <option value="">Select Month</option>
                              {months.map(month => (
                                <option key={month.value} value={month.value}>{month.label}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Quarter Selection - Only for quarterly reports */}
                        {selectedReportType === 'quarterly' && (
                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-2">Select Quarter</label>
                            <select 
                              value={selectedQuarter} 
                              onChange={(e) => handleQuarterChange(e.target.value)}
                              className="w-full p-3 border border-border rounded-md bg-background text-foreground"
                              disabled={!selectedYear}
                            >
                              <option value="">Select Quarter</option>
                              {quarters.map(quarter => (
                                <option key={quarter.value} value={quarter.value}>{quarter.label}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Generate Report Button */}
                      <div className="flex justify-end">
                        <Button 
                          onClick={generateReport} 
                          disabled={
                            !selectedYear || 
                            (selectedReportType === 'monthly' && !selectedMonth) ||
                            (selectedReportType === 'quarterly' && !selectedQuarter)
                          } 
                          variant="default"
                        >
                          Generate Report
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Report Table - Always Visible */}
                  <div className="mt-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">
                        {selectedReportType === 'overall' ? 'Overall Report - All Time' :
                         selectedReportType === 'monthly' && selectedYear && selectedMonth ? 
                         `Monthly Report - ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}` :
                         selectedReportType === 'quarterly' && selectedYear && selectedQuarter ? 
                         `Quarterly Report - ${quarters.find(q => q.value === selectedQuarter)?.label} ${selectedYear}` :
                         selectedReportType === 'yearly' && selectedYear ? 
                         `Yearly Report - ${selectedYear}` :
                         'Select filters to generate report'}
                      </h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b-2 border-border bg-muted/50">
                            <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[140px]">
                              Designer Name
                            </th>
                            <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[120px]">
                              Projects Count
                            </th>
                            <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[120px]">
                              Revision Count
                            </th>
                            <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[120px]">
                              Average Time
                            </th>
                            <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[120px]">
                              Average Error
                            </th>
                            <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[120px]">
                              Design Errors
                            </th>
                            <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[140px]">
                              Better Time<br />Management
                            </th>
                            <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[140px]">
                              AHJ/Utility<br />Rejections
                            </th>
                            <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[140px]">
                              Time Management<br />%
                            </th>
                            <th className="text-center px-4 py-4 text-sm font-semibold text-foreground min-w-[140px]">
                              Quality of Work<br />%
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {isLoading ? (
                            <tr>
                              <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                                Loading report data...
                              </td>
                            </tr>
                          ) : reportData.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                                No data available for the selected period
                              </td>
                            </tr>
                          ) : (
                            reportData.map((designer, index) => (
                              <tr key={index} className="border-b hover:bg-accent/30 transition-colors">
                                <td className="px-4 py-3 text-sm text-center font-medium">
                                  {designer.designerName}
                                </td>
                                <td className="px-4 py-3 text-sm text-center">
                                  {designer.projectsCount}
                                </td>
                                <td className="px-4 py-3 text-sm text-center">
                                  {designer.revisionCount}
                                </td>
                                <td className="px-4 py-3 text-sm text-center">
                                  {designer.averageTime}
                                </td>
                                <td className="px-4 py-3 text-sm text-center">
                                  {designer.averageError}
                                </td>
                                <td className="px-4 py-3 text-sm text-center">
                                  {designer.designErrors}
                                </td>
                                <td className="px-4 py-3 text-sm text-center">
                                  {designer.betterTimeManagement}
                                </td>
                                <td className="px-4 py-3 text-sm text-center">
                                  {designer.ahjUtilityRejections}
                                </td>
                                <td className="px-4 py-3 text-sm text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <span>{designer.timeManagementPercent}%</span>
                                    <div className="w-12 h-2 bg-accent rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-primary rounded-full" 
                                        style={{ width: `${designer.timeManagementPercent}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <span>{designer.qualityOfWorkPercent}%</span>
                                    <div className="w-12 h-2 bg-accent rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-green-500 rounded-full" 
                                        style={{ width: `${designer.qualityOfWorkPercent}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                </div>
              );
            })()}
          </CardContent>
        </Card>
        )}

        {/* Performance Chart Section - Hidden for Designers */}
        {!['designer', 'senior_designer', 'auto_cad_drafter'].includes(user.role) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project Volume vs. Date</CardTitle>
            <p className="text-sm text-muted-foreground">Project trend analysis over time</p>
          </CardHeader>
          <CardContent>
            <div className="w-full h-80">
              {/* Chart Container */}
              <div className="relative w-full h-full">
                {/* Chart SVG */}
                <svg className="w-full h-full" viewBox="0 0 800 300">
                  {/* Grid Lines - Horizontal */}
                  <defs>
                    <pattern id="grid" width="80" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 80 0 L 0 0 0 30" fill="none" stroke="rgb(229 231 235)" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {/* Y-axis */}
                  <line x1="60" y1="20" x2="60" y2="260" stroke="rgb(107 114 128)" strokeWidth="2"/>
                  
                  {/* X-axis */}
                  <line x1="60" y1="260" x2="740" y2="260" stroke="rgb(107 114 128)" strokeWidth="2"/>
                  
                  {/* Y-axis Labels - Dynamic based on data */}
                  {(() => {
                    // Calculate max value for Y-axis scaling
                    const currentDate = new Date();
                    const last4MonthsData = [];
                    
                    for (let i = 3; i >= 0; i--) {
                      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                      const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
                      
                      const monthProjects = projects.filter(project => {
                        const projectDate = project.createdAt ? new Date(project.createdAt) : 
                                           (project as any).created_at ? new Date((project as any).created_at) : null;
                        if (!projectDate || isNaN(projectDate.getTime())) return false;
                        return projectDate >= monthDate && projectDate < nextMonthDate;
                      });
                      
                      last4MonthsData.push(monthProjects.length);
                    }
                    
                    const maxValue = Math.max(...last4MonthsData, 10);
                    const step = Math.ceil(maxValue / 4);
                    
                    return (
                      <>
                        <text x="45" y="265" textAnchor="end" className="text-xs fill-muted-foreground">0</text>
                        <text x="45" y="212" textAnchor="end" className="text-xs fill-muted-foreground">{step}</text>
                        <text x="45" y="158" textAnchor="end" className="text-xs fill-muted-foreground">{step * 2}</text>
                        <text x="45" y="104" textAnchor="end" className="text-xs fill-muted-foreground">{step * 3}</text>
                        <text x="45" y="50" textAnchor="end" className="text-xs fill-muted-foreground">{maxValue}</text>
                      </>
                    );
                  })()}
                  
                  {/* Y-axis Title */}
                  <text x="25" y="140" textAnchor="middle" className="text-sm font-medium fill-foreground" transform="rotate(-90 25 140)">
                    Project Volume
                  </text>
                  
                  {/* X-axis Labels - Fixed as requested */}
                  <text x="170" y="280" textAnchor="middle" className="text-xs fill-muted-foreground">Day/Week/Month 1</text>
                  <text x="320" y="280" textAnchor="middle" className="text-xs fill-muted-foreground">Day/Week/Month 2</text>
                  <text x="470" y="280" textAnchor="middle" className="text-xs fill-muted-foreground">Day/Week/Month 3</text>
                  <text x="620" y="280" textAnchor="middle" className="text-xs fill-muted-foreground">Day/Week/Month 4</text>
                  
                  {/* X-axis Title */}
                  <text x="400" y="295" textAnchor="middle" className="text-sm font-medium fill-foreground">
                    Duration
                  </text>
                  
                  {/* Data Points and Line - Orange Color */}
                  {(() => {
                    // Calculate real data based on last 4 months
                    const calculateLast4MonthsData = () => {
                      const currentDate = new Date();
                      const monthsData = [];
                      
                      for (let i = 3; i >= 0; i--) {
                        const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                        const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
                        
                        // Filter projects created in this month
                        const monthProjects = projects.filter(project => {
                          const projectDate = project.createdAt ? new Date(project.createdAt) : 
                                             (project as any).created_at ? new Date((project as any).created_at) : null;
                          
                          if (!projectDate || isNaN(projectDate.getTime())) return false;
                          
                          return projectDate >= monthDate && projectDate < nextMonthDate;
                        });
                        
                        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
                        monthsData.push({
                          month: monthName,
                          count: monthProjects.length
                        });
                      }
                      
                      return monthsData;
                    };
                    
                    const last4MonthsData = calculateLast4MonthsData();
                    const maxValue = Math.max(...last4MonthsData.map(d => d.count), 10); // Minimum scale of 10
                    const chartHeight = 240;
                    const chartBottom = 260;
                    
                    const dataPoints = last4MonthsData.map((monthData, index) => {
                      const x = 170 + (index * 150); // Spread points evenly
                      const normalizedValue = Math.max(0, monthData.count / maxValue); // Normalize to 0-1
                      const y = chartBottom - (normalizedValue * chartHeight * 0.8); // Convert to chart coordinates, 80% of available height
                      return { 
                        x, 
                        y, 
                        value: monthData.count,
                        month: monthData.month
                      };
                    });
                    
                    const linePoints = dataPoints.map(point => `${point.x},${point.y}`).join(' ');
                    
                    return (
                      <g>
                        {/* Orange Line */}
                        <polyline
                          points={linePoints}
                          fill="none"
                          stroke="rgb(251 146 60)" // Orange color
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        
                        {/* Data Point Circles */}
                        {dataPoints.map((point, index) => (
                          <g key={index}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="6"
                              fill="rgb(251 146 60)" // Orange color
                              stroke="white"
                              strokeWidth="2"
                            />
                            {/* Value labels */}
                            <text
                              x={point.x}
                              y={point.y - 12}
                              textAnchor="middle"
                              className="text-xs font-medium fill-foreground"
                            >
                              {point.value}
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  })()}
                  
                  {/* Chart Area Background */}
                  <rect x="60" y="20" width="680" height="240" fill="transparent" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border bg-primary text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
              <p className="opacity-90 text-sm mt-1">Here's an overview tailored for your role</p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="secondary" className="capitalize bg-primary-foreground/15 text-primary-foreground border-none">{user.role.replace('_', ' ')}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards (hidden for digital marketing) */}
      {user.role !== 'digital_marketing' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-sm transition-shadow">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">{projectMetrics.total}</div>
              <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center"><BriefcaseIcon className="text-foreground/70" /></div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-shadow">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">{projectMetrics.active}</div>
              <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center"><ActivityIcon className="text-foreground/70" /></div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-shadow">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">{projectMetrics.pending}</div>
              <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center"><ClockIcon className="text-foreground/70" /></div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-shadow">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold text-foreground">{projectMetrics.completed}</div>
                <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center"><CheckCircleIcon className="text-foreground/70" /></div>
              </div>
              <Progress value={projectMetrics.completionRate} />
              <div className="text-xs text-muted-foreground mt-1">{projectMetrics.completionRate}% completion rate</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Role-specific extras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {roleExtras.map((item, idx) => (
          <Card key={idx} className="hover:shadow-sm transition-shadow">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">{item.value}</div>
              <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center"><item.icon className="text-foreground/70" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 hover:shadow-sm transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LineChartIcon size={18} /> Projects in last 6 months</CardTitle>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <div className="h-40 flex items-end gap-3">
                {projectMetrics.byMonth.map((v, i) => {
                  const max = Math.max(1, ...projectMetrics.byMonth);
                  const height = Math.round((v / max) * 100);
                  const d = projectMetrics.byMonthDetails ? projectMetrics.byMonthDetails[i] : { total: v, active: 0, pending: 0, completed: 0 };
                  return (
                    <div key={i} className="flex-1 h-full flex flex-col items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full bg-accent rounded-md cursor-default transition-all hover:ring-2 hover:ring-primary/30" style={{ height: `${height}%`, minHeight: v > 0 ? '6%' : '0' }}>
                            <div className="w-full h-full rounded-md bg-primary" style={{ height: '100%' }} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center" className="p-0 border bg-background shadow-md rounded-md">
                          <div className="p-3">
                            <div className="text-xs font-medium text-foreground mb-2">Month M{i + 1}</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <span className="inline-block w-2 h-2 rounded-full bg-primary"></span>
                                  <span>Total</span>
                                </div>
                                <div className="font-semibold text-foreground">{d.total}</div>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <span className="inline-block w-2 h-2 rounded-full bg-primary/80"></span>
                                  <span>Active</span>
                                </div>
                                <div className="font-semibold text-foreground">{d.active}</div>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <span className="inline-block w-2 h-2 rounded-full bg-primary/60"></span>
                                  <span>Pending</span>
                                </div>
                                <div className="font-semibold text-foreground">{d.pending}</div>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <span className="inline-block w-2 h-2 rounded-full bg-primary/40"></span>
                                  <span>Completed</span>
                                </div>
                                <div className="font-semibold text-foreground">{d.completed}</div>
                              </div>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-xs text-muted-foreground">M{i + 1}</span>
                    </div>
                  );
                })}
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3Icon size={18} /> Tasks by status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[{ label: 'To Do', value: taskMetrics.todo }, { label: 'In Progress', value: taskMetrics.inProgress }, { label: 'Review', value: taskMetrics.review }, { label: 'Completed', value: taskMetrics.completed }].map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <Badge variant="secondary">{row.value}</Badge>
                  </div>
                  <div className="w-full h-2 rounded bg-accent overflow-hidden">
                    <div className="h-2 bg-primary" style={{ width: `${taskMetrics.total ? Math.min(100, Math.round((row.value / Math.max(1, taskMetrics.total)) * 100)) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role-specific sections */}
      {renderRoleSections()}

      {/* Recent Projects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent projects</h2>
          <Link href="/dashboard" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {projects.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">No projects yet.</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.slice(0, 6).map((p) => (
              <ProjectCard key={p.id} project={p} showActions={false} />
            ))}
          </div>
        )}
      </div>

      {/* My Tasks (hidden for admin/PM/APM) */}
      {!(['admin', 'project_manager', 'assistant_project_manager', 'client', 'client_team_member'].includes(user.role)) && (
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">My tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-sm text-muted-foreground">No tasks assigned.</div>
            ) : (
              <div className="space-y-3">
                {tasks.slice(0, 8).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-md border bg-background hover:bg-accent/50 transition-colors">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{t.title}</div>
                      {t.dueDate && (
                        <div className="text-xs text-muted-foreground mt-1">Due {formatDate(t.dueDate)}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">{t.priority}</Badge>
                      <Badge className="text-xs capitalize">{t.status.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                ))}
                {tasks.length > 8 && (
                  <Link href="/dashboard/tasks" className="block text-center text-sm text-primary hover:underline">View more</Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard">
              <Button variant="default">Go to Projects</Button>
            </Link>
            <Link href="/dashboard/tasks">
              <Button variant="secondary">Open Tasks</Button>
            </Link>
            <Link href="/dashboard/messages">
              <Button variant="outline">Open Messages</Button>
            </Link>
            {['project_manager', 'assistant_project_manager', 'admin', 'operation_manager'].includes(user.role) && (
              <Link href="/dashboard/pending-requests">
                <Button variant="ghost">Review Requests</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity */}
      <Card className="hover:shadow-sm transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ActivityIcon size={18} /> Recent highlights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-md bg-accent flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tasks completion</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{taskMetrics.completionRate}%</span>
              </div>
            </div>
            <div className="p-3 rounded-md bg-accent flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Projects completion</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{projectMetrics.completionRate}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


