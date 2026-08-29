'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { RoleId, UserDetailsTab, ModuleAction, User } from '@/lib/types';
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
  Ban,
  User as UserIcon,
  Activity,
  Sliders,
  LogOut,
  Edit3,
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
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
  const [resetResult, setResetResult] = useState<{ username?: string; password?: string; email?: string; isAdmin: boolean } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleResetPassword = async () => {
    const isAdmin = user.assignedRoleIds.includes(0) || user.assignedRoleIds.includes(1);
    if (isAdmin) {
      resetUserPassword(user.id);
      showToast('Admin Reset Link Sent', `Password reset token dispatched to official email ${user.email}.`, 'info');
    } else {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
      let newPass = 'ASR@';
      for (let i = 0; i < 4; i++) newPass += chars.charAt(Math.floor(Math.random() * chars.length));

      await updateUserProfile(user.id, { tempPassword: newPass });
      setResetResult({
        username: user.username || user.name.toLowerCase().replace(/[^a-z0-9]/g, '.'),
        password: newPass,
        email: user.email,
        isAdmin: false,
      });
    }
  };

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
    showToast('Changes Discarded', 'Reverted role assignments.', 'info');
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
    setIsEditingProfile(false);
  };

  // User Audit Logs
  const userAuditLogs = useMemo(() => {
    return auditLogs.filter(
      (log) => log.actorId === user.id || log.target.includes(user.name) || log.target.includes(user.id)
    );
  }, [auditLogs, user]);

  const auditColumns: ColumnDef<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      accessor: (l) => l.timestamp,
      render: (l) => <span className="font-mono text-xs">{l.timestamp}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      accessor: (l) => l.action,
      render: (l) => (
        <span className={`font-bold text-xs ${l.isSensitive ? 'text-amber-800' : 'text-slate-800'}`}>
          {l.action}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Performed By',
      sortable: true,
      accessor: (l) => l.actorName,
      render: (l) => <span className="text-xs">{l.actorName}</span>,
    },
    {
      key: 'diff',
      header: 'Change Summary',
      sortable: false,
      render: (l) => (
        <div className="text-xs font-mono text-slate-600">
          {l.beforeVal && <span>{l.beforeVal} → </span>}
          <strong className="text-slate-900">{l.afterVal || l.target}</strong>
        </div>
      ),
    },
  ];

  const navTabs: { id: UserDetailsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'User Information', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'roles', label: 'Role Permissions', icon: <Shield className="w-4 h-4" /> },
    { id: 'security', label: 'Security & Sessions', icon: <Lock className="w-4 h-4" /> },
    { id: 'activity', label: 'Activity Log', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* ─── Header & Back Button ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedUserId(null)}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-[#E6E1D6] text-slate-700 transition-colors shadow-2xs cursor-pointer"
            title="Back to User Management"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              User Details
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Account identity, assigned roles, and security policies
            </p>
          </div>
        </div>

        <button
          onClick={() => setSelectedUserId(null)}
          className="text-xs font-semibold text-[#701A35] hover:text-[#5C142B] self-start sm:self-center hover:underline cursor-pointer"
        >
          ← Back to User Management
        </button>
      </div>

      {/* ─── 3-Column Enterprise Layout (matching screenshot) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ──── LEFT: Vertical Navigation Tab Menu (Span 3) ──── */}
        <div className="lg:col-span-3 space-y-1">
          {navTabs.map((tab) => {
            const isActive = userDetailsTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setUserDetailsTab(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#701A35] border-l-4 border-l-[#701A35] border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
                    : 'bg-white/60 hover:bg-white text-slate-600 hover:text-slate-900 border border-transparent hover:border-[#E6E1D6]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-[#701A35]' : 'text-slate-400'}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ──── CENTER: Main Content Card (Span 6) ──── */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6">

          {/* TAB 1: User Information */}
          {userDetailsTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    User Information
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review and update basic user details, account information and contact details
                  </p>
                </div>
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#E6E1D6] rounded-xl transition-all shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isEditingProfile ? 'Cancel' : 'Edit User Information'}</span>
                </button>
              </div>

              {isEditingProfile ? (
                /* Edit Form */
                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#701A35]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#701A35]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#701A35]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Department</label>
                      <input
                        type="text"
                        value={profileDept}
                        onChange={(e) => setProfileDept(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#701A35]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Designation / Title</label>
                      <input
                        type="text"
                        value={profileDesignation}
                        onChange={(e) => setProfileDesignation(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#701A35]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Emergency Contact</label>
                      <input
                        type="text"
                        value={profileEmergency}
                        onChange={(e) => setProfileEmergency(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#701A35]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Office / Residential Address</label>
                    <textarea
                      rows={2}
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#701A35]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#701A35] hover:bg-[#5C142B] text-white font-bold"
                    >
                      Save Information
                    </button>
                  </div>
                </form>
              ) : (
                /* Display Mode matching screenshot */
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Basic & Authentication Information
                      </h3>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono bg-slate-100 text-slate-700 border border-slate-200">
                        {user.assignedRoleIds.includes(0) || user.assignedRoleIds.includes(1)
                          ? 'Admin: Email Login'
                          : 'Staff/Cust: Username Login'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">User ID</span>
                        <span className="font-mono text-slate-900 font-bold block mt-0.5">{user.id}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Full Name</span>
                        <span className="text-slate-900 font-semibold block mt-0.5">{user.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Primary Login Identifier</span>
                        {user.assignedRoleIds.includes(0) || user.assignedRoleIds.includes(1) ? (
                          <span className="font-mono text-[#701A35] font-bold block mt-0.5">{user.email}</span>
                        ) : (
                          <span className="font-mono text-[#701A35] font-bold block mt-0.5">
                            @{user.username || user.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Email Address</span>
                        <span className="text-slate-900 font-medium block mt-0.5">{user.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Phone Number</span>
                        <span className="text-slate-900 font-mono block mt-0.5">{user.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Login Method</span>
                        <span className="text-slate-900 font-semibold block mt-0.5">
                          {user.assignedRoleIds.includes(0) || user.assignedRoleIds.includes(1)
                            ? 'Official Email & 2FA'
                            : 'Assigned Username & Password'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-3">
                      Account Information
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Title / Designation</span>
                        <span className="text-slate-900 font-semibold block mt-0.5">{user.designation || 'Staff'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Account Type</span>
                        <span className="text-slate-900 font-medium block mt-0.5">
                          {user.isCustomer ? 'Customer User' : 'Internal Staff'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Master Account</span>
                        <span className="text-slate-900 font-medium block mt-0.5">ASR Groups Enterprise</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Status</span>
                        <div className="mt-1">
                          <StatusPill status={user.status} size="sm" />
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Department</span>
                        <span className="text-slate-900 font-medium block mt-0.5">{user.department}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Joined Date</span>
                        <span className="font-mono text-slate-900 block mt-0.5">{user.joinedDate || user.createdAt}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[11px]">Registered Address</span>
                        <span className="text-slate-700 block mt-0.5">{user.address || 'No address specified'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Emergency Contact</span>
                        <span className="font-mono text-slate-700 block mt-0.5">{user.emergencyContact || 'None'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Role Permissions */}
          {userDetailsTab === 'roles' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Role & Access Permissions
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Multi-role assignments and authorization tiers
                  </p>
                </div>
                {hasUnsavedRoles && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDiscardRoles}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleSaveRoles}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] rounded-xl flex items-center gap-1.5 shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5 text-amber-200" />
                      <span>Save Roles</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Roles Selection Grid */}
              <div className="space-y-2.5">
                {roles.map((role) => {
                  const isAssigned = draftRoleIds.includes(role.id);
                  const isPrimary = draftPrimaryRole === role.id;

                  return (
                    <div
                      key={role.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isAssigned
                          ? 'bg-[#FAF8F5] border-[#C5A059]/60'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => handleToggleRole(role.id)}
                          className="w-4 h-4 rounded text-[#701A35] focus:ring-[#701A35] cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <RoleBadge roleId={role.id} size="xs" isPrimary={isPrimary} />
                            <span className="text-xs font-bold text-slate-900">{role.name}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{role.description}</p>
                        </div>
                      </div>

                      {isAssigned && (
                        <button
                          type="button"
                          onClick={() => setDraftPrimaryRole(role.id)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                            isPrimary
                              ? 'bg-[#701A35] text-white border-[#701A35]'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isPrimary ? '★ Primary Role' : 'Set as Primary'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Security & Sessions */}
          {userDetailsTab === 'security' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  Security & Sessions
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Two-factor authentication, active login sessions, and safety controls
                </p>
              </div>

              {/* 2FA Status */}
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E1D6] flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">Two-Factor Authentication (2FA)</p>
                  <p className="text-slate-500 mt-0.5">
                    {user.twoFactorEnabled ? 'Active and protecting this account' : 'Currently disabled'}
                  </p>
                </div>
                <button
                  onClick={() => toggleTwoFactor(user.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                    user.twoFactorEnabled
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {user.twoFactorEnabled ? 'Enabled' : 'Enable 2FA'}
                </button>
              </div>

              {/* Sessions */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono mb-2">
                  Active Login Sessions
                </h3>
                <div className="space-y-2">
                  {user.sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{sess.device} · {sess.browser}</p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {sess.ipAddress} ({sess.location}) · {sess.lastActive}
                        </p>
                      </div>
                      <button
                        onClick={() => forceLogoutSession(user.id, sess.id)}
                        className="px-2.5 py-1 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg"
                      >
                        Force Logout
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Activity Log */}
          {userDetailsTab === 'activity' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  User Activity History
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audit events and administrative changes associated with this account
                </p>
              </div>

              <DataTable
                data={userAuditLogs}
                columns={auditColumns}
                keyExtractor={(l) => l.id}
                title="Activity Records"
                searchPlaceholder="Search events..."
              />
            </div>
          )}

        </div>

        {/* ──── RIGHT: User Summary Profile Card (Span 3, matching screenshot) ──── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4 sticky top-4">
            {/* Big Name */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {user.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {user.isCustomer ? 'Customer User' : `Internal Staff · ${user.designation || 'Staff'}`}
              </p>
              <p className="text-xs text-slate-600 mt-2 break-all">{user.email}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{user.phone}</p>
            </div>

            {/* Status Pill */}
            <div>
              <StatusPill status={user.status} size="sm" />
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              {/* Reset Password */}
              <button
                onClick={handleResetPassword}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-[#FAF8F5] border border-slate-200 transition-colors text-left cursor-pointer shadow-2xs"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Password</span>
              </button>

              {/* Suspend / Reactivate */}
              <button
                onClick={() => setIsSuspendModalOpen(true)}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-amber-800 hover:bg-amber-50 border border-amber-200 transition-colors text-left cursor-pointer shadow-2xs"
              >
                <Ban className="w-3.5 h-3.5 text-amber-600" />
                <span>{user.status === 'Suspended' ? 'Reactivate User' : 'Suspend / Deactivate'}</span>
              </button>

              {/* Delete */}
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors text-left cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete Account</span>
              </button>
            </div>

            {/* Assigned Roles List */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Assigned Roles
              </h3>
              <div className="space-y-1.5">
                {user.assignedRoleIds.map((rId) => {
                  const roleObj = roles.find((r) => r.id === rId);
                  const isPrimary = user.primaryRoleId === rId;

                  return (
                    <div
                      key={rId}
                      className="text-xs text-slate-700 flex items-center justify-between p-2 rounded-lg bg-[#FAF8F5] border border-[#E6E1D6]/60"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono text-slate-400 font-bold">{rId} -</span>
                        <span className="font-medium truncate">{roleObj?.name || `Role ${rId}`}</span>
                      </div>
                      {isPrimary && (
                        <span title="Primary Role" className="text-[#C5A059] text-[11px] font-bold">
                          ★
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Reset Credentials Modal for Standard Users */}
      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-[#E6E1D6] shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-serif">New Credentials Generated</h3>
                  <p className="text-[11px] text-slate-500 font-mono">For {user.name}</p>
                </div>
              </div>
              <button
                onClick={() => setResetResult(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E1D6] space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-sans">Login Username:</span>
                <strong className="text-[#701A35] text-sm">@{resetResult.username}</strong>
              </div>
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-sans">New Password:</span>
                <strong className="text-slate-900 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 tracking-wider">
                  {resetResult.password}
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Standard users log in using their assigned Username and Password. Provide these updated credentials to the user.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`ASR Groups Login Credentials:\nUsername: ${resetResult.username}\nPassword: ${resetResult.password}`);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2500);
                }}
                className="px-3.5 py-2 text-xs font-bold text-[#701A35] bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#C5A059]/60 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                {isCopied ? '✓ Copied' : 'Copy Credentials'}
              </button>
              <button
                type="button"
                onClick={() => setResetResult(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] rounded-xl cursor-pointer shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ElevatedAccessModal
        isOpen={elevatedTargetRole !== null}
        onClose={() => setElevatedTargetRole(null)}
        onConfirm={confirmElevated}
        userName={user.name}
        elevatedRoleId={elevatedTargetRole ?? 1}
      />

      <SuspendUserModal
        user={user}
        isOpen={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
      />

      <DeleteUserModal
        user={user}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
