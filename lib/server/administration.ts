import { getTursoClient } from './turso';
import { initializeSchema } from './schema';
import {
  User,
  Role,
  PermissionMatrixState,
  ApprovalRule,
  AuditLogEntry,
  SystemSettingsState,
  RoleId,
  UserSession,
} from '@/lib/types';
import {
  INITIAL_PERMISSION_MATRIX,
  INITIAL_SYSTEM_SETTINGS,
} from '@/lib/seedData';

let schemaInitialized = false;

async function ensureDbInitialized() {
  if (schemaInitialized) return;
  const client = getTursoClient();
  try {
    await initializeSchema(client);
    schemaInitialized = true;
  } catch (err) {
    console.error('Turso Schema initialization warning:', err);
  }
}

function parseJson<T>(value: any, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function mapUserRow(row: any): User {
  return {
    id: String(row.id),
    name: String(row.name),
    username: row.username ? String(row.username) : undefined,
    email: String(row.email),
    phone: String(row.phone),
    tempPassword: row.temp_password ? String(row.temp_password) : undefined,
    loginMethod: (row.login_method as 'email' | 'username') || 'username',
    avatar: row.avatar ? String(row.avatar) : undefined,
    initials: String(row.initials || 'U'),
    assignedRoleIds: parseJson<RoleId[]>(row.assigned_role_ids, [Number(row.primary_role_id || 0) as RoleId]),
    primaryRoleId: Number(row.primary_role_id || 0) as RoleId,
    status: (row.status as any) || 'Active',
    department: String(row.department || 'Administration'),
    designation: String(row.designation || 'Staff'),
    joinedDate: String(row.joined_date || '2026-01-01'),
    createdAt: String(row.created_at || '2026-01-01 09:00'),
    lastLogin: String(row.last_login || 'Never'),
    address: row.address ? String(row.address) : undefined,
    emergencyContact: row.emergency_contact ? String(row.emergency_contact) : undefined,
    twoFactorEnabled: Boolean(row.two_factor_enabled),
    suspendReason: row.suspend_reason ? String(row.suspend_reason) : undefined,
    sessions: parseJson<UserSession[]>(row.sessions, []),
    isCustomer: Boolean(row.is_customer),
  };
}

export function mapRoleRow(row: any): Role {
  return {
    id: Number(row.id) as RoleId,
    name: String(row.name),
    code: String(row.code),
    description: String(row.description || ''),
    colorName: (row.color_name as any) || 'slate',
    bgClass: String(row.bg_class || ''),
    textClass: String(row.text_class || ''),
    borderClass: String(row.border_class || ''),
    hexColor: String(row.hex_color || '#000000'),
    isSystemProtected: Boolean(row.is_system_protected),
    userCount: Number(row.user_count || 0),
    hierarchyLevel: Number(row.hierarchy_level ?? 6),
  };
}

export function mapApprovalRuleRow(row: any): ApprovalRule {
  return {
    id: String(row.id),
    changeType: row.change_type,
    description: String(row.description || ''),
    whoCanRaise: parseJson<RoleId[]>(row.who_can_raise, []),
    whoMustApprove: Number(row.who_must_approve) as RoleId,
    amountThreshold: Number(row.amount_threshold || 0),
    autoApproveBelow: Boolean(row.auto_approve_below),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapAuditLogRow(row: any): AuditLogEntry {
  return {
    id: String(row.id),
    timestamp: String(row.timestamp),
    actorId: String(row.actor_id),
    actorName: String(row.actor_name),
    actorRoleId: Number(row.actor_role_id || 0) as RoleId,
    action: row.action,
    target: String(row.target),
    beforeVal: row.before_val ? String(row.before_val) : undefined,
    afterVal: row.after_val ? String(row.after_val) : undefined,
    ipAddress: String(row.ip_address || '127.0.0.1'),
    device: String(row.device || 'Server'),
    isSensitive: Boolean(row.is_sensitive),
  };
}

// ==========================================
// Users
// ==========================================
export async function getUsers(filters?: { roleId?: number; status?: string; query?: string }): Promise<User[]> {
  await ensureDbInitialized();
  const client = getTursoClient();

  let sql = 'SELECT * FROM users WHERE 1=1';
  const args: any[] = [];
  if (filters?.status) {
    sql += ' AND status = ?';
    args.push(filters.status);
  }
  if (filters?.query) {
    sql += ' AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR phone LIKE ? OR LOWER(id) LIKE ? OR LOWER(department) LIKE ?)';
    const q = `%${filters.query.toLowerCase()}%`;
    args.push(q, q, q, q, q);
  }
  sql += ' ORDER BY created_at DESC';

  const result = await client.execute({ sql, args });
  let users = result.rows.map(mapUserRow);

  if (filters?.roleId !== undefined) {
    users = users.filter((u) => u.assignedRoleIds.includes(filters.roleId as RoleId));
  }
  return users;
}

export async function getUserById(id: string): Promise<User | null> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const result = await client.execute({
    sql: 'SELECT * FROM users WHERE id = ? COLLATE NOCASE OR LOWER(email) = LOWER(?)',
    args: [id, id],
  });
  if (result.rows.length === 0) return null;
  return mapUserRow(result.rows[0]);
}

export async function createUser(user: Omit<User, 'id' | 'createdAt' | 'lastLogin' | 'sessions'>): Promise<User> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const countRes = await client.execute('SELECT COUNT(*) as count FROM users');
  const totalCount = Number(countRes.rows[0].count);
  const newId = `USR-${1000 + totalCount + 1}`;
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

  const isAdmin = user.assignedRoleIds.includes(0) || user.assignedRoleIds.includes(1);
  const newUser: User = {
    ...user,
    id: newId,
    username: isAdmin ? undefined : (user.username || user.name.toLowerCase().replace(/[^a-z0-9]/g, '.')),
    loginMethod: isAdmin ? 'email' : 'username',
    tempPassword: isAdmin ? undefined : (user.tempPassword || `ASR@${Math.floor(1000 + Math.random() * 9000)}`),
    createdAt: now,
    lastLogin: 'Never',
    sessions: [],
    isCustomer: user.assignedRoleIds.length === 1 && user.assignedRoleIds[0] === 6,
  };

  await client.execute({
    sql: `INSERT INTO users (
      id, name, username, email, phone, temp_password, login_method, avatar, initials,
      assigned_role_ids, primary_role_id, status, department, designation, joined_date,
      created_at, last_login, address, emergency_contact, two_factor_enabled, suspend_reason,
      sessions, is_customer
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      newUser.id,
      newUser.name,
      newUser.username || null,
      newUser.email,
      newUser.phone || null,
      newUser.tempPassword || null,
      newUser.loginMethod || 'username',
      newUser.avatar || null,
      newUser.initials || 'U',
      JSON.stringify(newUser.assignedRoleIds),
      newUser.primaryRoleId,
      newUser.status,
      newUser.department,
      newUser.designation,
      newUser.joinedDate,
      newUser.createdAt,
      newUser.lastLogin,
      newUser.address || '',
      newUser.emergencyContact || '',
      newUser.twoFactorEnabled ? 1 : 0,
      newUser.suspendReason || null,
      JSON.stringify(newUser.sessions),
      newUser.isCustomer ? 1 : 0,
    ],
  });

  return newUser;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const existing = await getUserById(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates };

  await client.execute({
    sql: `UPDATE users SET
      name = ?, username = ?, email = ?, phone = ?, temp_password = ?, login_method = ?,
      avatar = ?, initials = ?, assigned_role_ids = ?, primary_role_id = ?, status = ?,
      department = ?, designation = ?, joined_date = ?, address = ?, emergency_contact = ?,
      two_factor_enabled = ?, suspend_reason = ?, sessions = ?, is_customer = ?
    WHERE id = ?`,
    args: [
      updated.name,
      updated.username || null,
      updated.email,
      updated.phone || null,
      updated.tempPassword || null,
      updated.loginMethod || 'username',
      updated.avatar || null,
      updated.initials || 'U',
      JSON.stringify(updated.assignedRoleIds),
      updated.primaryRoleId,
      updated.status,
      updated.department,
      updated.designation,
      updated.joinedDate,
      updated.address || '',
      updated.emergencyContact || '',
      updated.twoFactorEnabled ? 1 : 0,
      updated.suspendReason || null,
      JSON.stringify(updated.sessions),
      updated.isCustomer ? 1 : 0,
      id,
    ],
  });

  return updated;
}

export async function deleteUser(id: string): Promise<boolean> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const res = await client.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
  return res.rowsAffected > 0;
}

// ==========================================
// Roles
// ==========================================
export async function getRoles(): Promise<Role[]> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const res = await client.execute('SELECT * FROM roles ORDER BY hierarchy_level ASC');
  return res.rows.map(mapRoleRow);
}

export async function createRole(role: Omit<Role, 'id' | 'userCount'>): Promise<Role> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const maxIdRes = await client.execute('SELECT MAX(id) as max_id FROM roles');
  const nextId = (Number(maxIdRes.rows[0].max_id ?? -1) + 1) as RoleId;

  const newRole: Role = { ...role, id: nextId, userCount: 0 };
  await client.execute({
    sql: `INSERT INTO roles (
      id, name, code, description, color_name, bg_class, text_class, border_class,
      hex_color, is_system_protected, user_count, hierarchy_level
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      newRole.id, newRole.name, newRole.code, newRole.description, newRole.colorName,
      newRole.bgClass, newRole.textClass, newRole.borderClass, newRole.hexColor,
      newRole.isSystemProtected ? 1 : 0, 0, newRole.hierarchyLevel,
    ],
  });
  return newRole;
}

export async function updateRole(id: number, updates: Partial<Role>): Promise<Role | null> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const roles = await getRoles();
  const cur = roles.find((r) => r.id === id);
  if (!cur) return null;

  const updated = { ...cur, ...updates };
  await client.execute({
    sql: `UPDATE roles SET
      name = ?, code = ?, description = ?, color_name = ?, bg_class = ?, text_class = ?,
      border_class = ?, hex_color = ?, hierarchy_level = ?
    WHERE id = ?`,
    args: [
      updated.name, updated.code, updated.description, updated.colorName,
      updated.bgClass, updated.textClass, updated.borderClass, updated.hexColor,
      updated.hierarchyLevel, id,
    ],
  });
  return updated;
}

