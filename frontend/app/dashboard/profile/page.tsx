'use client';

import { useState, useEffect } from 'react';
import { UserIcon, MailIcon, BriefcaseIcon, EditIcon, MapPinIcon, CreditCardIcon, CameraIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { authAPI, User as APIUser, RegisterData, resolveMediaUrl } from '@/lib/api/auth';
import { useRef, useMemo } from 'react';

export default function ProfilePage() {
  const [user, setUser] = useState<APIUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrl = useMemo(() => {
    if (profilePicFile) {
      return URL.createObjectURL(profilePicFile);
    }
    if (user?.profile_pic) {
      return resolveMediaUrl(user.profile_pic);
    }
    return '';
  }, [profilePicFile, user]);
  const [editForm, setEditForm] = useState<Partial<RegisterData>>({
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
    company_name: '',
    company_code: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await authAPI.getCurrentUser();
        setUser(currentUser);
        if (currentUser) {
          setEditForm({
            first_name: currentUser.first_name || '',
            last_name: currentUser.last_name || '',
            mobile_number: currentUser.mobile_number || '',
            address: currentUser.address || '',
            city: currentUser.city || '',
            state: currentUser.state || '',
            country: currentUser.country || '',
            pincode: currentUser.pincode || '',
            date_of_birth: currentUser.date_of_birth || '',
            aadhar_number: currentUser.aadhar_number || '',
            pan_number: currentUser.pan_number || '',
            date_of_joining: currentUser.date_of_joining || '',
            company_name: currentUser.company_name || '',
            company_code: (currentUser as any).company_code || '',
          });
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Build payload and prune empty/invalid values for schema compatibility
    const payload: Partial<RegisterData> = { ...editForm };
    // Remove empty date fields (ninja expects date or omit)
    if (!payload.date_of_birth) delete (payload as any).date_of_birth;
    if (!payload.date_of_joining) delete (payload as any).date_of_joining;
    // Trim strings
    Object.keys(payload).forEach((k) => {
      const key = k as keyof RegisterData;
      const val = payload[key] as unknown as string | undefined;
      if (typeof val === 'string') {
        (payload as any)[key] = val.trim();
      }
    });

    // For client team members, do not send company fields
    if (user.role === 'client_team_member') {
      delete (payload as any).company_name;
      delete (payload as any).company_code;
    }

    // Basic required validation for visible fields
    const requiredKeys: Array<keyof RegisterData> = [
      'first_name','last_name','mobile_number','address','city','state','country','pincode'
    ];
    for (const key of requiredKeys) {
      if (!payload[key] || String(payload[key]).trim() === '') {
        alert('Please fill all required fields');
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await authAPI.updateCurrentUser(payload);
      // Upload selected profile picture if present
      if (profilePicFile && user?.id) {
        try {
          await authAPI.uploadUserProfilePic(user.id, profilePicFile);
        } catch (_) {}
      }
      setUser(updated);
      setIsEditing(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    // Validate password length
    if (passwordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    // In a real app, you would send this to your backend
    console.log('Password change request:', {
      userId: user?.id,
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });

    // Reset form and close modal
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowChangePassword(false);
    alert('Password changed successfully!');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                {previewUrl ? <img src={previewUrl} alt="Profile preview" className="w-24 h-24 rounded-full object-cover border" /> : <UserIcon size={40} className="text-muted-foreground" />}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">{user.full_name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
              <span className="inline-block px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium capitalize">
                {user.role.replace('_', ' ')}
              </span>
              {(
                user.role === 'client' || user.role === 'client_team_member'
              ) && (
                <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full mt-4 flex items-center justify-center gap-2">
                  <EditIcon size={16} />
                  Edit Profile
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <UserIcon size={20} className="text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Full Name</div>
                  <div className="text-foreground">{user.full_name}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MailIcon size={20} className="text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Email Address</div>
                  <div className="text-foreground">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <BriefcaseIcon size={20} className="text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Role</div>
                  <div className="text-foreground capitalize">{user.role.replace('_', ' ')}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{user.role === 'designer' ? 'Security' : 'Account Settings'}</CardTitle>
            </CardHeader>
            <CardContent>
              {user.role === 'designer' ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">Password</div>
                    <div className="text-sm text-muted-foreground">Update your account password</div>
                  </div>
                  <Button onClick={() => setShowChangePassword(true)} variant="outline" size="sm">
                    Change Password
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">Email Notifications</div>
                      <div className="text-sm text-muted-foreground">Receive email updates about projects</div>
                    </div>
                    <input type="checkbox" defaultChecked className="accent-current" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">Push Notifications</div>
                      <div className="text-sm text-muted-foreground">Receive push notifications in browser</div>
                    </div>
                    <input type="checkbox" className="accent-current" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your personal details</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-1">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground flex items-center">
                <UserIcon size={20} className="mr-2 text-muted-foreground" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1">First Name</Label>
                  <Input type="text" required value={editForm.first_name || ''} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1">Last Name</Label>
                  <Input type="text" required value={editForm.last_name || ''} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1">Mobile Number</Label>
                  <Input type="tel" required value={editForm.mobile_number || ''} onChange={(e) => setEditForm({ ...editForm, mobile_number: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground flex items-center">
                <MapPinIcon size={20} className="mr-2 text-muted-foreground" />
                Address Information
              </h3>
              <div>
                <Label className="mb-1">Address</Label>
                <textarea
                  required
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="mb-1">City</Label>
                  <Input type="text" required value={editForm.city || ''} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1">State</Label>
                  <Input type="text" required value={editForm.state || ''} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1">Country</Label>
                  <Input type="text" required value={editForm.country || ''} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="mb-1">Pincode</Label>
                  <Input type="text" required value={editForm.pincode || ''} onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1">Date of Birth</Label>
                  <Input type="date" value={editForm.date_of_birth || ''} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1">Date of Joining</Label>
                  <Input type="date" value={editForm.date_of_joining || ''} onChange={(e) => setEditForm({ ...editForm, date_of_joining: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Identity Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground flex items-center">
                <CreditCardIcon size={20} className="mr-2 text-muted-foreground" />
                Identity Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1">Aadhar Number</Label>
                  <Input type="text" value={editForm.aadhar_number || ''} onChange={(e) => setEditForm({ ...editForm, aadhar_number: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1">PAN Number</Label>
                  <Input type="text" value={editForm.pan_number || ''} onChange={(e) => setEditForm({ ...editForm, pan_number: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Company Information (client only) */}
            {user.role === 'client' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground flex items-center">
                  <BriefcaseIcon size={20} className="mr-2 text-muted-foreground" />
                  Company Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1">Company Name</Label>
                    <Input type="text" value={editForm.company_name || ''} onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })} />
                  </div>
                  <div>
                    <Label className="mb-1">Company Code</Label>
                    <Input type="text" value={editForm.company_code || ''} onChange={(e) => setEditForm({ ...editForm, company_code: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {/* Profile Picture */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground flex items-center">
                <CameraIcon size={20} className="mr-2 text-muted-foreground" />
                Profile Picture
              </h3>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Set a new password for your account</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label className="mb-1">Current Password</Label>
              <Input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1">New Password</Label>
              <Input
                type="password"
                required
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Must be at least 6 characters long</p>
            </div>
            <div>
              <Label className="mb-1">Confirm New Password</Label>
              <Input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Change Password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}