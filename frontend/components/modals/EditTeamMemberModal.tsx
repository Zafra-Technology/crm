'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { authAPI, resolveMediaUrl } from '@/lib/api/auth';
import { useRef, useMemo } from 'react';

interface TeamMember {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  mobile_number: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  role: string;
  is_active: boolean;
  created_at: string;
  client_id: string | number;
}

interface EditTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeamMemberUpdated: () => void;
  member: TeamMember | null;
}

export default function EditTeamMemberModal({ 
  isOpen, 
  onClose, 
  onTeamMemberUpdated, 
  member 
}: EditTeamMemberModalProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    mobile_number: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    date_of_birth: '',
    aadhar_number: '',
    pan_number: '',
    date_of_joining: '',
    date_of_exit: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrl = useMemo(() => {
    if (profilePicFile) return URL.createObjectURL(profilePicFile);
    if (member && (member as any).profile_pic) return resolveMediaUrl((member as any).profile_pic);
    return '';
  }, [profilePicFile, member]);

  useEffect(() => {
    if (isOpen && member) {
      setFormData({
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        mobile_number: member.mobile_number || '',
        address: member.address || '',
        city: member.city || '',
        state: member.state || '',
        country: member.country || '',
        pincode: member.pincode || '',
        date_of_birth: (member as any).date_of_birth || '',
        aadhar_number: (member as any).aadhar_number || '',
        pan_number: (member as any).pan_number || '',
        date_of_joining: (member as any).date_of_joining || '',
        date_of_exit: (member as any).date_of_exit || '',
      });
      setError('');
      setProfilePicFile(null);
    }
  }, [isOpen, member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!member) return;
    
    setError('');
    
    try {
      setLoading(true);
      
      const payload: any = { ...formData };
      if (!payload.date_of_birth) delete payload.date_of_birth;
      if (!payload.date_of_joining) delete payload.date_of_joining;
      if (!payload.date_of_exit) delete payload.date_of_exit;
      await authAPI.updateTeamMember(member.id, payload);
      if (profilePicFile) {
        try { await authAPI.uploadUserProfilePic(member.id, profilePicFile); } catch (_) {}
      }
      onTeamMemberUpdated();
      onClose();
    } catch (error) {
      console.error('Failed to update team member:', error);
      setError('Failed to update team member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Edit Team Member
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    placeholder="Enter first name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="mobile_number">Mobile Number</Label>
                <Input
                  id="mobile_number"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleChange}
                  placeholder="Enter mobile number"
                />
              </div>

              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Address Information</h3>
              
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter address"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Enter city"
                  />
                </div>
                
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Enter state"
                  />
                </div>
                
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="Enter country"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="Enter pincode"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="aadhar_number">Aadhar Number</Label>
                  <Input
                    id="aadhar_number"
                    name="aadhar_number"
                    value={formData.aadhar_number}
                    onChange={handleChange}
                    placeholder="123456789012"
                  />
                </div>
                <div>
                  <Label htmlFor="pan_number">PAN Number</Label>
                  <Input
                    id="pan_number"
                    name="pan_number"
                    value={formData.pan_number}
                    onChange={handleChange}
                    placeholder="ABCDE1234F"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date_of_joining">Date of Joining</Label>
                  <Input
                    id="date_of_joining"
                    name="date_of_joining"
                    type="date"
                    value={formData.date_of_joining}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="date_of_exit">Date of Exit</Label>
                  <Input
                    id="date_of_exit"
                    name="date_of_exit"
                    type="date"
                    value={formData.date_of_exit}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Profile Picture */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Profile Picture</h3>
              <div className="border rounded-md p-4 bg-muted/20">
                {previewUrl ? (
                  <div className="flex items-center gap-4">
                    <img src={previewUrl} alt="Profile preview" className="w-16 h-16 rounded-full object-cover border" />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>Change</Button>
                      <Button type="button" variant="outline" onClick={() => setProfilePicFile(null)}>Remove</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">No image selected</div>
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>Choose File</Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setProfilePicFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Team Member
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

