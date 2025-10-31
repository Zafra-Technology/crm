'use client';

import { useMemo } from 'react';
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

    return { total, active, pending, completed, completionRate, byMonth, byMonthDetails };
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
                        <div className="text-xs text-muted-foreground mt-1">Due {new Date(t.dueDate!).toLocaleDateString()}</div>
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

      {/* KPI Cards */}
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
                        <div className="text-xs text-muted-foreground mt-1">Due {new Date(t.dueDate).toLocaleDateString()}</div>
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


