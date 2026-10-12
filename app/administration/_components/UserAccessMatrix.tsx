'use client';

import React from 'react';
import { Check, Lock, Save, X } from 'lucide-react';
import { MODULES_DATA } from '@/lib/seedData';
import { ModuleAction, PermissionMatrixState, Role, RoleId } from '@/lib/types';
import { RoleBadge } from '@/components/ui/RoleBadge';

const columns: { key: ModuleAction; label: string }[] = [
  { key: 'view', label: 'Access' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'approve', label: 'Approve' },
  { key: 'export', label: 'Download' },
];

interface UserAccessMatrixProps {
  section?: 'roles' | 'access';
  roles: Role[];
  draftRoleIds: RoleId[];
  draftPrimaryRole: RoleId;
  setDraftPrimaryRole: (roleId: RoleId) => void;
  toggleRole: (roleId: RoleId) => void;
  accessRoleId: RoleId;
  setAccessRoleId: (roleId: RoleId) => void;
  activeRole?: Role;
  draftMatrix: PermissionMatrixState;
  togglePermission: (moduleId: string, action: ModuleAction) => void;
  hasChanges: boolean;
  onSave: () => Promise<void>;
}

export const UserAccessMatrix: React.FC<UserAccessMatrixProps> = ({
  section,
  roles,
  draftRoleIds,
  draftPrimaryRole,
  setDraftPrimaryRole,
  toggleRole,
  accessRoleId,
  setAccessRoleId,
  activeRole,
  draftMatrix,
  togglePermission,
  hasChanges,
  onSave,
}) => {
  const assignedRoles = roles.filter((role) => draftRoleIds.includes(role.id));
  const allowed = (moduleId: string, action: ModuleAction) =>
    Boolean(draftMatrix[moduleId]?.[action]?.[accessRoleId]);
  const showRoles = !section || section === 'roles';
  const showAccess = !section || section === 'access';

  return (
    <div className="space-y-5">
      {showRoles && <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 border-b border-[#EEE8DE] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A07A39]">Authorization</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Roles</h2>
            <p className="mt-1 max-w-2xl text-xs text-slate-500">Assign named roles to this account and choose its primary role.</p>
          </div>
          {hasChanges && (
            <button type="button" onClick={() => void onSave()} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#701A35] px-3.5 py-2.5 text-xs font-bold text-white hover:bg-[#571027]">
              <Save className="h-3.5 w-3.5" />Save changes
            </button>
          )}
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <div><h3 className="text-sm font-bold text-slate-900">Available roles</h3><p className="mt-1 text-[11px] text-slate-500">A user must keep at least one role.</p></div>
          <span className="rounded-full bg-[#F5EEE3] px-2.5 py-1 text-[10px] font-bold text-[#701A35]">{draftRoleIds.length} assigned</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {roles.map((role) => {
            const assigned = draftRoleIds.includes(role.id);
            const primary = draftPrimaryRole === role.id;
            return <div key={role.id} className={`flex items-center justify-between gap-2 rounded-2xl border p-3 ${assigned ? 'border-[#C5A059] bg-[#FBF8F3]' : 'border-slate-200 bg-white'}`}>
              <button type="button" onClick={() => toggleRole(role.id)} className="flex min-w-0 items-center gap-2 text-left">
                <span className={`flex h-4 w-4 items-center justify-center rounded border ${assigned ? 'border-[#701A35] bg-[#701A35] text-white' : 'border-slate-300'}`}>{assigned && <Check className="h-3 w-3" />}</span>
                <RoleBadge roleId={role.id} roleName={role.name} size="xs" isPrimary={primary} />
              </button>
              {assigned && <button type="button" onClick={() => setDraftPrimaryRole(role.id)} className={`rounded-lg px-2 py-1 text-[10px] font-bold ${primary ? 'bg-[#701A35] text-white' : 'text-slate-500 hover:bg-white'}`}>{primary ? 'Primary role' : 'Make primary'}</button>}
            </div>;
          })}
        </div>
      </section>}

      {showAccess && <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-sm sm:p-7">
        <div className="border-b border-[#EEE8DE] pb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A07A39]">Authorization</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Page access</h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">Configure access for the selected role. The table contains only the {MODULES_DATA.length} registered ASR pages; the columns to the right are actions for those pages.</p>
        </div>
        <div className="mt-6 rounded-2xl border border-[#E7DFD2] bg-[#FBF8F3] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <label className="block min-w-0 md:max-w-sm"><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Role to configure</span><select value={accessRoleId} onChange={(event) => setAccessRoleId(Number(event.target.value))} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#C5A059]">{assignedRoles.map((role) => <option key={role.id} value={role.id}>{role.name}{role.id === draftPrimaryRole ? ' · Primary' : ''}</option>)}</select></label>
            <div className="text-[11px] text-slate-500">{activeRole?.isSystemProtected ? 'Protected role: permissions are read-only.' : 'Tick Access to show the page. Other actions are available only for registered page capabilities.'}</div>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[820px] w-full border-collapse text-left text-xs">
            <thead><tr className="border-b border-slate-200 bg-[#F8F6F2]"><th className="sticky left-0 z-10 min-w-[290px] bg-[#F8F6F2] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Registered pages ({MODULES_DATA.length})</th>{columns.map((column) => <th key={column.key} className="min-w-[82px] px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{column.label}</th>)}</tr></thead>
            <tbody>{MODULES_DATA.map((page) => <tr key={page.id} className="border-b border-slate-100 last:border-0 hover:bg-[#FCFBF9]"><td className="sticky left-0 bg-white px-4 py-3"><span className="block font-bold text-slate-800">{page.name}</span><span className="mt-0.5 block text-[10px] text-slate-400">{page.category} · {page.description}</span></td>{columns.map((column) => { const available = page.actions.includes(column.key); const isAllowed = activeRole?.isSystemProtected || (available && allowed(page.id, column.key)); return <td key={column.key} className="px-2 py-3 text-center">{available ? <button type="button" disabled={activeRole?.isSystemProtected} onClick={() => togglePermission(page.id, column.key)} aria-label={`${column.label} ${page.name}`} aria-pressed={Boolean(isAllowed)} className={`mx-auto flex h-8 w-8 items-center justify-center rounded-md border ${isAllowed ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-300 hover:border-[#C5A059]'} disabled:cursor-not-allowed disabled:opacity-80`}>{activeRole?.isSystemProtected ? <Lock className="h-3.5 w-3.5" /> : isAllowed ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</button> : <span className="text-slate-200">—</span>}</td>; })}</tr>)}</tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">Access is role-based and stored in the shared permission matrix. Removing Access automatically removes the other actions for that page.</p>
          {hasChanges && <button type="button" onClick={() => void onSave()} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#701A35] px-3.5 py-2.5 text-xs font-bold text-white hover:bg-[#571027]"><Save className="h-3.5 w-3.5" />Save access changes</button>}
        </div>
      </section>}
    </div>
  );
};
