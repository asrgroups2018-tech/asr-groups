'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { Role } from '@/lib/types';
import {
  ShieldPlus,
  Lock,
  Edit2,
  Copy,
  Trash2,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { CreateRoleModal } from './modals/CreateRoleModal';
import { EditRoleModal } from './modals/EditRoleModal';

type RoleFilter = 'all' | 'protected' | 'custom';

export const RolesPermissionsTab: React.FC = () => {
  const { roles, users, showToast, createRole, simulatedRoleId } = useApp();
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const isSuperAdmin = simulatedRoleId === 0;

  const filteredRoles = useMemo(() => {
    if (roleFilter === 'protected') return roles.filter((role) => role.isSystemProtected);
    if (roleFilter === 'custom') return roles.filter((role) => !role.isSystemProtected);
    return roles;
  }, [roles, roleFilter]);

  const handleCreateRoleClick = () => {
    if (!isSuperAdmin) {
      showToast(
        'Super Admin Required',
        'Only a Super Admin is authorized to create new roles.',
        'warning'
      );
      return;
    }
    setIsCreateRoleModalOpen(true);
  };

  const handleCloneRole = async (role: Role) => {
    if (!isSuperAdmin) {
      showToast(
        'Super Admin Required',
        'Only a Super Admin is authorized to clone or create new roles.',
        'warning'
      );
      return;
    }

    const newRole = await createRole({
      name: `${role.name} (Copy)`,
      code: `${role.code}_COPY`.slice(0, 20),
      description: `Cloned from ${role.name}. ${role.description}`,
      colorName: role.colorName,
      bgClass: role.bgClass,
      textClass: role.textClass,
      borderClass: role.borderClass,
      hexColor: role.hexColor,
      hierarchyLevel: role.hierarchyLevel + 1,
    });
    if (newRole) {
      setEditingRole(newRole);
    }
  };

  const columns: ColumnDef<Role>[] = useMemo(
    () => [
      {
        key: 'id',
        header: 'Role ID',
        sortable: true,
        align: 'left',
        accessor: (r) => r.id,
        render: (r) => (
          <span className="font-mono text-xs font-bold text-slate-700">
            {r.id}
          </span>
        ),
        exportValue: (r) => r.id,
      },
      {
        key: 'code',
        header: 'Role Name',
        sortable: true,
        accessor: (r) => r.code,
        render: (r) => (
          <button onClick={() => setEditingRole(r)} className="block text-left" title="Edit role and page access">
            <span className="block text-sm font-semibold text-[#701A35] hover:text-[#4E1026]">{r.name}</span>
            <span className="mt-1 block font-mono text-[10px] text-slate-400">{r.code}</span>
          </button>
        ),
        exportValue: (r) => r.code,
      },
      {
        key: 'description',
        header: 'Scope',
        sortable: true,
        accessor: (r) => r.description,
        render: (r) => (
          <div className="max-w-sm text-xs text-slate-700">
            <span className="block font-medium text-slate-900">{r.description || 'No scope description configured.'}</span>
            <span className="mt-1 block text-[11px] text-slate-400">Hierarchy level {r.hierarchyLevel}</span>
          </div>
        ),
        exportValue: (r) => `${r.name}: ${r.description}`,
      },
      {
        key: 'assignedUsers',
        header: 'Assigned users',
        sortable: true,
        accessor: (r) => users.filter((user) => user.assignedRoleIds.includes(r.id)).length,
        render: (r) => (
          <span className="text-sm font-semibold tabular-nums text-slate-800">
            {users.filter((user) => user.assignedRoleIds.includes(r.id)).length}
          </span>
        ),
      },
      {
        key: 'roleType',
        header: 'Type',
        sortable: true,
        accessor: (r) => (r.isSystemProtected ? 'System role' : 'Custom role'),
        render: (r) => (
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
            {r.isSystemProtected ? 'System role' : 'Custom role'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        align: 'center',
        sortable: true,
        accessor: () => 'Active',
        render: () => (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        sortable: false,
        filterable: false,
        render: (r) => (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Edit Role & Page Access Action */}
            <button
              onClick={() => setEditingRole(r)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Edit Role & Page Access"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            {/* Duplicate / Clone Role (Only Super Admin) */}
            {isSuperAdmin && (
              <button
                onClick={() => handleCloneRole(r)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                title="Clone Role Template (Super Admin)"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete Action (only for non-protected roles by Super Admin) */}
            {!r.isSystemProtected && isSuperAdmin && (
              <button
                onClick={() => showToast('Protected', 'Default system tiers cannot be deleted.', 'warning')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Delete Role"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [users, isSuperAdmin]
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ─── Top Category Filter Card (matching screenshot) ─── */}
      <div className="space-y-4 rounded-2xl border border-[#E6E1D6] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Role catalogue</h2>
            <p className="mt-1 text-xs text-slate-500">Define the access boundaries used across your organisation.</p>
          </div>
          <button
            onClick={handleCreateRoleClick}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer ${isSuperAdmin
                ? 'text-[#EED8A1] bg-[#701A35] hover:bg-[#5C142B] active:scale-98 border border-[#C5A059]/30'
                : 'text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200'
              }`}
            title={isSuperAdmin ? 'Create New Role' : 'Only Super Admin can create custom roles'}
          >
            {isSuperAdmin ? (
              <ShieldPlus className="w-4 h-4 text-amber-200" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{isSuperAdmin ? 'Create role' : 'Creation restricted'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {([
            { id: 'all', label: 'All roles' },
            { id: 'protected', label: 'System roles' },
            { id: 'custom', label: 'Custom roles' },
          ] as { id: RoleFilter; label: string }[]).map((filter) => {
            const isActive = roleFilter === filter.id;

            return (
              <button
                key={filter.id}
                onClick={() => setRoleFilter(filter.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer select-none ${isActive
                    ? 'bg-[#701A35] text-white border border-[#C5A059]/50 shadow-xs font-bold'
                    : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 border border-slate-200'
                  }`}
              >
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Roles Table Card matching screenshot ─── */}
      <DataTable
        data={filteredRoles}
        columns={columns}
        keyExtractor={(r) => String(r.id)}
        title="Roles"
        exportFileName="asr_role_management"
        searchPlaceholder="Search roles..."
      />

      {/* Edit Role & Page Visibility Modal */}
      <EditRoleModal
        role={editingRole}
        isOpen={editingRole !== null}
        onClose={() => setEditingRole(null)}
      />

      {/* Create Modal */}
      <CreateRoleModal
        isOpen={isCreateRoleModalOpen}
        onClose={() => setIsCreateRoleModalOpen(false)}
      />
    </div>
  );
};
