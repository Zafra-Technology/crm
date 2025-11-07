'use client';

import { useEffect, useMemo, useState } from 'react';
import { ahjApi, ProjectAhj } from '@/lib/api/ahj';
import CreateAhjModal from '@/components/modals/CreateAhjModal';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/modals/ConfirmModal';

export default function AhjPage() {
  const [items, setItems] = useState<ProjectAhj[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAhj, setSelectedAhj] = useState<ProjectAhj | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await ahjApi.list();
      setItems(data);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const matchesQuery = !q || [it.ahj, it.us_state, it.created_by, it.updated_by].some((v) => String(v || '').toLowerCase().includes(q));
      const matchesState = stateFilter === 'all' || (it.us_state || '') === stateFilter;
      return matchesQuery && matchesState;
    });
  }, [items, search, stateFilter]);

  const stateCounts = useMemo(() => {
    const counts: { [state: string]: number } = {};
    items.forEach((item) => {
      const state = item.us_state || 'Unknown';
      counts[state] = (counts[state] || 0) + 1;
    });
    return counts;
  }, [items]);

  const handleDeleteClick = (ahj: ProjectAhj) => {
    setSelectedAhj(ahj);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAhj) return;
    
    try {
      setDeleting(true);
      await ahjApi.delete(selectedAhj.id);
      await load(); // Reload the list
      setShowDeleteModal(false);
      setSelectedAhj(null);
    } catch (error: any) {
      console.error('Error deleting AHJ:', error);
      alert(error.message || 'Failed to delete AHJ. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">AHJ</h1>
            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
              {filtered.length} Total
            </div>
          </div>
          <p className="text-muted-foreground">Manage AHJ records and codes</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 shadow-md">
          <Plus size={18} />
          <span>Create AHJ</span>
        </Button>
      </div>

      {/* List Card like Users UI */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">AHJ List</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex gap-4 w-full sm:w-auto">
              <div className="min-w-[240px]">
                <Label htmlFor="ahj-search" className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="ahj-search" placeholder="Search AHJ, state, user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
                </div>
              </div>
              <div className="w-48">
                <Label className="text-xs">US State</Label>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'].map((s) => {
                      const count = stateCounts[s] || 0;
                      return (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center justify-between w-full">
                            <span>{s}</span>
                            {count > 0 && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                {count}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                    {stateCounts['Unknown'] && (
                      <SelectItem value="Unknown">
                        <div className="flex items-center justify-between w-full">
                          <span>Unknown State</span>
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                            {stateCounts['Unknown']}
                          </span>
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { /* client-side filter applied automatically */ }} className="flex items-center gap-2"><Filter size={16} /> Apply</Button>
              <Button variant="outline" onClick={() => { setSearch(''); setStateFilter('all'); }}>
                Reset
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto mt-4">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading AHJ...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No AHJ entries found</div>
            ) : (
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">S.No.</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Project AHJ Name</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">US State</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Electric Code</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Building Code</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Residential Code</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fire Code</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {filtered.map((row, index) => (
                    <tr key={row.id}>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground font-medium">{index + 1}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground font-medium">{row.ahj || '-'}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground">
                        {row.us_state ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {row.us_state}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground">
                        {row.electric_code ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                            {row.electric_code}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground">
                        {row.building_code ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            {row.building_code}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground">
                        {row.residential_code ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                            {row.residential_code}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground">
                        {row.fire_code ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                            {row.fire_code}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/ahj/${row.id}`} className="text-primary hover:underline text-xs">View Details</Link>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(row)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      <CreateAhjModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={load} />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedAhj(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete AHJ"
        message={`Are you sure you want to delete "${selectedAhj?.ahj || 'this AHJ'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
      />
    </div>
  );
}


