import fs from 'fs';
import path from 'path';
import {
  User,
  Role,
  PermissionMatrixState,
  ApprovalRule,
  AuditLogEntry,
  SystemSettingsState,
  RoleId,
  CustomerInvestor,
  BorrowerCompany,
  IntermediaryLoan,
} from '@/lib/types';
import {
  ROLES_DATA,
  INITIAL_PERMISSION_MATRIX,
  INITIAL_SYSTEM_SETTINGS,
} from '@/lib/seedData';

// Clean baseline: 1 root Admin account + 7 standard system roles
const BASELINE_ROOT_ADMIN: User = {
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
  address: 'No. 42, ASR Towers, Mount Road, Chennai - 600032',
  emergencyContact: '+91 98401 99887',
  twoFactorEnabled: true,
  sessions: [
    {
      id: 'SESS-1',
      device: 'Admin Console (Chrome / Web)',
      browser: 'Chrome 127.0.6533',
      ipAddress: '127.0.0.1',
      location: 'Chennai, TN, IN',
      lastActive: 'Active now',
      isCurrent: true,
    },
  ],
  isCustomer: false,
};

const BASELINE_AUDIT_LOG: AuditLogEntry = {
  id: 'AUD-1001',
  timestamp: '2026-08-23 09:00',
  actorId: 'ADM-1001',
  actorName: 'System Administrator',
  actorRoleId: 0,
  action: 'Created User',
  target: 'Security & Access Controls Configured',
  beforeVal: '-',
  afterVal: 'Primary Administrator Registered (ADM-1001)',
  ipAddress: '127.0.0.1',
  device: 'Server Bootstrap',
  isSensitive: false,
};

interface DatabaseSchema {
  users: User[];
  roles: Role[];
  permissionMatrix: PermissionMatrixState;
  approvalRules: ApprovalRule[];
  auditLogs: AuditLogEntry[];
  systemSettings: SystemSettingsState;
  customers: CustomerInvestor[];
  companies: BorrowerCompany[];
  loans: IntermediaryLoan[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'asr_db.json');

// In-memory cache
let memoryDb: DatabaseSchema | null = null;

function ensureDataFile(): DatabaseSchema {
  if (memoryDb) return memoryDb;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const loaded = JSON.parse(content);
      memoryDb = {
        users: loaded.users || [BASELINE_ROOT_ADMIN],
        roles: loaded.roles || ROLES_DATA,
        permissionMatrix: loaded.permissionMatrix || INITIAL_PERMISSION_MATRIX,
        approvalRules: loaded.approvalRules || [],
        auditLogs: loaded.auditLogs || [BASELINE_AUDIT_LOG],
        customers: loaded.customers || [],
        companies: loaded.companies || [],
        loans: loaded.loans || [],
        systemSettings: {
          ...INITIAL_SYSTEM_SETTINGS,
          ...(loaded.systemSettings || {}),
          companyProfile: {
            ...INITIAL_SYSTEM_SETTINGS.companyProfile,
            ...(loaded.systemSettings?.companyProfile || {}),
          },
          securityPolicy: {
            ...INITIAL_SYSTEM_SETTINGS.securityPolicy,
            ...(loaded.systemSettings?.securityPolicy || {}),
            ipAllowlist: loaded.systemSettings?.securityPolicy?.ipAllowlist || INITIAL_SYSTEM_SETTINGS.securityPolicy.ipAllowlist,
          },
          featureToggles: {
            ...INITIAL_SYSTEM_SETTINGS.featureToggles,
            ...(loaded.systemSettings?.featureToggles || {}),
          },
          shareholders: loaded.systemSettings?.shareholders || INITIAL_SYSTEM_SETTINGS.shareholders,
        },
      };
      return memoryDb!;
    }
  } catch (err) {
    console.warn('File system DB error, using in-memory database:', err);
  }

  // Initialize clean baseline
  const initialDb: DatabaseSchema = {
    users: [BASELINE_ROOT_ADMIN],
    roles: ROLES_DATA.map((r) => ({
      ...r,
      userCount: r.id === 0 ? 1 : 0,
    })),
    permissionMatrix: INITIAL_PERMISSION_MATRIX,
    approvalRules: [],
    auditLogs: [BASELINE_AUDIT_LOG],
    systemSettings: INITIAL_SYSTEM_SETTINGS,
    customers: [],
    companies: [],
    loans: [],
  };

  saveDb(initialDb);
  memoryDb = initialDb;
  return initialDb;
}

