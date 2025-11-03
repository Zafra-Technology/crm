'use client';

import { useState, useRef } from 'react';
import { X, Upload, Paperclip } from 'lucide-react';
import { projectsApi } from '@/lib/api/projects';
import { Project } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
  userId: string;
}

interface ProjectFormData {
  name: string;
  projectCode: string;
  description: string;
  requirements: string;
  timeline: string;
  projectType: 'residential' | 'commercial';
  projectAddress: string;
  projectLocationUrl: string;
  attachments: File[];
}

export default function CreateProjectModal({ isOpen, onClose, onProjectCreated, userId }: CreateProjectModalProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    projectCode: '',
    description: '',
    requirements: '',
    timeline: '',
    projectType: 'residential',
    projectAddress: '',
    projectLocationUrl: '',
    attachments: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Convert files to base64 for upload
      const attachments = await Promise.all(
        formData.attachments.map(async (file) => {
          return new Promise<{ name: string; size: number; type: string; url: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                name: file.name,
                size: file.size,
                type: file.type,
                url: reader.result as string,
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );

      const projectData = {
        name: formData.name,
        projectCode: formData.projectCode || undefined,
        description: formData.description,
        requirements: formData.requirements,
        timeline: formData.timeline,
        projectType: formData.projectType,
        projectAddress: formData.projectAddress || undefined,
        projectLocationUrl: formData.projectLocationUrl || undefined,
        status: 'inactive',
        clientId: userId,
        managerId: '1', // This will be handled by the backend
        designerIds: [],
        attachments: attachments,
      };

      console.log('Creating project with data:', projectData);
      console.log('Project type selected:', formData.projectType);
      
      const result = await projectsApi.create(projectData);
      console.log('Project created successfully:', result);
      console.log('Created project type:', result?.projectType);
      
      onProjectCreated();
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        projectCode: '',
        description: '',
        requirements: '',
        timeline: '',
        projectType: 'residential',
        projectAddress: '',
        projectLocationUrl: '',
        attachments: [],
      });
    } catch (error) {
      console.error('Project creation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Please select files smaller than 10MB.`);
        return false;
      }
      return true;
    });
    
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...validFiles]
    }));
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Fill in the project details to create a new project request
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter project name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectCode">Project Code</Label>
              <Input
                id="projectCode"
                name="projectCode"
                type="text"
                value={formData.projectCode}
                onChange={handleChange}
                placeholder="Enter project code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeline">Timeline *</Label>
              <Input
                id="timeline"
                name="timeline"
                type="text"
                value={formData.timeline}
                onChange={handleChange}
                required
                placeholder="e.g., 3 months, 6 weeks"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={3}
                placeholder="Describe your project"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                rows={3}
                placeholder="List project requirements"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type *</Label>
              <Select
                name="projectType"
                value={formData.projectType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, projectType: value as 'residential' | 'commercial' }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectAddress">
                <span className="text-destructive mr-1">*</span>Project Address
              </Label>
              <Textarea
                id="projectAddress"
                name="projectAddress"
                value={formData.projectAddress}
                onChange={handleChange}
                rows={2}
                placeholder="Enter project address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectLocationUrl">Location URL</Label>
              <Input
                id="projectLocationUrl"
                name="projectLocationUrl"
                type="url"
                value={formData.projectLocationUrl}
                onChange={handleChange}
                placeholder="https://www.google.com/maps/embed?pb=..."
              />
              <p className="text-xs text-muted-foreground">
                <strong>Optional:</strong> Paste any Google Maps URL (embed URL or regular link). Both formats are accepted and will work.
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> For embed URL, click "Share" → "Embed a map" in Google Maps. Regular links will be automatically converted.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Project Attachments</Label>
              <div className="space-y-3">
                {/* File Upload */}
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Paperclip className="w-8 h-8 mb-4 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PDF, DOC, Images, etc. (MAX. 10MB)</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                    />
                  </label>
                </div>

                {/* Uploaded Files List */}
                {formData.attachments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">Uploaded Files:</h4>
                    {formData.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex items-center space-x-2">
                          <Paperclip className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{file.name}</span>
                          <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                        </div>
                        <Button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </form>
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Creating...' : 'Send Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
