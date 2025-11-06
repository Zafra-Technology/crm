'use client';

import { useEffect, useMemo, useState } from 'react';
import { utilitiesApi, Utility } from '@/lib/api/utilities';
import CreateUtilityModal from '@/components/modals/CreateUtilityModal';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search, Filter, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/modals/ConfirmModal';

export default function UtilitiesPage() {
  const [items, setItems] = useState<Utility[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUtility, setSelectedUtility] = useState<Utility | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await utilitiesApi.list();
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
      const matchesQuery = !q || [it.utility_name, it.created_by, it.updated_by].some((v) => String(v || '').toLowerCase().includes(q));
      return matchesQuery;
    });
  }, [items, search]);

  const handleDeleteClick = (utility: Utility) => {
    setSelectedUtility(utility);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUtility) return;
    
    try {
      setDeleting(true);
      await utilitiesApi.delete(selectedUtility.id);
      await load(); // Reload the list
      setShowDeleteModal(false);
      setSelectedUtility(null);
    } catch (error: any) {
      console.error('Error deleting utility:', error);
      alert(error.message || 'Failed to delete utility. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Utilities</h1>
          <p className="text-muted-foreground">Manage utility records</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 shadow-md">
          <Plus size={18} />
          <span>Create Utilities</span>
        </Button>
      </div>

      {/* List Card like AHJ UI */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Utilities List</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex gap-4 w-full sm:w-auto">
              <div className="min-w-[240px]">
                <Label htmlFor="utility-search" className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="utility-search" placeholder="Search utility name, user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { /* client-side filter applied automatically */ }} className="flex items-center gap-2"><Filter size={16} /> Apply</Button>
              <Button variant="outline" onClick={() => { setSearch(''); }}>
                Reset
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto mt-4">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading utilities...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No utilities found</div>
            ) : (
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Utility Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Updated</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {filtered.map((row) => (
                    <tr key={row.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{row.utility_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(row.created_at)} - <span className="text-foreground">{row.created_by}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(row.updated_at)} - <span className="text-foreground">{row.updated_by}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <Link href={`/dashboard/utilities/${row.id}`} className="text-primary hover:underline">View Details</Link>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(row)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 size={16} />
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

      <CreateUtilityModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={load} />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUtility(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Utility"
        message={`Are you sure you want to delete "${selectedUtility?.utility_name || 'this utility'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
      />
    </div>
  );
}

