'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/types';
import { Building2, Mail, Phone, Hash, MapPin, FileText, Save, X, Edit2, CheckCircle2, BellIcon, ShieldIcon, PaletteIcon, SettingsIcon, LogOutIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CompanyDetails {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_code: string;
  company_address: string;
  company_gst_number: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyDigest: true,
    projectUpdates: true,
    darkMode: false,
    compactView: false,
    showAvatars: true,
  });
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    company_name: '',
    company_email: '',
    company_phone: '',
    company_code: '',
    company_address: '',
    company_gst_number: '',
  });
  const [originalDetails, setOriginalDetails] = useState<CompanyDetails>({
    company_name: '',
    company_email: '',
    company_phone: '',
    company_code: '',
    company_address: '',
    company_gst_number: '',
  });

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      // Only load if user is admin
      if (currentUser && currentUser.role === 'admin') {
        loadCompanyDetails();
      }
    };
    loadUser();
  }, []);

  const loadCompanyDetails = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/company-details', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCompanyDetails(data);
        setOriginalDetails(data);
      }
    } catch (error) {
      console.error('Failed to load company details:', error);
    }
  };

  const handleInputChange = (field: keyof CompanyDetails, value: string) => {
    setCompanyDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setOriginalDetails(companyDetails);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCompanyDetails(originalDetails);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/company-details', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(companyDetails),
      });
      if (response.ok) {
        setOriginalDetails(companyDetails);
        setIsEditing(false);
        setToast({ message: 'Company details updated successfully!', type: 'success' });
        setTimeout(() => setToast(null), 3000);
      } else {
        setToast({ message: 'Failed to update company details', type: 'error' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Error updating company details:', error);
      setToast({ message: 'Failed to update company details', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Show loading state if user is not yet loaded
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show different content based on user role
  if (user.role !== 'admin') {
    // Show old settings for non-admin users
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your preferences and account settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <BellIcon size={20} className="text-muted-foreground" />
                <CardTitle>Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive email updates' },
                { key: 'pushNotifications', label: 'Push Notifications', description: 'Browser notifications' },
                { key: 'weeklyDigest', label: 'Weekly Digest', description: 'Weekly summary email' },
                { key: 'projectUpdates', label: 'Project Updates', description: 'Instant project notifications' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">{item.label}</div>
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings[item.key as keyof typeof settings] as boolean}
                      onChange={(e) => handleSettingChange(item.key, e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <PaletteIcon size={20} className="text-muted-foreground" />
                <CardTitle>Appearance</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'darkMode', label: 'Dark Mode', description: 'Use dark theme (coming soon)' },
                { key: 'compactView', label: 'Compact View', description: 'Reduce spacing and padding' },
                { key: 'showAvatars', label: 'Show Avatars', description: 'Display user avatars in chat' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">{item.label}</div>
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings[item.key as keyof typeof settings] as boolean}
                      onChange={(e) => handleSettingChange(item.key, e.target.checked)}
                      disabled={item.key === 'darkMode'}
                    />
                    <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary ${item.key === 'darkMode' ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <ShieldIcon size={20} className="text-muted-foreground" />
                <CardTitle>Security</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">Change Password</Button>
              <Button variant="outline" className="w-full justify-start">Two-Factor Authentication</Button>
              <Button variant="outline" className="w-full justify-start">Active Sessions</Button>
            </CardContent>
          </Card>

          {/* Account */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <SettingsIcon size={20} className="text-muted-foreground" />
                <CardTitle>Account</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <div className="font-medium text-foreground mb-1">Account Type</div>
                <div className="capitalize text-foreground">{user.role.replace('_', ' ')}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                <div className="font-medium text-foreground mb-1">Member Since</div>
                <div>January 2024</div>
              </div>
              <hr className="border-border" />
              <Button variant="destructive" className="w-fit flex items-center gap-2">
                <LogOutIcon size={16} />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your company details</p>
        </div>
        {!isEditing ? (
          <Button onClick={handleEdit} className="flex items-center gap-2">
            <Edit2 size={16} />
            Edit
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button onClick={handleCancel} variant="outline" disabled={loading}>
              <X size={16} className="mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save size={16} className="mr-2" />
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 size={16} />
                Company Name
              </Label>
              <Input
                value={companyDetails.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                disabled={!isEditing}
                placeholder="Enter company name"
              />
            </div>

            {/* Company Email */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail size={16} />
                Company Email
              </Label>
              <Input
                type="email"
                value={companyDetails.company_email}
                onChange={(e) => handleInputChange('company_email', e.target.value)}
                disabled={!isEditing}
                placeholder="Enter company email"
              />
            </div>

            {/* Company Phone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone size={16} />
                Company Phone Number
              </Label>
              <Input
                type="tel"
                value={companyDetails.company_phone}
                onChange={(e) => handleInputChange('company_phone', e.target.value)}
                disabled={!isEditing}
                placeholder="Enter phone number"
              />
            </div>

            {/* Company Code */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hash size={16} />
                Company Code
              </Label>
              <Input
                value={companyDetails.company_code}
                onChange={(e) => handleInputChange('company_code', e.target.value)}
                disabled={!isEditing}
                placeholder="Enter company code"
              />
            </div>

            {/* Company GST Number */}
            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-2">
                <FileText size={16} />
                Company GST Number
              </Label>
              <Input
                value={companyDetails.company_gst_number}
                onChange={(e) => handleInputChange('company_gst_number', e.target.value)}
                disabled={!isEditing}
                placeholder="Enter GST number"
              />
            </div>

            {/* Company Address */}
            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-2">
                <MapPin size={16} />
                Company Address
              </Label>
              <Textarea
                value={companyDetails.company_address}
                onChange={(e) => handleInputChange('company_address', e.target.value)}
                disabled={!isEditing}
                placeholder="Enter company address"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toast Notification */}
      {toast && (
        <Alert 
          className={`fixed top-4 right-4 z-50 w-96 ${
            toast.type === 'success' 
              ? 'border-green-200 bg-green-50' 
              : 'border-red-200 bg-red-50'
          }`}
        >
          <AlertDescription className="flex items-center space-x-2">
            {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
            {toast.type === 'error' && <X className="h-5 w-5 text-red-600" />}
            <span className={`text-sm font-medium ${
              toast.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {toast.message}
            </span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
