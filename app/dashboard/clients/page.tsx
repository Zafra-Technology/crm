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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Only allow project managers to manage clients
  const canManageClients = user.role === 'project_manager';

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-gray-50 z-20 pb-4 mb-2 -mx-6 px-6">
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clients</h1>
            <p className="text-muted-foreground mt-1">Manage your client relationships</p>
          </div>
          {canManageClients && (
            <Button
              onClick={() => {
                setEditingClient(null);
                setFormData({ name: '', email: '', phoneNumber: '', company: '' });
                setShowAddForm(true);
              }}
              className="flex items-center space-x-2"
            >
              <PlusIcon size={20} />
              <span>Add Client</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">{clients.length}</div>
            <div className="text-sm text-muted-foreground">Total Clients</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {clients.filter(c => c.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">
              {clients.filter(c => c.status === 'inactive').length}
            </div>
            <div className="text-sm text-muted-foreground">Inactive</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {clients.reduce((sum, c) => sum + (c.projectsCount || 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Projects</div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="card">
        <div className="relative">
          <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search clients by name, email, or company..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Client Directory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="h-full flex flex-col">
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 ${getAvatarColor(client.name)} rounded-full flex items-center justify-center`}>
                      <span className="text-white font-semibold text-sm">{getInitials(client.name)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{client.name}</h3>
                      <Badge 
                        variant={client.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {client.status}
                      </Badge>
                    </div>
                  </div>
                  {canManageClients && (
                    <div className="flex space-x-1">
                      <Button
                        onClick={() => handleEditClient(client)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <EditIcon size={16} />
                      </Button>
                      <Button
                        onClick={() => openDeleteModal(client)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <TrashIcon size={16} />
                      </Button>
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
                    <span>{client.phoneNumber}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <BuildingIcon size={14} />
                    <span>{client.company}</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    {client.projectsCount} project{client.projectsCount !== 1 ? 's' : ''}
                  </div>
                {canManageClients && (
                  <Button
                    onClick={() => toggleClientStatus(client.id)}
                    variant="ghost"
                    size="sm"
                    className="text-primary font-medium transition-colors"
                  >
                    {client.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <BuildingIcon size={48} className="mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground mb-2">No clients found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms.' : 'Add your first client to get started.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Client Modal */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </DialogTitle>
            <DialogDescription>
              {editingClient ? 'Update client information below.' : 'Fill in the client details below.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Full Name *</Label>
                <Input
                  id="client-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-email">Email Address *</Label>
                <Input
                  id="client-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">Phone Number *</Label>
                <Input
                  id="client-phone"
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-company">Company *</Label>
                <Input
                  id="client-company"
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Enter company name"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setEditingClient(null);
                setFormData({ name: '', email: '', phoneNumber: '', company: '' });
              }}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading}
              className="flex-1"
              onClick={editingClient ? handleUpdateClient : handleAddClient}
            >
              {loading ? 'Processing...' : (editingClient ? 'Update Client' : 'Add Client')}
            </Button>
          </DialogFooter>
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
        message={`Are you sure you want to delete "${selectedClient?.name}"? This action cannot be undone.`}
        confirmText="Delete Client"
        type="danger"
        loading={loading}
      />
    </div>
  );
}