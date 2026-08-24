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
      memoryDb = JSON.parse(content);
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

    const newUser: User = {
      ...user,
      id: newId,
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

  resetAll: () => {
    const initialDb: DatabaseSchema = {
      users: [BASELINE_ROOT_ADMIN],
      roles: ROLES_DATA.map((r) => ({ ...r, userCount: r.id === 0 ? 1 : 0 })),
      permissionMatrix: INITIAL_PERMISSION_MATRIX,
      approvalRules: [],
      auditLogs: [BASELINE_AUDIT_LOG],
      systemSettings: INITIAL_SYSTEM_SETTINGS,
    };
    saveDb(initialDb);
    return initialDb;
  },
};
