'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { authAPI } from '@/lib/api/auth';
import { 
  PlusIcon, 
  UsersIcon, 
  MailIcon, 
  BuildingIcon, 
  SendIcon,
  CheckCircleIcon,
  AlertCircleIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils/dateUtils';

interface DigitalMarketingDashboardProps {
  user: User;
}

interface ClientOnboardingForm {
  name: string;
  email: string;
  company: string;
}

interface OnboardedClient {
  id: string;
  name: string;
  email: string;
  company: string;
  status: 'pending' | 'credentials_sent' | 'active';
  createdAt: string;
}

export default function DigitalMarketingDashboard({ user }: DigitalMarketingDashboardProps) {
  const [onboardedClients, setOnboardedClients] = useState<OnboardedClient[]>([]);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState<ClientOnboardingForm>({
    name: '',
    email: '',
    company: ''
  });
  const [loading, setLoading] = useState(false);
  const [sendingCredentials, setSendingCredentials] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadOnboardedClients();
  }, []);

  const loadOnboardedClients = async () => {
    try {
      // Fetch clients from backend
      const clientsData = await authAPI.getUsers();
      
      // Filter only client role
      const clients = clientsData
        .filter(user => user.role === 'client')
        .map(user => ({
          id: user.id.toString(),
          name: user.full_name,
          email: user.email,
          company: user.company_name || '',
          status: (user.credentials_sent ? 'credentials_sent' : 'pending') as 'pending' | 'credentials_sent' | 'active',
          createdAt: user.created_at,
        }));
      
      setOnboardedClients(clients);
    } catch (error) {
      console.error('Error loading onboarded clients:', error);
    }
  };

  const handleOnboardClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!onboardingForm.name || !onboardingForm.email || !onboardingForm.company) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      // Use the new onboardClient API method
      const result = await authAPI.onboardClient({
        name: onboardingForm.name,
        email: onboardingForm.email,
        company: onboardingForm.company
      });

      // Refresh the clients list from backend
      await loadOnboardedClients();

      // Reset form and close modal
      setOnboardingForm({ name: '', email: '', company: '' });
      setShowOnboardingModal(false);
      setSuccessMessage('Client onboarded successfully! You can now send credentials.');
      
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Error onboarding client:', error);
      setErrorMessage('Failed to onboard client. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleSendCredentials = async (client: OnboardedClient) => {
    try {
      setSendingCredentials(client.id);
      setErrorMessage('');

      // Use the new sendClientCredentials API method
      // Note: Password is generated on backend and sent via email
      await authAPI.sendClientCredentials(
        parseInt(client.id),
        client.email,
        client.name,
        client.company,
        undefined // Password is managed by backend
      );

      // Refresh the clients list from backend
      await loadOnboardedClients();

      setSuccessMessage(`Credentials sent successfully to ${client.name}!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Error sending credentials:', error);
      setErrorMessage('Failed to send credentials. Please try again.');
    } finally {
      setSendingCredentials(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pending</span>;
      case 'credentials_sent':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Credentials Sent</span>;
      case 'active':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Active</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Unknown</span>;
    }
  };

  const stats = {
    total: onboardedClients.length,
    pending: onboardedClients.filter(c => c.status === 'pending').length,
    credentialsSent: onboardedClients.filter(c => c.status === 'credentials_sent').length,
    active: onboardedClients.filter(c => c.status === 'active').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Digital Marketing Dashboard</h1>
        <p className="text-muted-foreground mt-1">Onboard new clients and manage client relationships</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert>
          <CheckCircleIcon className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertCircleIcon className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <MailIcon className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Credentials Sent</p>
                <p className="text-2xl font-bold text-green-600">{stats.credentialsSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Client Onboarding</h2>
        <Button onClick={() => setShowOnboardingModal(true)} className="flex items-center gap-2">
          <PlusIcon size={16} />
          Onboard New Client
        </Button>
      </div>

      {/* Onboarded Clients List */}
      <div className="space-y-4">
        {onboardedClients.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <UsersIcon size={48} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">No clients onboarded yet</h3>
              <p className="text-muted-foreground">Start by onboarding your first client.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {onboardedClients.map((client) => (
              <Card key={client.id} className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{client.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                    </div>
                    {getStatusBadge(client.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <BuildingIcon size={14} />
                    <span>{client.company}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Onboarded: {formatDate(client.createdAt)}
                  </div>
                  {client.status === 'pending' && (
                    <Button
                      onClick={() => handleSendCredentials(client)}
                      disabled={sendingCredentials === client.id}
                      className="w-full flex items-center gap-2"
                      size="sm"
                    >
                      <SendIcon size={14} />
                      {sendingCredentials === client.id ? 'Sending...' : 'Send Credentials'}
                    </Button>
                  )}
                  {client.status === 'credentials_sent' && (
                    <div className="text-center text-sm text-green-600 font-medium">
                      ✓ Credentials Sent
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Onboard Client Modal */}
      <Dialog open={showOnboardingModal} onOpenChange={setShowOnboardingModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Onboard New Client</DialogTitle>
            <DialogDescription>
              Enter client details to create their account and generate login credentials.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleOnboardClient} className="space-y-4">
            <div>
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                type="text"
                required
                value={onboardingForm.name}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
                placeholder="Enter client's full name"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                required
                value={onboardingForm.email}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, email: e.target.value })}
                placeholder="Enter client's email address"
              />
            </div>
            
            <div>
              <Label htmlFor="company">Company Name *</Label>
              <Input
                id="company"
                type="text"
                required
                value={onboardingForm.company}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, company: e.target.value })}
                placeholder="Enter company name"
              />
            </div>

            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> A random password will be generated automatically. 
                The client will receive their login credentials via email after onboarding.
              </p>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowOnboardingModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Onboarding...' : 'Onboard Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
