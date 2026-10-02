'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { User, RoleId } from '@/lib/types';
import {
  UserPlus,
  Ban,
  CheckCircle2,
  Eye,
  KeyRound,
  Filter,
  Trash2,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { CreateUserModal } from './modals/CreateUserModal';
import { SuspendUserModal } from './modals/SuspendUserModal';
import { DeleteUserModal } from './modals/DeleteUserModal';

type FilterChip = 'all' | 'staff' | 'customers' | 'pending' | 'suspended';

export const UserManagementTab: React.FC = () => {
  const router = useRouter();
  const {
    users,
    roles,
    setSelectedUserId,
    setUserDetailsTab,
    toggleUserStatus,
    resetUserPassword,
    deleteUser,
    showToast,
    systemSettings,
  } = useApp();

  const [activeChip, setActiveChip] = useState<FilterChip>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [suspendModalUser, setSuspendModalUser] = useState<User | null>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<User | null>(null);
  const [selectedUserKeys, setSelectedUserKeys] = useState<Set<string>>(new Set());

  // Filtered by Chip and Role Dropdown
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role Filter Dropdown
      if (selectedRoleFilter !== 'all') {
        const roleIdNum = Number(selectedRoleFilter);
        if (!u.assignedRoleIds.includes(roleIdNum as RoleId)) {
          return false;
        }
      }

      // Filter Chips
      if (activeChip === 'staff') return !u.isCustomer;
      if (activeChip === 'customers') return u.isCustomer;
      if (activeChip === 'pending') return u.status === 'Pending';
      if (activeChip === 'suspended') return u.status === 'Suspended';
      return true;
    });
  }, [users, activeChip, selectedRoleFilter]);

  // Counts for chips
  const counts = {
    all: users.length,
    staff: users.filter((u) => !u.isCustomer).length,
    customers: users.filter((u) => u.isCustomer).length,
    pending: users.filter((u) => u.status === 'Pending').length,
    suspended: users.filter((u) => u.status === 'Suspended').length,
  };

  const companyName = systemSettings?.companyProfile?.companyName || 'Organisation';

  const handleRowClick = (user: User) => {
    setSelectedUserId(user.id);
    setUserDetailsTab('roles');
    router.push(`/administration/users/${user.id}`);
  };

  const handleBulkActivate = () => {
    if (selectedUserKeys.size === 0) return;
    selectedUserKeys.forEach((id) => {
      toggleUserStatus(id, 'Active');
    });
    showToast('Bulk Action', `Activated ${selectedUserKeys.size} account(s).`, 'success');
    setSelectedUserKeys(new Set());
  };

  const handleBulkSuspend = () => {
    if (selectedUserKeys.size === 0) return;
    selectedUserKeys.forEach((id) => {
      toggleUserStatus(id, 'Suspended', 'Administrative bulk suspension');
    });
    showToast('Bulk Action', `Suspended ${selectedUserKeys.size} account(s).`, 'warning');
    setSelectedUserKeys(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedUserKeys.size === 0) return;
    const targetIds = Array.from(selectedUserKeys);
    targetIds.forEach((id) => {
      deleteUser(id);
    });
    showToast('Bulk Action', `Deleted ${targetIds.length} account(s).`, 'error');
    setSelectedUserKeys(new Set());
  };

  const columns: ColumnDef<User>[] = [
    {
      key: 'name',
      header: 'Account',
      sortable: true,
      accessor: (u) => u.name,
      render: (u) => (
        <div className="min-w-[180px]">
          <button
            onClick={() => handleRowClick(u)}
            className="font-semibold text-[#701A35] hover:text-[#4E1026] text-sm block text-left cursor-pointer transition-colors"
          >
            {u.name}
          </button>
          <span className="text-[11px] text-slate-400 font-mono block mt-1">{u.id}</span>
        </div>
      ),
      exportValue: (u) => `${u.name} (${u.id})`,
    },
    {
      key: 'login',
      header: 'Login identity',
      sortable: true,
      accessor: (u) => u.loginMethod === 'email' ? u.email : (u.username || u.email),
      render: (u) => (
        <div className="min-w-[190px] text-xs">
          <span className="block font-medium text-slate-900 font-mono truncate">{u.loginMethod === 'email' ? u.email : `@${u.username || u.email}`}</span>
          <span className="mt-1 inline-flex rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
            {u.loginMethod === 'email' ? 'Email sign-in' : 'Username sign-in'}
          </span>
        </div>
      ),
      exportValue: (u) => u.loginMethod === 'email' ? u.email : (u.username || u.email),
    },
    {
      key: 'access',
      header: 'Access',
      sortable: false,
      accessor: (u) => u.assignedRoleIds.map((roleId) => roles.find((r) => r.id === roleId)?.name || `Role ${roleId}`).join(', '),
      render: (u) => (
        <div className="min-w-[150px] space-y-1">
          <div className="flex flex-wrap gap-1">
            {u.assignedRoleIds.slice(0, 2).map((roleId) => (
              <RoleBadge key={roleId} roleId={roleId} size="xs" isPrimary={roleId === u.primaryRoleId} />
            ))}
          </div>
          {u.assignedRoleIds.length > 2 && <span className="text-[10px] text-slate-400">+{u.assignedRoleIds.length - 2} more roles</span>}
          <p className="text-[11px] text-slate-500">{u.isCustomer ? 'Customer account' : `${u.designation || 'Staff'}${u.department ? ` · ${u.department}` : ''}`}</p>
        </div>
      ),
      exportValue: (u) => u.assignedRoleIds.map((roleId) => roles.find((r) => r.id === roleId)?.name || `Role ${roleId}`).join(', '),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'left',
      sortable: true,
      accessor: (u) => u.status,
      render: (u) => <StatusPill status={u.status} size="sm" />,
    },
    {
      key: 'activity',
      header: 'Activity',
      sortable: true,
      accessor: (u) => u.lastLogin,
      render: (u) => (
        <div className="min-w-[145px] text-[11px]">
          <span className="block font-medium text-slate-700">Last sign-in</span>
          <span className="mt-0.5 block font-mono text-slate-500">{u.lastLogin || 'Never'}</span>
          <span className="mt-1 block text-slate-400">Joined {u.createdAt?.slice(0, 10) || '—'}</span>
        </div>
      ),
      exportValue: (u) => `Last sign-in: ${u.lastLogin}; Joined: ${u.createdAt}`,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      filterable: false,
      render: (u) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleRowClick(u)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Inspect User Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => resetUserPassword(u.id)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
            title="Reset Password"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSuspendModalUser(u)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              u.status === 'Suspended'
                ? 'text-emerald-600 hover:bg-emerald-50'
                : 'text-amber-600 hover:bg-amber-50'
            }`}
            title={u.status === 'Suspended' ? 'Reactivate User' : 'Suspend User'}
          >
            {u.status === 'Suspended' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Ban className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => setDeleteModalUser(u)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete Account"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const chips: { id: FilterChip; label: string; count: number }[] = [
    { id: 'all', label: 'All Accounts', count: counts.all },
    { id: 'staff', label: 'Internal Staff', count: counts.staff },
    { id: 'customers', label: 'Customers', count: counts.customers },
    { id: 'pending', label: 'Pending Review', count: counts.pending },
    { id: 'suspended', label: 'Suspended', count: counts.suspended },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-[#E6E1D6] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">User directory</h2>
            <p className="mt-1 text-xs text-slate-500">Review access, account status, and sign-in activity for {companyName}.</p>
          </div>
          <span className="text-xs font-medium text-slate-400">{counts.all} total accounts</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 sm:pb-0">
          {chips.map((chip) => {
            const isActive = activeChip === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setActiveChip(chip.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all flex items-center gap-2 shrink-0 ${
                  isActive
                    ? 'bg-[#701A35] text-white border border-[#C5A059]/40 shadow-xs font-bold'
                    : 'bg-[#F8F6F1] text-slate-600 hover:bg-[#F3EFE6] hover:text-slate-900 border border-[#E6E1D6]/60'
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Controls: Role filter + Bulk Actions + + Create User in Maroon */}
          <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#E6E1D6] rounded-xl px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  Role {r.id} · {r.name}
                </option>
              ))}
            </select>
          </div>

          {selectedUserKeys.size > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1 animate-in fade-in">
              <span className="text-xs font-bold text-amber-900 font-mono">
                {selectedUserKeys.size} selected
              </span>
              <button
                onClick={handleBulkActivate}
                className="px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
              >
                Activate
              </button>
              <button
                onClick={handleBulkSuspend}
                className="px-2.5 py-0.5 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
              >
                Suspend
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-2.5 py-0.5 text-[11px] font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          )}

          {/* Single primary button in Maroon */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <UserPlus className="w-4 h-4 text-amber-200" />
            <span>Create User</span>
          </button>
        </div>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        data={filteredUsers}
        columns={columns}
        keyExtractor={(u) => u.id}
        title="Directory Accounts"
        exportFileName="asr_users_directory"
        searchPlaceholder="Search users..."
        onRowClick={handleRowClick}
        selectedKeys={selectedUserKeys}
        onToggleSelect={(key) => {
          const next = new Set(selectedUserKeys);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          setSelectedUserKeys(next);
        }}
        onSelectAll={(keys) => setSelectedUserKeys(new Set(keys))}
        emptyStateMessage="No users found. Click 'Create User' to add an account."
        footerTotals={
          <>
            <td colSpan={3} className="px-4 py-2.5 text-xs text-slate-600">
              Total: <strong className="text-slate-900">{filteredUsers.length}</strong>
            </td>
            <td colSpan={3} className="px-4 py-2.5 text-xs text-right text-slate-500 font-mono">
              Active: {filteredUsers.filter((u) => u.status === 'Active').length} · Suspended: {filteredUsers.filter((u) => u.status === 'Suspended').length} · Pending: {filteredUsers.filter((u) => u.status === 'Pending').length}
            </td>
          </>
        }
      />

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <SuspendUserModal
        user={suspendModalUser}
        isOpen={suspendModalUser !== null}
        onClose={() => setSuspendModalUser(null)}
      />

      <DeleteUserModal
        user={deleteModalUser}
        isOpen={deleteModalUser !== null}
        onClose={() => setDeleteModalUser(null)}
      />
    </div>
  );
};
