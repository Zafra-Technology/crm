'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { equipmentsApi, Equipment } from '@/lib/api/equipments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProjectAttachments from '@/components/ProjectAttachments';
import FileViewerModal from '@/components/modals/FileViewerModal';
import type { ProjectAttachment } from '@/types';
import { ArrowLeft, PackageIcon, TagIcon, CalendarIcon, FileIcon, FolderKanban } from 'lucide-react';
import { formatDate } from '@/lib/utils/dateUtils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Project } from '@/types';
import { projectsApi } from '@/lib/api/projects';

const getCategoryConfig = (category: string) => {
  const configs: Record<string, { color: string }> = {
    Module: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
    Inventor: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
    Mounting: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' },
    Battery: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
  };
  return configs[category] || { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' };
};

export default function EquipmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const { toast } = useToast();

  const [data, setData] = useState<Equipment | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<ProjectAttachment | null>(null);
  const [relatedProjects, setRelatedProjects] = useState<Project[]>([]);

  const load = async () => {
    try {
      const res = await equipmentsApi.getById(id);
      setData(res);
      // Load attachments for this equipment
      const attachmentsData = await equipmentsApi.getAttachments(id);
      // Map backend response to frontend ProjectAttachment interface
      const mappedAttachments = attachmentsData.map((att: any) => ({
        id: String(att.id),
        name: att.name,
        size: att.size,
        type: att.file_type || 'application/octet-stream',
        url: att.file || '',
        uploadedAt: att.uploaded_at,
        uploadedBy: att.uploaded_by || 'Unknown',
      }));
      setAttachments(mappedAttachments);
      
      // Load related projects
      try {
        const projectsData = await equipmentsApi.getProjects(id);
        const mappedProjects = projectsData.map((p: any) => projectsApi._mapApiProject(p));
        setRelatedProjects(mappedProjects);
      } catch (error) {
        console.error('Failed to load related projects:', error);
        setRelatedProjects([]);
      }
    } catch (error) {
      console.error('Failed to load equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to load equipment details',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    loadCategories();
    load();
  }, [id]);

  const loadCategories = async () => {
    try {
      const cats = await equipmentsApi.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Don't set fallback categories - let the API provide them
      setCategories([]);
    }
  };

  const onChange = (key: string, value: any) => {
    setData((prev: any) => ({ ...(prev || {}), [key]: value }));
  };

  const removeNewFile = (idx: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!data) return;
    
    setSaving(true);
    try {
      // Update equipment details
      await equipmentsApi.update(id, {
        model_name: data.model_name,
        category: data.category,
      });

      // Upload new files if any
      if (newFiles.length > 0) {
        await equipmentsApi.uploadFiles(id, newFiles);
      }

      toast({
        title: 'Success',
        description: 'Equipment updated successfully',
      });
      
      setEdit(false);
      setNewFiles([]);
      await load();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update equipment',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading equipment details...</div>
      </div>
    );
  }

  const config = getCategoryConfig(data.category);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dashboard/equipments')}
                className="h-8 w-8"
              >
                <ArrowLeft size={18} />
              </Button>
              <div className="flex items-center gap-2">
                <PackageIcon size={20} className="text-primary" />
                <h1 className="text-2xl font-semibold tracking-tight">
                  {data.model_name || 'Equipment Details'}
                </h1>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <TagIcon size={16} />
                <span>Category</span>
                <Badge className={config.color}>{data.category}</Badge>
              </div>
              {data.created_at && (
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} />
                  <span>Created {formatDate(data.created_at)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Edit/Save/Cancel Buttons */}
          {!edit ? (
            <Button onClick={() => setEdit(true)}>Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEdit(false);
                  setNewFiles([]);
                  load();
                }}
              >
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6">
        {/* Equipment Details Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Model Name */}
              <div className="space-y-2">
                <Label htmlFor="model_name" className="text-sm font-medium">
                  Model Name
                </Label>
                {edit ? (
                  <Input
                    id="model_name"
                    value={data.model_name || ''}
                    onChange={(e) => onChange('model_name', e.target.value)}
                    placeholder="Enter model name"
                  />
                ) : (
                  <div className="text-sm text-foreground py-2">
                    {data.model_name || '—'}
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">
                  Category
                </Label>
                {edit ? (
                  <Select
                    value={data.category}
                    onValueChange={(value) => onChange('category', value)}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="py-2">
                    <Badge className={getCategoryConfig(data.category).color}>{data.category}</Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Files Section */}
        <Card>
          <CardContent className="pt-6">
            <ProjectAttachments
              title="Equipment Files"
              attachments={attachments}
              canEdit={edit}
              onAddAttachment={async (files: File[]) => {
                // Add files to be uploaded
                setNewFiles((prev) => [...prev, ...files]);
              }}
              onRemoveAttachment={async (attachmentId: string) => {
                try {
                  // Delete attachment from backend
                  await equipmentsApi.deleteAttachment(id, parseInt(attachmentId));
                  toast({
                    title: 'Success',
                    description: 'File deleted successfully',
                  });
                  // Reload attachments
                  await load();
                } catch (error: any) {
                  toast({
                    title: 'Error',
                    description: error.message || 'Failed to delete file',
                    variant: 'destructive',
                  });
                }
              }}
            />
            
            {/* Show pending files in edit mode */}
            {edit && newFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Pending Upload ({newFiles.length} files)</p>
                <div className="grid gap-2">
                  {newFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                    >
                      <div className="flex items-center gap-2">
                        <FileIcon size={16} className="text-amber-600" />
                        <div>
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNewFile(idx)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Related Items Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Related Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {relatedProjects.length === 0 ? (
              <div className="text-sm text-muted-foreground">No projects are using this equipment.</div>
            ) : (
              <div className="divide-y border rounded-md">
                {relatedProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FolderKanban size={20} className="text-primary flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">{project.name}</div>
                        {(project as any).projectCode && (
                          <div className="text-xs text-muted-foreground truncate">{(project as any).projectCode}</div>
                        )}
                      </div>
                    </div>
                    <Link href={`/dashboard/project/${project.id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={!!preview}
        onClose={() => setPreview(null)}
        attachment={preview}
      />
    </div>
  );
}

