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
          <div className="flex items-center gap-3">
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
                Utility Details
              </h1>
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

      <div className="space-y-4">
        {/* Utility Name */}
        <div className="border rounded-lg p-4 bg-card">
          <Label className="text-sm font-semibold text-muted-foreground mb-3 block">
            Utility Name
          </Label>
          {edit ? (
            <Input
              value={data.utility_name || ''}
              onChange={(e) => onChange('utility_name', e.target.value)}
              placeholder="Enter utility name"
            />
          ) : (
            <div className="text-lg font-medium text-foreground">
              {data.utility_name || '-'}
            </div>
          )}
        </div>

        {/* Utility Websites */}
        <div className="border rounded-lg p-4 bg-card">
          <Label className="text-sm font-semibold text-muted-foreground mb-3 block">
            Utility Websites
          </Label>
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
                <div className="text-muted-foreground">
                  No utility websites added
                </div>
              )}
            </div>
          )}
        </div>

        {/* Site Plan Requirements */}
        <div className="border rounded-lg p-4 bg-card">
          <Label className="text-sm font-semibold text-muted-foreground mb-3 block">
            Site Plan Requirements
          </Label>
          {edit ? (
            <Textarea
              value={data.site_plan_requirements || ''}
              onChange={(e) =>
                onChange('site_plan_requirements', e.target.value)
              }
              rows={4}
              placeholder="Enter site plan requirements"
            />
          ) : (
            <div className="text-foreground whitespace-pre-wrap break-words min-h-[60px] p-3 bg-muted/50 rounded-md">
              {data.site_plan_requirements || '-'}
            </div>
          )}
        </div>

        {/* Electrical Plan Requirements */}
        <div className="border rounded-lg p-4 bg-card">
          <Label className="text-sm font-semibold text-muted-foreground mb-3 block">
            Electrical Plan Requirements
          </Label>
          {edit ? (
            <Textarea
              value={data.electrical_plan_requirements || ''}
              onChange={(e) =>
                onChange('electrical_plan_requirements', e.target.value)
              }
              rows={4}
              placeholder="Enter electrical plan requirements"
            />
          ) : (
            <div className="text-foreground whitespace-pre-wrap break-words min-h-[60px] p-3 bg-muted/50 rounded-md">
              {data.electrical_plan_requirements || '-'}
            </div>
          )}
        </div>

        {/* Other Plan Requirements */}
        <div className="border rounded-lg p-4 bg-card">
          <Label className="text-sm font-semibold text-muted-foreground mb-3 block">
            Other Plan Requirements
          </Label>
          {edit ? (
            <Textarea
              value={data.other_plan_requirements || ''}
              onChange={(e) =>
                onChange('other_plan_requirements', e.target.value)
              }
              rows={4}
              placeholder="Enter other plan requirements"
            />
          ) : (
            <div className="text-foreground whitespace-pre-wrap break-words min-h-[60px] p-3 bg-muted/50 rounded-md">
              {data.other_plan_requirements || '-'}
            </div>
          )}
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

      <Separator />

      {/* Created By and Updated By at the bottom */}
      <div className="space-y-4">
        {/* Created By */}
        <div className="border rounded-lg p-4 bg-card">
          <Label className="text-sm font-semibold text-muted-foreground mb-3 block">
            Created By
          </Label>
          <div className="text-foreground">
            {data.created_by || '-'}
          </div>
        </div>

        {/* Updated By */}
        <div className="border rounded-lg p-4 bg-card">
          <Label className="text-sm font-semibold text-muted-foreground mb-3 block">
            Updated By
          </Label>
          <div className="text-foreground">
            {data.updated_by || '-'}
          </div>
        </div>
      </div>
    </div>
  );
}

