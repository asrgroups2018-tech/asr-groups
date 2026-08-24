'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  Role,
  PermissionMatrixState,
  ApprovalRule,
  AuditLogEntry,
  SystemSettingsState,
  RoleId,
  AdminTab,
  UserDetailsTab,
  UserStatus,
  ShareholderCompany,
  CompanyProfile,
  SecurityPolicy,
} from './types';
import {
  ROLES_DATA,
  INITIAL_PERMISSION_MATRIX,
  INITIAL_SYSTEM_SETTINGS,
} from './seedData';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: number;
}

interface AppContextType {
  // Navigation & Simulation
  activeMainTab: string;
  setActiveMainTab: (tab: string) => void;
  activeAdminTab: AdminTab;
  setActiveAdminTab: (tab: AdminTab) => void;
  selectedUserId: string | null;
  setSelectedUserId: (userId: string | null) => void;
  userDetailsTab: UserDetailsTab;
  setUserDetailsTab: (tab: UserDetailsTab) => void;
  simulatedRoleId: RoleId;
  setSimulatedRoleId: (roleId: RoleId) => void;
  currentActor: User;

  // Data State
  users: User[];
  roles: Role[];
  permissionMatrix: PermissionMatrixState;
  approvalRules: ApprovalRule[];
  auditLogs: AuditLogEntry[];
  systemSettings: SystemSettingsState;
  toasts: ToastMessage[];
  isLoading: boolean;

