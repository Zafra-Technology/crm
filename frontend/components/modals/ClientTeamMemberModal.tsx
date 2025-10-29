'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { authAPI, resolveMediaUrl } from '@/lib/api/auth';
import { useRef, useMemo } from 'react';

interface ClientTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeamMemberCreated: () => void;
  clientId: string;
}

interface TeamMemberFormData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  mobile_number: string;
  date_of_birth: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  aadhar_number: string;
  pan_number: string;
  date_of_joining: string;
  role: string;
}

export default function ClientTeamMemberModal({ 
  isOpen, 
  onClose, 
  onTeamMemberCreated, 
  clientId 
}: ClientTeamMemberModalProps) {
  const [formData, setFormData] = useState<TeamMemberFormData>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    mobile_number: '',
    date_of_birth: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    aadhar_number: '',
    pan_number: '',
    date_of_joining: '',
    role: 'client_team_member'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrl = useMemo(() => {
    if (profilePicFile) return URL.createObjectURL(profilePicFile);
    return '';
  }, [profilePicFile]);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        mobile_number: '',
        date_of_birth: '',
        address: '',
        city: '',
        state: '',
        country: '',
        pincode: '',
        aadhar_number: '',
        pan_number: '',
        date_of_joining: '',
        role: 'client_team_member'
      });
      setError('');
      setEmailError('');
      setProfilePicFile(null);
    }
  }, [isOpen]);

  const validateEmail = async (email: string) => {
    if (!email) {
      setEmailError('');
      return true;
    }
    
    try {
      const emailCheck = await authAPI.checkEmailExists(email);
      if (emailCheck.exists) {
        setEmailError('Email already exists. Please use a different email address.');
        return false;
      } else {
        setEmailError('');
        return true;
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailError('Error checking email availability');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    setEmailError('');
    
    try {
      setLoading(true);
      
      // Check if email already exists
      const isEmailValid = await validateEmail(formData.email);
      if (!isEmailValid) {
        setLoading(false);
        return;
      }
      
      const userData: any = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        mobile_number: formData.mobile_number,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        pincode: formData.pincode,
        role: formData.role,
        client_id: clientId, // Associate with the client
        date_of_joining: formData.date_of_joining || new Date().toISOString().split('T')[0]
      };
      if (formData.date_of_birth) userData.date_of_birth = formData.date_of_birth;
      if (formData.aadhar_number) userData.aadhar_number = formData.aadhar_number;
      if (formData.pan_number) userData.pan_number = formData.pan_number;

      // Only include date_of_joining if the user selected it
      if (formData.date_of_joining) userData.date_of_joining = formData.date_of_joining;

      const created = await authAPI.createTeamMember(userData);
      if (profilePicFile && created?.id) {
        try { await authAPI.uploadUserProfilePic(created.id, profilePicFile); } catch (_) {}
      }
      onTeamMemberCreated();
      onClose();
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        mobile_number: '',
        date_of_birth: '',
        address: '',
        city: '',
        state: '',
        country: '',
        pincode: '',
        aadhar_number: '',
        pan_number: '',
        date_of_joining: '',
        role: 'client_team_member'
      });
      setProfilePicFile(null);
    } catch (error) {
      console.error('Failed to create team member:', error);
      setError('Failed to create team member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Team Member
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
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter email address"
                />
                {emailError && (
                  <p className="text-red-500 text-sm mt-1">{emailError}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter password"
                  minLength={8}
                />
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
                Create Team Member
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
