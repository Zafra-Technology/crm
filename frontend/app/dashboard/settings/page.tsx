'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/types';
import { SettingsIcon, BellIcon, ShieldIcon, PaletteIcon, LogOutIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyDigest: true,
    projectUpdates: true,
    darkMode: false,
    compactView: false,
    showAvatars: true,
  });

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  );
}