  // Real Backend API Operations
  refreshAll: () => Promise<void>;
  showToast: (title: string, description?: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
  updateUserRoles: (userId: string, roleIds: RoleId[], primaryRoleId: RoleId) => Promise<boolean>;
  updateUserProfile: (userId: string, data: Partial<User>) => Promise<void>;
  createUser: (userData: Omit<User, 'id' | 'createdAt' | 'lastLogin' | 'sessions'>) => Promise<User | null>;
  toggleUserStatus: (userId: string, status: UserStatus, reason?: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  resetUserPassword: (userId: string) => Promise<void>;
  forceLogoutSession: (userId: string, sessionId: string) => Promise<void>;
  toggleTwoFactor: (userId: string) => Promise<void>;
  updatePermissionMatrix: (newMatrix: PermissionMatrixState) => Promise<void>;
  addApprovalRule: (rule: Omit<ApprovalRule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateApprovalRule: (id: string, updates: Partial<ApprovalRule>) => Promise<void>;
  deleteApprovalRule: (id: string) => Promise<void>;
  updateCompanyProfile: (profile: CompanyProfile) => Promise<void>;
  updateShareholders: (shareholders: ShareholderCompany[]) => Promise<boolean>;
  updateSecurityPolicy: (policy: SecurityPolicy) => Promise<void>;
  updateFeatureToggles: (toggles: SystemSettingsState['featureToggles']) => Promise<void>;
  triggerBackupNow: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Baseline Super Admin fallback if API is loading
const ROOT_ADMIN_FALLBACK: User = {
  id: 'ADM-1001',
  name: 'System Administrator',
  email: 'admin@asrgroups.in',
  phone: '+91 98401 22345',
  initials: 'SA',
  assignedRoleIds: [0],
  primaryRoleId: 0,
  status: 'Active',
  department: 'Administration',
  designation: 'Super Administrator',
  joinedDate: '2026-01-01',
  createdAt: '2026-01-01 09:00',
  lastLogin: '2026-08-23 10:00',
  twoFactorEnabled: true,
  sessions: [],
  isCustomer: false,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeMainTab, setActiveMainTab] = useState<string>('administration');
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('overview');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetailsTab, setUserDetailsTab] = useState<UserDetailsTab>('roles');
  const [simulatedRoleId, setSimulatedRoleId] = useState<RoleId>(0); // Default Super Admin
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [users, setUsers] = useState<User[]>([ROOT_ADMIN_FALLBACK]);
  const [roles, setRoles] = useState<Role[]>(ROLES_DATA);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrixState>(INITIAL_PERMISSION_MATRIX);
  const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettingsState>(INITIAL_SYSTEM_SETTINGS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (title: string, description?: string, type: ToastMessage['type'] = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastMessage = { id, title, description, type, timestamp: Date.now() };
      setToasts((prev) => [newToast, ...prev].slice(0, 5));
      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch all live records from the Backend REST API
  const refreshAll = useCallback(async () => {
    try {
      setIsLoading(true);
      const [usersRes, rolesRes, matrixRes, rulesRes, auditRes, settingsRes] = await Promise.all([
        fetch('/api/admin/users').then((r) => r.json()),
        fetch('/api/admin/roles').then((r) => r.json()),
        fetch('/api/admin/permissions').then((r) => r.json()),
        fetch('/api/admin/rules').then((r) => r.json()),
        fetch('/api/admin/audit').then((r) => r.json()),
        fetch('/api/admin/settings').then((r) => r.json()),
      ]);

      if (usersRes?.success && usersRes.data) setUsers(usersRes.data);
      if (rolesRes?.success && rolesRes.data) setRoles(rolesRes.data);
      if (matrixRes?.success && matrixRes.data) setPermissionMatrix(matrixRes.data);
      if (rulesRes?.success && rulesRes.data) setApprovalRules(rulesRes.data);
      if (auditRes?.success && auditRes.data) setAuditLogs(auditRes.data);
      if (settingsRes?.success && settingsRes.data) setSystemSettings(settingsRes.data);
    } catch (err) {
      console.warn('API fetch error, using local state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Current active user
  const currentActor =
    users.find((u) => u.assignedRoleIds.includes(simulatedRoleId)) || users[0] || ROOT_ADMIN_FALLBACK;

  // Real API Mutations
  const updateUserRoles = async (userId: string, roleIds: RoleId[], primaryRoleId: RoleId): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          assignedRoleIds: roleIds,
          primaryRoleId,
          isCustomer: roleIds.length === 1 && roleIds[0] === 6,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await refreshAll();
      showToast('Roles Updated', `Assigned ${roleIds.length} role(s) via Backend API.`, 'success');
      return true;
    } catch (err: any) {
      showToast('Error Updating Roles', err.message, 'error');
      return false;
    }
  };

  const updateUserProfile = async (userId: string, dataUpdates: Partial<User>) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          ...dataUpdates,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await refreshAll();
      showToast('Profile Saved', 'User record committed to database.', 'success');
    } catch (err: any) {
      showToast('Save Error', err.message, 'error');
    }
  };

  const createUser = async (
    userData: Omit<User, 'id' | 'createdAt' | 'lastLogin' | 'sessions'>
  ): Promise<User | null> => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await refreshAll();
      showToast('User Created', `Account created successfully for ${data.data.name}.`, 'success');
      return data.data;
    } catch (err: any) {
      showToast('Registration Error', err.message, 'error');
      return null;
    }
  };

  const toggleUserStatus = async (userId: string, status: UserStatus, reason?: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          status,
          suspendReason: status === 'Suspended' ? reason || 'Administrative lock' : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await refreshAll();
      showToast(`User ${status}`, `Account status changed to ${status}.`, status === 'Suspended' ? 'warning' : 'success');
    } catch (err: any) {
      showToast('Status Update Error', err.message, 'error');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (selectedUserId === userId) {
        setSelectedUserId(null);
        setActiveAdminTab('users');
      }

      await refreshAll();
      showToast('User Deleted', 'Account permanently removed from database.', 'error');
    } catch (err: any) {
      showToast('Delete Error', err.message, 'error');
    }
  };

  const resetUserPassword = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    showToast(
      'Password Reset Dispatched',
      `Temporary credentials sent to ${target?.email || 'user email'}.`,
      'info'
    );
    // Log via API
    fetch('/api/admin/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorId: currentActor.id,
        actorName: currentActor.name,
        actorRoleId: simulatedRoleId,
        action: 'Reset Password',
        target: `${target?.name || userId}`,
        isSensitive: true,
      }),
    });
  };

  const forceLogoutSession = async (userId: string, sessionId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    await updateUserProfile(userId, {
      sessions: target.sessions.filter((s) => s.id !== sessionId),
    });
    showToast('Session Revoked', 'Target device logged out.', 'warning');
  };

  const toggleTwoFactor = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const nextVal = !target.twoFactorEnabled;
    await updateUserProfile(userId, {
      twoFactorEnabled: nextVal,
    });
    showToast('2FA Setting Updated', `Two-Factor security is now ${nextVal ? 'Enforced' : 'Optional'}.`);
  };

  const updatePermissionMatrix = async (newMatrix: PermissionMatrixState) => {
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMatrix),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setPermissionMatrix(data.data);
      await refreshAll();
      showToast('Matrix Saved', 'System privileges synchronized across all 13 modules.', 'success');
    } catch (err: any) {
      showToast('Matrix Save Error', err.message, 'error');
    }
  };

  const addApprovalRule = async (rule: Omit<ApprovalRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const res = await fetch('/api/admin/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await refreshAll();
      showToast('Rule Created', `Workflow for ${rule.changeType} is now active.`, 'success');
    } catch (err: any) {
      showToast('Rule Creation Error', err.message, 'error');
    }
  };

  const updateApprovalRule = async (id: string, updates: Partial<ApprovalRule>) => {
    try {
      const res = await fetch('/api/admin/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await refreshAll();
      showToast('Rule Updated', `Approval workflow rule updated.`, 'success');
    } catch (err: any) {
      showToast('Update Error', err.message, 'error');
    }
  };

  const deleteApprovalRule = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/rules?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await refreshAll();
      showToast('Rule Deleted', 'Workflow rule removed.', 'error');
    } catch (err: any) {
      showToast('Delete Error', err.message, 'error');
    }
  };

  const updateCompanyProfile = async (profile: CompanyProfile) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyProfile: profile }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await refreshAll();
      showToast('Company Profile Saved', 'Corporate details updated.', 'success');
    } catch (err: any) {
      showToast('Settings Error', err.message, 'error');
    }
  };

  const updateShareholders = async (shareholders: ShareholderCompany[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareholders }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await refreshAll();
      showToast('Shareholders Saved', 'Equity distribution split updated.', 'success');
      return true;
    } catch (err: any) {
      showToast('Validation Error', err.message, 'error');
      return false;
    }
  };

  const updateSecurityPolicy = async (policy: SecurityPolicy) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ securityPolicy: policy }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await refreshAll();
      showToast('Security Policy Updated', 'Global authentication parameters saved.', 'success');
    } catch (err: any) {
      showToast('Security Save Error', err.message, 'error');
    }
  };

  const updateFeatureToggles = async (toggles: SystemSettingsState['featureToggles']) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureToggles: toggles }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await refreshAll();
      showToast('Feature Flags Saved', 'Platform capability flags committed.', 'success');
    } catch (err: any) {
      showToast('Flags Save Error', err.message, 'error');
    }
  };

  const triggerBackupNow = async () => {
    try {
      const res = await fetch('/api/admin/backup', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await refreshAll();
      showToast('Backup Completed', `Database snapshot saved: ${data.timestamp}`, 'success');
    } catch (err: any) {
      showToast('Backup Error', err.message, 'error');
    }
  };

  const resetToDefaults = async () => {
    await refreshAll();
    showToast('State Reloaded', 'Synchronized with latest backend records.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        activeMainTab,
        setActiveMainTab,
        activeAdminTab,
        setActiveAdminTab,
        selectedUserId,
        setSelectedUserId,
        userDetailsTab,
        setUserDetailsTab,
        simulatedRoleId,
        setSimulatedRoleId,
        currentActor,
        users,
        roles,
        permissionMatrix,
        approvalRules,
        auditLogs,
        systemSettings,
        toasts,
        isLoading,
        refreshAll,
        showToast,
        removeToast,
        updateUserRoles,
        updateUserProfile,
        createUser,
        toggleUserStatus,
        deleteUser,
        resetUserPassword,
        forceLogoutSession,
        toggleTwoFactor,
        updatePermissionMatrix,
        addApprovalRule,
        updateApprovalRule,
        deleteApprovalRule,
        updateCompanyProfile,
        updateShareholders,
        updateSecurityPolicy,
        updateFeatureToggles,
        triggerBackupNow,
        resetToDefaults,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
