'use client';

import { useState } from 'react';
import { XIcon, AlertTriangleIcon, UserIcon } from 'lucide-react';
import { authAPI, User as APIUser } from '@/lib/api/auth';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserDeleted: () => void;
  user: APIUser | null;
}

export default function DeleteConfirmationModal({ isOpen, onClose, onUserDeleted, user }: DeleteConfirmationModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await authAPI.deleteUser(user.id);
      onUserDeleted();
      onClose();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 p-2 rounded-full">
              <AlertTriangleIcon size={20} className="text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Delete User</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-gray-100 p-3 rounded-full">
              <UserIcon size={24} className="text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-medium text-gray-900 mb-2">
                Are you sure you want to delete this user?
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Name:</span>
                    <span className="ml-2 text-sm text-gray-900">{user.full_name}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Email:</span>
                    <span className="ml-2 text-sm text-gray-900">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Role:</span>
                    <span className="ml-2 text-sm text-gray-900">{user.role_display}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangleIcon size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Warning</p>
                    <p className="text-sm text-red-700 mt-1">
                      This action cannot be undone. All user data, including projects, tasks, and messages associated with this user will be permanently deleted.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  );
}
