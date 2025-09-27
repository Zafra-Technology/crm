'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { clientsApi } from '@/lib/api/clients';
import { User } from '@/types';
import { Client } from '@/types/client';
import ConfirmModal from '@/components/modals/ConfirmModal';
import { 
  PlusIcon, 
  UserIcon, 
  MailIcon, 
  PhoneIcon, 
  BuildingIcon,
  EditIcon,
  TrashIcon,
  SearchIcon
} from 'lucide-react';

export default function ClientsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    company: '',
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
      // Load both clients and projects
      const [clientsData, projectsData] = await Promise.all([
        clientsApi.getAll(),
        fetch('/api/projects').then(res => res.json()).then(data => data.projects)
      ]);
      
      // Calculate actual project counts for each client
      const clientsWithCounts = clientsData.map(client => ({
        ...client,
        projectsCount: projectsData.filter((project: any) => 
          project.clientId === client.id
        ).length
      }));
      
      setClients(clientsWithCounts);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading clients and projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const newClient = await clientsApi.create(formData);
      if (newClient) {
        // Add with project count of 0 for new clients
        const clientWithCount = { ...newClient, projectsCount: 0 };
        setClients([...clients, clientWithCount]);
        setFormData({ name: '', email: '', phoneNumber: '', company: '' });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding client:', error);
      alert('Failed to add client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phoneNumber: client.phoneNumber,
      company: client.company,
    });
    setShowAddForm(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      try {
        setLoading(true);
        const updatedClient = await clientsApi.update(editingClient.id, formData);
        if (updatedClient) {
          // Preserve the project count when updating
          const clientWithCount = { 
            ...updatedClient, 
            projectsCount: editingClient.projectsCount 
          };
          setClients(clients.map(c => 
            c.id === editingClient.id ? clientWithCount : c
          ));
          setEditingClient(null);
          setFormData({ name: '', email: '', phoneNumber: '', company: '' });
          setShowAddForm(false);
        }
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
      const success = await clientsApi.delete(selectedClient.id);
      if (success) {
        setClients(clients.filter(c => c.id !== selectedClient.id));
        setShowDeleteModal(false);
        setSelectedClient(null);
      }
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
        const updatedClient = await clientsApi.toggleStatus(id, client.status);
        if (updatedClient) {
          setClients(clients.map(c => 
            c.id === id ? { ...updatedClient, projectsCount: client.projectsCount } : c
          ));
        }
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
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company.toLowerCase().includes(searchTerm.toLowerCase())
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
          const searchResults = await clientsApi.search(value);
          // Calculate project counts for search results
          const searchWithCounts = searchResults.map(client => ({
            ...client,
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

  // Only allow project managers to manage clients
  const canManageClients = user.role === 'project_manager';

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-gray-50 z-20 pb-4 mb-2 -mx-6 px-6">
        <div className="flex items-center justify-between bg-gray-50 pt-2">
          <div>
            <h1 className="text-2xl font-bold text-black">Clients</h1>
            <p className="text-gray-600 mt-1">Manage your client relationships</p>
          </div>
          {canManageClients && (
            <button
              onClick={() => {
                setEditingClient(null);
                setFormData({ name: '', email: '', phoneNumber: '', company: '' });
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
            {clients.filter(c => c.status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-600">
            {clients.filter(c => c.status === 'inactive').length}
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
                  <div className={`w-12 h-12 ${getAvatarColor(client.name)} rounded-full flex items-center justify-center`}>
                    <span className="text-white font-semibold text-sm">{getInitials(client.name)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-black">{client.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      client.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {client.status}
                    </span>
                  </div>
                </div>
                {canManageClients && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditClient(client)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <EditIcon size={16} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(client)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon size={16} />
                    </button>
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
                  <span>{client.phoneNumber}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <BuildingIcon size={14} />
                  <span>{client.company}</span>
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
                    {client.status === 'active' ? 'Deactivate' : 'Activate'}
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
              {/* Two Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
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
                    setFormData({ name: '', email: '', phoneNumber: '', company: '' });
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
        message={`Are you sure you want to delete "${selectedClient?.name}"? This action cannot be undone.`}
        confirmText="Delete Client"
        type="danger"
        loading={loading}
      />
    </div>
  );
}