function saveDb(data: DatabaseSchema) {
  memoryDb = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write db file:', err);
  }
}

// Public Database Service API
export const db = {
  // Users
  getUsers: (filters?: { roleId?: number; status?: string; query?: string }) => {
    const dbData = ensureDataFile();
    let result = [...dbData.users];

    if (filters?.roleId !== undefined) {
      result = result.filter((u) => u.assignedRoleIds.includes(filters.roleId as RoleId));
    }
    if (filters?.status) {
      result = result.filter((u) => u.status === filters.status);
    }
    if (filters?.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone.includes(q) ||
          u.id.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q)
      );
    }
    return result;
  },

  getUserById: (id: string) => {
    const dbData = ensureDataFile();
    return dbData.users.find((u) => u.id === id) || null;
  },

  createUser: (user: Omit<User, 'id' | 'createdAt' | 'lastLogin' | 'sessions'>) => {
    const dbData = ensureDataFile();
    const newId = `USR-${1000 + dbData.users.length + 1}`;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;

    const isAdmin = user.assignedRoleIds.includes(0) || user.assignedRoleIds.includes(1);
    const defaultUsername = user.username || user.name.toLowerCase().replace(/[^a-z0-9]/g, '.');
    const defaultPassword = user.tempPassword || `ASR@${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser: User = {
      ...user,
      id: newId,
      username: isAdmin ? undefined : defaultUsername,
      loginMethod: isAdmin ? 'email' : 'username',
      tempPassword: isAdmin ? undefined : defaultPassword,
      createdAt: timestamp,
      lastLogin: 'Never',
      sessions: [],
      isCustomer: user.assignedRoleIds.length === 1 && user.assignedRoleIds[0] === 6,
    };

    dbData.users.unshift(newUser);

    // Update role counts
    dbData.roles = dbData.roles.map((r) => ({
      ...r,
      userCount: dbData.users.filter((u) => u.assignedRoleIds.includes(r.id)).length,
    }));

    // Auto-record audit log
    db.logAudit({
      actorId: 'ADM-1001',
      actorName: 'System Administrator',
      actorRoleId: 0,
      action: 'Created User',
      target: `${newUser.name} (${newUser.id})`,
      beforeVal: '-',
      afterVal: `Roles: [${newUser.assignedRoleIds.map((r) => `Role ${r}`).join(', ')}]`,
      isSensitive: newUser.assignedRoleIds.includes(0) || newUser.assignedRoleIds.includes(1),
    });

    saveDb(dbData);
    return newUser;
  },

  updateUser: (id: string, updates: Partial<User>) => {
    const dbData = ensureDataFile();
    const index = dbData.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    const existing = dbData.users[index];
    const beforeRoles = existing.assignedRoleIds.join(', ');

    const updated: User = {
      ...existing,
      ...updates,
    };

    dbData.users[index] = updated;

    // Update role counts
    dbData.roles = dbData.roles.map((r) => ({
      ...r,
      userCount: dbData.users.filter((u) => u.assignedRoleIds.includes(r.id)).length,
    }));

    if (updates.assignedRoleIds) {
      db.logAudit({
        actorId: 'ADM-1001',
        actorName: 'System Administrator',
        actorRoleId: 0,
        action: 'Assigned Role',
        target: `${updated.name} (${updated.id})`,
        beforeVal: `Roles: [${beforeRoles}]`,
        afterVal: `Roles: [${updated.assignedRoleIds.join(', ')}]`,
        isSensitive:
          updated.assignedRoleIds.includes(0) || updated.assignedRoleIds.includes(1),
      });
    }

    saveDb(dbData);
    return updated;
  },

  deleteUser: (id: string) => {
    const dbData = ensureDataFile();
    const target = dbData.users.find((u) => u.id === id);
    if (!target) return false;

    dbData.users = dbData.users.filter((u) => u.id !== id);

    // Update role counts
    dbData.roles = dbData.roles.map((r) => ({
      ...r,
      userCount: dbData.users.filter((u) => u.assignedRoleIds.includes(r.id)).length,
    }));

    db.logAudit({
      actorId: 'ADM-1001',
      actorName: 'System Administrator',
      actorRoleId: 0,
      action: 'Deleted User',
      target: `${target.name} (${target.id})`,
      beforeVal: `Account: ${target.email}`,
      afterVal: 'Permanently Removed',
      isSensitive: true,
    });

    saveDb(dbData);
    return true;
  },

  // Roles
  getRoles: () => {
    const dbData = ensureDataFile();
    return dbData.roles;
  },

  createRole: (role: Omit<Role, 'id' | 'userCount'>) => {
    const dbData = ensureDataFile();
    const nextId = dbData.roles.length as RoleId;
    const newRole: Role = {
      ...role,
      id: nextId,
      userCount: 0,
    };
    dbData.roles.push(newRole);

    db.logAudit({
      actorId: 'ADM-1001',
      actorName: 'System Administrator',
      actorRoleId: 0,
      action: 'Updated Settings',
      target: `Custom Role: ${newRole.name}`,
      beforeVal: '-',
      afterVal: `Role Code: ${newRole.code}`,
      isSensitive: true,
    });

    saveDb(dbData);
    return newRole;
  },

  updateRole: (id: number, updates: Partial<Role>) => {
    const dbData = ensureDataFile();
    const index = dbData.roles.findIndex((r) => r.id === id);
    if (index === -1) return null;

    dbData.roles[index] = {
      ...dbData.roles[index],
      ...updates,
    };

    db.logAudit({
      actorId: 'ADM-1001',
      actorName: 'System Administrator',
      actorRoleId: 0,
      action: 'Updated Settings',
      target: `Role Config: ${dbData.roles[index].name} (${id})`,
      beforeVal: 'Active Role',
      afterVal: `Updated: ${updates.name || updates.description || 'Config'}`,
      isSensitive: true,
    });

    saveDb(dbData);
    return dbData.roles[index];
  },

  // Permissions Matrix
  getPermissionMatrix: () => {
    const dbData = ensureDataFile();
    return dbData.permissionMatrix;
  },

  updatePermissionMatrix: (matrix: PermissionMatrixState) => {
    const dbData = ensureDataFile();
    dbData.permissionMatrix = matrix;

    db.logAudit({
      actorId: 'ADM-1001',
      actorName: 'System Administrator',
      actorRoleId: 0,
      action: 'Edited Permission',
      target: 'System Permission Matrix',
      beforeVal: 'Active Matrix',
      afterVal: 'Updated Matrix Commits',
      isSensitive: true,
    });

    saveDb(dbData);
    return dbData.permissionMatrix;
  },

  // Approval Rules
  getApprovalRules: () => {
    const dbData = ensureDataFile();
    return dbData.approvalRules;
  },

  createApprovalRule: (rule: Omit<ApprovalRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    const dbData = ensureDataFile();
    const nextId = `RULE-${100 + dbData.approvalRules.length + 1}`;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;

    const newRule: ApprovalRule = {
      ...rule,
      id: nextId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    dbData.approvalRules.unshift(newRule);

    db.logAudit({
      actorId: 'ADM-1001',
      actorName: 'System Administrator',
      actorRoleId: 0,
      action: 'Updated Approval Rule',
      target: `${newRule.changeType} (${newRule.id})`,
      beforeVal: '-',
      afterVal: `Approver: Role ${newRule.whoMustApprove}, Limit: ₹${newRule.amountThreshold}`,
      isSensitive: true,
    });

    saveDb(dbData);
    return newRule;
  },

  updateApprovalRule: (id: string, updates: Partial<ApprovalRule>) => {
    const dbData = ensureDataFile();
    const index = dbData.approvalRules.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;

    dbData.approvalRules[index] = {
      ...dbData.approvalRules[index],
      ...updates,
      updatedAt: timestamp,
    };

    saveDb(dbData);
    return dbData.approvalRules[index];
  },

  deleteApprovalRule: (id: string) => {
    const dbData = ensureDataFile();
    dbData.approvalRules = dbData.approvalRules.filter((r) => r.id !== id);

    db.logAudit({
      actorId: 'ADM-1001',
      actorName: 'System Administrator',
      actorRoleId: 0,
      action: 'Updated Approval Rule',
      target: `Deleted Rule: ${id}`,
      beforeVal: 'Active Rule',
      afterVal: 'Removed',
      isSensitive: true,
    });

    saveDb(dbData);
    return true;
  },

  // Audit Logs
  getAuditLogs: () => {
    const dbData = ensureDataFile();
    return dbData.auditLogs;
  },

  logAudit: (
    entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'ipAddress' | 'device'> & {
      ipAddress?: string;
      device?: string;
    }
  ) => {
    const dbData = ensureDataFile();
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;

    const newLog: AuditLogEntry = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp,
      actorId: entry.actorId || 'ADM-1001',
      actorName: entry.actorName || 'System Administrator',
      actorRoleId: entry.actorRoleId ?? 0,
      action: entry.action,
      target: entry.target,
      beforeVal: entry.beforeVal,
      afterVal: entry.afterVal,
      ipAddress: entry.ipAddress || '127.0.0.1',
      device: entry.device || 'Admin Web Console',
      isSensitive: !!entry.isSensitive,
    };

    dbData.auditLogs.unshift(newLog);
    saveDb(dbData);
    return newLog;
  },

  // System Settings
  getSystemSettings: () => {
    const dbData = ensureDataFile();
    return dbData.systemSettings;
  },

  updateSystemSettings: (updates: Partial<SystemSettingsState>) => {
    const dbData = ensureDataFile();
    dbData.systemSettings = {
      ...dbData.systemSettings,
      ...updates,
    };

    db.logAudit({
      actorId: 'ADM-1001',
      actorName: 'System Administrator',
      actorRoleId: 0,
      action: 'Updated Settings',
      target: 'System Settings Parameters',
      beforeVal: 'Previous Config',
      afterVal: `Fields updated: ${Object.keys(updates).join(', ')}`,
      isSensitive: true,
    });

    saveDb(dbData);
    return dbData.systemSettings;
  },

  triggerBackup: () => {
    const dbData = ensureDataFile();
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())} IST`;

    dbData.systemSettings.lastBackupTimestamp = ts;
    dbData.systemSettings.backupStatus = 'Completed';

    db.logAudit({
      actorId: 'ADM-1001',
      actorName: 'System Administrator',
      actorRoleId: 0,
      action: 'Triggered Backup',
      target: 'Cloud Database Snapshot (DB-PROD-ASR)',
      beforeVal: 'Manual Trigger',
      afterVal: `Snapshot Success at ${ts}`,
      isSensitive: false,
    });

    saveDb(dbData);
    return ts;
  },

  // ==========================================
  // Customers (Investors / Financiers)
  // ==========================================
  getCustomers: (query?: string) => {
    const dbData = ensureDataFile();
    let res = dbData.customers || [];
    if (query) {
      const q = query.toLowerCase();
      res = res.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          (c.companyName && c.companyName.toLowerCase().includes(q)) ||
          c.phone.includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }
    return res;
  },

  getCustomerById: (id: string) => {
    const dbData = ensureDataFile();
    return (dbData.customers || []).find((c) => c.id === id) || null;
  },

  createCustomer: (data: Partial<CustomerInvestor> & { fullName: string; phone: string; email?: string }) => {
    const dbData = ensureDataFile();
    if (!dbData.customers) dbData.customers = [];

    const newId = `CUST-${100 + dbData.customers.length + 1}`;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const newCustomer: CustomerInvestor = {
      id: newId,
      fullName: data.fullName.trim(),
      companyName: data.companyName ? data.companyName.trim() : undefined,
      phone: data.phone.trim(),
      email: data.email ? data.email.trim() : `${data.fullName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@investor.in`,
      address: data.address || 'Chennai, Tamil Nadu',
      status: data.status || 'Active',
      totalInvested: data.totalInvested || 0,
      totalReturns: data.totalReturns || 0,
      activeLoansCount: data.activeLoansCount || 0,
      createdAt: ts,
    };

    dbData.customers.unshift(newCustomer);

    db.logAudit({
      actorId: 'ADM-1001',
      actorName: 'System Administrator',
      actorRoleId: 0,
      action: 'Created User',
      target: `Customer / Investor: ${newCustomer.fullName} (${newCustomer.id})`,
      beforeVal: '-',
      afterVal: `Investor Registered (${newCustomer.phone})`,
      isSensitive: false,
    });

    saveDb(dbData);
    return newCustomer;
  },

  updateCustomer: (id: string, updates: Partial<CustomerInvestor>) => {
    const dbData = ensureDataFile();
    if (!dbData.customers) dbData.customers = [];

    const index = dbData.customers.findIndex((c) => c.id === id);
    if (index === -1) return null;

    dbData.customers[index] = {
      ...dbData.customers[index],
      ...updates,
    };

    saveDb(dbData);
    return dbData.customers[index];
  },

  deleteCustomer: (id: string) => {
    const dbData = ensureDataFile();
    if (!dbData.customers) return false;
    dbData.customers = dbData.customers.filter((c) => c.id !== id);
    saveDb(dbData);
    return true;
  },

  // ==========================================
  // Companies (Borrowers)
  // ==========================================
  getCompanies: (query?: string) => {
    const dbData = ensureDataFile();
    let res = dbData.companies || [];
    if (query) {
      const q = query.toLowerCase();
      res = res.filter(
        (c) =>
          c.companyName.toLowerCase().includes(q) ||
          c.contactPerson.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.area.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }
    return res;
  },

  getCompanyById: (id: string) => {
    const dbData = ensureDataFile();
    return (dbData.companies || []).find((c) => c.id === id) || null;
  },

  createCompany: (data: Partial<BorrowerCompany> & { companyName: string; contactPerson: string; phone: string }) => {
    const dbData = ensureDataFile();
    if (!dbData.companies) dbData.companies = [];

    const newId = `COMP-${100 + dbData.companies.length + 1}`;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const newCompany: BorrowerCompany = {
      id: newId,
      companyName: data.companyName.trim(),
      contactPerson: data.contactPerson.trim(),
      phone: data.phone.trim(),
      email: data.email ? data.email.trim() : `${data.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}@borrower.in`,
      address: data.address || 'Chennai, Tamil Nadu',
      area: data.area || 'Chennai Industrial Area',
      defaultInterestRate: data.defaultInterestRate ?? 24,
      bankDetails: data.bankDetails || {
        bankName: 'HDFC Bank',
        accountNumber: '502000' + Math.floor(100000 + Math.random() * 900000),
        ifsc: 'HDFC0001234',
      },
      totalBorrowed: data.totalBorrowed || 0,
      outstandingAmount: data.outstandingAmount || 0,
      activeLoansCount: data.activeLoansCount || 0,
      onTimeRepaymentRate: data.onTimeRepaymentRate ?? 100,
      status: data.status || 'Active',
      createdAt: ts,
    };

    dbData.companies.unshift(newCompany);

    db.logAudit({
      actorId: 'ADM-1001',
      actorName: 'System Administrator',
      actorRoleId: 0,
      action: 'Created User',
      target: `Borrower Company: ${newCompany.companyName} (${newCompany.id})`,
      beforeVal: '-',
      afterVal: `Default Rate: ${newCompany.defaultInterestRate}%`,
      isSensitive: false,
    });

    saveDb(dbData);
    return newCompany;
  },

  updateCompany: (id: string, updates: Partial<BorrowerCompany>) => {
    const dbData = ensureDataFile();
    if (!dbData.companies) dbData.companies = [];

    const index = dbData.companies.findIndex((c) => c.id === id);
    if (index === -1) return null;

    dbData.companies[index] = {
      ...dbData.companies[index],
      ...updates,
    };

    saveDb(dbData);
    return dbData.companies[index];
  },

  deleteCompany: (id: string) => {
    const dbData = ensureDataFile();
    if (!dbData.companies) return false;
    dbData.companies = dbData.companies.filter((c) => c.id !== id);
    saveDb(dbData);
    return true;
  },

  // ==========================================
  // Loans (Intermediary Multi-Party Syndication)
  // ==========================================
  getLoans: (query?: string) => {
    const dbData = ensureDataFile();
    let res = dbData.loans || [];
    if (query) {
      const q = query.toLowerCase();
      res = res.filter(
        (l) =>
          l.id.toLowerCase().includes(q) ||
          l.customers.some((c) => c.customerName.toLowerCase().includes(q)) ||
          l.companies.some((c) => c.companyName.toLowerCase().includes(q)) ||
          l.status.toLowerCase().includes(q)
      );
    }
    return res;
  },

  getLoanById: (id: string) => {
    const dbData = ensureDataFile();
    return (dbData.loans || []).find((l) => l.id === id) || null;
  },

  createLoan: (loanData: Omit<IntermediaryLoan, 'id' | 'createdAt'>) => {
    const dbData = ensureDataFile();
    if (!dbData.loans) dbData.loans = [];
    if (!dbData.customers) dbData.customers = [];
    if (!dbData.companies) dbData.companies = [];

    const newId = `LOAN-2026-${String(dbData.loans.length + 1).padStart(3, '0')}`;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const newLoan: IntermediaryLoan = {
      ...loanData,
      id: newId,
      createdAt: ts,
    };

    dbData.loans.unshift(newLoan);

    // Update participating Customers stats
    newLoan.customers.forEach((custShare) => {
      const custIndex = dbData.customers.findIndex((c) => c.id === custShare.customerId);
      if (custIndex !== -1) {
        dbData.customers[custIndex].totalInvested =
          (dbData.customers[custIndex].totalInvested || 0) + (custShare.shareAmount || 0);
        dbData.customers[custIndex].activeLoansCount =
          (dbData.customers[custIndex].activeLoansCount || 0) + 1;
      }
    });

    // Update participating Borrower Companies stats
    newLoan.companies.forEach((compSplit) => {
      const compIndex = dbData.companies.findIndex((c) => c.id === compSplit.companyId);
      if (compIndex !== -1) {
        const principal = compSplit.amount || 0;
        const rate = compSplit.interestRate || newLoan.defaultInterestRate || 24;
        const tenure = newLoan.tenureMonths || 12;
        const interest = principal * (rate / 100) * (tenure / 12);

        dbData.companies[compIndex].totalBorrowed =
          (dbData.companies[compIndex].totalBorrowed || 0) + principal;
        dbData.companies[compIndex].outstandingAmount =
          (dbData.companies[compIndex].outstandingAmount || 0) + principal + interest;
        dbData.companies[compIndex].activeLoansCount =
          (dbData.companies[compIndex].activeLoansCount || 0) + 1;
      }
    });

    db.logAudit({
      actorId: 'ADM-1001',
      actorName: 'System Administrator',
      actorRoleId: 0,
      action: 'Created User',
      target: `New Loan Syndication (${newLoan.id})`,
      beforeVal: '-',
      afterVal: `Amount: ₹${newLoan.totalAmount.toLocaleString('en-IN')}, Borrowers: ${newLoan.companies.length}`,
      isSensitive: true,
    });

    saveDb(dbData);
    return newLoan;
  },

  updateLoan: (id: string, updates: Partial<IntermediaryLoan>) => {
    const dbData = ensureDataFile();
    if (!dbData.loans) dbData.loans = [];

    const index = dbData.loans.findIndex((l) => l.id === id);
    if (index === -1) return null;

    dbData.loans[index] = {
      ...dbData.loans[index],
      ...updates,
    };

    saveDb(dbData);
    return dbData.loans[index];
  },

  updateLoanInstallmentStatus: (loanId: string, sNo: number, status: 'Paid' | 'Pending' | 'Overdue') => {
    const dbData = ensureDataFile();
    if (!dbData.loans) return null;

    const loan = dbData.loans.find((l) => l.id === loanId);
    if (!loan) return null;

    const installment = loan.schedule.find((s) => s.sNo === sNo);
    if (!installment) return null;

    installment.status = status;
    if (status === 'Paid') {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      installment.paidDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      // Update customer returns proportional
      const profitPortion = (loan.customerNetProfit / loan.schedule.length);
      loan.customers.forEach((custShare) => {
        const custIndex = dbData.customers.findIndex((c) => c.id === custShare.customerId);
        if (custIndex !== -1) {
          dbData.customers[custIndex].totalReturns += Math.round(profitPortion * (custShare.sharePercentage / 100));
        }
      });
    }

    saveDb(dbData);
    return loan;
  },

  updateLoanInstallmentDate: (
    loanId: string,
    sNo: number,
    newDate: string,
    newDueDate?: string,
    reason?: string
  ) => {
    const dbData = ensureDataFile();
    if (!dbData.loans) return null;

    const loan = dbData.loans.find((l) => l.id === loanId);
    if (!loan) return null;

    const installment = loan.schedule.find((s) => s.sNo === sNo);
    if (!installment) return null;

    const oldDate = installment.date;
    installment.date = newDate;
    if (newDueDate) installment.dueDate = newDueDate;
    if (reason) installment.rescheduledReason = reason;
    if (installment.status !== 'Paid') {
      installment.status = 'Rescheduled';
    }

    db.logAudit({
      actorId: 'ADM-1001',
      actorName: 'System Administrator',
      actorRoleId: 0,
      action: 'Updated Settings',
      target: `Rescheduled Cycle #${sNo} for ${loan.id}`,
      beforeVal: `Date: ${oldDate}`,
      afterVal: `New Date: ${newDate}${reason ? ` (Reason: ${reason})` : ''}`,
      isSensitive: false,
    });

    saveDb(dbData);
    return loan;
  },

  deleteLoan: (id: string) => {
    const dbData = ensureDataFile();
    if (!dbData.loans) return false;
    dbData.loans = dbData.loans.filter((l) => l.id !== id);
    saveDb(dbData);
    return true;
  },

  resetAll: () => {
    const initialDb: DatabaseSchema = {
      users: [BASELINE_ROOT_ADMIN],
      roles: ROLES_DATA.map((r) => ({ ...r, userCount: r.id === 0 ? 1 : 0 })),
      permissionMatrix: INITIAL_PERMISSION_MATRIX,
      approvalRules: [],
      auditLogs: [BASELINE_AUDIT_LOG],
      systemSettings: INITIAL_SYSTEM_SETTINGS,
      customers: [],
      companies: [],
      loans: [],
    };
    saveDb(initialDb);
    return initialDb;
  },
};
