'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, setCurrentUser } from '@/lib/auth';
import { User } from '@/types';
import { UserIcon, MailIcon, BriefcaseIcon, EditIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      setEditForm({
        name: currentUser.name,
        email: currentUser.email,
      });
    }
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      const updatedUser = { ...user, ...editForm };
      setUser(updatedUser);
      setCurrentUser(updatedUser);
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
        <h1 className="text-2xl font-bold text-black">Profile</h1>
        <p className="text-gray-600 mt-1">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="card text-center">
            <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon size={40} className="text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-black mb-1">{user.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{user.email}</p>
            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize">
              {user.role.replace('_', ' ')}
            </span>
            {user.role !== 'designer' && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="w-full mt-4 flex items-center justify-center space-x-2"
              >
                <EditIcon size={16} />
                <span>Edit Profile</span>
              </Button>
            )}
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-black mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <UserIcon size={20} className="text-gray-500" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Full Name</div>
                  <div className="text-gray-900">{user.name}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MailIcon size={20} className="text-gray-500" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Email Address</div>
                  <div className="text-gray-900">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <BriefcaseIcon size={20} className="text-gray-500" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Role</div>
                  <div className="text-gray-900 capitalize">{user.role.replace('_', ' ')}</div>
                </div>
              </div>
            </div>
          </div>

          {user.role === 'designer' ? (
            <div className="card">
              <h3 className="text-lg font-semibold text-black mb-4">Security</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Password</div>
                    <div className="text-sm text-gray-600">Update your account password</div>
                  </div>
                  <Button
                    onClick={() => setShowChangePassword(true)}
                    variant="outline"
                    size="sm"
                  >
                    Change Password
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <h3 className="text-lg font-semibold text-black mb-4">Account Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Email Notifications</div>
                    <div className="text-sm text-gray-600">Receive email updates about projects</div>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Push Notifications</div>
                    <div className="text-sm text-gray-600">Receive push notifications in browser</div>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your personal information below.
            </DialogDescription>
          </DialogHeader>
          
          <form id="edit-profile-form" onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email Address</Label>
              <Input
                id="profile-email"
                type="email"
                required
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="Enter your email address"
              />
            </div>
          </form>
          
          <DialogFooter className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-profile-form"
              className="flex-1"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update your account password for better security.
            </DialogDescription>
          </DialogHeader>
          
          <form id="change-password-form" onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Enter current password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Enter new password"
              />
              <p className="text-xs text-muted-foreground">Must be at least 6 characters long</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>
          </form>
          
          <DialogFooter className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowChangePassword(false);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="change-password-form"
              className="flex-1"
            >
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}