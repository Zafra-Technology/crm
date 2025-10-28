'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { authAPI } from '@/lib/api/auth';
import { projectsApi } from '@/lib/api/projects';
import type { RegisterData } from '@/lib/api/auth';
import { User } from '@/types';
import { Client } from '@/types/client';
import ConfirmModal from '@/components/modals/ConfirmModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { 
  PlusIcon, 
  UserIcon, 
  KeyIcon,
  MailIcon, 
  PhoneIcon, 
  BuildingIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  EyeIcon,
  EyeOffIcon,
  FolderIcon
} from 'lucide-react';
// use existing authAPI import above

export default function ClientsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailError, setEmailError] = useState('');
  const [showSendMailModal, setShowSendMailModal] = useState(false);
  const [mailForm, setMailForm] = useState({ to: '', subject: '', message: '' });
  const [mailLoading, setMailLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };
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
    company_name: '',
    company_code: '',
    profile_pic: null as File | null,
  });

  // Generate colorful avatar background
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500', 'bg-rose-500', 'bg-violet-500'
    ];
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        loadClientsAndProjects(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const loadClientsAndProjects = async (currentUser?: User | null) => {
    try {
      setLoading(true);
      // Load clients
      const clientsData = await authAPI.getUsers('client');

      // Load projects and aggregate counts per client
      let allProjects = [] as any[];
      try {
        // Admin/PMs can see all projects
        const role = currentUser?.role || user?.role;
        const uid = (currentUser?.id || user?.id) as any;
        if (role === 'admin' || role === 'project_manager' || role === 'assistant_project_manager') {
          allProjects = await projectsApi.getAll();
        } else if (uid) {
          // Fallback: projects for current user
          allProjects = await projectsApi.getByUser(String(uid), String(role));
        }
      } catch (e) {
        console.warn('Projects load failed; falling back to zero counts');
        allProjects = [];
      }

      const countsByClientId: Record<string, number> = {};
      allProjects.forEach((p: any) => {
        const clientId = String(p.clientId || p.client_id || '');
        if (!clientId) return;
        countsByClientId[clientId] = (countsByClientId[clientId] || 0) + 1;
      });

      const clientsWithCounts = clientsData.map(client => ({
        ...client,
        id: client.id.toString(),
        pan_number: (client as any).pan_number || '',
        projectsCount: countsByClientId[String(client.id)] || 0,
      }));

      setClients(clientsWithCounts);
      setProjects(allProjects);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
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

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous email error
    setEmailError('');
    
    try {
      setLoading(true);
      
      // Check if email already exists
      const isEmailValid = await validateEmail(formData.email);
      if (!isEmailValid) {
        setLoading(false);
        return;
      }
      
      const clientData: RegisterData = {
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
        pan_number: formData.pan_number,
        company_name: formData.company_name,
        role: 'client' // Always set role as client
      };

      const newClient = await authAPI.createUser(clientData);
      
      // Add to clients list with projects count
      const clientWithCount = {
        ...newClient,
        id: newClient.id.toString(), // Convert number to string
        pan_number: (newClient as any).pan_number || '', // Handle missing pan_number
        projectsCount: 0
      };
      
      setClients([...clients, clientWithCount]);
      setFormData({ 
        email: '', password: '', first_name: '', last_name: '', 
        mobile_number: '', address: '', city: '', 
        state: '', country: '', pincode: '', aadhar_number: '', 
        pan_number: '', company_name: '', company_code: '', profile_pic: null 
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding client:', error);
      alert('Failed to create client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData({
      email: client.email,
      password: '', // Don't populate password for editing
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      mobile_number: client.mobile_number || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      country: client.country || '',
      pincode: client.pincode || '',
      aadhar_number: client.aadhar_number || '',
      pan_number: (client as any).pan_number || '',
      company_name: client.company_name || '',
      company_code: (client as any).company_code || '',
      profile_pic: null,
    });
    setShowAddForm(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      try {
        setLoading(true);
        
        // Update client through API
        const updatedClient = await authAPI.updateUser(parseInt(editingClient.id), {
          first_name: formData.first_name,
          last_name: formData.last_name,
          mobile_number: formData.mobile_number,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          pincode: formData.pincode,
          aadhar_number: formData.aadhar_number,
          pan_number: formData.pan_number,
          company_name: formData.company_name,
        } as Partial<RegisterData>);
        
        // Preserve the project count when updating
        const clientWithCount = { 
          ...updatedClient, 
          id: updatedClient.id.toString(), // Convert number to string
          pan_number: (updatedClient as any).pan_number || '',
          projectsCount: editingClient.projectsCount 
        };
        setClients(clients.map(c => 
          c.id === editingClient.id ? clientWithCount : c
        ));
        setEditingClient(null);
        setFormData({ 
          email: '', password: '', first_name: '', last_name: '', 
          mobile_number: '', address: '', city: '', 
          state: '', country: '', pincode: '', aadhar_number: '', 
          pan_number: '', company_name: '', company_code: '', profile_pic: null 
        });
        setShowAddForm(false);
      } catch (error) {
        console.error('Error updating client:', error);
        alert('Failed to update client. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    
    try {
      setLoading(true);
      // Client deletion now handled through Django backend
      await authAPI.deleteUser(parseInt(selectedClient.id));
      setClients(clients.filter(c => c.id !== selectedClient.id));
      setShowDeleteModal(false);
      setSelectedClient(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleClientStatus = async (id: string) => {
    const client = clients.find(c => c.id === id);
    if (client) {
      try {
        setLoading(true);
        
        // Update user status through API
        const updatedClient = await authAPI.updateUser(parseInt(id), {
          is_active: !client.is_active
        });
        
        // Update the client in the list
        setClients(clients.map(c => 
          c.id === id ? { 
            ...updatedClient, 
            id: updatedClient.id.toString(), // Convert number to string
            pan_number: (updatedClient as any).pan_number || '',
            projectsCount: client.projectsCount 
          } : c
        ));
      } catch (error) {
        console.error('Error toggling client status:', error);
        alert('Failed to update client status. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const openDeleteModal = (client: Client) => {
    setSelectedClient(client);
    setShowDeleteModal(true);
  };

  // Use live search with debouncing
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const filteredClients = clients.filter(client =>
    (client.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.company_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for search
    const timeout = setTimeout(async () => {
      if (value.trim()) {
        try {
          const searchResults = await authAPI.getUsers('client', value);
          // Calculate project counts for search results
          const searchWithCounts = searchResults.map(client => ({
            ...client,
            id: client.id.toString(), // Convert number to string
            pan_number: (client as any).pan_number || '', // Handle missing pan_number
            projectsCount: projects.filter((project: any) => 
              project.clientId === client.id
            ).length
          }));
          setClients(searchWithCounts);
        } catch (error) {
          console.error('Error searching clients:', error);
        }
      } else {
        loadClientsAndProjects();
      }
    }, 300);
    
    setSearchTimeout(timeout);
  };

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Allow project managers, assistant project managers, and admins to manage clients (edit/delete)
  const canManageClients = user.role === 'project_manager' || user.role === 'assistant_project_manager' || user.role === 'admin';
  // Allow project managers, assistant project managers, and admins to create clients
  const canCreateClients = canManageClients;

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-background z-20 pb-4 mb-2 -mx-6 px-6">
        <div className="flex items-center justify-between bg-background pt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clients</h1>
            <p className="text-muted-foreground mt-1">Manage your client relationships</p>
          </div>
          {canCreateClients && (
            <Button
              onClick={() => {
                setEditingClient(null);
                setFormData({ 
                  email: '', password: '', first_name: '', last_name: '', 
                  mobile_number: '', address: '', city: '', 
                  state: '', country: '', pincode: '', aadhar_number: '', 
                  pan_number: '', company_name: '', company_code: '', profile_pic: null 
                });
                setShowAddForm(true);
              }}
              className="flex items-center gap-2 shadow-md"
            >
              <PlusIcon size={18} />
              <span>Add Client</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center p-6">
            <div className="text-2xl font-bold text-foreground">{clients.length}</div>
            <div className="text-sm text-muted-foreground">Total Clients</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center p-6">
            <div className="text-2xl font-bold text-green-600">
              {clients.filter(c => c.is_active).length}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center p-6">
            <div className="text-2xl font-bold text-muted-foreground">
              {clients.filter(c => !c.is_active).length}
            </div>
            <div className="text-sm text-muted-foreground">Inactive</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center p-6">
            <div className="text-2xl font-bold text-blue-600">
              {clients.reduce((sum, c) => sum + (c.projectsCount || 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Projects</div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search clients by name, email, or company..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              name="client_search"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Client Directory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="h-full flex flex-col">
              <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 ${getAvatarColor(client.full_name)} rounded-full flex items-center justify-center`}>
                    <span className="text-white font-semibold text-sm">{getInitials(client.full_name)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{client.full_name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      client.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {client.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                {canManageClients && (
                  <div className="flex space-x-1">
                    {/* Edit: allowed for admins/PMs */}
                    {canManageClients && (
                      <button
                        onClick={() => handleEditClient(client)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        <EditIcon size={16} />
                      </button>
                    )}
                    {/* Change Password: admins/PMs */}
                    {canManageClients && (
                      <button
                        onClick={() => {
                          setSelectedClient(client);
                          setPasswordForm({ password: '', confirm: '' });
                          setShowPasswordModal(true);
                        }}
                        className="p-1 text-muted-foreground hover:text-amber-600"
                        title="Change Password"
                      >
                        <KeyIcon size={16} />
                      </button>
                    )}
                    {/* Send Mail: admins/PMs */}
                    {canManageClients && (
                      <button
                        onClick={() => {
                          setSelectedClient(client);
                          setMailForm({ 
                            to: client.email, 
                            subject: '', 
                            message: '' 
                          });
                          setShowSendMailModal(true);
                        }}
                        className="p-1 text-muted-foreground hover:text-blue-600"
                        title="Send Email"
                      >
                        <MailIcon size={16} />
                      </button>
                    )}
                    {/* View Projects: admins/PMs */}
                    {canManageClients && (
                      <button
                        onClick={() => {
                          // Navigate to projects page with client filter
                          window.location.href = `/dashboard?client=${client.id}`;
                        }}
                        className="p-1 text-muted-foreground hover:text-green-600"
                        title="View Client Projects"
                      >
                        <FolderIcon size={16} />
                      </button>
                    )}
                    {/* Delete: only admins/PMs */}
                    {canManageClients && (
                      <button
                        onClick={() => openDeleteModal(client)}
                        className="p-1 text-muted-foreground hover:text-red-600"
                      >
                        <TrashIcon size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <MailIcon size={14} />
                  <span>{client.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <PhoneIcon size={14} />
                  <span>{client.mobile_number || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <BuildingIcon size={14} />
                  <span>{client.company_name || 'N/A'}</span>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  {client.projectsCount} project{client.projectsCount !== 1 ? 's' : ''}
                </div>
                {canManageClients && (
                  <button
                    onClick={() => toggleClientStatus(client.id)}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    {client.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="card text-center py-12">
            <BuildingIcon size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No clients found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Add your first client to get started.'}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Client Modal */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
            <DialogDescription>
              {editingClient ? 'Update client information' : 'Create a new client account'}
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Modal Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <form onSubmit={editingClient ? handleUpdateClient : handleAddClient} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!editingClient && (
                    <>
                      <div>
                        <Label className="mb-1">Email Address *</Label>
                        <Input
                          type="email"
                          required
                          value={formData.email}
                          onChange={async (e) => {
                            setFormData({ ...formData, email: e.target.value });
                            // Clear error when user starts typing
                            if (emailError) setEmailError('');
                          }}
                          onBlur={() => validateEmail(formData.email)}
                          autoComplete="email"
                          name="client_email"
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
                          autoComplete="new-password"
                          name="new_client_password"
                          placeholder="Enter password"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <Label className="mb-1">First Name</Label>
                    <Input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Last Name</Label>
                    <Input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Enter last name"
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Mobile Number</Label>
                    <Input
                      type="tel"
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                      placeholder="Enter mobile number"
                    />
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1">Company Name</Label>
                    <Input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Company Code</Label>
                    <Input
                      type="text"
                      value={formData.company_code}
                      onChange={(e) => setFormData({ ...formData, company_code: e.target.value })}
                      placeholder="Enter company code"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Address Information</h3>
                <div>
                  <Label className="mb-1">Address</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    placeholder="Enter full address"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-1">City</Label>
                    <Input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <Label className="mb-1">State</Label>
                    <Input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="Enter state"
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Country</Label>
                    <Input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Enter country"
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Pincode</Label>
                    <Input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="Enter pincode"
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
                      placeholder="Enter Aadhar number"
                      maxLength={12}
                    />
                  </div>
                  <div>
                    <Label className="mb-1">PAN Number</Label>
                    <Input
                      type="text"
                      value={formData.pan_number}
                      onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                      placeholder="Enter PAN number"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingClient(null);
                    setFormData({ 
                      email: '', password: '', first_name: '', last_name: '', 
                      mobile_number: '', address: '', city: '', 
                      state: '', country: '', pincode: '', aadhar_number: '', 
                      pan_number: '', company_name: '', company_code: '', profile_pic: null 
                    });
                  }}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Processing...' : (editingClient ? 'Update Client' : 'Add Client')}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedClient(null);
        }}
        onConfirm={handleDeleteClient}
        title="Delete Client"
        message={`Are you sure you want to delete "${selectedClient?.full_name}"? This action cannot be undone.`}
        confirmText="Delete Client"
        type="danger"
        loading={loading}
      />

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal && !!selectedClient} onOpenChange={setShowPasswordModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              {selectedClient ? `For ${selectedClient.full_name}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
              <div>
                <Label className="mb-1">New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                    autoComplete="new-password"
                    name="set_password_new"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Password must be at least 6 characters.</p>
              </div>
              <div>
                <Label className="mb-1">Confirm Password</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    autoComplete="new-password"
                    name="set_password_confirm"
                    placeholder="Re-enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
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
                    if (!selectedClient) return;
                    await authAPI.setUserPassword(parseInt(selectedClient.id), passwordForm.password);
                    setShowPasswordModal(false);
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

      {/* Send Mail Modal */}
      <Dialog open={showSendMailModal && !!selectedClient} onOpenChange={setShowSendMailModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Send Mail</DialogTitle>
            <DialogDescription>Send an email to this client</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
              <div>
                <Label className="mb-1">To</Label>
                <Input
                  type="email"
                  value={mailForm.to}
                  onChange={(e) => setMailForm({ ...mailForm, to: e.target.value })}
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <Label className="mb-1">Subject</Label>
                <Input
                  type="text"
                  value={mailForm.subject}
                  onChange={(e) => setMailForm({ ...mailForm, subject: e.target.value })}
                  placeholder="Subject"
                />
              </div>
              <div>
                <Label className="mb-1">Message</Label>
                <Textarea
                  rows={6}
                  value={mailForm.message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMailForm({ ...mailForm, message: e.target.value })}
                  placeholder="Type your message..."
                />
              </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setShowSendMailModal(false)} disabled={mailLoading} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={async () => {
                  try {
                    setMailLoading(true);
                    await authAPI.sendMail(mailForm);
                    setShowSendMailModal(false);
                    showToast('success', 'Email sent successfully');
                  } catch (err: any) {
                    showToast('error', err?.message || 'Failed to send email');
                  } finally {
                    setMailLoading(false);
                  }
                }}
              disabled={mailLoading || !mailForm.to || !mailForm.subject || !mailForm.message}
            >
              {mailLoading ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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