// ==========================================
// Permission Matrix
// ==========================================
export async function getPermissionMatrix(): Promise<PermissionMatrixState> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const res = await client.execute("SELECT data FROM permission_matrix WHERE id = 'current'");
  if (res.rows.length === 0) return INITIAL_PERMISSION_MATRIX;
  return parseJson<PermissionMatrixState>(res.rows[0].data, INITIAL_PERMISSION_MATRIX);
}

export async function updatePermissionMatrix(matrix: PermissionMatrixState): Promise<PermissionMatrixState> {
  await ensureDbInitialized();
  const client = getTursoClient();
  await client.execute({
    sql: 'INSERT OR REPLACE INTO permission_matrix (id, data, updated_at) VALUES (?, ?, ?)',
    args: ['current', JSON.stringify(matrix), new Date().toISOString()],
  });
  return matrix;
}

// ==========================================
// Approval Rules
// ==========================================
export async function getApprovalRules(): Promise<ApprovalRule[]> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const res = await client.execute('SELECT * FROM approval_rules ORDER BY created_at DESC');
  return res.rows.map(mapApprovalRuleRow);
}

export async function createApprovalRule(rule: Omit<ApprovalRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApprovalRule> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const countRes = await client.execute('SELECT COUNT(*) as count FROM approval_rules');
  const nextId = `RULE-${100 + Number(countRes.rows[0].count) + 1}`;
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

  const newRule: ApprovalRule = { ...rule, id: nextId, createdAt: now, updatedAt: now };
  await client.execute({
    sql: `INSERT INTO approval_rules (
      id, change_type, description, who_can_raise, who_must_approve, amount_threshold,
      auto_approve_below, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      newRule.id, newRule.changeType, newRule.description, JSON.stringify(newRule.whoCanRaise),
      newRule.whoMustApprove, newRule.amountThreshold, newRule.autoApproveBelow ? 1 : 0,
      newRule.isActive ? 1 : 0, newRule.createdAt, newRule.updatedAt,
    ],
  });
  return newRule;
}

export async function updateApprovalRule(id: string, updates: Partial<ApprovalRule>): Promise<ApprovalRule | null> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const rules = await getApprovalRules();
  const cur = rules.find((r) => r.id === id);
  if (!cur) return null;

  const updated = { ...cur, ...updates, updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') };
  await client.execute({
    sql: `UPDATE approval_rules SET
      change_type = ?, description = ?, who_can_raise = ?, who_must_approve = ?,
      amount_threshold = ?, auto_approve_below = ?, is_active = ?, updated_at = ?
    WHERE id = ?`,
    args: [
      updated.changeType, updated.description, JSON.stringify(updated.whoCanRaise),
      updated.whoMustApprove, updated.amountThreshold, updated.autoApproveBelow ? 1 : 0,
      updated.isActive ? 1 : 0, updated.updatedAt, id,
    ],
  });
  return updated;
}

export async function deleteApprovalRule(id: string): Promise<boolean> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const res = await client.execute({ sql: 'DELETE FROM approval_rules WHERE id = ?', args: [id] });
  return res.rowsAffected > 0;
}

// ==========================================
// Audit Logs
// ==========================================
export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const res = await client.execute('SELECT * FROM audit_logs ORDER BY timestamp DESC, id DESC LIMIT 500');
  return res.rows.map(mapAuditLogRow);
}

export async function logAudit(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'ipAddress' | 'device'> & {
    ipAddress?: string;
    device?: string;
  }
): Promise<AuditLogEntry> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

  const newLog: AuditLogEntry = {
    id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: now,
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

  await client.execute({
    sql: `INSERT INTO audit_logs (
      id, timestamp, actor_id, actor_name, actor_role_id, action, target,
      before_val, after_val, ip_address, device, is_sensitive
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      newLog.id, newLog.timestamp, newLog.actorId, newLog.actorName, newLog.actorRoleId,
      newLog.action, newLog.target, newLog.beforeVal || null, newLog.afterVal || null,
      newLog.ipAddress, newLog.device, newLog.isSensitive ? 1 : 0,
    ],
  });

  return newLog;
}

