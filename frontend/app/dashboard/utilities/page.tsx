'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { utilitiesApi, Utility } from '@/lib/api/utilities';
import { User } from '@/types';
import AddUtilitiesModal from '@/components/modals/AddUtilitiesModal';
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
import { PlusIcon, WrenchIcon, BatteryIcon, ZapIcon, PackageIcon, PencilIcon, TrashIcon, AnchorIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils/dateUtils';

export default function UtilitiesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUtility, setSelectedUtility] = useState<Utility | null>(null);
  const [editingUtility, setEditingUtility] = useState<Utility | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    model_name: '',
    category: 'Inventor' as 'Inventor' | 'Module' | 'Mounting' | 'Battery',
  });
  const { toast } = useToast();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        if (currentUser) {
          loadUtilities();
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const loadUtilities = async () => {
    try {
      setLoading(true);
      const data = await utilitiesApi.getAll();
      setUtilities(data);
    } catch (error) {
      console.error('Error loading utilities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load utilities',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUtilityCreated = () => {
    loadUtilities();
    toast({
      title: 'Success',
      description: 'Utility created successfully',
    });
  };

  const handleEditUtility = (utility: Utility) => {
    setEditingUtility(utility);
    setFormData({
      model_name: utility.model_name,
      category: utility.category,
    });
    setShowEditModal(true);
  };

  const handleUpdateUtility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUtility) return;

    try {
      setLoading(true);
      await utilitiesApi.update(editingUtility.id, formData);
      toast({
        title: 'Success',
        description: 'Utility updated successfully',
      });
      setShowEditModal(false);
      setEditingUtility(null);
      loadUtilities();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update utility',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUtility = async () => {
    if (!selectedUtility) return;

    try {
      setLoading(true);
      await utilitiesApi.delete(selectedUtility.id);
      toast({
        title: 'Success',
        description: 'Utility deleted successfully',
      });
      setShowDeleteModal(false);
      setSelectedUtility(null);
      loadUtilities();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete utility',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter utilities based on search term and category
  const filteredUtilities = utilities.filter((utility) => {
    const matchesSearch = utility.model_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === 'all' || utility.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = [
    {
      title: 'Total Utilities',
      value: utilities.length,
      icon: WrenchIcon,
      color: 'bg-blue-500',
    },
    {
      title: 'Inventor',
      value: utilities.filter((u) => u.category === 'Inventor').length,
      icon: ZapIcon,
      color: 'bg-yellow-500',
    },
    {
      title: 'Module',
      value: utilities.filter((u) => u.category === 'Module').length,
      icon: PackageIcon,
      color: 'bg-green-500',
    },
    {
      title: 'Mounting',
      value: utilities.filter((u) => u.category === 'Mounting').length,
      icon: AnchorIcon,
      color: 'bg-purple-500',
    },
    {
      title: 'Battery',
      value: utilities.filter((u) => u.category === 'Battery').length,
      icon: BatteryIcon,
      color: 'bg-orange-500',
    },
  ];

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Utilities</h1>
          <p className="text-muted-foreground">Manage utility models and categories</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 shadow-md"
        >
          <PlusIcon size={18} />
          <span>Add Utilities</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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

      {/* Utilities Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Utility Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex gap-4 w-full sm:w-auto">
              <div className="w-48">
                <Label className="text-xs">Category</Label>
                <Select
                  value={categoryFilter}
                  onValueChange={(v) => setCategoryFilter(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Inventor">Inventor</SelectItem>
                    <SelectItem value="Module">Module</SelectItem>
                    <SelectItem value="Mounting">Mounting</SelectItem>
                    <SelectItem value="Battery">Battery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[240px]">
                <Label htmlFor="utility-search" className="text-xs">Search</Label>
                <Input
                  id="utility-search"
                  type="text"
                  placeholder="Search by model name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadUtilities}>Apply</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCategoryFilter('all');
                  setSearchTerm('');
                  loadUtilities();
                }}
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading utilities...</div>
            ) : (
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Model Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {filteredUtilities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        {utilities.length === 0
                          ? 'No utilities found. Add your first utility to get started.'
                          : 'No utilities match your filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUtilities.map((utility, index) => (
                      <tr key={utility.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">
                            {utility.model_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              utility.category === 'Inventor'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                : utility.category === 'Module'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : utility.category === 'Mounting'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                            }`}
                          >
                            {utility.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {utility.created_at
                            ? formatDate(utility.created_at)
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditUtility(utility)}
                              className="text-primary hover:text-primary/80 transition-colors"
                            >
                              <PencilIcon size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUtility(utility);
                                setShowDeleteModal(true);
                              }}
                              className="text-destructive hover:text-destructive/80 transition-colors"
                            >
                              <TrashIcon size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Utilities Modal */}
      <AddUtilitiesModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onUtilityCreated={handleUtilityCreated}
      />

      {/* Edit Utility Modal */}
      <Dialog open={showEditModal && !!editingUtility} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Utility</DialogTitle>
            <DialogDescription>
              Update utility information
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateUtility} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_model_name">Model Name *</Label>
              <Input
                id="edit_model_name"
                type="text"
                value={formData.model_name}
                onChange={(e) =>
                  setFormData({ ...formData, model_name: e.target.value })
                }
                placeholder="Enter model name"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: 'Inventor' | 'Module' | 'Mounting' | 'Battery') =>
                  setFormData({ ...formData, category: value })
                }
                disabled={loading}
              >
                <SelectTrigger id="edit_category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inventor">Inventor</SelectItem>
                  <SelectItem value="Module">Module</SelectItem>
                  <SelectItem value="Mounting">Mounting</SelectItem>
                  <SelectItem value="Battery">Battery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUtility(null);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Utility'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal && !!selectedUtility} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Utility</DialogTitle>
            <DialogDescription>Confirm utility deletion</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <WrenchIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">
                  {selectedUtility?.model_name}
                </h4>
                <p className="text-xs text-muted-foreground">{selectedUtility?.category}</p>
              </div>
            </div>
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm">
              Are you sure you want to delete "{selectedUtility?.model_name}"? This action
              cannot be undone.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedUtility(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUtility}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete Utility'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
