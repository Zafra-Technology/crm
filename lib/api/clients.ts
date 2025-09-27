import { Client } from '@/types/client';

const API_BASE = '/api/clients';

export const clientsApi = {
  // Get all clients
  getAll: async (): Promise<Client[]> => {
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error('Failed to fetch clients');
      const data = await response.json();
      return data.clients;
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
  },

  // Search clients
  search: async (searchTerm: string): Promise<Client[]> => {
    try {
      const response = await fetch(`${API_BASE}?search=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error('Failed to search clients');
      const data = await response.json();
      return data.clients;
    } catch (error) {
      console.error('Error searching clients:', error);
      return [];
    }
  },

  // Get single client
  getById: async (id: string): Promise<Client | null> => {
    try {
      const response = await fetch(`${API_BASE}/${id}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.client;
    } catch (error) {
      console.error('Error fetching client:', error);
      return null;
    }
  },

  // Create new client
  create: async (clientData: Omit<Client, 'id' | 'status' | 'joinedDate' | 'projectsCount'>): Promise<Client | null> => {
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create client');
      }
      
      const data = await response.json();
      return data.client;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  },

  // Update client
  update: async (id: string, updateData: Partial<Client>): Promise<Client | null> => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update client');
      }
      
      const data = await response.json();
      return data.client;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  },

  // Delete client
  delete: async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error deleting client:', error);
      return false;
    }
  },

  // Toggle client status
  toggleStatus: async (id: string, currentStatus: 'active' | 'inactive'): Promise<Client | null> => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    return await clientsApi.update(id, { status: newStatus });
  },
};