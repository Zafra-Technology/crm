'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Settings, BarChart3, FolderOpen, PencilIcon, TrashIcon, Lock } from 'lucide-react';
import { authAPI, User as APIUser, resolveMediaUrl } from '@/lib/api/auth';
import { getAuthToken } from '@/lib/auth';
import { User } from '@/types';
// UI components for updated styling
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils/dateUtils';

interface AdminDashboardProps {
  user: User;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [users, setUsers] = useState<APIUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<APIUser | null>(null);
  const [editingUser, setEditingUser] = useState<APIUser | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirm: '',
  });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleChoices, setRoleChoices] = useState<Array<{value: string, label: string}>>([]);
  const [emailError, setEmailError] = useState('');
  const [roleError, setRoleError] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    mobile_number: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    aadhar_number: '',
    pan_number: '',
    role: '',
    date_of_joining: '',
    date_of_exit: '',
    profile_pic: null as File | null
  });

  const fetchUsers = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return;
      }

      console.log('Fetching users with role filter:', selectedRole, 'search:', searchTerm);
      const usersData = await authAPI.getUsers(selectedRole || undefined, searchTerm || undefined);
      console.log('Fetched users data:', usersData);
      
      // Filter out clients and client team members - only show staff users
      const staffUsers = usersData.filter(user => user.role !== 'client' && user.role !== 'client_team_member');
      setUsers(staffUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    loadRoleChoices();
  }, [selectedRole, searchTerm]);

  const loadRoleChoices = async () => {
    try {
      const roles = await authAPI.getRoleChoices();
      // Filter out client and client team member roles for staff management
      const staffRoles = roles.filter(role => role.value !== 'client' && role.value !== 'client_team_member');
      setRoleChoices(staffRoles);
    } catch (error) {
      console.error('Failed to load role choices:', error);
      // Fallback to empty array if API fails
      setRoleChoices([]);
    }
  };

  const handleUserCreated = () => {
    fetchUsers();
  };

  const handleUserUpdated = () => {
    fetchUsers();
  };

  const handleUserDeleted = () => {
    fetchUsers();
  };

  const openEditModal = (userData: APIUser) => {
    setSelectedUser(userData);
    setShowEditUserModal(true);
  };

  const openDeleteModal = (userData: APIUser) => {
    setSelectedUser(userData);
    setShowDeleteModal(true);
  };

  const openPasswordModal = (userData: APIUser) => {
    setSelectedUser(userData);
    setPasswordForm({ password: '', confirm: '' });
    setShowPasswordModal(true);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous email error
    setEmailError('');
    setRoleError('');
    
    // Require role selection
    if (!formData.role || formData.role === 'none') {
      setRoleError('Please select a role.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Check if email already exists
      const isEmailValid = await validateEmail(formData.email);
      if (!isEmailValid) {
        setLoading(false);
        return;
      }
      
      const userData = {
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
        aadhar_number: formData.aadhar_number,
        role: formData.role,
        date_of_joining: formData.date_of_joining || undefined
      };

      const created = await authAPI.createUser(userData);
      // Upload profile pic if provided
      if (formData.profile_pic) {
        try {
          await authAPI.uploadUserProfilePic(created.id, formData.profile_pic);
        } catch (err) {
          console.error('Profile picture upload failed:', err);
        }
      }
      fetchUsers();
      setShowCreateUserModal(false);
      setFormData({
        email: '', password: '', first_name: '', last_name: '',
        mobile_number: '', address: '', city: '', state: '', country: '',
        pincode: '', aadhar_number: '', pan_number: '', role: '',
        date_of_joining: '', date_of_exit: '', profile_pic: null
      });
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (userData: APIUser) => {
    setEditingUser(userData);
    setFormData({
      email: userData.email,
      password: '', // Don't populate password for editing
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      mobile_number: userData.mobile_number || '',
      address: userData.address || '',
      city: userData.city || '',
      state: userData.state || '',
      country: userData.country || '',
      pincode: userData.pincode || '',
      aadhar_number: userData.aadhar_number || '',
      pan_number: '', // This field doesn't exist in API yet
      role: userData.role || '',
      date_of_joining: userData.date_of_joining || '',
      date_of_exit: userData.date_of_exit || '',
      profile_pic: null,
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      try {
        setLoading(true);
        
        const userData = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          mobile_number: formData.mobile_number,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          pincode: formData.pincode,
          aadhar_number: formData.aadhar_number,
          role: formData.role,
          date_of_joining: formData.date_of_joining || undefined,
          date_of_exit: formData.date_of_exit || undefined
        };
        
        const updated = await authAPI.updateUser(editingUser.id, userData);
        // Upload profile pic if provided
        if (formData.profile_pic) {
          try {
            await authAPI.uploadUserProfilePic(updated.id, formData.profile_pic);
          } catch (err) {
            console.error('Profile picture upload failed:', err);
          }
        }
        fetchUsers();
        setShowEditUserModal(false);
        setEditingUser(null);
        setFormData({
          email: '', password: '', first_name: '', last_name: '',
          mobile_number: '', address: '', city: '', state: '', country: '',
          pincode: '', aadhar_number: '', pan_number: '', role: '',
          date_of_joining: '', date_of_exit: '', profile_pic: null
        });
      } catch (error) {
        console.error('Error updating user:', error);
        alert('Failed to update user. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      await authAPI.deleteUser(selectedUser.id);
      fetchUsers();
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      title: 'Total Users',
      value: users.length,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Users',
      value: users.filter(u => u.is_active).length,
      icon: BarChart3,
      color: 'bg-green-500'
    },
    {
      title: 'Admins',
      value: users.filter(u => u.role === 'admin').length,
      icon: Settings,
      color: 'bg-purple-500'
    },
    {
      title: 'Project Managers',
      value: users.filter(u => u.role === 'project_manager').length,
      icon: FolderOpen,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users and system settings</p>
        </div>
        <Button onClick={() => setShowCreateUserModal(true)} className="flex items-center gap-2 shadow-md">
          <UserPlus size={18} />
          <span>Create User</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex gap-4 w-full sm:w-auto">
              <div className="w-48">
                <Label className="text-xs">Role</Label>
                <Select value={selectedRole || 'all'} onValueChange={(v) => setSelectedRole(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Staff Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff Roles</SelectItem>
                    {roleChoices.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[240px]">
                <Label htmlFor="admin-user-search" className="text-xs">Search</Label>
                <Input
                  id="admin-user-search"
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchUsers}>Apply</Button>
              <Button variant="outline" onClick={() => { setSelectedRole(''); setSearchTerm(''); fetchUsers(); }}>Reset</Button>
            </div>
          </div>

        <div className="overflow-x-auto mt-4">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading users...</div>
            ) : (
              <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-border">
                {users.map((userData) => (
                  <tr key={userData.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {userData.profile_pic ? (
                              <img
                                src={resolveMediaUrl(userData.profile_pic)}
                                alt={userData.full_name}
                                className="h-10 w-10 rounded-full object-cover cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewImage(resolveMediaUrl(userData.profile_pic || ''));
                                }}
                              />
                            ) : (
                              <span className="text-sm font-medium text-foreground">
                                {userData.full_name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {userData.full_name}
                          </div>
                          <div className="text-sm text-muted-foreground">{userData.email}</div>
                  
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                        {userData.role_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {userData.company_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userData.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {userData.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {userData.date_of_joining ? formatDate(userData.date_of_joining) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleEditUser(userData);
                          }}
                          className="text-primary hover:text-primary/80 transition-colors"
                          title="Edit User"
                          type="button"
                        >
                          <PencilIcon size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            openPasswordModal(userData);
                          }}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Change Password"
                          type="button"
                        >
                          <Lock size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            openDeleteModal(userData);
                          }}
                          className="text-destructive hover:text-destructive/80 transition-colors"
                          disabled={userData.id === parseInt(user.id)}
                          title="Delete User"
                          type="button"
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Dialog open={showCreateUserModal} onOpenChange={setShowCreateUserModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Staff User</DialogTitle>
            <DialogDescription>Fill in details to create a new staff account</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <form onSubmit={handleCreateUser} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-1">Email Address *</Label>
                      <Input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (emailError) setEmailError('');
                        }}
                        onBlur={() => validateEmail(formData.email)}
                        className={emailError ? 'border-red-500' : ''}
                        placeholder="Enter email address"
                      />
                      {emailError && (
                        <p className="mt-1 text-sm text-red-600">{emailError}</p>
                      )}
                    </div>
                    <div>
                      <Label className="mb-1">Password *</Label>
                      <Input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">First Name</Label>
                      <Input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">Last Name</Label>
                      <Input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Last name"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">Mobile Number</Label>
                      <Input
                        type="tel"
                        value={formData.mobile_number}
                        onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                        placeholder="Mobile number"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">Role *</Label>
                      <Select value={formData.role || 'none'} onValueChange={(v) => { setFormData({ ...formData, role: v === 'none' ? '' : v }); if (roleError) setRoleError(''); }}>
                        <SelectTrigger className={roleError ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select Role</SelectItem>
                          {roleChoices.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label} *
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {roleError && (
                        <p className="mt-1 text-sm text-red-600">{roleError}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Picture */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground">Profile Picture</h3>
                  <div>
                    <Label className="mb-1">Upload Profile Picture</Label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                        setFormData({ ...formData, profile_pic: file });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formData.profile_pic && (
                      <p className="text-sm text-gray-600 mt-1">Selected: {formData.profile_pic.name}</p>
                    )}
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Address Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label className="mb-1">Address</Label>
                      <Input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Address"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">City</Label>
                      <Input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">State</Label>
                      <Input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">Country</Label>
                      <Input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        placeholder="Country"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">Pincode</Label>
                      <Input
                        type="text"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        placeholder="Pincode"
                      />
                    </div>
                  </div>
                </div>

                {/* Identity Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Identity Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-1">Aadhar Number</Label>
                      <Input
                        type="text"
                        value={formData.aadhar_number}
                        onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value })}
                        placeholder="Aadhar number"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">Date of Joining</Label>
                      <Input
                        type="date"
                        value={formData.date_of_joining}
                        onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateUserModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create User'}</Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditUserModal && !!editingUser} onOpenChange={setShowEditUserModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit User: {editingUser?.full_name}</DialogTitle>
            <DialogDescription>Update staff details</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <form onSubmit={handleUpdateUser} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-1">Email Address</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        disabled
                        className="bg-muted text-muted-foreground"
                        placeholder="Email address"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">First Name</Label>
                      <Input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">Last Name</Label>
                      <Input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Last name"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">Mobile Number</Label>
                      <Input
                        type="tel"
                        value={formData.mobile_number}
                        onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                        placeholder="Mobile number"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">Role</Label>
                      <Select value={formData.role || 'none'} onValueChange={(v) => setFormData({ ...formData, role: v === 'none' ? '' : v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select Role</SelectItem>
                          {roleChoices.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Address Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label className="mb-1">Address</Label>
                      <Input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Address"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">City</Label>
                      <Input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">State</Label>
                      <Input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">Country</Label>
                      <Input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        placeholder="Country"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">Pincode</Label>
                      <Input
                        type="text"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        placeholder="Pincode"
                      />
                    </div>
                  </div>
                </div>

                {/* Employment Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Employment Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-1">Aadhar Number</Label>
                      <Input
                        type="text"
                        value={formData.aadhar_number}
                        onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value })}
                        placeholder="Aadhar number"
                      />
                    </div>
                    <div>
                      <Label className="mb-1">Date of Joining</Label>
                      <Input
                        type="date"
                        value={formData.date_of_joining}
                        onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="mb-1">Date of Exit</Label>
                      <Input
                        type="date"
                        value={formData.date_of_exit}
                        onChange={(e) => setFormData({ ...formData, date_of_exit: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Profile Picture */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground">Profile Picture</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {editingUser?.profile_pic ? 'Replace Profile Picture' : 'Upload Profile Picture'}
                    </label>
                    {editingUser?.profile_pic && (
                      <div className="flex items-center space-x-3 mb-2">
                        <img
                          src={resolveMediaUrl(editingUser.profile_pic)}
                          alt="Current profile"
                          className="h-12 w-12 rounded-full object-cover"
                        />
                        <span className="text-sm text-gray-600">Current</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                        setFormData({ ...formData, profile_pic: file });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formData.profile_pic && (
                      <p className="text-sm text-gray-600 mt-1">Selected: {formData.profile_pic.name}</p>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                {/* Legacy footer removed; using DialogFooter below */}
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditUserModal(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update User'}</Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal && !!selectedUser} onOpenChange={setShowPasswordModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                placeholder="Enter new password"
                className="mt-1"
              />
              {passwordForm.password && passwordForm.password.length < 6 && (
                <p className="mt-1 text-xs text-red-600">Password must be at least 6 characters.</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                placeholder="Confirm new password"
                className="mt-1"
              />
              {passwordForm.confirm && passwordForm.password !== passwordForm.confirm && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setShowPasswordModal(false)} disabled={passwordLoading} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!passwordForm.password || passwordForm.password.length < 6) {
                  showToast('error', 'Password must be at least 6 characters');
                  return;
                }
                if (passwordForm.password !== passwordForm.confirm) {
                  showToast('error', 'Passwords do not match');
                  return;
                }
                try {
                  setPasswordLoading(true);
                  if (!selectedUser) return;
                  await authAPI.setUserPassword(selectedUser.id, passwordForm.password);
                  setShowPasswordModal(false);
                  setPasswordForm({ password: '', confirm: '' });
                  showToast('success', 'Password updated successfully');
                } catch (err: any) {
                  showToast('error', err?.message || 'Failed to update password');
                } finally {
                  setPasswordLoading(false);
                }
              }}
              disabled={passwordLoading || !passwordForm.password || passwordForm.password.length < 6 || passwordForm.password !== passwordForm.confirm}
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal && !!selectedUser} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>Confirm user deletion</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <span className="text-lg font-medium text-muted-foreground">
                  {selectedUser?.full_name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">{selectedUser?.full_name}</h4>
                <p className="text-xs text-muted-foreground">{selectedUser?.email}</p>
                <p className="text-xs text-muted-foreground">{selectedUser?.role_display}</p>
              </div>
            </div>
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm">
              Are you sure you want to delete "{selectedUser?.full_name}"? This action cannot be undone.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={loading || (!!selectedUser && selectedUser.id === parseInt(user.id))}>
              {loading ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal - match edit modal sizing */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setPreviewImage(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white rounded-t-lg px-6 pt-6 pb-4 border-b border-gray-200 z-10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black">Profile Picture</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close preview"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto px-6 pb-6 flex items-center justify-center">
              <img src={previewImage} alt="Profile preview" className="max-h-[70vh] w-auto rounded-md object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-md border ${
          toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}