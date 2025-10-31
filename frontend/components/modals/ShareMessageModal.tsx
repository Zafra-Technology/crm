"use client";

import { useEffect, useMemo, useState } from 'react';
import { groupChatApi, GroupOut } from '@/lib/api/chat-groups';
import { authAPI } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

type SimpleUser = {
  id: number;
  full_name?: string;
  email?: string;
  role?: string;
};

interface ShareMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selected: { groupIds: number[]; userIds: number[] }) => Promise<void> | void;
  loading?: boolean;
}

export default function ShareMessageModal({ isOpen, onClose, onConfirm, loading = false }: ShareMessageModalProps) {
  const [groups, setGroups] = useState<GroupOut[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set());
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  // unified view: combined list of groups and people

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      try {
        const [g, u] = await Promise.all([
          groupChatApi.listGroups(),
          authAPI.getUsers(undefined, ''),
        ]);
        if (!mounted) return;
        setGroups(g || []);
        setUsers((u || []).map((x: any) => ({ id: Number(x.id), full_name: x.full_name, email: x.email, role: x.role })));
      } catch {
        // swallow
      }
    })();
    return () => { mounted = false; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedGroups(new Set());
      setSelectedUsers(new Set());
    }
  }, [isOpen]);

  const filteredCombined = useMemo(() => {
    const q = search.trim().toLowerCase();
    const groupItems = (groups || []).map(g => ({
      kind: 'group' as const,
      id: g.id,
      title: g.name,
      subtitle: `${g.member_ids?.length || 0} members`,
    }));
    const userItems = (users || []).map(u => ({
      kind: 'user' as const,
      id: u.id,
      title: u.full_name || u.email || 'User',
      subtitle: u.role || '',
    }));
    const all = [...groupItems, ...userItems];
    if (!q) return all;
    return all.filter(x => x.title.toLowerCase().includes(q) || x.subtitle.toLowerCase().includes(q));
  }, [groups, users, search]);

  const toggleGroup = (id: number) => {
    setSelectedGroups(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleUser = (id: number) => {
    setSelectedUsers(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const handleConfirm = async () => {
    if (loading) return;
    await onConfirm({ groupIds: Array.from(selectedGroups), userIds: Array.from(selectedUsers) });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share to</DialogTitle>
          <DialogDescription>Select group chats or people to share this file.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Search groups or people"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="max-h-72 overflow-y-auto divide-y">
            {filteredCombined.map(item => (
              <label key={`${item.kind}-${item.id}`} className="flex items-center gap-3 py-2 cursor-pointer">
                <Checkbox
                  checked={item.kind === 'group' ? selectedGroups.has(item.id) : selectedUsers.has(item.id)}
                  onCheckedChange={() => item.kind === 'group' ? toggleGroup(item.id) : toggleUser(item.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.title}</div>
                  {item.subtitle ? (
                    <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                  ) : null}
                </div>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground border rounded px-1 py-0.5">
                  {item.kind}
                </span>
              </label>
            ))}
            {filteredCombined.length === 0 && (
              <div className="py-6 text-sm text-muted-foreground text-center">No matches</div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="button" onClick={handleConfirm} disabled={loading || (selectedGroups.size === 0 && selectedUsers.size === 0)}>
            {loading ? 'Sharing…' : 'Share'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


