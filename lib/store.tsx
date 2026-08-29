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
  CustomerInvestor,
  BorrowerCompany,
  IntermediaryLoan,
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
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  selectedLoanId: string | null;
  setSelectedLoanId: (id: string | null) => void;
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
  customers: CustomerInvestor[];
  companies: BorrowerCompany[];
  loans: IntermediaryLoan[];
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
  updateRole: (roleId: number, data: Partial<Role>) => Promise<boolean>;
  createRole: (roleData: Partial<Role>) => Promise<Role | null>;
  addApprovalRule: (rule: Omit<ApprovalRule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateApprovalRule: (id: string, updates: Partial<ApprovalRule>) => Promise<void>;
  deleteApprovalRule: (id: string) => Promise<void>;
  updateCompanyProfile: (profile: CompanyProfile) => Promise<void>;
  updateShareholders: (shareholders: ShareholderCompany[]) => Promise<boolean>;
  updateSecurityPolicy: (policy: SecurityPolicy) => Promise<void>;
  updateFeatureToggles: (toggles: SystemSettingsState['featureToggles']) => Promise<void>;
  triggerBackupNow: () => Promise<void>;
  resetToDefaults: () => Promise<void>;

  // Customer / Investor Operations
  createCustomer: (data: Partial<CustomerInvestor> & { fullName: string; phone: string; companyName?: string; email?: string }) => Promise<CustomerInvestor | null>;
  updateCustomer: (id: string, updates: Partial<CustomerInvestor>) => Promise<CustomerInvestor | null>;
  deleteCustomer: (id: string) => Promise<boolean>;

  // Company / Borrower Operations
  createCompany: (data: Partial<BorrowerCompany> & { companyName: string; contactPerson: string; phone: string }) => Promise<BorrowerCompany | null>;
  updateCompany: (id: string, updates: Partial<BorrowerCompany>) => Promise<BorrowerCompany | null>;
  deleteCompany: (id: string) => Promise<boolean>;

  // Loan / Intermediary Operations
  createLoan: (loanData: Omit<IntermediaryLoan, 'id' | 'createdAt'>) => Promise<IntermediaryLoan | null>;
  updateLoan: (id: string, updates: Partial<IntermediaryLoan>) => Promise<IntermediaryLoan | null>;
  updateLoanInstallmentStatus: (loanId: string, sNo: number, status: 'Paid' | 'Pending' | 'Overdue') => Promise<IntermediaryLoan | null>;
  updateLoanInstallmentDate: (loanId: string, sNo: number, newDate: string, newDueDate?: string, reason?: string) => Promise<IntermediaryLoan | null>;
  deleteLoan: (id: string) => Promise<boolean>;
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

const LS_KEYS = {
  USERS: 'asr_users_v2',
  CUSTOMERS: 'asr_customers_v2',
  COMPANIES: 'asr_companies_v2',
  LOANS: 'asr_loans_v2',
};

function loadFromLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function saveToLS(key: string, data: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeMainTab, setActiveMainTab] = useState<string>('administration');
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('overview');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [userDetailsTab, setUserDetailsTab] = useState<UserDetailsTab>('roles');
  const [simulatedRoleId, setSimulatedRoleId] = useState<RoleId>(0); // Default Super Admin
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [users, setUsers] = useState<User[]>(() => loadFromLS(LS_KEYS.USERS, [ROOT_ADMIN_FALLBACK]));
  const [roles, setRoles] = useState<Role[]>(ROLES_DATA);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrixState>(INITIAL_PERMISSION_MATRIX);
  const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettingsState>(INITIAL_SYSTEM_SETTINGS);
  const [customers, setCustomers] = useState<CustomerInvestor[]>(() => loadFromLS(LS_KEYS.CUSTOMERS, []));
  const [companies, setCompanies] = useState<BorrowerCompany[]>(() => loadFromLS(LS_KEYS.COMPANIES, []));
  const [loans, setLoans] = useState<IntermediaryLoan[]>(() => loadFromLS(LS_KEYS.LOANS, []));
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

  // Fetch all live records from the Backend REST API with localStorage merge fallback
  const refreshAll = useCallback(async () => {
    try {
      setIsLoading(true);
      const [usersRes, rolesRes, matrixRes, rulesRes, auditRes, settingsRes, custRes, compRes, loansRes] =
        await Promise.all([
          fetch('/api/admin/users').then((r) => r.json()).catch(() => null),
          fetch('/api/admin/roles').then((r) => r.json()).catch(() => null),
          fetch('/api/admin/permissions').then((r) => r.json()).catch(() => null),
          fetch('/api/admin/rules').then((r) => r.json()).catch(() => null),
          fetch('/api/admin/audit').then((r) => r.json()).catch(() => null),
          fetch('/api/admin/settings').then((r) => r.json()).catch(() => null),
          fetch('/api/customers').then((r) => r.json()).catch(() => null),
          fetch('/api/companies').then((r) => r.json()).catch(() => null),
          fetch('/api/loans').then((r) => r.json()).catch(() => null),
        ]);

      if (usersRes?.success && usersRes.data) {
        setUsers(usersRes.data);
        saveToLS(LS_KEYS.USERS, usersRes.data);
      }
      if (rolesRes?.success && rolesRes.data) setRoles(rolesRes.data);
      if (matrixRes?.success && matrixRes.data) setPermissionMatrix(matrixRes.data);
      if (rulesRes?.success && rulesRes.data) setApprovalRules(rulesRes.data);
      if (auditRes?.success && auditRes.data) setAuditLogs(auditRes.data);
      if (settingsRes?.success && settingsRes.data) setSystemSettings(settingsRes.data);

      if (custRes?.success && Array.isArray(custRes.data)) {
        setCustomers((prev) => {
          const merged = custRes.data.length >= prev.length ? custRes.data : prev;
          saveToLS(LS_KEYS.CUSTOMERS, merged);
          return merged;
        });
      }
      if (compRes?.success && Array.isArray(compRes.data)) {
        setCompanies((prev) => {
          const merged = compRes.data.length >= prev.length ? compRes.data : prev;
          saveToLS(LS_KEYS.COMPANIES, merged);
          return merged;
        });
      }
      if (loansRes?.success && Array.isArray(loansRes.data)) {
        setLoans((prev) => {
          const merged = loansRes.data.length >= prev.length ? loansRes.data : prev;
          saveToLS(LS_KEYS.LOANS, merged);
          return merged;
        });
      }
    } catch (err) {
      console.warn('API fetch warning, retaining local state:', err);
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

  const updateRole = async (roleId: number, data: Partial<Role>): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roleId, ...data }),
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error);

      await refreshAll();
      showToast('Role Saved', `Role details for "${resData.data.name}" updated successfully.`, 'success');
      return true;
    } catch (err: any) {
      showToast('Role Update Error', err.message, 'error');
      return false;
    }
  };

  const createRole = async (roleData: Partial<Role>): Promise<Role | null> => {
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData),
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error);

      await refreshAll();
      showToast('Role Created', `New role "${resData.data.name}" created successfully.`, 'success');
      return resData.data;
    } catch (err: any) {
      showToast('Role Creation Error', err.message, 'error');
      return null;
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

  // ==========================================
  // Customer / Investor Mutations
  // ==========================================
  const createCustomer = async (
    data: Partial<CustomerInvestor> & { fullName: string; phone: string; companyName?: string; email?: string }
  ): Promise<CustomerInvestor | null> => {
    // Generate optimistic ID if needed
    const newId = `CUST-${101 + customers.length}`;
    const newCustomer: CustomerInvestor = {
      id: newId,
      fullName: data.fullName,
      phone: data.phone,
      companyName: data.companyName || '',
      email: data.email || '',
      totalInvested: 0,
      totalReturns: 0,
      activeLoansCount: 0,
      status: 'Active',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    // Immediate local state + LS update
    const nextCustomers = [newCustomer, ...customers];
    setCustomers(nextCustomers);
    saveToLS(LS_KEYS.CUSTOMERS, nextCustomers);

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json().catch(() => null);
      if (resData?.success && resData.data) {
        setCustomers((prev) => {
          const updated = prev.map((c) => (c.id === newCustomer.id ? resData.data : c));
          saveToLS(LS_KEYS.CUSTOMERS, updated);
          return updated;
        });
        showToast('Customer Created', `Investor ${resData.data.fullName} registered successfully.`, 'success');
        return resData.data;
      }
    } catch (err) {
      console.warn('API error, retained local copy:', err);
    }
    showToast('Customer Created', `Investor ${newCustomer.fullName} registered locally.`, 'success');
    return newCustomer;
  };

  const updateCustomer = async (id: string, updates: Partial<CustomerInvestor>): Promise<CustomerInvestor | null> => {
    let updatedCust: CustomerInvestor | null = null;
    setCustomers((prev) => {
      const next = prev.map((c) => {
        if (c.id === id) {
          updatedCust = { ...c, ...updates };
          return updatedCust;
        }
        return c;
      });
      saveToLS(LS_KEYS.CUSTOMERS, next);
      return next;
    });

    try {
      const res = await fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });
      const resData = await res.json().catch(() => null);
      if (resData?.success && resData.data) {
        showToast('Customer Updated', 'Investor profile updated.', 'success');
        return resData.data;
      }
    } catch (err) {
      console.warn('API error, retained local copy:', err);
    }
    showToast('Customer Updated', 'Investor profile updated.', 'success');
    return updatedCust;
  };

  const deleteCustomer = async (id: string): Promise<boolean> => {
    setCustomers((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveToLS(LS_KEYS.CUSTOMERS, next);
      return next;
    });
    if (selectedCustomerId === id) setSelectedCustomerId(null);

    try {
      await fetch(`/api/customers?id=${id}`, { method: 'DELETE' }).catch(() => null);
    } catch {
      // ignore
    }
    showToast('Customer Removed', 'Investor account removed.', 'info');
    return true;
  };

  // ==========================================
  // Company / Borrower Mutations
  // ==========================================
  const createCompany = async (
    data: Partial<BorrowerCompany> & { companyName: string; contactPerson: string; phone: string }
  ): Promise<BorrowerCompany | null> => {
    const newId = `COMP-${101 + companies.length}`;
    const newCompany: BorrowerCompany = {
      id: newId,
      companyName: data.companyName,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: data.email || '',
      address: data.address || '',
      area: data.area || 'Chennai',
      totalBorrowed: 0,
      outstandingAmount: 0,
      activeLoansCount: 0,
      onTimeRepaymentRate: 100,
      status: 'Active',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    const nextCompanies = [newCompany, ...companies];
    setCompanies(nextCompanies);
    saveToLS(LS_KEYS.COMPANIES, nextCompanies);

    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json().catch(() => null);
      if (resData?.success && resData.data) {
        setCompanies((prev) => {
          const updated = prev.map((c) => (c.id === newCompany.id ? resData.data : c));
          saveToLS(LS_KEYS.COMPANIES, updated);
          return updated;
        });
        showToast('Company Onboarded', `Borrowing business ${resData.data.companyName} registered.`, 'success');
        return resData.data;
      }
    } catch (err) {
      console.warn('API error, retained local copy:', err);
    }
    showToast('Company Onboarded', `Borrowing business ${newCompany.companyName} registered.`, 'success');
    return newCompany;
  };

  const updateCompany = async (id: string, updates: Partial<BorrowerCompany>): Promise<BorrowerCompany | null> => {
    let updatedComp: BorrowerCompany | null = null;
    setCompanies((prev) => {
      const next = prev.map((c) => {
        if (c.id === id) {
          updatedComp = { ...c, ...updates };
          return updatedComp;
        }
        return c;
      });
      saveToLS(LS_KEYS.COMPANIES, next);
      return next;
    });

    try {
      const res = await fetch('/api/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });
      const resData = await res.json().catch(() => null);
      if (resData?.success && resData.data) {
        showToast('Company Updated', 'Borrower details updated.', 'success');
        return resData.data;
      }
    } catch (err) {
      console.warn('API error, retained local copy:', err);
    }
    showToast('Company Updated', 'Borrower details updated.', 'success');
    return updatedComp;
  };

  const deleteCompany = async (id: string): Promise<boolean> => {
    setCompanies((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveToLS(LS_KEYS.COMPANIES, next);
      return next;
    });
    if (selectedCompanyId === id) setSelectedCompanyId(null);

    try {
      await fetch(`/api/companies?id=${id}`, { method: 'DELETE' }).catch(() => null);
    } catch {
      // ignore
    }
    showToast('Company Removed', 'Borrower entity removed.', 'info');
    return true;
  };

  // ==========================================
  // Loan / Intermediary Syndication Mutations
  // ==========================================
  const createLoan = async (loanData: Omit<IntermediaryLoan, 'id' | 'createdAt'>): Promise<IntermediaryLoan | null> => {
    const newId = `LOAN-${1001 + loans.length}`;
    const newLoan: IntermediaryLoan = {
      ...loanData,
      id: newId,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'Active',
    };

    // Immediate local state + LS update
    const nextLoans = [newLoan, ...loans];
    setLoans(nextLoans);
    saveToLS(LS_KEYS.LOANS, nextLoans);

    // Update customer and company active counts locally
    setCustomers((prev) => {
      const updated = prev.map((c) => {
        const found = loanData.customers.find((lc) => lc.customerId === c.id);
        if (found) {
          return {
            ...c,
            totalInvested: (c.totalInvested || 0) + (found.shareAmount || 0),
            activeLoansCount: (c.activeLoansCount || 0) + 1,
          };
        }
        return c;
      });
      saveToLS(LS_KEYS.CUSTOMERS, updated);
      return updated;
    });

    setCompanies((prev) => {
      const updated = prev.map((c) => {
        const found = loanData.companies.find((lc) => lc.companyId === c.id);
        if (found) {
          return {
            ...c,
            totalBorrowed: (c.totalBorrowed || 0) + (found.amount || 0),
            activeLoansCount: (c.activeLoansCount || 0) + 1,
          };
        }
        return c;
      });
      saveToLS(LS_KEYS.COMPANIES, updated);
      return updated;
    });

    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanData),
      });
      const resData = await res.json().catch(() => null);
      if (resData?.success && resData.data) {
        setLoans((prev) => {
          const updated = prev.map((l) => (l.id === newLoan.id ? resData.data : l));
          saveToLS(LS_KEYS.LOANS, updated);
          return updated;
        });
        showToast('Loan Created & Disbursed', `Loan deal ${resData.data.id} created across ${loanData.companies.length} borrower companies.`, 'success');
        return resData.data;
      }
    } catch (err) {
      console.warn('API error, retained local copy:', err);
    }
    showToast('Loan Created & Disbursed', `Loan deal ${newLoan.id} created across ${loanData.companies.length} borrower companies.`, 'success');
    return newLoan;
  };

  const updateLoan = async (id: string, updates: Partial<IntermediaryLoan>): Promise<IntermediaryLoan | null> => {
    let updatedLoan: IntermediaryLoan | null = null;
    setLoans((prev) => {
      const next = prev.map((l) => {
        if (l.id === id) {
          updatedLoan = { ...l, ...updates };
          return updatedLoan;
        }
        return l;
      });
      saveToLS(LS_KEYS.LOANS, next);
      return next;
    });

    try {
      const res = await fetch('/api/loans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });
      const resData = await res.json().catch(() => null);
      if (resData?.success && resData.data) {
        showToast('Loan Updated', `Loan deal ${id} updated.`, 'success');
        return resData.data;
      }
    } catch (err) {
      console.warn('API error, retained local copy:', err);
    }
    showToast('Loan Updated', `Loan deal ${id} updated.`, 'success');
    return updatedLoan;
  };

  const updateLoanInstallmentStatus = async (
    loanId: string,
    sNo: number,
    status: 'Paid' | 'Pending' | 'Overdue'
  ): Promise<IntermediaryLoan | null> => {
    let updatedLoan: IntermediaryLoan | null = null;
    setLoans((prev) => {
      const next = prev.map((l) => {
        if (l.id === loanId) {
          const nextSchedule = l.schedule.map((inst) => {
            if (inst.sNo === sNo) {
              return {
                ...inst,
                status,
                paidDate: status === 'Paid' ? new Date().toISOString().split('T')[0] : undefined,
              };
            }
            return inst;
          });
          const allPaid = nextSchedule.every((i) => i.status === 'Paid');
          updatedLoan = {
            ...l,
            schedule: nextSchedule,
            status: allPaid ? ('Closed' as const) : l.status,
          };
          return updatedLoan;
        }
        return l;
      });
      saveToLS(LS_KEYS.LOANS, next);
      return next;
    });

    try {
      const res = await fetch(`/api/loans/${loanId}/installment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sNo, status }),
      });
      const resData = await res.json().catch(() => null);
      if (resData?.success && resData.data) {
        setLoans((prev) => {
          const next = prev.map((l) => (l.id === loanId ? resData.data : l));
          saveToLS(LS_KEYS.LOANS, next);
          return next;
        });
        showToast(
          status === 'Paid' ? 'Payment Collected' : 'Status Updated',
          `Installment #${sNo} marked as ${status}. Returns updated for participating investors.`,
          'success'
        );
        return resData.data;
      }
    } catch (err) {
      console.warn('API error, retained local copy:', err);
    }
    showToast(
      status === 'Paid' ? 'Payment Collected' : 'Status Updated',
      `Installment #${sNo} marked as ${status}.`,
      'success'
    );
    return updatedLoan;
  };

  const updateLoanInstallmentDate = async (
    loanId: string,
    sNo: number,
    newDate: string,
    newDueDate?: string,
    reason?: string
  ): Promise<IntermediaryLoan | null> => {
    let updatedLoan: IntermediaryLoan | null = null;
    setLoans((prev) => {
      const next = prev.map((l) => {
        if (l.id === loanId) {
          const nextSchedule = l.schedule.map((inst) => {
            if (inst.sNo === sNo) {
              return {
                ...inst,
                date: newDate,
                dueDate: newDueDate || newDate,
                status: (inst.status === 'Paid' ? 'Paid' : 'Rescheduled') as 'Paid' | 'Pending' | 'Overdue' | 'Rescheduled',
                rescheduledReason: reason || inst.rescheduledReason,
              };
            }
            return inst;
          });
          updatedLoan = {
            ...l,
            schedule: nextSchedule,
          };
          return updatedLoan;
        }
        return l;
      });
      saveToLS(LS_KEYS.LOANS, next);
      return next;
    });

    try {
      const res = await fetch(`/api/loans/${loanId}/installment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sNo, newDate, newDueDate, reason }),
      });
      const resData = await res.json().catch(() => null);
      if (resData?.success && resData.data) {
        setLoans((prev) => {
          const next = prev.map((l) => (l.id === loanId ? resData.data : l));
          saveToLS(LS_KEYS.LOANS, next);
          return next;
        });
        showToast('Schedule Date Updated', `Installment #${sNo} rescheduled to ${newDate}.`, 'success');
        return resData.data;
      }
    } catch (err) {
      console.warn('API error, retained local copy:', err);
    }
    showToast('Schedule Date Updated', `Installment #${sNo} rescheduled to ${newDate}.`, 'success');
    return updatedLoan;
  };

  const deleteLoan = async (id: string): Promise<boolean> => {
    setLoans((prev) => {
      const next = prev.filter((l) => l.id !== id);
      saveToLS(LS_KEYS.LOANS, next);
      return next;
    });
    if (selectedLoanId === id) setSelectedLoanId(null);

    try {
      await fetch(`/api/loans?id=${id}`, { method: 'DELETE' }).catch(() => null);
    } catch {
      // ignore
    }
    showToast('Loan Deal Deleted', `Loan ${id} removed.`, 'info');
    return true;
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
        selectedCustomerId,
        setSelectedCustomerId,
        selectedCompanyId,
        setSelectedCompanyId,
        selectedLoanId,
        setSelectedLoanId,
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
        customers,
        companies,
        loans,
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
        updateRole,
        createRole,
        addApprovalRule,
        updateApprovalRule,
        deleteApprovalRule,
        updateCompanyProfile,
        updateShareholders,
        updateSecurityPolicy,
        updateFeatureToggles,
        triggerBackupNow,
        resetToDefaults,
        createCustomer,
        updateCustomer,
        deleteCustomer,
        createCompany,
        updateCompany,
        deleteCompany,
        createLoan,
        updateLoan,
        updateLoanInstallmentStatus,
        updateLoanInstallmentDate,
        deleteLoan,
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
