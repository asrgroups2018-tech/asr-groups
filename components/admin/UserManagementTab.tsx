'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { User, RoleId } from '@/lib/types';
import {
  UserPlus,
  Shield,
  Ban,
  CheckCircle2,
  MoreHorizontal,
  Eye,
  KeyRound,
  Filter,
  UserCheck,
  Search,
  Trash2,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/common/DataTable';
import { RoleBadge } from '@/components/common/RoleBadge';
import { StatusPill } from '@/components/common/StatusPill';
import { CreateUserModal } from './modals/CreateUserModal';
import { SuspendUserModal } from './modals/SuspendUserModal';
import { DeleteUserModal } from './modals/DeleteUserModal';

type FilterChip = 'all' | 'staff' | 'customers' | 'pending' | 'suspended';

export const UserManagementTab: React.FC = () => {
  const {
    users,
    roles,
    setSelectedUserId,
    setUserDetailsTab,
    toggleUserStatus,
    resetUserPassword,
    deleteUser,
    showToast,
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

  const handleRowClick = (user: User) => {
    setSelectedUserId(user.id);
    setUserDetailsTab('roles');
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
      header: 'User Name',
      sortable: true,
      accessor: (u) => u.name,
      render: (u) => {
        const isAdmin = u.assignedRoleIds.includes(0) || u.assignedRoleIds.includes(1);

        return (
          <div className="min-w-0">
            <button
              onClick={() => handleRowClick(u)}
              className="font-bold text-[#701A35] hover:underline text-xs block text-left cursor-pointer transition-colors"
            >
              {u.name}
            </button>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              {isAdmin ? `(${u.id} · Admin)` : `@${u.username || u.id.toLowerCase()}`}
            </span>
          </div>
        );
      },
      exportValue: (u) => `${u.name} (${u.username ? `@${u.username}` : u.id})`,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortable: true,
      accessor: (u) => u.status,
      render: (u) => <StatusPill status={u.status} size="sm" />,
    },
    {
      key: 'masterAccount',
      header: 'Master Account',
      sortable: true,
      accessor: () => 'ASR Groups Enterprise',
      render: () => (
        <span className="text-xs text-slate-700 font-medium">
          ASR Groups Enterprise
        </span>
      ),
      exportValue: () => 'ASR Groups Enterprise',
    },
    {
      key: 'email',
      header: 'Login ID / Email',
      sortable: true,
      accessor: (u) => (u.assignedRoleIds.includes(0) || u.assignedRoleIds.includes(1) ? u.email : u.username || u.email),
      render: (u) => {
        const isAdmin = u.assignedRoleIds.includes(0) || u.assignedRoleIds.includes(1);

        return (
          <div className="text-xs">
            {isAdmin ? (
              <div>
                <span className="text-slate-900 font-medium font-mono">{u.email}</span>
                <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 block w-fit mt-0.5 font-bold">
                  Email Login
                </span>
              </div>
            ) : (
              <div>
                <span className="text-slate-900 font-bold font-mono">@{u.username || u.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}</span>
                <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                  {u.email}
                </span>
              </div>
            )}
          </div>
        );
      },
      exportValue: (u) => u.email,
    },
    {
      key: 'accountType',
      header: 'Account Type',
      sortable: true,
      accessor: (u) => (u.isCustomer ? 'Customer' : 'Internal Staff'),
      render: (u) => (
        <span className="text-xs text-slate-700">
          {u.isCustomer ? 'Customer' : 'Internal Staff'}
        </span>
      ),
      exportValue: (u) => (u.isCustomer ? 'Customer' : 'Internal Staff'),
    },
    {
      key: 'jobTitle',
      header: 'Job Title/Dept',
      sortable: true,
      accessor: (u) => `${u.designation} (${u.department})`,
      render: (u) => (
        <span className="text-xs text-slate-700">
          {u.designation || u.department}
        </span>
      ),
      exportValue: (u) => `${u.designation || ''} - ${u.department || ''}`,
    },
    {
      key: 'createdAt',
      header: 'Create Date (IST)',
      sortable: true,
      accessor: (u) => u.createdAt,
      render: (u) => (
        <span className="text-[11px] font-mono text-slate-600">
          {u.createdAt} IST
        </span>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Login (IST)',
      sortable: true,
      accessor: (u) => u.lastLogin,
      render: (u) => (
        <span className="text-[11px] font-mono text-slate-600">
          {u.lastLogin} IST
        </span>
      ),
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
      {/* Top Filter Chips & Actions Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
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
              <option value="all">All Roles (0–6)</option>
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
            <span>+ Create User</span>
          </button>
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
        emptyStateMessage="No users found. Click '+ Create User' to add an account."
        footerTotals={
          <>
            <td colSpan={3} className="px-4 py-2.5 text-xs text-slate-600">
              Total: <strong className="text-slate-900">{filteredUsers.length}</strong>
            </td>
            <td colSpan={4} className="px-4 py-2.5 text-xs text-right text-slate-500 font-mono">
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
