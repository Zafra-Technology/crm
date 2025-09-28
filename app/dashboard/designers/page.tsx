'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { designersApi } from '@/lib/api/designers';
import { User } from '@/types';
import { Designer } from '@/types/designer';
import { 
  PlusIcon, 
  UserIcon, 
  MailIcon, 
  PhoneIcon, 
  BriefcaseIcon,
  EditIcon,
  TrashIcon,
  SearchIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function DesignersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDesigner, setEditingDesigner] = useState<Designer | null>(null);
  const [deletingDesigner, setDeletingDesigner] = useState<Designer | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    role: '',
  });
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

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
    loadDesignersAndProjects();
  }, []);

  const loadDesignersAndProjects = async () => {
    try {
      setLoading(true);
      // Load both designers and projects
      const [designersData, projectsData] = await Promise.all([
        designersApi.getAll(),
        fetch('/api/projects').then(res => res.json()).then(data => data.projects)
      ]);
      
      // Calculate actual project counts for each designer
      const designersWithCounts = designersData.map(designer => ({
        ...designer,
        projectsCount: projectsData.filter((project: any) => 
          project.designerIds && project.designerIds.includes(designer.id)
        ).length
      }));
      
      setDesigners(designersWithCounts);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading designers and projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDesigner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const newDesigner = await designersApi.create(formData);
      if (newDesigner) {
        // Add with project count of 0 for new designers
        const designerWithCount = { ...newDesigner, projectsCount: 0 };
        setDesigners([...designers, designerWithCount]);
        setFormData({ name: '', email: '', phoneNumber: '', role: '' });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding designer:', error);
      alert('Failed to add designer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDesigner = (designer: Designer) => {
    setEditingDesigner(designer);
    setFormData({
      name: designer.name,
      email: designer.email,
      phoneNumber: designer.phoneNumber,
      role: designer.role,
    });
    setShowAddForm(true);
  };

  const handleUpdateDesigner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDesigner) {
      try {
        setLoading(true);
        const updatedDesigner = await designersApi.update(editingDesigner.id, formData);
        if (updatedDesigner) {
          // Preserve the project count when updating
          const designerWithCount = { 
            ...updatedDesigner, 
            projectsCount: editingDesigner.projectsCount 
          };
          setDesigners(designers.map(d => 
            d.id === editingDesigner.id ? designerWithCount : d
          ));
          setEditingDesigner(null);
          setFormData({ name: '', email: '', phoneNumber: '', role: '' });
          setShowAddForm(false);
        }
      } catch (error) {
        console.error('Error updating designer:', error);
        alert('Failed to update designer. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteDesigner = async () => {
    if (deletingDesigner) {
      try {
        setLoading(true);
        const success = await designersApi.delete(deletingDesigner.id);
        if (success) {
          setDesigners(designers.filter(d => d.id !== deletingDesigner.id));
          setDeletingDesigner(null);
        } else {
          alert('Failed to delete designer. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting designer:', error);
        alert('Failed to delete designer. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleDesignerStatus = async (id: string) => {
    const designer = designers.find(d => d.id === id);
    if (designer) {
      try {
        setLoading(true);
        const updatedDesigner = await designersApi.toggleStatus(id, designer.status);
        if (updatedDesigner) {
          setDesigners(designers.map(d => 
            d.id === id ? updatedDesigner : d
          ));
        }
      } catch (error) {
        console.error('Error toggling designer status:', error);
        alert('Failed to update designer status. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Use live search with debouncing
  
  const filteredDesigners = designers.filter(designer =>
    designer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    designer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    designer.role.toLowerCase().includes(searchTerm.toLowerCase())
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
          const searchResults = await designersApi.search(value);
          // Calculate project counts for search results
          const searchWithCounts = searchResults.map(designer => ({
            ...designer,
            projectsCount: projects.filter((project: any) => 
              project.designerIds && project.designerIds.includes(designer.id)
            ).length
          }));
          setDesigners(searchWithCounts);
        } catch (error) {
          console.error('Error searching designers:', error);
        }
      } else {
        loadDesignersAndProjects();
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

  // Only allow project managers to manage designers
  const canManageDesigners = user.role === 'project_manager';

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-gray-50 z-20 pb-4 mb-2 -mx-6 px-6">
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Designers</h1>
            <p className="text-muted-foreground mt-1">Manage your design team members</p>
          </div>
          {canManageDesigners && (
            <Button
              onClick={() => {
                setEditingDesigner(null);
                setFormData({ name: '', email: '', phoneNumber: '', role: '' });
                setShowAddForm(true);
              }}
              className="flex items-center space-x-2"
            >
              <PlusIcon size={20} />
              <span>Add Designer</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">{designers.length}</div>
            <div className="text-sm text-muted-foreground">Total Designers</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {designers.filter(d => d.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">
              {designers.filter(d => d.status === 'inactive').length}
            </div>
            <div className="text-sm text-muted-foreground">Inactive</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {designers.reduce((sum, d) => sum + (d.projectsCount || 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Assignments</div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="card">
        <div className="relative">
          <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search designers by name, email, or role..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Designers List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDesigners.map((designer) => (
            <Card key={designer.id} className="h-full flex flex-col">
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 ${getAvatarColor(designer.name)} rounded-full flex items-center justify-center`}>
                      <span className="text-white font-semibold text-sm">{getInitials(designer.name)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{designer.name}</h3>
                      <Badge 
                        variant={designer.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {designer.status}
                      </Badge>
                    </div>
                  </div>
                  {canManageDesigners && (
                    <div className="flex space-x-1">
                      <Button
                        onClick={() => handleEditDesigner(designer)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <EditIcon size={16} />
                      </Button>
                      <Button
                        onClick={() => setDeletingDesigner(designer)}
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
                    <span>{designer.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <PhoneIcon size={14} />
                    <span>{designer.phoneNumber}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <BriefcaseIcon size={14} />
                    <span>{designer.role}</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    {designer.projectsCount} project{designer.projectsCount !== 1 ? 's' : ''}
                  </div>
                  {canManageDesigners && (
                    <Button
                      onClick={() => toggleDesignerStatus(designer.id)}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      {designer.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredDesigners.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <UserIcon size={48} className="mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground mb-2">No designers found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms.' : 'Add your first designer to get started.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Designer Modal */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingDesigner ? 'Edit Designer' : 'Add New Designer'}
            </DialogTitle>
            <DialogDescription>
              {editingDesigner ? 'Update designer information below.' : 'Fill in the designer details below.'}
            </DialogDescription>
          </DialogHeader>
            
          <form id="designer-form" onSubmit={editingDesigner ? handleUpdateDesigner : handleAddDesigner} className="space-y-6">
            {/* Two Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  type="text"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Senior UI/UX Designer"
                />
              </div>
            </div>
          </form>
          
          <DialogFooter className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setEditingDesigner(null);
                setFormData({ name: '', email: '', phoneNumber: '', role: '' });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="designer-form"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Processing...' : (editingDesigner ? 'Update Designer' : 'Add Designer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingDesigner} onOpenChange={() => setDeletingDesigner(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Designer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingDesigner?.name}</strong>? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingDesigner(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteDesigner}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Deleting...' : 'Delete Designer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}