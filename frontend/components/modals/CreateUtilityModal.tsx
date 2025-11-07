'use client';

import { useState, useRef } from 'react';
import { utilitiesApi } from '@/lib/api/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, X, Globe, FileText, Paperclip, Trash2 } from 'lucide-react';

interface CreateUtilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateUtilityModal({ isOpen, onClose, onCreated }: CreateUtilityModalProps) {
  const [utilityName, setUtilityName] = useState('');
  const [utilityWebsites, setUtilityWebsites] = useState<string[]>(['']);
  const [sitePlanRequirements, setSitePlanRequirements] = useState('');
  const [electricalPlanRequirements, setElectricalPlanRequirements] = useState('');
  const [otherPlanRequirements, setOtherPlanRequirements] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    const validFiles = uploadedFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Please select files smaller than 10MB.`);
        return false;
      }
      return true;
    });
    setFiles([...files, ...validFiles]);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setUtilityName('');
    setUtilityWebsites(['']);
    setSitePlanRequirements('');
    setElectricalPlanRequirements('');
    setOtherPlanRequirements('');
    setFiles([]);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!utilityName.trim()) {
        setError('Please enter utility name');
        setLoading(false);
        return;
      }
      
      // Filter out empty website URLs
      const validWebsites = utilityWebsites.filter((url) => url.trim() !== '');
      
      // Build payload with only non-empty fields
      const payload: {
        utility_name: string;
        utility_websites?: string[];
        site_plan_requirements?: string;
        electrical_plan_requirements?: string;
        other_plan_requirements?: string;
      } = {
        utility_name: utilityName.trim(),
      };
      
      if (validWebsites.length > 0) {
        payload.utility_websites = validWebsites;
      }
      
      const sitePlan = sitePlanRequirements.trim();
      if (sitePlan) {
        payload.site_plan_requirements = sitePlan;
      }
      
      const electricalPlan = electricalPlanRequirements.trim();
      if (electricalPlan) {
        payload.electrical_plan_requirements = electricalPlan;
      }
      
      const otherPlan = otherPlanRequirements.trim();
      if (otherPlan) {
        payload.other_plan_requirements = otherPlan;
      }
      
      const newUtility = await utilitiesApi.create(payload);
      
      // Upload files if any
      if (files.length > 0 && newUtility.id) {
        try {
          await utilitiesApi.uploadFiles(newUtility.id, files);
        } catch (fileError) {
          console.error('Failed to upload files:', fileError);
          // Don't fail the entire operation if file upload fails
          // The utility was created successfully
        }
      }
      
      onCreated();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create utility');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Utility</DialogTitle>
          <DialogDescription>Provide the utility details to add a new entry.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Utility Name */}
          <div className="space-y-2">
            <Label htmlFor="utility_name">Utility Name *</Label>
            <Input
              id="utility_name"
              name="utility_name"
              type="text"
              value={utilityName}
              onChange={(e) => setUtilityName(e.target.value)}
              placeholder="Enter utility name"
              required
            />
          </div>

          {/* Utility Websites */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-primary" />
              <Label>Utility Websites</Label>
            </div>
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
          </div>

          {/* Requirements Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Site Plan Requirements */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                <Label htmlFor="site_plan_requirements">Site Plan Requirements</Label>
              </div>
              <Textarea
                id="site_plan_requirements"
                value={sitePlanRequirements}
                onChange={(e) => setSitePlanRequirements(e.target.value)}
                rows={4}
                placeholder="Enter site plan requirements..."
              />
            </div>

            {/* Electrical Plan Requirements */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                <Label htmlFor="electrical_plan_requirements">Electrical Plan Requirements</Label>
              </div>
              <Textarea
                id="electrical_plan_requirements"
                value={electricalPlanRequirements}
                onChange={(e) => setElectricalPlanRequirements(e.target.value)}
                rows={4}
                placeholder="Enter electrical plan requirements..."
              />
            </div>

            {/* Other Plan Requirements */}
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                <Label htmlFor="other_plan_requirements">Other Plan Requirements</Label>
              </div>
              <Textarea
                id="other_plan_requirements"
                value={otherPlanRequirements}
                onChange={(e) => setOtherPlanRequirements(e.target.value)}
                rows={4}
                placeholder="Enter other plan requirements..."
              />
            </div>
          </div>

          {/* File Attachments */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Paperclip size={16} className="text-primary" />
              <Label>Attachments</Label>
            </div>
            <div className="space-y-2">
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="cursor-pointer"
                accept="*/*"
              />
              {files.length > 0 && (
                <div className="space-y-2 mt-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Paperclip size={16} className="text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={16} />
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

        <DialogFooter className="flex gap-3">
          <Button type="button" onClick={handleClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

