'use client';

import { useState, useEffect, useRef } from 'react';
import { ahjApi } from '@/lib/api/ahj';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { MapPin, Wind, Snowflake, ShieldCheck, Globe, Building2, Plug, Home, Flame, Paperclip, X } from 'lucide-react';

interface CreateAhjModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming'
];

export default function CreateAhjModal({ isOpen, onClose, onCreated }: CreateAhjModalProps) {
  const [formData, setFormData] = useState({
    ahj: '',
    us_state: '',
    electric_code: '',
    building_code: '',
    residential_code: '',
    fire_code: '',
    wind_speed_mph: '',
    snow_load_psf: '',
    fire_setback_required: false,
    building_department_web: '',
    site_plan: '',
    structural_notes: '',
    electrical_notes: '',
    placards_notes: '',
    files: [] as any[],
  });
  const [codes, setCodes] = useState<{ electric: string[]; building: string[]; residential: string[]; fire: string[] }>({
    electric: [],
    building: [],
    residential: [],
    fire: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load codes when state changes
  useEffect(() => {
    if (formData.us_state) {
      ahjApi.getCodes(formData.us_state).then(c => {
        setCodes({ electric: c.electric || [], building: c.building || [], residential: c.residential || [], fire: c.fire || [] });
        // Clear code fields if they are not in new codes
        ['electric_code', 'building_code', 'residential_code', 'fire_code'].forEach(k => {
          const codeType = k === 'electric_code' ? 'electric' : k === 'building_code' ? 'building' : k === 'residential_code' ? 'residential' : 'fire';
          const currentValue = formData[k as keyof typeof formData];
          if (currentValue && typeof currentValue === 'string' && !c[codeType]?.includes(currentValue)) {
            setFormData(prev => ({ ...prev, [k]: '' }));
          }
        });
      }).catch(() => {
        setCodes({ electric: [], building: [], residential: [], fire: [] });
      });
    } else {
      setCodes({ electric: [], building: [], residential: [], fire: [] });
    }
  }, [formData.us_state]);

  const handleChange = (key: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    
    Promise.all(validFiles.map(f => new Promise<any>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: f.name, size: f.size, type: f.type, url: String(reader.result) });
      reader.onerror = reject;
      reader.readAsDataURL(f);
    }))).then(list => {
      handleChange('files', [...formData.files, ...list]);
    });
  };

  const removeAttachment = (index: number) => {
    handleChange('files', formData.files.filter((_: any, i: number) => i !== index));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.ahj.trim()) {
        setError('Please enter AHJ name');
        setLoading(false);
        return;
      }

      const payload: any = {
        ahj: formData.ahj.trim(),
        us_state: formData.us_state || null,
        electric_code: formData.electric_code || null,
        building_code: formData.building_code || null,
        residential_code: formData.residential_code || null,
        fire_code: formData.fire_code || null,
        wind_speed_mph: formData.wind_speed_mph || null,
        snow_load_psf: formData.snow_load_psf || null,
        fire_setback_required: formData.fire_setback_required || null,
        building_department_web: formData.building_department_web || null,
        site_plan: formData.site_plan || null,
        structural_notes: formData.structural_notes || null,
        electrical_notes: formData.electrical_notes || null,
        placards_notes: formData.placards_notes || null,
        files: formData.files.length > 0 ? formData.files : null,
      };

      await ahjApi.create(payload);
      onCreated();
      onClose();
      // Reset form
      setFormData({
        ahj: '',
        us_state: '',
        electric_code: '',
        building_code: '',
        residential_code: '',
        fire_code: '',
        wind_speed_mph: '',
        snow_load_psf: '',
        fire_setback_required: false,
        building_department_web: '',
        site_plan: '',
        structural_notes: '',
        electrical_notes: '',
        placards_notes: '',
        files: [],
      });
      setCodes({ electric: [], building: [], residential: [], fire: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create AHJ');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setFormData({
      ahj: '',
      us_state: '',
      electric_code: '',
      building_code: '',
      residential_code: '',
      fire_code: '',
      wind_speed_mph: '',
      snow_load_psf: '',
      fire_setback_required: false,
      building_department_web: '',
      site_plan: '',
      structural_notes: '',
      electrical_notes: '',
      placards_notes: '',
      files: [],
    });
    setCodes({ electric: [], building: [], residential: [], fire: [] });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Project AHJ</DialogTitle>
          <DialogDescription>
            Fill in the AHJ details to create a new Project AHJ entry.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project AHJ name */}
            <div className="space-y-2">
              <Label htmlFor="ahj" className="flex items-center gap-2">
                <Building2 size={16} className="text-primary" />
                Project AHJ Name *
              </Label>
              <Input
                id="ahj"
                name="ahj"
                type="text"
                value={formData.ahj}
                onChange={(e) => handleChange('ahj', e.target.value)}
                placeholder="Enter AHJ name"
                required
              />
            </div>

            {/* US state */}
            <div className="space-y-2">
              <Label htmlFor="us_state" className="flex items-center gap-2">
                <MapPin size={16} className="text-primary" />
                US State
              </Label>
              <Select value={formData.us_state} onValueChange={(v) => handleChange('us_state', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Codes Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Electric code */}
              <div className="space-y-2">
                <Label htmlFor="electric_code" className="flex items-center gap-2">
                  <Plug size={16} className="text-primary" />
                  Electric code
                </Label>
                <Select
                  value={formData.electric_code}
                  onValueChange={(v) => handleChange('electric_code', v)}
                  disabled={!formData.us_state}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!formData.us_state ? "Select state first" : codes.electric.length === 0 ? "No code for this state" : "Select"} />
                  </SelectTrigger>
                  <SelectContent>
                    {codes.electric.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No code for this state</div>
                    ) : (
                      codes.electric.map((c) => (
                        <SelectItem key={`electric-${c}`} value={c}>{c}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Building code */}
              <div className="space-y-2">
                <Label htmlFor="building_code" className="flex items-center gap-2">
                  <Building2 size={16} className="text-primary" />
                  Building code
                </Label>
                <Select
                  value={formData.building_code}
                  onValueChange={(v) => handleChange('building_code', v)}
                  disabled={!formData.us_state}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!formData.us_state ? "Select state first" : codes.building.length === 0 ? "No code for this state" : "Select"} />
                  </SelectTrigger>
                  <SelectContent>
                    {codes.building.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No code for this state</div>
                    ) : (
                      codes.building.map((c) => (
                        <SelectItem key={`building-${c}`} value={c}>{c}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Residential code */}
              <div className="space-y-2">
                <Label htmlFor="residential_code" className="flex items-center gap-2">
                  <Home size={16} className="text-primary" />
                  Residential code
                </Label>
                <Select
                  value={formData.residential_code}
                  onValueChange={(v) => handleChange('residential_code', v)}
                  disabled={!formData.us_state}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!formData.us_state ? "Select state first" : codes.residential.length === 0 ? "No code for this state" : "Select"} />
                  </SelectTrigger>
                  <SelectContent>
                    {codes.residential.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No code for this state</div>
                    ) : (
                      codes.residential.map((c) => (
                        <SelectItem key={`residential-${c}`} value={c}>{c}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Fire code */}
              <div className="space-y-2">
                <Label htmlFor="fire_code" className="flex items-center gap-2">
                  <Flame size={16} className="text-primary" />
                  Fire code
                </Label>
                <Select
                  value={formData.fire_code}
                  onValueChange={(v) => handleChange('fire_code', v)}
                  disabled={!formData.us_state}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!formData.us_state ? "Select state first" : codes.fire.length === 0 ? "No code for this state" : "Select"} />
                  </SelectTrigger>
                  <SelectContent>
                    {codes.fire.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No code for this state</div>
                    ) : (
                      codes.fire.map((c) => (
                        <SelectItem key={`fire-${c}`} value={c}>{c}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Environmental Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Wind speed (mph) */}
              <div className="space-y-2">
                <Label htmlFor="wind_speed_mph" className="flex items-center gap-2">
                  <Wind size={16} className="text-primary" />
                  Wind speed (mph)
                </Label>
                <Input
                  id="wind_speed_mph"
                  name="wind_speed_mph"
                  type="text"
                  value={formData.wind_speed_mph}
                  onChange={(e) => handleChange('wind_speed_mph', e.target.value)}
                  placeholder="Enter wind speed"
                />
              </div>

              {/* Snow load (psf) */}
              <div className="space-y-2">
                <Label htmlFor="snow_load_psf" className="flex items-center gap-2">
                  <Snowflake size={16} className="text-primary" />
                  Snow load (psf)
                </Label>
                <Input
                  id="snow_load_psf"
                  name="snow_load_psf"
                  type="text"
                  value={formData.snow_load_psf}
                  onChange={(e) => handleChange('snow_load_psf', e.target.value)}
                  placeholder="Enter snow load"
                />
              </div>

              {/* Fire setback required */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary" />
                  Fire setback required
                </Label>
                <RadioGroup
                  value={String(formData.fire_setback_required)}
                  onValueChange={(v) => handleChange('fire_setback_required', v === 'true')}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="fs-yes" />
                    <Label htmlFor="fs-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="fs-no" />
                    <Label htmlFor="fs-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Building department website */}
            <div className="space-y-2">
              <Label htmlFor="building_department_web" className="flex items-center gap-2">
                <Globe size={16} className="text-primary" />
                Building department website
              </Label>
              <Input
                id="building_department_web"
                name="building_department_web"
                type="url"
                value={formData.building_department_web}
                onChange={(e) => handleChange('building_department_web', e.target.value)}
                placeholder="https://..."
              />
            </div>

            {/* Notes Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Site plan */}
              <div className="space-y-2">
                <Label htmlFor="site_plan">Site plan</Label>
                <Textarea
                  id="site_plan"
                  name="site_plan"
                  value={formData.site_plan}
                  onChange={(e) => handleChange('site_plan', e.target.value)}
                  rows={4}
                  placeholder="Enter site plan notes"
                />
              </div>

              {/* Structural notes */}
              <div className="space-y-2">
                <Label htmlFor="structural_notes">Structural notes</Label>
                <Textarea
                  id="structural_notes"
                  name="structural_notes"
                  value={formData.structural_notes}
                  onChange={(e) => handleChange('structural_notes', e.target.value)}
                  rows={4}
                  placeholder="Enter structural notes"
                />
              </div>

              {/* Electrical notes */}
              <div className="space-y-2">
                <Label htmlFor="electrical_notes">Electrical notes</Label>
                <Textarea
                  id="electrical_notes"
                  name="electrical_notes"
                  value={formData.electrical_notes}
                  onChange={(e) => handleChange('electrical_notes', e.target.value)}
                  rows={4}
                  placeholder="Enter electrical notes"
                />
              </div>

              {/* Placards notes */}
              <div className="space-y-2">
                <Label htmlFor="placards_notes">Placards notes</Label>
                <Textarea
                  id="placards_notes"
                  name="placards_notes"
                  value={formData.placards_notes}
                  onChange={(e) => handleChange('placards_notes', e.target.value)}
                  rows={4}
                  placeholder="Enter placards notes"
                />
              </div>
            </div>

            {/* Files Section */}
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
                      <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT (MAX. 10MB)</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    />
                  </label>
                </div>

                {/* Uploaded Files List */}
                {formData.files.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">Uploaded Files:</h4>
                    {formData.files.map((file: any, index: number) => (
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
