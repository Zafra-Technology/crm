'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ahjApi } from '@/lib/api/ahj';
import Link from 'next/link';
import type { Project } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FileViewerModal from '@/components/modals/FileViewerModal';
import ProjectAttachments from '@/components/ProjectAttachments';
import type { ProjectAttachment } from '@/types';
import { Badge } from '@/components/ui/badge';
import { MapPin, Wind, Snowflake, ShieldCheck, Globe, ClipboardList, Building2, Plug, Home, Flame, ArrowLeft, FolderKanban } from 'lucide-react';

export default function AhjDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [data, setData] = useState<any | null>(null);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [codes, setCodes] = useState<{ electric: string[]; building: string[]; residential: string[]; fire: string[] }>({ electric: [], building: [], residential: [], fire: [] });
  const [preview, setPreview] = useState<{ url: string; name?: string; type?: string } | null>(null);
  const [relatedProjects, setRelatedProjects] = useState<Project[]>([]);

  const load = async () => {
    const res = await ahjApi.get(id);
    setData(res);
    // Load related projects for this AHJ
    try {
      const projects = await ahjApi.getProjects(id);
      setRelatedProjects(projects);
    } catch (e) {
      setRelatedProjects([]);
    }
    if (res?.us_state) {
      const c = await ahjApi.getCodes(res.us_state);
      setCodes({ electric: c.electric || [], building: c.building || [], residential: c.residential || [], fire: c.fire || [] });
    }
  };

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    load();
  }, [id]);

  const onChange = (key: string, value: any) => setData((prev: any) => ({ ...(prev || {}), [key]: value }));

  const onStateChange = async (value: string) => {
    onChange('us_state', value);
    try {
      const c = await ahjApi.getCodes(value);
      setCodes({ electric: c.electric || [], building: c.building || [], residential: c.residential || [], fire: c.fire || [] });
      // Clear code fields if they are not in new codes
      ['electric_code','building_code','residential_code','fire_code'].forEach(k => {
        if (data && data[k]) {
          const codeType = k === 'electric_code' ? 'electric' : k === 'building_code' ? 'building' : k === 'residential_code' ? 'residential' : 'fire';
          if (!c[codeType]?.includes(data[k])) {
            onChange(k, null);
          }
        }
      });
    } catch {}
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    Promise.all(files.map(f => new Promise<any>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: f.name, size: f.size, type: f.type, url: String(reader.result) });
      reader.onerror = reject;
      reader.readAsDataURL(f);
    }))).then(list => {
      onChange('files', [ ...(data?.files || []), ...list ]);
    });
  };

  const removeFile = (idx: number) => {
    const next = (data?.files || []).filter((_: any, i: number) => i !== idx);
    onChange('files', next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await ahjApi.update(id, data);
      setEdit(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <div className="text-muted-foreground">Loading...</div>;

  return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/ahj')} className="h-8 w-8">
                  <ArrowLeft size={18} />
                </Button>
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-primary" />
                  <h1 className="text-2xl font-semibold tracking-tight">{data.ahj || 'Project AHJ'}</h1>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  <span>State</span>
                  <Badge variant="secondary" className="uppercase">{data.us_state || '—'}</Badge>
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
            <Button variant="outline" onClick={() => { setEdit(false); load(); }}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        )}
          </div>
          <div className="flex flex-wrap gap-2">
            {data.electric_code && (
              <Badge variant="outline" className="capitalize flex items-center gap-1"><Plug size={14} /> {data.electric_code}</Badge>
            )}
            {data.building_code && (
              <Badge variant="outline" className="capitalize flex items-center gap-1"><Building2 size={14} /> {data.building_code}</Badge>
            )}
            {data.residential_code && (
              <Badge variant="outline" className="capitalize flex items-center gap-1"><Home size={14} /> {data.residential_code}</Badge>
            )}
            {data.fire_code && (
              <Badge variant="outline" className="capitalize flex items-center gap-1"><Flame size={14} /> {data.fire_code}</Badge>
            )}
            {!data.electric_code && !data.building_code && !data.residential_code && !data.fire_code && (
              <span className="text-sm text-muted-foreground">No codes selected</span>
            )}
          </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Project AHJ name */}
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={18} className="text-primary" />
            <Label className="text-sm font-semibold text-muted-foreground">Project AHJ name</Label>
          </div>
          {edit ? (
            <Input value={data.ahj || ''} onChange={e => onChange('ahj', e.target.value)} className="mt-1" />
          ) : (
            <div className="text-lg font-medium text-foreground mt-1">{data.ahj || '-'}</div>
          )}
        </div>

        {/* US state */}
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={18} className="text-primary" />
            <Label className="text-sm font-semibold text-muted-foreground">US state</Label>
          </div>
          {edit ? (
            <Select value={data.us_state || ''} onValueChange={onStateChange}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                {['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-lg font-medium text-foreground mt-1">{data.us_state || '-'}</div>
          )}
        </div>

        {/* Codes Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Electric code */}
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Plug size={18} className="text-primary" />
              <Label className="text-sm font-semibold text-muted-foreground">Electric code</Label>
            </div>
            {edit ? (
              <Select value={data.electric_code || ''} onValueChange={(v) => onChange('electric_code', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {codes.electric.map((c) => (
                    <SelectItem key={`electric-${c}`} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-lg font-medium text-foreground mt-1">{data.electric_code || '-'}</div>
            )}
          </div>

          {/* Building code */}
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={18} className="text-primary" />
              <Label className="text-sm font-semibold text-muted-foreground">Building code</Label>
            </div>
            {edit ? (
              <Select value={data.building_code || ''} onValueChange={(v) => onChange('building_code', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {codes.building.map((c) => (
                    <SelectItem key={`building-${c}`} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-lg font-medium text-foreground mt-1">{data.building_code || '-'}</div>
            )}
          </div>

          {/* Residential code */}
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Home size={18} className="text-primary" />
              <Label className="text-sm font-semibold text-muted-foreground">Residential code</Label>
            </div>
            {edit ? (
              <Select value={data.residential_code || ''} onValueChange={(v) => onChange('residential_code', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {codes.residential.map((c) => (
                    <SelectItem key={`residential-${c}`} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-lg font-medium text-foreground mt-1">{data.residential_code || '-'}</div>
            )}
          </div>

          {/* Fire code */}
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Flame size={18} className="text-primary" />
              <Label className="text-sm font-semibold text-muted-foreground">Fire code</Label>
            </div>
            {edit ? (
              <Select value={data.fire_code || ''} onValueChange={(v) => onChange('fire_code', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {codes.fire.map((c) => (
                    <SelectItem key={`fire-${c}`} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-lg font-medium text-foreground mt-1">{data.fire_code || '-'}</div>
            )}
          </div>
        </div>

        {/* Environmental Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Wind speed (mph) */}
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Wind size={18} className="text-primary" />
              <Label className="text-sm font-semibold text-muted-foreground">Wind speed (mph)</Label>
            </div>
            {edit ? (
              <Input value={data.wind_speed_mph || ''} onChange={e => onChange('wind_speed_mph', e.target.value)} className="mt-1" />
            ) : (
              <div className="text-lg font-medium text-foreground mt-1">{data.wind_speed_mph || '-'}</div>
            )}
          </div>

          {/* Snow load (psf) */}
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Snowflake size={18} className="text-primary" />
              <Label className="text-sm font-semibold text-muted-foreground">Snow load (psf)</Label>
            </div>
            {edit ? (
              <Input value={data.snow_load_psf || ''} onChange={e => onChange('snow_load_psf', e.target.value)} className="mt-1" />
            ) : (
              <div className="text-lg font-medium text-foreground mt-1">{data.snow_load_psf || '-'}</div>
            )}
          </div>

          {/* Fire setback required */}
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={18} className="text-primary" />
              <Label className="text-sm font-semibold text-muted-foreground">Fire setback required</Label>
            </div>
            {edit ? (
              <RadioGroup value={String(!!data.fire_setback_required)} onValueChange={(v) => onChange('fire_setback_required', v === 'true')} className="flex gap-6 mt-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="fs-yes" />
                  <Label htmlFor="fs-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="fs-no" />
                  <Label htmlFor="fs-no">No</Label>
                </div>
              </RadioGroup>
            ) : (
              <div className="text-lg font-medium text-foreground mt-1">{data.fire_setback_required ? 'Yes' : 'No'}</div>
            )}
          </div>
        </div>

        {/* Building department website */}
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={18} className="text-primary" />
            <Label className="text-sm font-semibold text-muted-foreground">Building department website</Label>
          </div>
          {edit ? (
            <Input value={data.building_department_web || ''} onChange={e => onChange('building_department_web', e.target.value)} className="mt-1" />
          ) : (
            <div className="text-lg font-medium text-foreground mt-1 break-all">
              {data.building_department_web ? (
                <a href={data.building_department_web} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {data.building_department_web}
                </a>
              ) : '-'}
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Site plan */}
          <div className="border rounded-lg p-4 bg-card">
            <Label className="text-sm font-semibold text-muted-foreground mb-2 block">Site plan</Label>
            {edit ? (
              <Textarea value={data.site_plan || ''} onChange={e => onChange('site_plan', e.target.value)} rows={4} className="mt-1" />
            ) : (
              <div className="text-foreground whitespace-pre-wrap break-words min-h-[60px] mt-1 p-3 bg-muted/50 rounded-md">{data.site_plan || '-'}</div>
            )}
          </div>

          {/* Structural notes */}
          <div className="border rounded-lg p-4 bg-card">
            <Label className="text-sm font-semibold text-muted-foreground mb-2 block">Structural notes</Label>
            {edit ? (
              <Textarea value={data.structural_notes || ''} onChange={e => onChange('structural_notes', e.target.value)} rows={4} className="mt-1" />
            ) : (
              <div className="text-foreground whitespace-pre-wrap break-words min-h-[60px] mt-1 p-3 bg-muted/50 rounded-md">{data.structural_notes || '-'}</div>
            )}
          </div>

          {/* Electrical notes */}
          <div className="border rounded-lg p-4 bg-card">
            <Label className="text-sm font-semibold text-muted-foreground mb-2 block">Electrical notes</Label>
            {edit ? (
              <Textarea value={data.electrical_notes || ''} onChange={e => onChange('electrical_notes', e.target.value)} rows={4} className="mt-1" />
            ) : (
              <div className="text-foreground whitespace-pre-wrap break-words min-h-[60px] mt-1 p-3 bg-muted/50 rounded-md">{data.electrical_notes || '-'}</div>
            )}
          </div>

          {/* Placards notes */}
          <div className="border rounded-lg p-4 bg-card">
            <Label className="text-sm font-semibold text-muted-foreground mb-2 block">Placards notes</Label>
            {edit ? (
              <Textarea value={data.placards_notes || ''} onChange={e => onChange('placards_notes', e.target.value)} rows={4} className="mt-1" />
            ) : (
              <div className="text-foreground whitespace-pre-wrap break-words min-h-[60px] mt-1 p-3 bg-muted/50 rounded-md">{data.placards_notes || '-'}</div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <ProjectAttachments
          title="AHJ Attachments"
          attachments={(data.files || []).map((f: any, idx: number) => ({
            id: String(idx),
            name: f.name || 'attachment',
            size: Number(f.size || 0),
            type: f.type || 'application/octet-stream',
            url: f.url || '',
            uploadedAt: new Date().toISOString(),
            uploadedBy: '',
          })) as ProjectAttachment[]}
          canEdit={edit}
          onAddAttachment={async (files: File[]) => {
            // Reuse existing onFileSelect logic (convert to data URLs and append)
            const list = await Promise.all(files.map(f => new Promise<any>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve({ name: f.name, size: f.size, type: f.type, url: String(reader.result) });
              reader.onerror = reject;
              reader.readAsDataURL(f);
            })));
            onChange('files', [ ...(data?.files || []), ...list ]);
          }}
          onRemoveAttachment={(attachmentId: string) => {
            const idx = Number(attachmentId);
            if (!Number.isNaN(idx)) removeFile(idx);
          }}
        />
        {/* Related Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Related Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {relatedProjects.length === 0 ? (
              <div className="text-sm text-muted-foreground">No projects linked to this AHJ.</div>
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


