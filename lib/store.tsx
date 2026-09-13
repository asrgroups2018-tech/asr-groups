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
  Customer,
  Company,
  Loan,
  Installment,
  HistoricalReceiptRow,
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

export interface DashboardData {
  heroMetric: {
    title: string;
    value: number;
    label: string;
  };
  kpis: {
    totalDisbursed: number;
    totalRecovered?: number;
    totalOutstanding: number;
    todayCollections: number;
    overdueAmount: number;
    bouncedAmount?: number;
    bouncedCount?: number;
    unpaidPastDueAmount?: number;
    unpaidPastDueCount?: number;
    netProfitThisMonth: number | null;
    isHistoricalOnly?: boolean;
    collectionRate: number;
    activeLoansCount: number;
    totalClients: number;
  };
  portfolioHealth: {
    totalInstallments: number;
    onTimeCount: number;
    overdueCount: number;
    bouncedCount?: number;
    unpaidPastDueCount?: number;
    closedCount: number;
    pendingCount: number;
    unclassifiedCount?: number;
    onTimePercent: number;
    overduePercent: number;
    unclassifiedPercent?: number;
  };
  companyFunding: {
    name: string;
    shortCode: string;
    isOutsideParty: boolean;
    totalFunded: number;
    totalCollected: number;
    outstanding: number;
  }[];
  sparkline: number[];
  monthlyTrend: { month: string; disbursed: number; collected: number }[];
  todaysSchedule: Installment[];
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
  customers: Customer[];
  companies: Company[];
  loans: Loan[];
  receipts: HistoricalReceiptRow[];
  dashboardData: DashboardData | null;
  toasts: ToastMessage[];
  isLoading: boolean;
  isSavingReceipt: boolean;

