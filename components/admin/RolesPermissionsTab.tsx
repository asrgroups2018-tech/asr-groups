'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { Role, RoleId } from '@/lib/types';
import {
  ShieldPlus,
  Lock,
  Sliders,
  Edit2,
  Copy,
  Trash2,
  Check,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/common/DataTable';
import { StatusPill } from '@/components/common/StatusPill';
import { CreateRoleModal } from './modals/CreateRoleModal';
import { EditRoleModal } from './modals/EditRoleModal';

interface EnhancedRole extends Role {
  category: string;
  accountType: string;
  status: 'Active' | 'Pending' | 'Suspended';
}

const ROLE_METADATA: Record<number, { category: string; accountType: string; status: 'Active' | 'Pending' | 'Suspended' }> = {
  0: { category: 'Administration', accountType: 'STAFF, SUPER_ADMIN', status: 'Active' },
  1: { category: 'Administration', accountType: 'STAFF, ADMIN', status: 'Active' },
  2: { category: 'Loans & Underwriting', accountType: 'STAFF, MANAGER', status: 'Active' },
  3: { category: 'Accounting & Cashbook', accountType: 'STAFF, ACCOUNTANT', status: 'Active' },
  4: { category: 'Collections & Field', accountType: 'FIELD_AGENT, STAFF', status: 'Active' },
  5: { category: 'Salary & Payroll', accountType: 'STAFF, EMPLOYEE', status: 'Active' },
  6: { category: 'General', accountType: 'CUSTOMER_PORTAL', status: 'Active' },
};

const CATEGORIES = [
  'All',
  'General',
  'Loans & Underwriting',
  'Collections & Field',
  'Accounting & Cashbook',
  'Salary & Payroll',
  'Agents & Business',
  'Reports & Analytics',
  'Administration',
];

export const RolesPermissionsTab: React.FC = () => {
  const { roles, setActiveAdminTab, showToast, createRole, simulatedRoleId } = useApp();
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const isSuperAdmin = simulatedRoleId === 0;

  const enhancedRoles: EnhancedRole[] = useMemo(() => {
    return roles.map((r) => {
      const meta = ROLE_METADATA[r.id] || {
        category: 'General',
        accountType: 'STAFF_CUSTOM',
        status: 'Active' as const,
      };
      return {
        ...r,
        category: meta.category,
        accountType: meta.accountType,
        status: meta.status,
      };
    });
  }, [roles]);

  const filteredRoles = useMemo(() => {
    if (selectedCategory === 'All') return enhancedRoles;
    return enhancedRoles.filter((r) => r.category === selectedCategory);
  }, [enhancedRoles, selectedCategory]);

  const handleCreateRoleClick = () => {
    if (!isSuperAdmin) {
      showToast(
        'Super Admin Required',
        'Only Super Admin (Role 0) is authorized to create new roles.',
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
        'Only Super Admin (Role 0) is authorized to clone or create new roles.',
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

  const columns: ColumnDef<EnhancedRole>[] = [
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
        <button
          onClick={() => setEditingRole(r)}
          className="font-bold text-[#701A35] hover:underline text-xs font-mono block text-left cursor-pointer transition-colors"
          title="Click to edit role and accessible pages"
        >
          {r.code}
        </button>
      ),
      exportValue: (r) => r.code,
    },
    {
      key: 'description',
      header: 'Role Description',
      sortable: true,
      accessor: (r) => r.description,
      render: (r) => (
        <div className="text-xs text-slate-700 max-w-sm">
          <span className="font-medium">{r.name}</span>
          <span className="text-slate-400 block text-[11px] mt-0.5 truncate">{r.description}</span>
        </div>
      ),
      exportValue: (r) => `${r.name}: ${r.description}`,
    },
    {
      key: 'category',
      header: 'Role Category',
      sortable: true,
      accessor: (r) => r.category,
      render: (r) => (
        <span className="text-xs text-slate-700">
          {r.category}
        </span>
      ),
    },
    {
      key: 'accountType',
      header: 'Account Type',
      sortable: true,
      accessor: (r) => r.accountType,
      render: (r) => (
        <span className="text-[11px] font-mono text-slate-600 bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E6E1D6]">
          {r.accountType}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortable: true,
      accessor: (r) => r.status,
      render: (r) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ─── Top Category Filter Card (matching screenshot) ─── */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-700">
            Filter by Category:
          </span>
          <button
            onClick={handleCreateRoleClick}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer ${
              isSuperAdmin
                ? 'text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98'
                : 'text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200'
            }`}
            title={isSuperAdmin ? 'Create New Role' : 'Only Super Admin can create custom roles'}
          >
            {isSuperAdmin ? (
              <ShieldPlus className="w-4 h-4 text-amber-200" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{isSuperAdmin ? '+ Create Role' : 'Create Role (Super Admin Only)'}</span>
          </button>
        </div>

        {/* Category Pills Bar matching screenshot */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#701A35] text-white border border-[#C5A059]/50 shadow-2xs font-bold'
                    : 'bg-[#FAF8F5] text-slate-600 hover:bg-[#F3EFE6] hover:text-slate-900 border border-[#E6E1D6]'
                }`}
              >
                {isActive && <Check className="w-3 h-3 text-[#EED8A1]" />}
                <span>{cat}</span>
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
