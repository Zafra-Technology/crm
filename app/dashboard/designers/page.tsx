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

  const handleDeleteDesigner = async (id: string) => {
    if (confirm('Are you sure you want to delete this designer?')) {
      try {
        setLoading(true);
        const success = await designersApi.delete(id);
        if (success) {
          setDesigners(designers.filter(d => d.id !== id));
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
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Only allow project managers to manage designers
  const canManageDesigners = user.role === 'project_manager';

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-gray-50 z-20 pb-4 mb-2 -mx-6 px-6">
        <div className="flex items-center justify-between bg-gray-50 pt-2">
          <div>
            <h1 className="text-2xl font-bold text-black">Designers</h1>
            <p className="text-gray-600 mt-1">Manage your design team members</p>
          </div>
          {canManageDesigners && (
            <button
              onClick={() => {
                setEditingDesigner(null);
                setFormData({ name: '', email: '', phoneNumber: '', role: '' });
                setShowAddForm(true);
              }}
              className="btn-primary flex items-center space-x-2 shadow-md"
            >
              <PlusIcon size={20} />
              <span>Add Designer</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-black">{designers.length}</div>
          <div className="text-sm text-gray-600">Total Designers</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {designers.filter(d => d.status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-600">
            {designers.filter(d => d.status === 'inactive').length}
          </div>
          <div className="text-sm text-gray-600">Inactive</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">
            {designers.reduce((sum, d) => sum + (d.projectsCount || 0), 0)}
          </div>
          <div className="text-sm text-gray-600">Total Assignments</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card">
        <div className="relative">
          <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search designers by name, email, or role..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
          />
        </div>
      </div>

      {/* Designers List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-black">Team Members</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDesigners.map((designer) => (
            <div key={designer.id} className="card h-full flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 ${getAvatarColor(designer.name)} rounded-full flex items-center justify-center`}>
                    <span className="text-white font-semibold text-sm">{getInitials(designer.name)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-black">{designer.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      designer.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {designer.status}
                    </span>
                  </div>
                </div>
                {canManageDesigners && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditDesigner(designer)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <EditIcon size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteDesigner(designer.id)}
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
                  <span>{designer.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <PhoneIcon size={14} />
                  <span>{designer.phoneNumber}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <BriefcaseIcon size={14} />
                  <span>{designer.role}</span>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-200 flex items-center justify-between text-sm">
                <div className="text-gray-500">
                  {designer.projectsCount} project{designer.projectsCount !== 1 ? 's' : ''}
                </div>
                {canManageDesigners && (
                  <button
                    onClick={() => toggleDesignerStatus(designer.id)}
                    className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    {designer.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredDesigners.length === 0 && (
          <div className="card text-center py-12">
            <UserIcon size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No designers found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Add your first designer to get started.'}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Designer Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}>
          <div className="bg-white rounded-lg max-w-2xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Sticky Modal Header */}
            <div className="sticky top-0 bg-white rounded-t-lg px-6 pt-6 pb-4 border-b border-gray-200 z-10">
              <h3 className="text-lg font-semibold text-black">
                {editingDesigner ? 'Edit Designer' : 'Add New Designer'}
              </h3>
            </div>
            
            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
            <form onSubmit={editingDesigner ? handleUpdateDesigner : handleAddDesigner} className="space-y-6">
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
                    Role *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                    placeholder="e.g., Senior UI/UX Designer"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingDesigner(null);
                    setFormData({ name: '', email: '', phoneNumber: '', role: '' });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : (editingDesigner ? 'Update Designer' : 'Add Designer')}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}