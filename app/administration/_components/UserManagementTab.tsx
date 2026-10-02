'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, Search, UserPlus, Users } from 'lucide-react';
import { useApp } from '@/lib/store';
import { RoleId, User } from '@/lib/types';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { CreateUserModal } from './modals/CreateUserModal';
import { SuspendUserModal } from './modals/SuspendUserModal';
import { DeleteUserModal } from './modals/DeleteUserModal';

type FilterChip = 'all' | 'staff' | 'customers' | 'pending' | 'suspended';

const chipLabels: Record<FilterChip, string> = {
  all: 'All accounts', staff: 'Internal staff', customers: 'Customers', pending: 'Pending', suspended: 'Suspended',
};

export const UserManagementTab: React.FC = () => {
  const router = useRouter();
  const { users, roles, setSelectedUserId, toggleUserStatus, deleteUser, showToast, systemSettings } = useApp();
  const [activeChip, setActiveChip] = useState<FilterChip>('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [suspendUser, setSuspendUser] = useState<User | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts = useMemo(() => ({
    all: users.length,
    staff: users.filter((user) => !user.isCustomer).length,
    customers: users.filter((user) => user.isCustomer).length,
    pending: users.filter((user) => user.status === 'Pending').length,
    suspended: users.filter((user) => user.status === 'Suspended').length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesChip = activeChip === 'all'
        || (activeChip === 'staff' && !user.isCustomer)
        || (activeChip === 'customers' && user.isCustomer)
        || user.status.toLowerCase() === activeChip;
      const matchesRole = roleFilter === 'all' || user.assignedRoleIds.includes(Number(roleFilter) as RoleId);
      const matchesSearch = !normalized || [user.name, user.id, user.email, user.username, user.phone, user.department, user.designation]
        .some((value) => String(value || '').toLowerCase().includes(normalized));
      return matchesChip && matchesRole && matchesSearch;
    });
  }, [activeChip, query, roleFilter, users]);

  const companyName = systemSettings?.companyProfile?.companyName || 'your organisation';
  const openAccount = (user: User, edit = false) => {
    setSelectedUserId(user.id);
    router.push(`/administration/users/${encodeURIComponent(user.id)}${edit ? '?edit=1' : ''}`);
  };
  const toggleSelected = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected((current) => current.size === filteredUsers.length ? new Set() : new Set(filteredUsers.map((user) => user.id)));
  const bulkUpdate = async (action: 'Active' | 'Suspended' | 'Delete') => {
    if (!selected.size) return;
    const ids = Array.from(selected);
    if (action === 'Delete') await Promise.all(ids.map((id) => deleteUser(id)));
    else await Promise.all(ids.map((id) => toggleUserStatus(id, action, action === 'Suspended' ? 'Administrative bulk suspension' : undefined)));
    showToast('Bulk action complete', `${ids.length} account(s) updated.`, action === 'Suspended' ? 'warning' : 'success');
    setSelected(new Set());
  };

  return (
    <div className="w-full space-y-5 pb-8">
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">Directory</p><div className="mt-1 flex items-center gap-3"><h2 className="text-2xl font-bold tracking-tight text-[#24131B]">People & accounts</h2><span className="rounded-full bg-[#F5EEE3] px-2.5 py-1 text-xs font-bold text-[#701A35]">{counts.all}</span></div><p className="mt-2 max-w-2xl text-sm text-slate-500">Manage identity, sign-in status, roles, and page access for {companyName}.</p></div>
          <button onClick={() => setCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#701A35] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#571027]"><UserPlus className="h-4 w-4 text-[#EED8A1]" /> Create user</button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 border-t border-[#EEE8DE] pt-5 sm:grid-cols-5">
          {(['all', 'staff', 'customers', 'pending', 'suspended'] as FilterChip[]).map((key) => <button key={key} onClick={() => setActiveChip(key)} className={`rounded-2xl border px-3.5 py-3 text-left transition ${activeChip === key ? 'border-[#C5A059] bg-[#FBF8F3] shadow-sm' : 'border-transparent bg-[#F7F7F6] hover:border-[#E7DFD2] hover:bg-white'}`}><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{chipLabels[key]}</span><span className="mt-1 block text-xl font-bold tabular-nums text-slate-900">{counts[key]}</span></button>)}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
        <div className="flex flex-col gap-3 border-b border-[#E7DFD2] bg-[#FCFBF9] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2"><div className="relative min-w-[220px] flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID, email or username" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-xs outline-none transition focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/15" /></div><label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-500"><Filter className="h-3.5 w-3.5" /><select aria-label="Filter by role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="bg-transparent font-semibold text-slate-700 outline-none"><option value="all">All roles</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label></div>
          {selected.size > 0 && <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1.5"><span className="px-1.5 text-[11px] font-bold text-amber-900">{selected.size} selected</span><button onClick={() => bulkUpdate('Active')} className="rounded-lg bg-emerald-100 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800">Activate</button><button onClick={() => bulkUpdate('Suspended')} className="rounded-lg bg-amber-100 px-2.5 py-1.5 text-[11px] font-bold text-amber-800">Suspend</button><button onClick={() => bulkUpdate('Delete')} className="rounded-lg bg-rose-100 px-2.5 py-1.5 text-[11px] font-bold text-rose-700">Delete</button></div>}
        </div>

        <div className="hidden md:block"><table className="w-full border-collapse text-left text-xs"><thead><tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.11em] text-slate-500"><th className="w-12 px-4 py-3 text-center"><input aria-label="Select all accounts" type="checkbox" checked={filteredUsers.length > 0 && selected.size === filteredUsers.length} onChange={toggleAll} className="h-3.5 w-3.5 accent-[#701A35]" /></th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Login</th><th className="px-4 py-3">Roles & access</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last activity</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">
          {filteredUsers.length === 0 ? <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-500">No accounts match the current filters.</td></tr> : filteredUsers.map((user) => { const primaryRole = roles.find((role) => role.id === user.primaryRoleId); const loginMethod = user.loginMethod === 'username' && !user.username ? 'email' : user.loginMethod; const loginValue = loginMethod === 'email' ? user.email : user.username || 'Username not set'; return <tr key={user.id} className={`transition-colors hover:bg-[#FCFAF7] ${selected.has(user.id) ? 'bg-amber-50/40' : ''}`}><td className="px-4 py-4 text-center"><input aria-label={`Select ${user.name}`} type="checkbox" checked={selected.has(user.id)} onChange={() => toggleSelected(user.id)} className="h-3.5 w-3.5 accent-[#701A35]" /></td><td className="max-w-[210px] px-4 py-4"><button onClick={() => openAccount(user)} className="block max-w-full truncate text-left text-sm font-bold text-[#701A35] hover:underline">{user.name}</button><span className="mt-1 block truncate text-[11px] text-slate-400">{user.id}</span></td><td className="max-w-[220px] px-4 py-4"><span className="block truncate font-mono text-[11px] font-semibold text-slate-800">{loginValue}</span><span className="mt-1 inline-flex rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">{loginMethod === 'email' ? 'Email' : 'Username'}</span></td><td className="max-w-[230px] px-4 py-4"><div className="flex flex-wrap gap-1">{user.assignedRoleIds.slice(0, 2).map((roleId) => <RoleBadge key={roleId} roleId={roleId} roleName={roles.find((role) => role.id === roleId)?.name} size="xs" />)}{user.assignedRoleIds.length > 2 && <span className="self-center text-[10px] text-slate-400">+{user.assignedRoleIds.length - 2}</span>}</div><span className="mt-1 block text-[10px] text-slate-500">Primary role: {primaryRole?.name || '—'}</span></td><td className="px-4 py-4"><StatusPill status={user.status} size="sm" /></td><td className="max-w-[160px] px-4 py-4"><span className="block text-[11px] font-semibold text-slate-700">{user.lastLogin && user.lastLogin !== 'Never' ? 'Last sign-in' : 'Never signed in'}</span><span className="mt-1 block truncate font-mono text-[10px] text-slate-500">{user.lastLogin || '—'}</span></td><td className="px-4 py-4"><div className="flex items-center justify-end gap-1.5"><button onClick={() => openAccount(user, true)} className="rounded-lg border border-[#DCC7B0] bg-[#FFFDF9] px-3 py-1.5 text-[10px] font-bold text-[#701A35] hover:bg-[#FBF4E9]">Edit</button><button onClick={() => setDeleteUserTarget(user)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-rose-700 hover:bg-rose-100">Delete</button></div></td></tr>; })}
        </tbody></table></div>

        <div className="divide-y divide-slate-100 md:hidden">{filteredUsers.length === 0 ? <div className="p-10 text-center text-xs text-slate-500">No accounts match the current filters.</div> : filteredUsers.map((user) => <article key={user.id} className="space-y-3 p-4"><div className="flex items-start gap-3"><input aria-label={`Select ${user.name}`} type="checkbox" checked={selected.has(user.id)} onChange={() => toggleSelected(user.id)} className="mt-1 h-3.5 w-3.5 accent-[#701A35]" /><button onClick={() => openAccount(user)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-bold text-[#701A35]">{user.name}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{user.id} · {user.email}</span></button><StatusPill status={user.status} size="sm" /></div><div className="flex flex-wrap gap-1.5 pl-6">{user.assignedRoleIds.map((roleId) => <RoleBadge key={roleId} roleId={roleId} roleName={roles.find((role) => role.id === roleId)?.name} size="xs" />)}</div><div className="pl-6 text-[10px] text-slate-500">Primary role: {roles.find((role) => role.id === user.primaryRoleId)?.name || '—'}</div><div className="flex flex-wrap gap-2 pl-6"><button onClick={() => openAccount(user, true)} className="rounded-lg border border-[#DCC7B0] px-3 py-2 text-[11px] font-bold text-[#701A35]">Edit</button><button onClick={() => setDeleteUserTarget(user)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">Delete</button></div></article>)}</div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E7DFD2] bg-[#FCFBF9] px-4 py-3 text-[11px] text-slate-500"><span>Showing <strong className="text-slate-900">{filteredUsers.length}</strong> of {counts.all} accounts</span><span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Select rows for bulk actions</span></div>
      </section>
      <CreateUserModal isOpen={createOpen} onClose={() => setCreateOpen(false)} /><SuspendUserModal user={suspendUser} isOpen={Boolean(suspendUser)} onClose={() => setSuspendUser(null)} /><DeleteUserModal user={deleteUserTarget} isOpen={Boolean(deleteUserTarget)} onClose={() => setDeleteUserTarget(null)} />
    </div>
  );
};
