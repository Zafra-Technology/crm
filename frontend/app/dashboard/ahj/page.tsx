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
import { Plus, Search, Filter } from 'lucide-react';

export default function AhjPage() {
  const [items, setItems] = useState<ProjectAhj[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project AHJ</h1>
          <p className="text-muted-foreground">Manage AHJ records and codes</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 shadow-md">
          <Plus size={18} />
          <span>Create Project AHJ</span>
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
                    {['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Project AHJ Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">US State</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Updated</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {filtered.map((row) => (
                    <tr key={row.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{row.ahj || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{row.us_state || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(row.created_at)} - <span className="text-foreground">{row.created_by}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(row.updated_at)} - <span className="text-foreground">{row.updated_by}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link href={`/dashboard/ahj/${row.id}`} className="text-primary hover:underline">View Details</Link>
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
    </div>
  );
}


