'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { authAPI } from '@/lib/api/auth';
import { User } from '@/types';
import { Designer } from '@/types/designer';
import { 
  UserIcon, 
  MailIcon, 
  PhoneIcon, 
  BriefcaseIcon,
  SearchIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { projectsApi } from '@/lib/api/projects';

export default function DesignersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

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
    getCurrentUser().then(setUser);
    loadDesignersAndProjects();
  }, []);

  const loadDesignersAndProjects = async () => {
    try {
      setLoading(true);
      // Load designers from user management system
      const designersData = await authAPI.getUsers();
      // Load projects from backend to compute counts
      const allProjects = await projectsApi.getAll();
      
      // Filter for designer roles
      const designerRoles = ['designer', 'senior_designer', 'professional_engineer', 'auto_cad_drafter'];
      const filteredDesigners = designersData.filter(user => 
        designerRoles.includes(user.role)
      );
      
      // Precompute per-designer project counts
      const designerIdToCount: Record<string, number> = {};
      for (const p of allProjects) {
        const ids = ((p as any).designerIds && (p as any).designerIds.length > 0)
          ? (p as any).designerIds
          : Array.isArray((p as any).designers)
            ? (p as any).designers.map((d: any) => String(d.id))
            : [];
        for (const did of ids) {
          const key = String(did);
          designerIdToCount[key] = (designerIdToCount[key] || 0) + 1;
        }
      }

      // Convert to Designer format and add project count from backend
      const designersWithCounts = filteredDesigners.map(designer => {
        const idStr = designer.id.toString();
        const projectsCount = designerIdToCount[idStr] || 0;
        return {
          id: idStr,
          name: designer.full_name,
          email: designer.email,
          phoneNumber: designer.mobile_number,
          company: designer.company_name || '',
          role: designer.role || 'designer',
          status: (designer.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
          joinedDate: designer.date_of_joining || designer.created_at,
          projectsCount
        };
      });
      
      setDesigners(designersWithCounts);
      setProjects(allProjects as any[]);
    } catch (error) {
      console.error('Error loading designers and projects:', error);
    } finally {
      setLoading(false);
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
          
          // Recompute counts from current projects state
          const designerIdToCount: Record<string, number> = {};
          for (const p of projects) {
            const ids = ((p as any).designerIds && (p as any).designerIds.length > 0)
              ? (p as any).designerIds
              : Array.isArray((p as any).designers)
                ? (p as any).designers.map((d: any) => String(d.id))
                : [];
            for (const did of ids) {
              const key = String(did);
              designerIdToCount[key] = (designerIdToCount[key] || 0) + 1;
            }
          }

          // Convert to Designer format with counts
          const searchWithCounts = filteredResults.map(designer => {
            const idStr = designer.id.toString();
            const projectsCount = designerIdToCount[idStr] || 0;
            return {
              id: idStr,
              name: designer.full_name,
              email: designer.email,
              phoneNumber: designer.mobile_number,
              company: designer.company_name || '',
              role: designer.role || 'designer',
              status: (designer.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
              joinedDate: designer.date_of_joining || designer.created_at,
              projectsCount
            };
          });
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

  // Designers page is view-only; no edit/delete/activate/deactivate controls
  const canManageDesigners = false;

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-background z-20 pb-4 mb-2 -mx-6 px-6">
        <div className="flex items-center justify-between bg-background pt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Designers</h1>
            <p className="text-muted-foreground mt-1">Manage your design team members</p>
          </div>
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
                  {/* actions removed */}
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
                  {/* activate/deactivate removed */}
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
    </div>
  );
}
