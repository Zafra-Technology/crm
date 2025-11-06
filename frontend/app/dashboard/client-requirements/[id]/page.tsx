'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { User, Project } from '@/types';
import { ClientRequirement } from '@/types';
import { clientRequirementsApi } from '@/lib/api/client-requirements';
import { projectsApi } from '@/lib/api/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProjectAttachments from '@/components/ProjectAttachments';
import type { ProjectAttachment } from '@/types';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileTextIcon, UserIcon, CalendarIcon, ClockIcon, Building2, FolderKanban } from 'lucide-react';
import { formatDate } from '@/lib/utils/dateUtils';

export default function ClientRequirementDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<ClientRequirement | null>(null);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [relatedProjects, setRelatedProjects] = useState<Project[]>([]);
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/');
        return;
      }
      setUser(currentUser);
      if (id) {
        loadRequirement(parseInt(id));
      }
    };
    init();
  }, [router, id]);

  const loadRequirement = async (reqId: number) => {
    try {
      setLoading(true);
      const requirement = await clientRequirementsApi.get(reqId);
      setData(requirement);
      
      // Load related projects
      try {
        console.log('loadRequirement: Loading related projects for requirement ID:', reqId);
        const projectsData = await clientRequirementsApi.getProjects(reqId);
        console.log('loadRequirement: Raw projects data:', projectsData);
        const mappedProjects = projectsData.map((p: any) => projectsApi._mapApiProject(p));
        console.log('loadRequirement: Mapped projects:', mappedProjects);
        setRelatedProjects(mappedProjects);
      } catch (error) {
        console.error('Failed to load related projects:', error);
        setRelatedProjects([]);
      }
    } catch (error) {
      console.error('Failed to load client requirement:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const onChange = (key: string, value: any) => {
    setData((prev: any) => ({ ...(prev || {}), [key]: value }));
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await clientRequirementsApi.update(data.id, {
        client_name: data.client_name !== undefined && data.client_name !== null ? data.client_name : undefined,
        other: data.other !== undefined && data.other !== null ? data.other : undefined,
        layout: data.layout !== undefined && data.layout !== null ? data.layout : undefined,
        structural: data.structural !== undefined && data.structural !== null ? data.structural : undefined,
        electrical: data.electrical !== undefined && data.electrical !== null ? data.electrical : undefined,
        files: data.files && Array.isArray(data.files) ? data.files : undefined,
      });
      
      setEdit(false);
      await loadRequirement(data.id);
    } catch (error) {
      console.error('Failed to save client requirement:', error);
      alert('Failed to save client requirement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEdit(false);
    loadRequirement(parseInt(id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Button onClick={() => router.push('/dashboard/client-requirements')} variant="outline">
          <ArrowLeft size={16} className="mr-2" />
          Back to Client Requirements
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Client requirement not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fileCount = data.file_count || (Array.isArray(data.files) ? data.files.length : 0);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/client-requirements')} className="h-8 w-8">
                <ArrowLeft size={18} />
              </Button>
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-primary" />
                <h1 className="text-2xl font-semibold tracking-tight">{data.client_name || 'Client Requirement'}</h1>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileTextIcon size={16} />
                <span>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span>Created by</span>
                <span className="text-foreground font-medium">{data.created_by || '—'}</span>
                <span>• Updated by</span>
                <span className="text-foreground font-medium">{data.updated_by || '—'}</span>
              </div>
            </div>
          </div>
          {!edit ? (
            <Button onClick={() => setEdit(true)}>Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Client Name */}
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={18} className="text-primary" />
            <Label className="text-sm font-semibold text-muted-foreground">Client Name</Label>
          </div>
          {edit ? (
            <Input 
              value={data.client_name || ''} 
              onChange={e => onChange('client_name', e.target.value)} 
              className="mt-1" 
              placeholder="Enter client name"
            />
          ) : (
            <div className="text-lg font-medium text-foreground mt-1">{data.client_name || '-'}</div>
          )}
        </div>

        {/* Other */}
        <div className="border rounded-lg p-4 bg-card">
          <Label className="text-sm font-semibold text-muted-foreground mb-2 block">Other</Label>
          {edit ? (
            <Textarea 
              value={data.other || ''} 
              onChange={e => onChange('other', e.target.value)} 
              rows={4} 
              className="mt-1" 
              placeholder="Enter other requirements"
            />
          ) : (
            <div className="text-foreground whitespace-pre-wrap break-words min-h-[60px] mt-1 p-3 bg-muted/50 rounded-md">
              {data.other || '-'}
            </div>
          )}
        </div>

        {/* Layout */}
        <div className="border rounded-lg p-4 bg-card">
          <Label className="text-sm font-semibold text-muted-foreground mb-2 block">Layout</Label>
          {edit ? (
            <Textarea 
              value={data.layout || ''} 
              onChange={e => onChange('layout', e.target.value)} 
              rows={4} 
              className="mt-1" 
              placeholder="Enter layout requirements"
            />
          ) : (
            <div className="text-foreground whitespace-pre-wrap break-words min-h-[60px] mt-1 p-3 bg-muted/50 rounded-md">
              {data.layout || '-'}
            </div>
          )}
        </div>

        {/* Structural */}
        <div className="border rounded-lg p-4 bg-card">
          <Label className="text-sm font-semibold text-muted-foreground mb-2 block">Structural</Label>
          {edit ? (
            <Textarea 
              value={data.structural || ''} 
              onChange={e => onChange('structural', e.target.value)} 
              rows={4} 
              className="mt-1" 
              placeholder="Enter structural requirements"
            />
          ) : (
            <div className="text-foreground whitespace-pre-wrap break-words min-h-[60px] mt-1 p-3 bg-muted/50 rounded-md">
              {data.structural || '-'}
            </div>
          )}
        </div>

        {/* Electrical */}
        <div className="border rounded-lg p-4 bg-card">
          <Label className="text-sm font-semibold text-muted-foreground mb-2 block">Electrical</Label>
          {edit ? (
            <Textarea 
              value={data.electrical || ''} 
              onChange={e => onChange('electrical', e.target.value)} 
              rows={4} 
              className="mt-1" 
              placeholder="Enter electrical requirements"
            />
          ) : (
            <div className="text-foreground whitespace-pre-wrap break-words min-h-[60px] mt-1 p-3 bg-muted/50 rounded-md">
              {data.electrical || '-'}
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <ProjectAttachments
          title="Client Requirements Files"
          attachments={(data.files || []).map((f: any, idx: number) => ({
            id: String(idx),
            name: f.name || 'attachment',
            size: Number(f.size || 0),
            type: f.type || 'application/octet-stream',
            url: f.url || '',
            uploadedAt: new Date().toISOString(),
            uploadedBy: data.created_by || '',
          })) as ProjectAttachment[]}
          canEdit={edit}
          onAddAttachment={async (files: File[]) => {
            // Convert files to base64 data URLs and append
            const list = await Promise.all(files.map(f => new Promise<any>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve({ name: f.name, size: f.size, type: f.type, url: String(reader.result) });
              reader.onerror = reject;
              reader.readAsDataURL(f);
            })));
            onChange('files', [...(data?.files || []), ...list]);
          }}
          onRemoveAttachment={(attachmentId: string) => {
            const idx = Number(attachmentId);
            if (!Number.isNaN(idx)) {
              const next = (data?.files || []).filter((_: any, i: number) => i !== idx);
              onChange('files', next);
            }
          }}
        />
      </div>

      <Separator />

      {/* Related Items Section */}
      <div className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Related Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {relatedProjects.length === 0 ? (
              <div className="text-sm text-muted-foreground">No projects linked to this client requirement.</div>
            ) : (
              <div className="divide-y border rounded-md">
                {relatedProjects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FolderKanban size={20} className="text-primary flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                        {p.projectCode && (
                          <div className="text-xs text-muted-foreground truncate">{p.projectCode}</div>
                        )}
                      </div>
                    </div>
                    <Link href={`/dashboard/project/${p.id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