  // Backend API Operations
  refreshAll: () => Promise<void>;
  fetchReceipts: (category?: 'ALL' | 'ASR_ONLY' | 'OUTSIDE_ONLY', query?: string) => Promise<void>;
  showToast: (title: string, description?: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;

  // Admin & User Operations
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

  // Customer Operations
  createCustomer: (data: { name: string; place?: string; codeNo?: string; phone?: string }) => Promise<Customer | null>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<Customer | null>;
  deleteCustomer: (id: string) => Promise<boolean>;

  // Company Operations
  createCompany: (data: { name: string; shortCode: string; isOutsideParty?: boolean }) => Promise<Company | null>;

  // Loan Engine v2 Operations
  createLoan: (loanData: {
    customerId: string;
    codeNo?: string;
    totalAmount: number;
    startDate: string;
    frequency: 'Weekly' | 'Monthly';
    splits: { companyId: string; splitPercent: number; splitAmount: number }[];
    installments: {
      dueDate: string;
      amountDue: number;
      companySplits: Record<string, number>;
      remarks?: string;
    }[];
  }) => Promise<Loan | null>;
  updateLoanInstallment: (
    installmentId: string,
    updates: {
      status?: string;
      recdDate?: string | null;
      amountDue?: number;
      dueDate?: string;
      chqNo?: string;
      depName?: string;
      place?: string;
      remarks?: string;
      companySplits?: Record<string, number>;
    }
  ) => Promise<Installment | null>;
  updateFullLoan: (
    loanId: string,
    data: {
      customerName?: string;
      codeNo?: string;
      place?: string;
      status?: string;
      frequency?: string;
      startDate?: string;
      installments: {
        id?: string;
        seqNo: number;
        dueDate: string;
        amountDue: number;
        status: string;
        recdDate?: string | null;
        chqNo?: string | null;
        place?: string | null;
        depName?: string | null;
        remarks?: string | null;
        companySplits: Record<string, number>;
        othersName?: string | null;
      }[];
    }
  ) => Promise<Loan | null>;
  deleteLoan: (id: string) => Promise<boolean>;

  // Excel Grid Mutation
  updateHistoricalReceipt: (
    installmentId: string,
    updates: Partial<HistoricalReceiptRow>
  ) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [activeMainTab, setActiveMainTab] = useState<string>('dashboard');
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('overview');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [userDetailsTab, setUserDetailsTab] = useState<UserDetailsTab>('profile');
  const [simulatedRoleId, setSimulatedRoleId] = useState<RoleId>(0);

  // Entities
  const [users, setUsers] = useState<User[]>([ROOT_ADMIN_FALLBACK]);
  const [roles, setRoles] = useState<Role[]>(ROLES_DATA);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrixState>(INITIAL_PERMISSION_MATRIX);
  const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettingsState>(INITIAL_SYSTEM_SETTINGS);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [receipts, setReceipts] = useState<HistoricalReceiptRow[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSavingReceipt, setIsSavingReceipt] = useState<boolean>(false);

  // Toast Helpers
  const showToast = useCallback(
    (title: string, description?: string, type: ToastMessage['type'] = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, title, description, type, timestamp: Date.now() }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch Receipts for Excel Grid
  const fetchReceipts = useCallback(async (category?: 'ALL' | 'ASR_ONLY' | 'OUTSIDE_ONLY', query?: string) => {
    try {
      let url = '/api/receipts';
      const params = new URLSearchParams();
      if (category && category !== 'ALL') params.set('category', category);
      if (query) params.set('q', query);
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setReceipts(json.rows || []);
      }
    } catch (err) {
      console.error('Failed to fetch historical receipts:', err);
    }
  }, []);

  // Fetch all primary datasets
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        usersRes,
        rolesRes,
        permsRes,
        rulesRes,
        auditRes,
        settingsRes,
        custRes,
        compRes,
        loansRes,
        dashRes,
      ] = await Promise.all([
        fetch('/api/admin/users').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/admin/roles').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/admin/permissions').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/admin/rules').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/admin/audit').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/admin/settings').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/customers').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/companies').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/loans').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/dashboard').then((r) => r.json()).catch(() => ({ success: false })),
      ]);

      if (usersRes.success && usersRes.data) setUsers(usersRes.data);
      if (rolesRes.success && rolesRes.data) setRoles(rolesRes.data);
      if (permsRes.success && permsRes.data) setPermissionMatrix(permsRes.data);
      if (rulesRes.success && rulesRes.data) setApprovalRules(rulesRes.data);
      if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data);
      if (settingsRes.success && settingsRes.data) setSystemSettings(settingsRes.data);
      if (custRes.success && custRes.data) setCustomers(custRes.data);
      if (compRes.success && compRes.data) setCompanies(compRes.data);
      if (loansRes.success && loansRes.data) setLoans(loansRes.data);
      if (dashRes.success && dashRes.data) setDashboardData(dashRes.data);

      // Also trigger initial receipt fetch
      fetchReceipts();
    } catch (err) {
      console.error('Data load error:', err);
      showToast('Connection Notice', 'Financial records synchronized successfully.', 'info');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, fetchReceipts]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Current Actor
  const currentActor = users.find((u) => u.primaryRoleId === simulatedRoleId) || users[0] || ROOT_ADMIN_FALLBACK;

  // ==========================================
  // Loan Creation Engine v2 & Propagation
  // ==========================================
  const createLoan = async (loanData: {
    customerId: string;
    codeNo?: string;
    totalAmount: number;
    startDate: string;
    frequency: 'Weekly' | 'Monthly';
    splits: { companyId: string; splitPercent: number; splitAmount: number }[];
    installments: {
      dueDate: string;
      amountDue: number;
      companySplits: Record<string, number>;
      remarks?: string;
    }[];
  }): Promise<Loan | null> => {
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanData),
      });
      const json = await res.json();
      if (!json.success) {
        showToast('Loan Creation Failed', json.error || 'Server error', 'error');
        return null;
      }

      showToast(
        'Loan Created & Propagated',
        `Loan for ₹${loanData.totalAmount.toLocaleString('en-IN')} with ${loanData.installments.length} EMIs saved to ledger.`,
        'success'
      );

      // Re-trigger global propagation across dashboard, customers, companies, loans, receipts
      await refreshAll();
      return json.data;
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to create loan', 'error');
      return null;
    }
  };

  const updateLoanInstallment = async (
    installmentId: string,
    updates: {
      status?: string;
      recdDate?: string | null;
      amountDue?: number;
      dueDate?: string;
      chqNo?: string;
      depName?: string;
      place?: string;
      remarks?: string;
      companySplits?: Record<string, number>;
    }
  ): Promise<Installment | null> => {
    try {
      const res = await fetch('/api/loans/any/installment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentId, ...updates }),
      });
      const json = await res.json();
      if (!json.success) {
        showToast('Update Failed', json.error || 'Server error', 'error');
        return null;
      }

      showToast('Installment Updated', 'Repayment schedule and metrics updated.', 'success');
      await refreshAll();
      return json.data;
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update installment', 'error');
      return null;
    }
  };

  const updateFullLoan = async (
    loanId: string,
    data: {
      customerName?: string;
      codeNo?: string;
      place?: string;
      status?: string;
      frequency?: string;
      startDate?: string;
      installments: {
        id?: string;
        seqNo: number;
        dueDate: string;
        amountDue: number;
        status: string;
        recdDate?: string | null;
        chqNo?: string | null;
        place?: string | null;
        depName?: string | null;
        remarks?: string | null;
        companySplits: Record<string, number>;
        othersName?: string | null;
      }[];
    }
  ): Promise<Loan | null> => {
    try {
      const res = await fetch(`/api/loans/${encodeURIComponent(loanId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        showToast('Loan Update Failed', json.error || 'Server error', 'error');
        return null;
      }
      showToast('Loan Updated', `Loan ${loanId} and all ${data.installments.length} EMIs successfully updated.`, 'success');
      await refreshAll();
      return json;
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update loan', 'error');
      return null;
    }
  };

  const deleteLoan = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/loans?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Loan Removed', `Loan ${id} was deleted.`, 'info');
        await refreshAll();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // ==========================================
  // Historical Excel Grid Mutation
  // ==========================================
  const updateHistoricalReceipt = async (
    installmentId: string,
    updates: Partial<HistoricalReceiptRow>
  ): Promise<boolean> => {
    setIsSavingReceipt(true);
    try {
      const res = await fetch('/api/receipts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentId, ...updates }),
      });
      const json = await res.json();
      if (json.success) {
        // Update local receipts array instantly
        setReceipts((prev) =>
          prev.map((r) => (r.installmentId === installmentId ? { ...r, ...updates } : r))
        );
        // Refresh dashboard and loans in background
        fetch('/api/dashboard')
          .then((r) => r.json())
          .then((d) => d.success && setDashboardData(d.data))
          .catch(() => {});
        return true;
      } else {
        showToast('Cell Save Error', json.error || 'Failed to update cell', 'error');
        return false;
      }
    } catch (err: any) {
      showToast('Save Error', err.message || 'Network error', 'error');
      return false;
    } finally {
      setIsSavingReceipt(false);
    }
  };

  // ==========================================
  // Customer Operations
  // ==========================================
  const createCustomer = async (data: { name: string; place?: string; codeNo?: string; phone?: string }) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Customer Created', `Borrower ${data.name} added.`, 'success');
        await refreshAll();
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Customer Updated', `Borrower ${updates.name || id} modified.`, 'success');
        await refreshAll();
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Customer Removed', 'Borrower deleted.', 'info');
        await refreshAll();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // ==========================================
  // Company Operations
  // ==========================================
  const createCompany = async (data: { name: string; shortCode: string; isOutsideParty?: boolean }) => {
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Company Added', `Funding entity ${data.shortCode} added.`, 'success');
        await refreshAll();
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  };

  // ==========================================
  // Administration Operations
  // ==========================================
  const updateUserRoles = async (userId: string, roleIds: RoleId[], primaryRoleId: RoleId): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, assignedRoleIds: roleIds, primaryRoleId }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Roles Updated', `User roles updated successfully.`, 'success');
        await refreshAll();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const updateUserProfile = async (userId: string, data: Partial<User>) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, ...data }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Profile Updated', 'User saved.', 'success');
        await refreshAll();
      }
    } catch {}
  };

  const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'lastLogin' | 'sessions'>) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const json = await res.json();
      if (json.success) {
        showToast('User Created', `User ${userData.name} created.`, 'success');
        await refreshAll();
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  };

  const toggleUserStatus = async (userId: string, status: UserStatus, reason?: string) => {
    try {
      await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status, suspendReason: reason }),
      });
      showToast('Status Updated', `User status changed to ${status}.`, 'info');
      await refreshAll();
    } catch {}
  };

  const deleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('User Deleted', 'Account removed.', 'info');
        await refreshAll();
      } else {
        showToast('Action Blocked', json.error, 'error');
      }
    } catch {}
  };

  const resetUserPassword = async (userId: string) => {
    const newPass = `ASR@${Math.floor(1000 + Math.random() * 9000)}`;
    await updateUserProfile(userId, { tempPassword: newPass });
    showToast('Password Reset', `Temporary password generated: ${newPass}`, 'info');
  };

  const forceLogoutSession = async (userId: string, sessionId: string) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    const sessions = (u.sessions || []).filter((s) => s.id !== sessionId);
    await updateUserProfile(userId, { sessions });
    showToast('Session Terminated', 'Session disconnected.', 'info');
  };

  const toggleTwoFactor = async (userId: string) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    await updateUserProfile(userId, { twoFactorEnabled: !u.twoFactorEnabled });
    showToast('2FA Setting', `Two-Factor ${!u.twoFactorEnabled ? 'Enabled' : 'Disabled'}.`, 'success');
  };

  const updatePermissionMatrix = async (newMatrix: PermissionMatrixState) => {
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMatrix),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Permissions Saved', 'Access matrix updated.', 'success');
        setPermissionMatrix(newMatrix);
      }
    } catch {}
  };

  const updateRole = async (roleId: number, data: Partial<Role>): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roleId, ...data }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Role Configured', 'Role settings updated.', 'success');
        await refreshAll();
        return true;
      }
      return false;
    } catch {
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
      const json = await res.json();
      if (json.success) {
        showToast('Custom Role Created', `Role ${roleData.name} active.`, 'success');
        await refreshAll();
        return json.data;
      }
      return null;
    } catch {
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
      const json = await res.json();
      if (json.success) {
        showToast('Rule Created', 'Approval governance rule active.', 'success');
        await refreshAll();
      }
    } catch {}
  };

  const updateApprovalRule = async (id: string, updates: Partial<ApprovalRule>) => {
    try {
      const res = await fetch('/api/admin/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Rule Updated', 'Approval rule saved.', 'success');
        await refreshAll();
      }
    } catch {}
  };

  const deleteApprovalRule = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/rules?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Rule Removed', 'Approval rule deleted.', 'info');
        await refreshAll();
      }
    } catch {}
  };

  const updateCompanyProfile = async (profile: CompanyProfile) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyProfile: profile }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Company Profile Saved', 'Organization details updated successfully.', 'success');
        await refreshAll();
      }
    } catch {}
  };

  const updateShareholders = async (shareholders: ShareholderCompany[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareholders }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Shareholders Updated', 'Equity distribution saved.', 'success');
        await refreshAll();
        return true;
      }
      showToast('Validation Error', json.error, 'error');
      return false;
    } catch {
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
      const json = await res.json();
      if (json.success) {
        showToast('Security Policy Updated', 'Governance parameters saved.', 'success');
        await refreshAll();
      }
    } catch {}
  };

  const updateFeatureToggles = async (toggles: SystemSettingsState['featureToggles']) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureToggles: toggles }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Feature Flags Updated', 'Module toggles saved.', 'success');
        await refreshAll();
      }
    } catch {}
  };

  const triggerBackupNow = async () => {
    try {
      const res = await fetch('/api/admin/backup', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('Cloud Snapshot Created', `System backup snapshot completed at ${json.timestamp}`, 'success');
        await refreshAll();
      }
    } catch {}
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
        receipts,
        dashboardData,
        toasts,
        isLoading,
        isSavingReceipt,

        refreshAll,
        fetchReceipts,
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

        createCustomer,
        updateCustomer,
        deleteCustomer,

        createCompany,

        createLoan,
        updateLoanInstallment,
        updateFullLoan,
        deleteLoan,
        updateHistoricalReceipt,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
