'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
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
  ApprovalRequest,
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
  approvalRequests: ApprovalRequest[];
  dashboardData: DashboardData | null;
  toasts: ToastMessage[];
  isLoading: boolean;
  isSavingReceipt: boolean;

  // Backend API Operations
  refreshAll: (showLoadingState?: boolean) => Promise<void>;
  fetchReceipts: (category?: 'ALL' | 'ASR_ONLY' | 'OUTSIDE_ONLY', query?: string) => Promise<void>;
  fetchApprovalRequests: (status?: string, changeType?: string, query?: string) => Promise<void>;
  showToast: (title: string, description?: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;

  // Requests & Approvals
  createApprovalRequest: (data: any) => Promise<ApprovalRequest | null>;
  approveRequest: (id: string, notes?: string) => Promise<boolean>;
  rejectRequest: (id: string, notes: string) => Promise<boolean>;

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
    disbursedAmount?: number | null;
    interestAmount?: number | null;
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
      disbursedAmount?: number | null;
      interestAmount?: number | null;
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
  const pathname = usePathname();
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

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
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSavingReceipt, setIsSavingReceipt] = useState<boolean>(false);
  const hasLoadedDataRef = React.useRef(false);
  const isFetchingAuthRef = React.useRef(false);

  useEffect(() => {
    if (pathname === '/login') {
      setAuthenticatedUser(null);
      setAuthReady(true);
      return;
    }

    if (authenticatedUser || isFetchingAuthRef.current) {
      setAuthReady(true);
      return;
    }

    isFetchingAuthRef.current = true;
    let cancelled = false;
    fetch('/api/auth/me')
      .then((response) => (response.ok ? response.json() : { success: false }))
      .then((json) => {
        if (cancelled) return;
        setAuthenticatedUser(json.success ? json.data : null);
        setAuthReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setAuthenticatedUser(null);
          setAuthReady(true);
        }
      })
      .finally(() => {
        isFetchingAuthRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, authenticatedUser]);

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
  const refreshAll = useCallback(async (showLoadingState = false) => {
    if (showLoadingState || !hasLoadedDataRef.current) {
      setIsLoading(true);
    }
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
        reqsRes,
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
        fetch('/api/requests').then((r) => r.json()).catch(() => ({ success: false })),
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
      if (reqsRes && reqsRes.success && reqsRes.data) setApprovalRequests(reqsRes.data);

      hasLoadedDataRef.current = true;
      // Also trigger initial receipt fetch
      fetchReceipts();
    } catch (err) {
      console.error('Data load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchReceipts]);

  useEffect(() => {
    if (!authReady || pathname === '/login') {
      setIsLoading(false);
      return;
    }
    // Only load initial data once on mount / initial auth
    if (!hasLoadedDataRef.current) {
      refreshAll(true);
    }
  }, [authReady, pathname, refreshAll]);

  // Current Actor
  const effectiveRoleId = authenticatedUser && !authenticatedUser.assignedRoleIds.includes(simulatedRoleId)
    ? authenticatedUser.primaryRoleId
    : simulatedRoleId;
  const currentActor = authenticatedUser || users[0] || ROOT_ADMIN_FALLBACK;

  const fetchApprovalRequests = useCallback(async (status?: string, changeType?: string, query?: string) => {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'ALL') params.set('status', status);
      if (changeType && changeType !== 'ALL') params.set('changeType', changeType);
      if (query) params.set('q', query);
      const res = await fetch(`/api/requests?${params.toString()}`);
      const json = await res.json();
      if (json.success) setApprovalRequests(json.data || []);
    } catch (err) {
      console.error('Failed to fetch approval requests:', err);
    }
  }, []);

  const createApprovalRequest = async (data: any): Promise<ApprovalRequest | null> => {
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          data.status === 'Auto-Approved' ? 'Request Auto-Approved' : 'Request Submitted',
          data.status === 'Auto-Approved'
            ? `${data.title} was automatically approved per active threshold policy.`
            : `${data.title} submitted to Approvals Queue for authorization.`,
          data.status === 'Auto-Approved' ? 'success' : 'info'
        );
        refreshAll(false);
        return json.data;
      } else {
        showToast('Submission Failed', json.error || 'Failed to create request', 'error');
        return null;
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Network error', 'error');
      return null;
    }
  };

  const approveRequest = async (id: string, notes?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/requests/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerId: currentActor.id,
          reviewerName: currentActor.name,
          reviewerRoleId: currentActor.primaryRoleId,
          notes: notes || 'Approved by reviewer',
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Request Approved', `Request ${id} approved and changes committed to ledger.`, 'success');
        refreshAll(false);
        return true;
      } else {
        showToast('Approval Error', json.error || 'Failed to approve request', 'error');
        return false;
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to approve request', 'error');
      return false;
    }
  };

  const rejectRequest = async (id: string, notes: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/requests/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerId: currentActor.id,
          reviewerName: currentActor.name,
          reviewerRoleId: currentActor.primaryRoleId,
          notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Request Rejected', `Request ${id} was rejected. Reason: ${notes}`, 'warning');
        refreshAll(false);
        return true;
      } else {
        showToast('Rejection Error', json.error || 'Failed to reject request', 'error');
        return false;
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to reject request', 'error');
      return false;
    }
  };

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
      refreshAll(false);
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
      refreshAll(false);
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
      refreshAll(false);
      return json.data;
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update loan', 'error');
      return null;
    }
  };

  const deleteLoan = async (id: string): Promise<boolean> => {
    try {
      setLoans((prev) => prev.filter((l) => l.id !== id));
      const res = await fetch(`/api/loans?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Loan Removed', `Loan ${id} was deleted.`, 'info');
        refreshAll(false);
        return true;
      }
      refreshAll(false);
      return false;
    } catch {
      refreshAll(false);
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
        if (json.data) {
          setCustomers((prev) => [json.data, ...prev]);
        }
        refreshAll(false);
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    try {
      const res = await fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Customer Updated', `Borrower ${updates.name || id} modified.`, 'success');
        refreshAll(false);
        return json.data;
      }
      refreshAll(false);
      return null;
    } catch {
      refreshAll(false);
      return null;
    }
  };

  const deleteCustomer = async (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Customer Removed', 'Borrower deleted.', 'info');
        refreshAll(false);
        return true;
      }
      refreshAll(false);
      return false;
    } catch {
      refreshAll(false);
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
        if (json.data) {
          setCompanies((prev) => [...prev, json.data]);
        }
        refreshAll(false);
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
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, assignedRoleIds: roleIds, primaryRoleId } : u))
    );
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, assignedRoleIds: roleIds, primaryRoleId }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Roles Updated', `User roles updated successfully.`, 'success');
        refreshAll(false);
        return true;
      }
      showToast('Access update failed', json.error || 'The role assignment could not be saved.', 'error');
      return false;
    } catch {
      showToast('Access update failed', 'The server could not save the role assignment.', 'error');
      return false;
    }
  };

  const updateUserProfile = async (userId: string, data: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...data } : u)));
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
      } else {
        showToast('Profile update failed', json.error || 'The account could not be saved.', 'error');
      }
    } catch {
      showToast('Profile update failed', 'The server could not save the account.', 'error');
    }
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
        if (json.data) {
          setUsers((prev) => [...prev, json.data]);
        }
        refreshAll(false);
        return json.data;
      }
      showToast('User creation failed', json.error || 'The account could not be created.', 'error');
      return null;
    } catch {
      showToast('User creation failed', 'The server could not create the account.', 'error');
      return null;
    }
  };

  const toggleUserStatus = async (userId: string, status: UserStatus, reason?: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status, suspendReason: reason }),
      });
      const json = await res.json();
      if (!json.success) {
        showToast('Status update failed', json.error || 'The account status could not be changed.', 'error');
        return;
      }
      showToast('Status Updated', `User status changed to ${status}.`, 'info');
      await refreshAll();
    } catch {
      showToast('Status update failed', 'The server could not change the account status.', 'error');
    }
  };

  const deleteUser = async (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('User Deleted', 'Account removed.', 'info');
        refreshAll(false);
      } else {
        showToast('Action Blocked', json.error, 'error');
        refreshAll(false);
      }
    } catch {
      showToast('Delete failed', 'The server could not remove this account.', 'error');
    }
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
    const nextVal = !u.twoFactorEnabled;
    setUsers((prev) => prev.map((x) => (x.id === userId ? { ...x, twoFactorEnabled: nextVal } : x)));
    showToast('2FA Setting', `Two-Factor ${nextVal ? 'Enabled' : 'Disabled'}.`, 'success');
    try {
      await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, twoFactorEnabled: nextVal }),
      });
      refreshAll(false);
    } catch {
      refreshAll(false);
    }
  };

  const updatePermissionMatrix = async (newMatrix: PermissionMatrixState) => {
    setPermissionMatrix(newMatrix);
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMatrix),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Permissions Saved', 'Access matrix updated.', 'success');
        refreshAll(false);
      }
    } catch {
      refreshAll(false);
    }
  };

  const updateRole = async (roleId: number, data: Partial<Role>): Promise<boolean> => {
    setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, ...data } : r)));
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roleId, ...data }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Role Configured', 'Role settings updated.', 'success');
        refreshAll(false);
        return true;
      }
      refreshAll(false);
      return false;
    } catch {
      refreshAll(false);
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
        if (json.data) {
          setRoles((prev) => [...prev, json.data]);
        }
        refreshAll(false);
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
        refreshAll(false);
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
        refreshAll(false);
      }
    } catch {}
  };

  const deleteApprovalRule = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/rules?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Rule Removed', 'Approval rule deleted.', 'info');
        refreshAll(false);
      }
    } catch {}
  };

  const updateCompanyProfile = async (profile: CompanyProfile) => {
    setSystemSettings((prev) => ({ ...prev, companyProfile: profile }));
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyProfile: profile }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Company Profile Saved', 'Organization details updated successfully.', 'success');
        refreshAll(false);
      }
    } catch {}
  };

  const updateShareholders = async (shareholders: ShareholderCompany[]): Promise<boolean> => {
    setSystemSettings((prev) => ({ ...prev, shareholders }));
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareholders }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Shareholders Updated', 'Equity distribution saved.', 'success');
        refreshAll(false);
        return true;
      }
      showToast('Validation Error', json.error, 'error');
      refreshAll(false);
      return false;
    } catch {
      refreshAll(false);
      return false;
    }
  };

  const updateSecurityPolicy = async (policy: SecurityPolicy) => {
    setSystemSettings((prev) => ({ ...prev, securityPolicy: policy }));
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ securityPolicy: policy }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Security Policy Updated', 'Governance parameters saved.', 'success');
        refreshAll(false);
      }
    } catch {}
  };

  const updateFeatureToggles = async (toggles: SystemSettingsState['featureToggles']) => {
    setSystemSettings((prev) => ({ ...prev, featureToggles: toggles }));
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureToggles: toggles }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Feature Flags Updated', 'Module toggles saved.', 'success');
        refreshAll(false);
      }
    } catch {}
  };

  const triggerBackupNow = async () => {
    try {
      const res = await fetch('/api/admin/backup', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('Cloud Snapshot Created', `System backup snapshot completed at ${json.timestamp}`, 'success');
        refreshAll(false);
      }
    } catch {}
  };

  const contextValue: AppContextType = React.useMemo(
    () => ({
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
      simulatedRoleId: effectiveRoleId,
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
      approvalRequests,
      dashboardData,
      toasts,
      isLoading,
      isSavingReceipt,

      refreshAll,
      fetchReceipts,
      fetchApprovalRequests,
      showToast,
      removeToast,

      createApprovalRequest,
      approveRequest,
      rejectRequest,

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
    }),
    [
      activeMainTab,
      activeAdminTab,
      selectedUserId,
      selectedCustomerId,
      selectedCompanyId,
      selectedLoanId,
      userDetailsTab,
      effectiveRoleId,
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
      approvalRequests,
      dashboardData,
      toasts,
      isLoading,
      isSavingReceipt,
      refreshAll,
      fetchReceipts,
      fetchApprovalRequests,
      showToast,
      removeToast,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
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
