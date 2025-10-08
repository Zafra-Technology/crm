'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/types';
import { SettingsIcon, BellIcon, ShieldIcon, PaletteIcon, LogOutIcon } from 'lucide-react';

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
        <h1 className="text-2xl font-bold text-black">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your preferences and account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <BellIcon size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-black">Notifications</h3>
          </div>
          <div className="space-y-4">
            {[
              { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive email updates' },
              { key: 'pushNotifications', label: 'Push Notifications', description: 'Browser notifications' },
              { key: 'weeklyDigest', label: 'Weekly Digest', description: 'Weekly summary email' },
              { key: 'projectUpdates', label: 'Project Updates', description: 'Instant project notifications' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{item.label}</div>
                  <div className="text-sm text-gray-600">{item.description}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings[item.key as keyof typeof settings] as boolean}
                    onChange={(e) => handleSettingChange(item.key, e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Appearance */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <PaletteIcon size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-black">Appearance</h3>
          </div>
          <div className="space-y-4">
            {[
              { key: 'darkMode', label: 'Dark Mode', description: 'Use dark theme (coming soon)' },
              { key: 'compactView', label: 'Compact View', description: 'Reduce spacing and padding' },
              { key: 'showAvatars', label: 'Show Avatars', description: 'Display user avatars in chat' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{item.label}</div>
                  <div className="text-sm text-gray-600">{item.description}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings[item.key as keyof typeof settings] as boolean}
                    onChange={(e) => handleSettingChange(item.key, e.target.checked)}
                    disabled={item.key === 'darkMode'}
                  />
                  <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black ${item.key === 'darkMode' ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <ShieldIcon size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-black">Security</h3>
          </div>
          <div className="space-y-4">
            <button className="btn-secondary w-full text-left">
              <div className="font-medium">Change Password</div>
              <div className="text-sm text-gray-600 mt-1">Update your account password</div>
            </button>
            <button className="btn-secondary w-full text-left">
              <div className="font-medium">Two-Factor Authentication</div>
              <div className="text-sm text-gray-600 mt-1">Add extra security to your account</div>
            </button>
            <button className="btn-secondary w-full text-left">
              <div className="font-medium">Active Sessions</div>
              <div className="text-sm text-gray-600 mt-1">Manage your active login sessions</div>
            </button>
          </div>
        </div>

        {/* Account */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <SettingsIcon size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-black">Account</h3>
          </div>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <div className="font-medium text-gray-900 mb-1">Account Type</div>
              <div className="capitalize">{user.role.replace('_', ' ')}</div>
            </div>
            <div className="text-sm text-gray-600">
              <div className="font-medium text-gray-900 mb-1">Member Since</div>
              <div>January 2024</div>
            </div>
            <hr className="border-gray-200" />
            <button className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors">
              <LogOutIcon size={16} />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="btn-primary">
          Save Settings
        </button>
      </div>
    </div>
  );
}