'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/types';
import { UserIcon, MailIcon, BriefcaseIcon, EditIcon } from 'lucide-react';
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

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        setEditForm({
          name: currentUser.name,
          email: currentUser.email,
        });
      }
    };
    loadUser();
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      const updatedUser = { ...user, ...editForm };
      setUser(updatedUser);
      // TODO: Save to backend API
      setIsEditing(false);
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
                <UserIcon size={40} className="text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">{user.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
              <span className="inline-block px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium capitalize">
                {user.role.replace('_', ' ')}
              </span>
              {user.role !== 'designer' && (
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
                  <div className="text-foreground">{user.name}</div>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your personal details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <Label className="mb-1">Full Name</Label>
              <Input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1">Email Address</Label>
              <Input
                type="email"
                required
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
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