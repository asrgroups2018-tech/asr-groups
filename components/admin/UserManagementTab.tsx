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
    const targetIds = Array.from(selectedUserKeys).filter((id) => id !== 'ADM-1001');
    targetIds.forEach((id) => {
      deleteUser(id);
    });
    showToast('Bulk Action', `Deleted ${targetIds.length} account(s).`, 'error');
    setSelectedUserKeys(new Set());
  };

  const columns: ColumnDef<User>[] = [
    {
      key: 'user',
      header: 'Identity & User ID',
      sortable: true,
      accessor: (u) => u.name,
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1A0A13] text-[#EED8A1] flex items-center justify-center font-bold text-xs shrink-0 border border-[#C5A059]/40 shadow-2xs font-mono">
            {u.initials}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 hover:text-[#701A35] transition-colors leading-tight text-xs">
              {u.name}
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{u.id}</p>
          </div>
        </div>
      ),
      exportValue: (u) => `${u.name} (${u.id})`,
    },
    {
      key: 'email',
      header: 'Contact Details',
      sortable: true,
      accessor: (u) => u.email,
      render: (u) => (
        <div className="space-y-0.5">
          <p className="text-slate-800 text-xs font-medium">{u.email}</p>
          <p className="text-slate-400 text-[11px] font-mono">{u.phone}</p>
        </div>
      ),
      exportValue: (u) => `${u.email} | ${u.phone}`,
    },
    {
      key: 'department',
      header: 'Department & Title',
      sortable: true,
      accessor: (u) => u.department,
      render: (u) => (
        <div>
          <p className="text-slate-800 font-medium text-xs">{u.department}</p>
          <p className="text-slate-400 text-[11px]">{u.designation}</p>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Assigned Security Roles',
      sortable: false,
      render: (u) => (
        <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
          {u.assignedRoleIds.map((rId) => (
            <RoleBadge
              key={rId}
              roleId={rId}
              size="xs"
              isPrimary={u.primaryRoleId === rId}
            />
          ))}
        </div>
      ),
      exportValue: (u) =>
        u.assignedRoleIds
          .map((rId) => roles.find((r) => r.id === rId)?.name || `Role ${rId}`)
          .join('; '),
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
      key: 'lastLogin',
      header: 'Activity',
      sortable: true,
      accessor: (u) => u.lastLogin,
      render: (u) => (
        <div className="font-mono text-[11px] text-slate-600">
          <p className="font-medium text-slate-800">{u.lastLogin}</p>
          <p className="text-[10px] text-slate-400">Joined: {u.createdAt.slice(0, 10)}</p>
        </div>
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
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Inspect Account & Roles"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => resetUserPassword(u.id)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
            title="Reset Password"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSuspendModalUser(u)}
            className={`p-1.5 rounded-lg transition-colors ${
              u.status === 'Suspended'
                ? 'text-emerald-600 hover:bg-emerald-50'
                : 'text-amber-600 hover:bg-amber-50'
            }`}
            title={u.status === 'Suspended' ? 'Reactivate User' : 'Suspend User'}
          >
            {u.status === 'Suspended' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Ban className="w-4 h-4" />
            )}
          </button>

          {/* Direct Delete Button */}
          {u.id !== 'ADM-1001' && (
            <button
              onClick={() => setDeleteModalUser(u)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete Account (Super Admin)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
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
        searchPlaceholder="Search by name, email, phone, user ID, or department..."
        onRowClick={handleRowClick}
        selectedKeys={selectedUserKeys}
        onToggleSelect={(key) => {
          const next = new Set(selectedUserKeys);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          setSelectedUserKeys(next);
        }}
        onSelectAll={(keys) => setSelectedUserKeys(new Set(keys))}
        emptyStateMessage="No users found matching the selected filter criteria. Click '+ Create User' to register new staff or customer accounts."
        footerTotals={
          <>
            <td colSpan={3} className="px-4 py-2.5 text-xs text-slate-600">
              Total Filtered Accounts: <strong className="text-slate-900">{filteredUsers.length}</strong>
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
