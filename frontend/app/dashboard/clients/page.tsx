'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { authAPI } from '@/lib/api/auth';
import type { RegisterData } from '@/lib/api/auth';
import { User } from '@/types';
import { Client } from '@/types/client';
import ConfirmModal from '@/components/modals/ConfirmModal';
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
  EyeOffIcon
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
    const currentUser = getCurrentUser();
    setUser(currentUser);
    loadClientsAndProjects();
  }, []);

  const loadClientsAndProjects = async () => {
    try {
      setLoading(true);
      // Load clients only (projects API not available yet)
      const clientsData = await authAPI.getUsers('client');
      
      // Set projects count to 0 for now (will be updated when projects API is ready)
      const clientsWithCounts = clientsData.map(client => ({
        ...client,
        id: client.id.toString(), // Convert number to string
        pan_number: (client as any).pan_number || '', // Handle missing pan_number
        projectsCount: 0 // TODO: Update when projects API is available
      }));
      
      setClients(clientsWithCounts);
      setProjects([]); // Empty projects array for now
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
        pan_number: '', company_name: '', profile_pic: null 
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
          pan_number: '', company_name: '', profile_pic: null 
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

  // Allow project managers and admins to manage clients (edit/delete)
  const canManageClients = user.role === 'project_manager' || user.role === 'admin';
  // Allow digital marketing to create clients
  const canCreateClients = canManageClients || user.role === 'digital_marketing';
  const canSendMail = user.role === 'digital_marketing';

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-gray-50 z-20 pb-4 mb-2 -mx-6 px-6">
        <div className="flex items-center justify-between bg-gray-50 pt-2">
          <div>
            <h1 className="text-2xl font-bold text-black">Clients</h1>
            <p className="text-gray-600 mt-1">Manage your client relationships</p>
          </div>
          {canCreateClients && (
            <button
              onClick={() => {
                setEditingClient(null);
                setFormData({ 
          email: '', password: '', first_name: '', last_name: '', 
          mobile_number: '', address: '', city: '', 
          state: '', country: '', pincode: '', aadhar_number: '', 
          pan_number: '', company_name: '', profile_pic: null 
        });
                setShowAddForm(true);
              }}
              className="btn-primary flex items-center space-x-2 shadow-md"
            >
              <PlusIcon size={20} />
              <span>Add Client</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-black">{clients.length}</div>
          <div className="text-sm text-gray-600">Total Clients</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {clients.filter(c => c.is_active).length}
          </div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-600">
            {clients.filter(c => !c.is_active).length}
          </div>
          <div className="text-sm text-gray-600">Inactive</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">
            {clients.reduce((sum, c) => sum + (c.projectsCount || 0), 0)}
          </div>
          <div className="text-sm text-gray-600">Total Projects</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card">
        <div className="relative">
          <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients by name, email, or company..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            name="client_search"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-black">Client Directory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div key={client.id} className="card h-full flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 ${getAvatarColor(client.full_name)} rounded-full flex items-center justify-center`}>
                    <span className="text-white font-semibold text-sm">{getInitials(client.full_name)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-black">{client.full_name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      client.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {client.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                {(canManageClients || canSendMail || user.role === 'digital_marketing') && (
                  <div className="flex space-x-1">
                    {/* Edit: allowed for admins/PMs and digital_marketing */}
                    {(canManageClients || user.role === 'digital_marketing') && (
                      <button
                        onClick={() => handleEditClient(client)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <EditIcon size={16} />
                      </button>
                    )}
                    {/* Change Password: admins/PMs and digital_marketing */}
                    {(canManageClients || user.role === 'digital_marketing') && (
                      <button
                        onClick={() => {
                          setSelectedClient(client);
                          setPasswordForm({ password: '', confirm: '' });
                          setShowPasswordModal(true);
                        }}
                        className="p-1 text-gray-400 hover:text-amber-600"
                        title="Change Password"
                      >
                        <KeyIcon size={16} />
                      </button>
                    )}
                    {/* Delete: only admins/PMs */}
                    {canManageClients && (
                      <button
                        onClick={() => openDeleteModal(client)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <TrashIcon size={16} />
                      </button>
                    )}
                    {canSendMail && (
                      <button
                        onClick={() => {
                          setSelectedClient(client);
                          setMailForm({ to: client.email || '', subject: '', message: '' });
                          setShowSendMailModal(true);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Send Mail"
                      >
                        <MailIcon size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <MailIcon size={14} />
                  <span>{client.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <PhoneIcon size={14} />
                  <span>{client.mobile_number || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <BuildingIcon size={14} />
                  <span>{client.company_name || 'N/A'}</span>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-200 flex items-center justify-between text-sm">
                <div className="text-gray-500">
                  {client.projectsCount} project{client.projectsCount !== 1 ? 's' : ''}
                </div>
                {canManageClients && (
                  <button
                    onClick={() => toggleClientStatus(client.id)}
                    className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    {client.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
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
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}>
          <div className="bg-white rounded-lg max-w-2xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Sticky Modal Header */}
            <div className="sticky top-0 bg-white rounded-t-lg px-6 pt-6 pb-4 border-b border-gray-200 z-10">
              <h3 className="text-lg font-semibold text-black">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h3>
            </div>
            
            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
            <form onSubmit={editingClient ? handleUpdateClient : handleAddClient} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!editingClient && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address *
                        </label>
                        <input
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
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-black focus:border-black ${
                            emailError ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter email address"
                        />
                        {emailError && (
                          <p className="mt-1 text-sm text-red-600">{emailError}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          autoComplete="new-password"
                          name="new_client_password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                          placeholder="Enter password"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                      placeholder="Enter last name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                      placeholder="Enter mobile number"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                    placeholder="Enter full address"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                      placeholder="Enter state"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                      placeholder="Enter country"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>
              </div>

              {/* Identity Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Identity Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Aadhar Number
                    </label>
                    <input
                      type="text"
                      value={formData.aadhar_number}
                      onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                      placeholder="Enter Aadhar number"
                      maxLength={12}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={formData.pan_number}
                      onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                      placeholder="Enter PAN number"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                    placeholder="Enter company name"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingClient(null);
                    setFormData({ 
          email: '', password: '', first_name: '', last_name: '', 
          mobile_number: '', address: '', city: '', 
          state: '', country: '', pincode: '', aadhar_number: '', 
          pan_number: '', company_name: '', profile_pic: null 
        });
                  }}
                  disabled={loading}
                  className="btn-secondary flex-1 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (editingClient ? 'Update Client' : 'Add Client')}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

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
      {showPasswordModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}>
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-black">Change Password</h3>
              <p className="text-sm text-gray-500 mt-1">For {selectedClient.full_name}</p>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                    autoComplete="new-password"
                    name="set_password_new"
                    className="w-full pr-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
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
                <p className="mt-1 text-xs text-gray-500">Password must be at least 6 characters.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    autoComplete="new-password"
                    name="set_password_confirm"
                    className="w-full pr-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
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
            <div className="px-6 pb-6 flex space-x-3">
              <button
                onClick={() => setShowPasswordModal(false)}
                disabled={passwordLoading}
                className="btn-secondary flex-1 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
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
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Mail Modal */}
      {showSendMailModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}>
          <div className="bg-white rounded-lg max-w-xl w-full overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-black">Send Mail</h3>
              <p className="text-sm text-gray-500 mt-1">Send an email to this client</p>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="email"
                  value={mailForm.to}
                  onChange={(e) => setMailForm({ ...mailForm, to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={mailForm.subject}
                  onChange={(e) => setMailForm({ ...mailForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                  placeholder="Subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  rows={6}
                  value={mailForm.message}
                  onChange={(e) => setMailForm({ ...mailForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                  placeholder="Type your message..."
                />
              </div>
            </div>
            <div className="px-6 pb-6 flex space-x-3">
              <button
                onClick={() => setShowSendMailModal(false)}
                disabled={mailLoading}
                className="btn-secondary flex-1 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
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
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {mailLoading ? 'Sending...' : 'Send'}
              </button>
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