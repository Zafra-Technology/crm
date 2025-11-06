'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { utilitiesApi, Utility } from '@/lib/api/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProjectAttachments from '@/components/ProjectAttachments';
import type { ProjectAttachment } from '@/types';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Zap, Globe, FileText, Plus, X } from 'lucide-react';
import UtilityWebsiteCard from '@/components/UtilityWebsiteCard';

export default function UtilityDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [data, setData] = useState<Utility | null>(null);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [utilityWebsites, setUtilityWebsites] = useState<string[]>(['']);

  const load = async () => {
    try {
      const res = await utilitiesApi.get(id);
      setData(res);
      // Initialize utility websites array
      if (res.utility_websites && res.utility_websites.length > 0) {
        setUtilityWebsites([...res.utility_websites, '']);
      } else {
        setUtilityWebsites(['']);
      }
    } catch (e) {
      console.error('Failed to load utility:', e);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    load();
  }, [id]);

  const onChange = (key: string, value: any) => {
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });
  };

  const handleWebsiteChange = (index: number, value: string) => {
    const newWebsites = [...utilityWebsites];
    newWebsites[index] = value;
    setUtilityWebsites(newWebsites);
  };

  const addWebsiteField = () => {
    setUtilityWebsites([...utilityWebsites, '']);
  };

  const removeWebsiteField = (index: number) => {
    if (utilityWebsites.length > 1) {
      const newWebsites = utilityWebsites.filter((_, i) => i !== index);
      setUtilityWebsites(newWebsites);
    }
  };


  const save = async () => {
    setSaving(true);
    try {
      // Filter out empty website URLs
      const validWebsites = utilityWebsites.filter((url) => url.trim() !== '');
      
      // Always send textarea values (even if empty) to allow clearing them
      await utilitiesApi.update(id, {
        utility_name: data?.utility_name ?? undefined,
        utility_websites: validWebsites,
        // Send textarea values as-is (empty strings are valid to clear the field)
        site_plan_requirements: data?.site_plan_requirements !== undefined ? String(data.site_plan_requirements || '') : undefined,
        electrical_plan_requirements: data?.electrical_plan_requirements !== undefined ? String(data.electrical_plan_requirements || '') : undefined,
        other_plan_requirements: data?.other_plan_requirements !== undefined ? String(data.other_plan_requirements || '') : undefined,
      });
      setEdit(false);
      await load();
    } catch (error) {
      console.error('Failed to save utility:', error);
      alert('Failed to save utility. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setEdit(false);
    load();
  };

  if (!data) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dashboard/utilities')}
                className="h-8 w-8"
              >
                <ArrowLeft size={18} />
              </Button>
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-primary" />
                <h1 className="text-2xl font-semibold tracking-tight">
                  {data.utility_name || 'Utility'}
                </h1>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="hidden md:flex items-center gap-2">
                <span>Created by</span>
                <span className="text-foreground font-medium">
                  {data.created_by || '—'}
                </span>
                <span>• Updated by</span>
                <span className="text-foreground font-medium">
                  {data.updated_by || '—'}
                </span>
              </div>
            </div>
          </div>
          {!edit ? (
            <Button onClick={() => setEdit(true)}>Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={cancel}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Utility Name */}
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-primary" />
            <Label className="text-sm font-semibold text-muted-foreground">
              Utility Name
            </Label>
          </div>
          {edit ? (
            <Input
              value={data.utility_name || ''}
              onChange={(e) => onChange('utility_name', e.target.value)}
              className="mt-1"
            />
          ) : (
            <div className="text-lg font-medium text-foreground mt-1">
              {data.utility_name || '-'}
            </div>
          )}
        </div>

        {/* Utility Websites */}
        <div className="grid grid-cols-[180px_1fr] gap-0 border rounded-lg overflow-hidden">
          {/* Left Sidebar - Header */}
          <div className="bg-muted/50 p-3 flex items-start">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-primary" />
              <Label className="text-xs font-semibold text-muted-foreground">
                Utility Website
              </Label>
            </div>
          </div>

          {/* Right Side - Content */}
          <div className="p-3">
            {edit ? (
              <div className="space-y-2">
                {utilityWebsites.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => handleWebsiteChange(index, e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1"
                    />
                    {utilityWebsites.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeWebsiteField(index)}
                      >
                        <X size={16} />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addWebsiteField}
                  className="w-full"
                >
                  <Plus size={16} className="mr-2" />
                  Add Website
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {data.utility_websites && data.utility_websites.length > 0 ? (
                  data.utility_websites.map((url, index) => (
                    <UtilityWebsiteCard key={index} url={url} />
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground py-2">
                    No utility websites added
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Requirements Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Site Plan Requirements */}
          <div className="border rounded-lg p-4 bg-card">
            <Label className="text-sm font-semibold text-muted-foreground mb-2 block">
              Site Plan Requirements
            </Label>
            {edit ? (
              <Textarea
                value={data.site_plan_requirements || ''}
                onChange={(e) =>
                  onChange('site_plan_requirements', e.target.value)
                }
                rows={4}
                className="mt-1"
              />
            ) : (
              <div className="text-foreground whitespace-pre-wrap break-words min-h-[60px] mt-1 p-3 bg-muted/50 rounded-md">
                {data.site_plan_requirements || '-'}
              </div>
            )}
          </div>

          {/* Electrical Plan Requirements */}
          <div className="border rounded-lg p-4 bg-card">
            <Label className="text-sm font-semibold text-muted-foreground mb-2 block">
              Electrical Plan Requirements
            </Label>
            {edit ? (
              <Textarea
                value={data.electrical_plan_requirements || ''}
                onChange={(e) =>
                  onChange('electrical_plan_requirements', e.target.value)
                }
                rows={4}
                className="mt-1"
              />
            ) : (
              <div className="text-foreground whitespace-pre-wrap break-words min-h-[60px] mt-1 p-3 bg-muted/50 rounded-md">
                {data.electrical_plan_requirements || '-'}
              </div>
            )}
          </div>

          {/* Other Plan Requirements */}
          <div className="border rounded-lg p-4 bg-card md:col-span-2">
            <Label className="text-sm font-semibold text-muted-foreground mb-2 block">
              Other Plan Requirements
            </Label>
            {edit ? (
              <Textarea
                value={data.other_plan_requirements || ''}
                onChange={(e) =>
                  onChange('other_plan_requirements', e.target.value)
                }
                rows={4}
                className="mt-1"
              />
            ) : (
              <div className="text-foreground whitespace-pre-wrap break-words min-h-[60px] mt-1 p-3 bg-muted/50 rounded-md">
                {data.other_plan_requirements || '-'}
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <ProjectAttachments
          title="Utility Attachments"
          attachments={(data.files || []).map((f: any) => ({
            id: String(f.id || ''),
            name: f.name || 'attachment',
            size: Number(f.size || 0),
            type: f.type || f.file_type || 'application/octet-stream',
            url: f.url || '',
            uploadedAt: f.uploadedAt || f.uploaded_at || new Date().toISOString(),
            uploadedBy: f.uploadedBy || f.uploaded_by || '',
          })) as ProjectAttachment[]}
          canEdit={edit}
          onAddAttachment={async (files: File[]) => {
            try {
              await utilitiesApi.uploadFiles(id, files);
              await load(); // Reload to get updated attachments
            } catch (error) {
              console.error('Failed to upload files:', error);
              alert('Failed to upload files. Please try again.');
            }
          }}
          onRemoveAttachment={async (attachmentId: string) => {
            try {
              const attachmentIdNum = Number(attachmentId);
              if (!Number.isNaN(attachmentIdNum)) {
                await utilitiesApi.deleteAttachment(id, attachmentIdNum);
                await load(); // Reload to get updated attachments
              }
            } catch (error) {
              console.error('Failed to delete attachment:', error);
              alert('Failed to delete attachment. Please try again.');
            }
          }}
        />
      </div>
    </div>
  );
}

