'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { RoleId, UserDetailsTab, ModuleAction } from '@/lib/types';
import { MODULES_DATA } from '@/lib/seedData';
import {
  ArrowLeft,
  Shield,
  Star,
  Check,
  X,
  AlertTriangle,
  Lock,
  Smartphone,
  Trash2,
  KeyRound,
  RotateCcw,
  Save,
  CheckCircle2,
  Clock,
  MoreVertical,
  Ban,
  User as UserIcon,
  Activity,
  Sliders,
  LogOut,
  Info,
} from 'lucide-react';
import { RoleBadge } from '@/components/common/RoleBadge';
import { StatusPill } from '@/components/common/StatusPill';
import { ElevatedAccessModal } from './modals/ElevatedAccessModal';
import { SuspendUserModal } from './modals/SuspendUserModal';
import { DeleteUserModal } from './modals/DeleteUserModal';
import { DataTable, ColumnDef } from '@/components/common/DataTable';
import { AuditLogEntry } from '@/lib/types';

export const UserDetailsView: React.FC = () => {
  const {
    users,
    roles,
    permissionMatrix,
    auditLogs,
    selectedUserId,
    setSelectedUserId,
    userDetailsTab,
    setUserDetailsTab,
    updateUserRoles,
    updateUserProfile,
    resetUserPassword,
    forceLogoutSession,
    toggleTwoFactor,
    showToast,
  } = useApp();

  const user = users.find((u) => u.id === selectedUserId) || users[0];

  // Local draft states for Roles & Access tab
  const [draftRoleIds, setDraftRoleIds] = useState<RoleId[]>(user.assignedRoleIds);
  const [draftPrimaryRole, setDraftPrimaryRole] = useState<RoleId>(user.primaryRoleId);

  // Local draft states for Profile tab
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profilePhone, setProfilePhone] = useState(user.phone);
  const [profileDept, setProfileDept] = useState(user.department);
  const [profileDesignation, setProfileDesignation] = useState(user.designation);
  const [profileAddress, setProfileAddress] = useState(user.address || '');
  const [profileEmergency, setProfileEmergency] = useState(user.emergencyContact || '');

  // Modals
  const [elevatedTargetRole, setElevatedTargetRole] = useState<RoleId | null>(null);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isKebabOpen, setIsKebabOpen] = useState(false);

  // Has unsaved role changes?
  const hasUnsavedRoles =
    JSON.stringify(draftRoleIds.sort()) !== JSON.stringify([...user.assignedRoleIds].sort()) ||
    draftPrimaryRole !== user.primaryRoleId;

  // Toggle role in draft
  const handleToggleRole = (roleId: RoleId) => {
    if (draftRoleIds.includes(roleId)) {
      if (draftRoleIds.length === 1) {
        showToast('Validation Warning', 'A user must hold at least one role.', 'warning');
        return;
      }
      const updated = draftRoleIds.filter((id) => id !== roleId);
      setDraftRoleIds(updated);
      if (draftPrimaryRole === roleId) {
        setDraftPrimaryRole(updated[0]);
      }
    } else {
      if (roleId === 0 || roleId === 1) {
        setElevatedTargetRole(roleId);
      } else {
        setDraftRoleIds([...draftRoleIds, roleId]);
      }
    }
  };

  const confirmElevated = () => {
    if (elevatedTargetRole !== null) {
      setDraftRoleIds([...draftRoleIds, elevatedTargetRole]);
      setElevatedTargetRole(null);
    }
  };

  const handleSaveRoles = () => {
    updateUserRoles(user.id, draftRoleIds, draftPrimaryRole);
  };

  const handleDiscardRoles = () => {
    setDraftRoleIds(user.assignedRoleIds);
    setDraftPrimaryRole(user.primaryRoleId);
    showToast('Changes Discarded', 'Reverted role assignments to previous state.', 'info');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(user.id, {
      name: profileName,
      email: profileEmail,
      phone: profilePhone,
      department: profileDept,
      designation: profileDesignation,
      address: profileAddress,
      emergencyContact: profileEmergency,
    });
  };

  // Auto-computed Union Matrix for Permissions Preview
  const computedUnionMatrix = useMemo(() => {
    const activeRoles = hasUnsavedRoles ? draftRoleIds : user.assignedRoleIds;
    const actionsList: ModuleAction[] = ['view', 'create', 'edit', 'delete', 'approve', 'export'];

    const matrix: Record<
      string,
      Record<
        ModuleAction,
        {
          allowed: boolean;
          grantingRoles: string[];
        }
      >
    > = {};

    MODULES_DATA.forEach((mod) => {
      matrix[mod.id] = {
        view: { allowed: false, grantingRoles: [] },
        create: { allowed: false, grantingRoles: [] },
        edit: { allowed: false, grantingRoles: [] },
        delete: { allowed: false, grantingRoles: [] },
        approve: { allowed: false, grantingRoles: [] },
        export: { allowed: false, grantingRoles: [] },
      };

      actionsList.forEach((act) => {
        const granting: string[] = [];
        activeRoles.forEach((roleId) => {
          const isAllowed = permissionMatrix[mod.id]?.[act]?.[roleId];
          if (isAllowed) {
            const roleName = roles.find((r) => r.id === roleId)?.name || `Role ${roleId}`;
            granting.push(roleName);
          }
        });

        matrix[mod.id][act] = {
          allowed: granting.length > 0,
          grantingRoles: granting,
        };
      });
    });

    return matrix;
  }, [user.assignedRoleIds, draftRoleIds, hasUnsavedRoles, permissionMatrix, roles]);

  // User-scoped audit events
  const userAuditLogs = useMemo(() => {
    return auditLogs.filter(
      (log) =>
        log.target.includes(user.name) ||
        log.target.includes(user.id) ||
        log.actorId === user.id
    );
  }, [auditLogs, user]);

  const auditColumns: ColumnDef<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      accessor: (l) => l.timestamp,
      render: (l) => <span className="font-mono text-[11px]">{l.timestamp}</span>,
    },
    {
      key: 'actor',
      header: 'Actor',
      sortable: true,
      accessor: (l) => l.actorName,
      render: (l) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-800">{l.actorName}</span>
          <RoleBadge roleId={l.actorRoleId} size="xs" />
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      accessor: (l) => l.action,
      render: (l) => (
        <span className={`font-bold ${l.isSensitive ? 'text-amber-700' : 'text-slate-800'}`}>
          {l.action}
        </span>
      ),
    },
    {
      key: 'diff',
      header: 'Audit Diff (Before → After)',
      sortable: false,
      render: (l) => (
        <div className="text-[11px] space-y-0.5 max-w-sm">
          {l.beforeVal && (
            <p className="text-slate-500 line-through truncate">Before: {l.beforeVal}</p>
          )}
          {l.afterVal && (
            <p className="text-emerald-700 font-mono font-medium truncate">After: {l.afterVal}</p>
          )}
        </div>
      ),
    },
    {
      key: 'ip',
      header: 'IP & Device',
      sortable: false,
      accessor: (l) => l.ipAddress,
      render: (l) => (
        <div className="text-[11px] font-mono text-slate-500">
          <p>{l.ipAddress}</p>
          <p className="text-[10px] text-slate-400">{l.device}</p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedUserId(null)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-[#EBE7DF] text-xs font-bold text-slate-700 transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to User Management</span>
        </button>

        <span className="text-xs text-slate-500 font-mono">
          Viewing Record: <strong>{user.id}</strong>
        </span>
      </div>

      {/* Sticky User Profile Header */}
      <div className="bg-white rounded-2xl p-6 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] sticky top-0 z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Avatar & User Details */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-amber-100 flex items-center justify-center font-bold text-xl shrink-0 border border-slate-700 shadow-xs">
              {user.initials}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 font-serif leading-tight">
                  {user.name}
                </h2>
                <StatusPill status={user.status} size="sm" />
                <span className="text-xs font-mono text-slate-400">({user.id})</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                <span>{user.email}</span>
                <span>•</span>
                <span>{user.phone}</span>
                <span>•</span>
                <span>{user.department}</span>
              </p>

              {/* Combined Assigned Role Badges */}
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <span className="text-[11px] font-bold uppercase text-slate-400 font-mono mr-1">
                  Active Roles:
                </span>
                {user.assignedRoleIds.map((rId) => (
                  <RoleBadge
                    key={rId}
                    roleId={rId}
                    size="sm"
                    isPrimary={user.primaryRoleId === rId}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons & Kebab Menu */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {hasUnsavedRoles && (
              <button
                onClick={handleSaveRoles}
                className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] border border-[#C5A059]/40 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4 text-amber-200" />
                <span>Save Changes</span>
              </button>
            )}

            <button
              onClick={() => resetUserPassword(user.id)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Reset Password</span>
            </button>

            {/* Kebab Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsKebabOpen(!isKebabOpen)}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isKebabOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 z-30 animate-in fade-in">
                  <button
                    onClick={() => {
                      resetUserPassword(user.id);
                      setIsKebabOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset Password</span>
                  </button>

                  <button
                    onClick={() => {
                      if (user.sessions.length > 0) {
                        forceLogoutSession(user.id, user.sessions[0].id);
                      } else {
                        showToast('No Active Sessions', 'User has no active sessions.', 'info');
                      }
                      setIsKebabOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-400" />
                    <span>Force Logout All</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsSuspendModalOpen(true);
                      setIsKebabOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-lg flex items-center gap-2"
                  >
                    <Ban className="w-3.5 h-3.5 text-amber-600" />
                    <span>{user.status === 'Suspended' ? 'Reactivate User' : 'Suspend Account'}</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(true);
                      setIsKebabOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Delete User</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 border-t border-slate-100 mt-5 pt-3 overflow-x-auto">
          {[
            { id: 'roles', label: 'Roles & Access', icon: <Shield className="w-3.5 h-3.5" /> },
            {
              id: 'permissions',
              label: 'Permissions Preview',
              icon: <Sliders className="w-3.5 h-3.5" />,
            },
            { id: 'profile', label: 'Profile', icon: <UserIcon className="w-3.5 h-3.5" /> },
            { id: 'activity', label: 'Activity Log', icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'security', label: 'Security & Sessions', icon: <Lock className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const isActive = userDetailsTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setUserDetailsTab(tab.id as UserDetailsTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  isActive
                    ? 'bg-[#701A35] text-white border border-[#C5A059]/40 shadow-xs'
                    : 'text-slate-600 hover:bg-[#F3EFE6] hover:text-slate-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id === 'roles' && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {draftRoleIds.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB 1: ROLES & ACCESS (THE FLAGSHIP HERO TAB) */}
      {userDetailsTab === 'roles' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Summary Box */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase font-mono">
                  Multi-Role Assignment Engine
                </h4>
                <p className="text-xs text-slate-600">
                  This user currently holds{' '}
                  <strong className="text-slate-900 font-bold">
                    {draftRoleIds.length} role(s)
                  </strong>
                  . Effective access is the non-destructive union of all enabled roles.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono">
                Default Landing:{' '}
                <strong>
                  {roles.find((r) => r.id === draftPrimaryRole)?.name || 'Super Admin'}
                </strong>
              </span>
            </div>
          </div>

          {/* List of 7 Roles with Toggles and Star Icon */}
          <div className="bg-white rounded-2xl border border-[#EBE7DF] divide-y divide-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] overflow-hidden">
            {roles.map((role) => {
              const isEnabled = draftRoleIds.includes(role.id);
              const isPrimary = draftPrimaryRole === role.id;
              const isElevated = role.id === 0 || role.id === 1;

              return (
                <div
                  key={role.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isEnabled ? 'bg-white' : 'bg-slate-50/60 opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      <RoleBadge roleId={role.id} size="md" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">
                          {role.name}
                        </h4>
                        {role.isSystemProtected && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded border border-slate-300">
                            SYSTEM PROTECTED
                          </span>
                        )}
                        {isElevated && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                            ELEVATED PRIVILEGES
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{role.description}</p>
                    </div>
                  </div>

                  {/* Toggle Switch & Primary Role Star */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {isEnabled && (
                      <button
                        onClick={() => setDraftPrimaryRole(role.id)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-xl border transition-all flex items-center gap-1.5 ${
                          isPrimary
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold shadow-2xs'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Set as user's primary landing role"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isPrimary
                              ? 'fill-amber-500 text-amber-500'
                              : 'text-slate-400'
                          }`}
                        />
                        <span>{isPrimary ? 'Primary Role' : 'Set Primary'}</span>
                      </button>
                    )}

                    {/* Large Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleToggleRole(role.id)}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 shadow-inner" />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Bottom Save / Discard Bar for Unsaved Changes */}
          {hasUnsavedRoles && (
            <div className="fixed bottom-4 left-4 right-4 md:left-72 md:right-8 z-40 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-amber-400/40 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-300">
                    Unsaved Role Configuration
                  </h4>
                  <p className="text-xs text-slate-300">
                    You have modified role assignments ({draftRoleIds.length} active). Click Save to commit to the Audit Log.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDiscardRoles}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Discard Changes
                </button>
                <button
                  onClick={handleSaveRoles}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] border border-[#C5A059]/40 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4 text-amber-200" />
                  <span>Save Role Assignments</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: PERMISSIONS PREVIEW (AUTO-COMPUTED UNION MATRIX) */}
      {userDetailsTab === 'permissions' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-indigo-950 uppercase font-mono">
                  Effective Union Matrix Preview
                </h4>
                <p className="text-xs text-indigo-800">
                  Effective access computed from{' '}
                  <strong>{draftRoleIds.length} assigned role(s)</strong> (
                  {draftRoleIds
                    .map((rId) => roles.find((r) => r.id === rId)?.name)
                    .join(', ')}
                  ).
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-indigo-900 bg-indigo-100 px-3 py-1 rounded-xl border border-indigo-300">
              {draftRoleIds.length} ROLES ACTIVE
            </span>
          </div>

          {/* Matrix Spreadsheet Grid */}
          <div className="bg-white rounded-2xl border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-slate-200">
                  <th className="px-4 py-3 font-bold uppercase text-slate-600 text-[11px]">
                    ERP Module
                  </th>
                  <th className="px-4 py-3 font-bold uppercase text-slate-600 text-[11px]">
                    Category
                  </th>
                  {['View', 'Create', 'Edit', 'Delete', 'Approve', 'Export'].map((act) => (
                    <th
                      key={act}
                      className="px-3 py-3 font-bold uppercase text-slate-600 text-[11px] text-center"
                    >
                      {act}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MODULES_DATA.map((mod) => {
                  const permissions = computedUnionMatrix[mod.id];
                  const actions: ModuleAction[] = [
                    'view',
                    'create',
                    'edit',
                    'delete',
                    'approve',
                    'export',
                  ];

                  return (
                    <tr key={mod.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{mod.name}</p>
                        <p className="text-[10px] text-slate-400">{mod.description}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {mod.category}
                      </td>

                      {actions.map((act) => {
                        const cell = permissions?.[act];
                        const isSupported = mod.actions.includes(act);

                        if (!isSupported) {
                          return (
                            <td
                              key={act}
                              className="px-3 py-3 text-center text-slate-300 font-mono text-[10px]"
                            >
                              -
                            </td>
                          );
                        }

                        return (
                          <td key={act} className="px-3 py-3 text-center">
                            {cell?.allowed ? (
                              <div
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300 shadow-2xs group relative cursor-pointer"
                                title={`Granted by: ${cell.grantingRoles.join(', ')}`}
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                                {/* Tooltip */}
                                <div className="hidden group-hover:block absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-sans px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap z-30">
                                  Granted by: {cell.grantingRoles.join(', ')}
                                </div>
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-300">
                                <X className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PROFILE */}
      {userDetailsTab === 'profile' && (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white rounded-2xl p-6 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-5 animate-in fade-in max-w-3xl"
        >
          <h3 className="text-base font-bold text-slate-900 font-serif">
            User Account Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phone Number
              </label>
              <input
                type="text"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Emergency Contact
              </label>
              <input
                type="text"
                value={profileEmergency}
                onChange={(e) => setProfileEmergency(e.target.value)}
                placeholder="e.g. +91 98401 99887 (Spouse)"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Department
              </label>
              <input
                type="text"
                value={profileDept}
                onChange={(e) => setProfileDept(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Designation
              </label>
              <input
                type="text"
                value={profileDesignation}
                onChange={(e) => setProfileDesignation(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Address
            </label>
            <input
              type="text"
              value={profileAddress}
              onChange={(e) => setProfileAddress(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs"
            >
              Save Profile
            </button>
          </div>
        </form>
      )}

      {/* SUB-TAB 4: ACTIVITY (USER-SCOPED AUDIT LOG) */}
      {userDetailsTab === 'activity' && (
        <div className="space-y-4 animate-in fade-in">
          <DataTable
            data={userAuditLogs}
            columns={auditColumns}
            keyExtractor={(l) => l.id}
            title={`Audit History for ${user.name}`}
            exportFileName={`audit_${user.id}`}
            searchPlaceholder="Search user activity records..."
          />
        </div>
      )}

      {/* SUB-TAB 5: SECURITY */}
      {userDetailsTab === 'security' && (
        <div className="space-y-6 animate-in fade-in max-w-4xl">
          {/* Authentication & 2FA */}
          <div className="bg-white rounded-2xl p-6 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-serif">
              Authentication & Two-Factor (2FA)
            </h3>

            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Two-Factor Authentication (2FA)
                  </p>
                  <p className="text-xs text-slate-500">
                    Requires TOTP authenticator code or SMS OTP on each login attempt
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={user.twoFactorEnabled}
                  onChange={() => toggleTwoFactor(user.id)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div>
                <p className="text-xs font-bold text-slate-900">Credential Reset</p>
                <p className="text-xs text-slate-500">
                  Generate a randomized temporary password and send to {user.email}
                </p>
              </div>
              <button
                onClick={() => resetUserPassword(user.id)}
                className="px-4 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-2xs"
              >
                Reset Password
              </button>
            </div>
          </div>

          {/* Active Sessions List */}
          <div className="bg-white rounded-2xl p-6 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  Active User Sessions
                </h3>
                <p className="text-xs text-slate-500">
                  Devices with valid JWT tokens authorized for ERP access
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {user.sessions.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No active device sessions registered.</p>
              ) : (
                user.sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{sess.device}</span>
                        {sess.isCurrent && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                            CURRENT DEVICE
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-[11px] font-mono">
                        {sess.browser} · {sess.ipAddress} ({sess.location})
                      </p>
                      <p className="text-slate-400 text-[10px]">Active: {sess.lastActive}</p>
                    </div>

                    <button
                      onClick={() => forceLogoutSession(user.id, sess.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors self-start sm:self-center"
                    >
                      Force Logout
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-rose-50/60 rounded-2xl p-6 border border-rose-200 space-y-4">
            <h3 className="text-base font-bold text-rose-950 font-serif flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Danger Zone</span>
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-rose-200 bg-white">
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {user.status === 'Suspended' ? 'Reactivate Account' : 'Suspend Account'}
                </p>
                <p className="text-xs text-slate-500">
                  {user.status === 'Suspended'
                    ? 'Restore full system access'
                    : 'Immediately lock the account and invalidate active sessions'}
                </p>
              </div>
              <button
                onClick={() => setIsSuspendModalOpen(true)}
                className="px-4 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors shrink-0"
              >
                {user.status === 'Suspended' ? 'Reactivate User' : 'Suspend Account'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-rose-200 bg-white">
              <div>
                <p className="text-xs font-bold text-rose-700">Delete User Permanently</p>
                <p className="text-xs text-slate-500">
                  Irreversibly delete this account. Requires confirmation phrase typing.
                </p>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shrink-0"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elevated Access Confirmation Modal */}
      <ElevatedAccessModal
        isOpen={elevatedTargetRole !== null}
        onClose={() => setElevatedTargetRole(null)}
        onConfirm={confirmElevated}
        userName={user.name}
        elevatedRoleId={elevatedTargetRole ?? 1}
      />

      {/* Suspend Modal */}
      <SuspendUserModal
        user={user}
        isOpen={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
      />

      {/* Delete Modal */}
      <DeleteUserModal
        user={user}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
