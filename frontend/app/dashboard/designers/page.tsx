'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { authAPI } from '@/lib/api/auth';
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
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    company: '',
    role: '',
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
    loadDesignersAndProjects();
  }, []);

  const loadDesignersAndProjects = async () => {
    try {
      setLoading(true);
      // Load designers from user management system
      const designersData = await authAPI.getUsers();
      
      // Filter for designer roles
      const designerRoles = ['designer', 'senior_designer', 'professional_engineer', 'auto_cad_drafter'];
      const filteredDesigners = designersData.filter(user => 
        designerRoles.includes(user.role)
      );
      
      // Convert to Designer format and add project count
      const designersWithCounts = filteredDesigners.map(designer => ({
        id: designer.id.toString(),
        name: designer.full_name,
        email: designer.email,
        phoneNumber: designer.mobile_number,
        company: designer.company_name || '',
        role: designer.role || 'designer',
        status: (designer.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
        joinedDate: designer.date_of_joining || designer.created_at,
        projectsCount: 0 // TODO: Update when projects API is available
      }));
      
      setDesigners(designersWithCounts);
      setProjects([]); // Empty projects array for now
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
      
      // Create designer using authAPI
      const designerData = {
        email: formData.email,
        password: 'temp123', // Temporary password - should be changed by user
        first_name: formData.name.split(' ')[0] || '',
        last_name: formData.name.split(' ').slice(1).join(' ') || '',
        mobile_number: formData.phoneNumber,
        company_name: formData.company,
        role: 'designer' // Default role
      };
      
      const newDesigner = await authAPI.createUser(designerData);
      if (newDesigner) {
        // Convert to Designer format and add with project count of 0
        const designerWithCount = {
          id: newDesigner.id.toString(),
          name: newDesigner.full_name,
          email: newDesigner.email,
          phoneNumber: newDesigner.mobile_number,
          company: newDesigner.company_name || '',
          role: newDesigner.role || 'designer',
          status: (newDesigner.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
          joinedDate: newDesigner.date_of_joining || newDesigner.created_at,
          projectsCount: 0
        };
        setDesigners([...designers, designerWithCount]);
        setFormData({ name: '', email: '', phoneNumber: '', company: '', role: '' });
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
      company: designer.company,
      role: designer.role,
    });
    setShowAddForm(true);
  };

  const handleUpdateDesigner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDesigner) {
      try {
        setLoading(true);
        
        // Update designer using authAPI
        const designerData = {
          first_name: formData.name.split(' ')[0] || '',
          last_name: formData.name.split(' ').slice(1).join(' ') || '',
          mobile_number: formData.phoneNumber,
          company_name: formData.company
        };
        
        const updatedDesigner = await authAPI.updateUser(parseInt(editingDesigner.id), designerData);
        if (updatedDesigner) {
          // Convert to Designer format and preserve project count
          const designerWithCount = {
            id: updatedDesigner.id.toString(),
            name: updatedDesigner.full_name,
            email: updatedDesigner.email,
            phoneNumber: updatedDesigner.mobile_number,
            company: updatedDesigner.company_name || '',
            role: updatedDesigner.role || editingDesigner.role || 'designer',
            status: (updatedDesigner.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
            joinedDate: updatedDesigner.date_of_joining || updatedDesigner.created_at,
            projectsCount: editingDesigner.projectsCount
          };
          setDesigners(designers.map(d => 
            d.id === editingDesigner.id ? designerWithCount : d
          ));
          setEditingDesigner(null);
          setFormData({ name: '', email: '', phoneNumber: '', company: '', role: '' });
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

  const handleDeleteDesigner = async (id: string) => {
    if (confirm('Are you sure you want to delete this designer?')) {
      try {
        setLoading(true);
        await authAPI.deleteUser(parseInt(id));
        setDesigners(designers.filter(d => d.id !== id));
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
        
        // Toggle status using authAPI
        const updatedDesigner = await authAPI.updateUser(parseInt(id), {
          is_active: designer.status === 'active' ? false : true
        });
        
        if (updatedDesigner) {
          // Convert to Designer format and preserve project count
          const designerWithCount = {
            id: updatedDesigner.id.toString(),
            name: updatedDesigner.full_name,
            email: updatedDesigner.email,
            phoneNumber: updatedDesigner.mobile_number,
            company: updatedDesigner.company_name || '',
            role: updatedDesigner.role || designer.role || 'designer',
            status: (updatedDesigner.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
            joinedDate: updatedDesigner.date_of_joining || updatedDesigner.created_at,
            projectsCount: designer.projectsCount
          };
          setDesigners(designers.map(d => 
            d.id === id ? designerWithCount : d
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
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
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
          // Search designers using authAPI
          const searchResults = await authAPI.getUsers(undefined, value);
          
          // Filter for designer roles
          const designerRoles = ['designer', 'senior_designer', 'auto_cad_drafter'];
          const filteredResults = searchResults.filter(user => 
            designerRoles.includes(user.role)
          );
          
          // Convert to Designer format
          const searchWithCounts = filteredResults.map(designer => ({
            id: designer.id.toString(),
            name: designer.full_name,
            email: designer.email,
            phoneNumber: designer.mobile_number,
            company: designer.company_name || '',
            role: designer.role || 'designer',
            status: (designer.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
            joinedDate: designer.date_of_joining || designer.created_at,
            projectsCount: 0 // TODO: Update when projects API is available
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
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Only allow project managers to manage designers
  const canManageDesigners = user.role === 'project_manager';

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-background z-20 pb-4 mb-2 -mx-6 px-6">
        <div className="flex items-center justify-between bg-background pt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Designers</h1>
            <p className="text-muted-foreground mt-1">Manage your design team members</p>
          </div>
          {canManageDesigners && (
            <Button
              onClick={() => {
                setEditingDesigner(null);
                setFormData({ name: '', email: '', phoneNumber: '', company: '', role: '' });
                setShowAddForm(true);
              }}
              className="flex items-center space-x-2 shadow-md"
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
      <Card>
        <CardContent className="p-4">
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
        </CardContent>
      </Card>

      {/* Designers List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDesigners.map((designer) => (
            <Card key={designer.id} className="h-full flex flex-col">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 ${getAvatarColor(designer.name)} rounded-full flex items-center justify-center`}>
                      <span className="text-white font-semibold text-sm">{getInitials(designer.name)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{designer.name}</h3>
                      <Badge variant={designer.status === 'active' ? 'default' : 'secondary'} className="text-xs">
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
                        className="h-8 w-8"
                      >
                        <EditIcon size={16} />
                      </Button>
                      <Button
                        onClick={() => handleDeleteDesigner(designer.id)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
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

                <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    {designer.projectsCount} project{designer.projectsCount !== 1 ? 's' : ''}
                  </div>
                  {canManageDesigners && (
                    <Button
                      onClick={() => toggleDesignerStatus(designer.id)}
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary/80 font-medium"
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
          <Card>
            <CardContent className="text-center py-12">
              <UserIcon size={48} className="mx-auto mb-4 text-muted-foreground" />
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
              {editingDesigner ? 'Update designer information' : 'Add a new designer to the team'}
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
                setFormData({ name: '', email: '', phoneNumber: '', company: '', role: '' });
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
    </div>
  );
}