// ==========================================
// System Settings
// ==========================================
export async function getSystemSettings(): Promise<SystemSettingsState> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const res = await client.execute("SELECT * FROM system_settings WHERE id = 'global'");
  if (res.rows.length === 0) return INITIAL_SYSTEM_SETTINGS;

  const row = res.rows[0];
  return {
    companyProfile: parseJson(row.company_profile, INITIAL_SYSTEM_SETTINGS.companyProfile),
    shareholders: parseJson(row.shareholders, INITIAL_SYSTEM_SETTINGS.shareholders),
    securityPolicy: parseJson(row.security_policy, INITIAL_SYSTEM_SETTINGS.securityPolicy),
    featureToggles: parseJson(row.feature_toggles, INITIAL_SYSTEM_SETTINGS.featureToggles),
    lastBackupTimestamp: String(row.last_backup_timestamp || INITIAL_SYSTEM_SETTINGS.lastBackupTimestamp),
    backupStatus: (row.backup_status as any) || 'Idle',
  };
}

export async function updateSystemSettings(updates: Partial<SystemSettingsState>): Promise<SystemSettingsState> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const current = await getSystemSettings();
  const updated = {
    ...current,
    ...updates,
    companyProfile: { ...current.companyProfile, ...(updates.companyProfile || {}) },
    securityPolicy: { ...current.securityPolicy, ...(updates.securityPolicy || {}) },
    featureToggles: { ...current.featureToggles, ...(updates.featureToggles || {}) },
    shareholders: updates.shareholders || current.shareholders,
  };

  await client.execute({
    sql: `UPDATE system_settings SET
      company_profile = ?, shareholders = ?, security_policy = ?, feature_toggles = ?,
      last_backup_timestamp = ?, backup_status = ?, updated_at = ?
    WHERE id = 'global'`,
    args: [
      JSON.stringify(updated.companyProfile), JSON.stringify(updated.shareholders),
      JSON.stringify(updated.securityPolicy), JSON.stringify(updated.featureToggles),
      updated.lastBackupTimestamp, updated.backupStatus, new Date().toISOString(),
    ],
  });
  return updated;
}

export async function triggerBackup(): Promise<string> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const ts = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} IST`;
  await client.execute({
    sql: "UPDATE system_settings SET last_backup_timestamp = ?, backup_status = 'Completed' WHERE id = 'global'",
    args: [ts],
  });
  return ts;
}
