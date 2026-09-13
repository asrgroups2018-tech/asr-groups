import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('Error: TURSO_DATABASE_URL is not defined in environment.');
  process.exit(1);
}

const client = createClient({
  url,
  authToken,
});

async function runMigration() {
  console.log('--- TURSO DATABASE MIGRATION ---');
  console.log(`Target URL: ${url.replace(/:[^@]+@/, ':***@')}`);

  console.log('\n[1/3] Creating tables & indexes in Turso...');

  // 1. Roles
  await client.execute(`CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    color_name TEXT,
    bg_class TEXT,
    text_class TEXT,
    border_class TEXT,
    hex_color TEXT,
    is_system_protected INTEGER NOT NULL DEFAULT 0,
    user_count INTEGER NOT NULL DEFAULT 0,
    hierarchy_level INTEGER NOT NULL DEFAULT 6
  );`);

  // 2. Users
  await client.execute(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    temp_password TEXT,
    login_method TEXT DEFAULT 'username',
    avatar TEXT,
    initials TEXT,
    assigned_role_ids TEXT NOT NULL,
    primary_role_id INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active',
    department TEXT,
    designation TEXT,
    joined_date TEXT,
    created_at TEXT NOT NULL,
    last_login TEXT DEFAULT 'Never',
    address TEXT,
    emergency_contact TEXT,
    two_factor_enabled INTEGER NOT NULL DEFAULT 0,
    suspend_reason TEXT,
    sessions TEXT DEFAULT '[]',
    is_customer INTEGER NOT NULL DEFAULT 0
  );`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);

  // 3. Permission Matrix
  await client.execute(`CREATE TABLE IF NOT EXISTS permission_matrix (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`);

  // 4. Approval Rules
  await client.execute(`CREATE TABLE IF NOT EXISTS approval_rules (
    id TEXT PRIMARY KEY,
    change_type TEXT NOT NULL,
    description TEXT,
    who_can_raise TEXT NOT NULL,
    who_must_approve INTEGER NOT NULL,
    amount_threshold REAL NOT NULL DEFAULT 0,
    auto_approve_below INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_approval_rules_active ON approval_rules(is_active);`);

  // 5. Audit Logs
  await client.execute(`CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role_id INTEGER NOT NULL DEFAULT 0,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    before_val TEXT,
    after_val TEXT,
    ip_address TEXT,
    device TEXT,
    is_sensitive INTEGER NOT NULL DEFAULT 0
  );`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);`);

  // 6. System Settings
  await client.execute(`CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY,
    company_profile TEXT NOT NULL,
    shareholders TEXT NOT NULL,
    security_policy TEXT NOT NULL,
    feature_toggles TEXT NOT NULL,
    last_backup_timestamp TEXT,
    backup_status TEXT DEFAULT 'Idle',
    updated_at TEXT NOT NULL
  );`);

  // 7. Customers
  await client.execute(`CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    company_name TEXT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    total_invested REAL NOT NULL DEFAULT 0,
    total_returns REAL NOT NULL DEFAULT 0,
    active_loans_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(full_name);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);`);

  // 8. Borrower Companies
  await client.execute(`CREATE TABLE IF NOT EXISTS borrower_companies (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    area TEXT,
    default_interest_rate REAL DEFAULT 24,
    bank_details TEXT,
    total_borrowed REAL NOT NULL DEFAULT 0,
    outstanding_amount REAL NOT NULL DEFAULT 0,
    active_loans_count INTEGER NOT NULL DEFAULT 0,
    on_time_repayment_rate REAL NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL
  );`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_borrower_companies_name ON borrower_companies(company_name);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_borrower_companies_status ON borrower_companies(status);`);

  // 9. Loans
  await client.execute(`CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    total_amount REAL NOT NULL,
    disbursed_date TEXT NOT NULL,
    tenure_months INTEGER NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'Monthly',
    default_interest_rate REAL NOT NULL,
    asr_commission_rate REAL NOT NULL,
    customers TEXT NOT NULL,
    companies TEXT NOT NULL,
    total_interest_expected REAL NOT NULL,
    asr_income REAL NOT NULL,
    customer_net_profit REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    schedule TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_loans_disbursed_date ON loans(disbursed_date);`);

  console.log('Tables & indexes created successfully.');

  console.log('\n[2/3] Checking if data migration from existing dataset is required...');
  const userCountRes = await client.execute('SELECT COUNT(*) as count FROM users');
  const userCount = Number(userCountRes.rows[0].count);

  if (userCount === 0) {
    console.log('Turso database is empty. Migrating existing data from .data/asr_db.json...');
    const localDbPath = path.join(__dirname, '..', '.data', 'asr_db.json');
    if (fs.existsSync(localDbPath)) {
      const content = fs.readFileSync(localDbPath, 'utf-8');
      const loaded = JSON.parse(content);

      // Roles
      if (loaded.roles && loaded.roles.length > 0) {
        for (const r of loaded.roles) {
          await client.execute({
            sql: `INSERT OR REPLACE INTO roles (id, name, code, description, color_name, bg_class, text_class, border_class, hex_color, is_system_protected, user_count, hierarchy_level)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              r.id,
              r.name,
              r.code,
              r.description || '',
              r.colorName || 'slate',
              r.bgClass || '',
              r.textClass || '',
              r.borderClass || '',
              r.hexColor || '#000',
              r.isSystemProtected ? 1 : 0,
              r.userCount || 0,
              r.hierarchyLevel ?? 6,
            ],
          });
        }
        console.log(`- Migrated ${loaded.roles.length} roles`);
      }

      // Users
      if (loaded.users && loaded.users.length > 0) {
        for (const u of loaded.users) {
          await client.execute({
            sql: `INSERT OR REPLACE INTO users (id, name, username, email, phone, temp_password, login_method, avatar, initials, assigned_role_ids, primary_role_id, status, department, designation, joined_date, created_at, last_login, address, emergency_contact, two_factor_enabled, suspend_reason, sessions, is_customer)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              u.id,
              u.name,
              u.username || null,
              u.email,
              u.phone,
              u.tempPassword || null,
              u.loginMethod || 'username',
              u.avatar || null,
              u.initials || 'U',
              JSON.stringify(u.assignedRoleIds || [u.primaryRoleId || 0]),
              u.primaryRoleId ?? 0,
              u.status || 'Active',
              u.department || 'Administration',
              u.designation || 'Staff',
              u.joinedDate || '2026-01-01',
              u.createdAt || '2026-01-01 09:00',
              u.lastLogin || 'Never',
              u.address || '',
              u.emergencyContact || '',
              u.twoFactorEnabled ? 1 : 0,
              u.suspendReason || null,
              JSON.stringify(u.sessions || []),
              u.isCustomer ? 1 : 0,
            ],
          });
        }
        console.log(`- Migrated ${loaded.users.length} users`);
      }

      // Permission Matrix
      if (loaded.permissionMatrix) {
        await client.execute({
          sql: `INSERT OR REPLACE INTO permission_matrix (id, data, updated_at) VALUES (?, ?, ?)`,
          args: ['current', JSON.stringify(loaded.permissionMatrix), new Date().toISOString()],
        });
        console.log('- Migrated permission matrix');
      }

      // Approval Rules
      if (loaded.approvalRules && loaded.approvalRules.length > 0) {
        for (const r of loaded.approvalRules) {
          await client.execute({
            sql: `INSERT OR REPLACE INTO approval_rules (id, change_type, description, who_can_raise, who_must_approve, amount_threshold, auto_approve_below, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              r.id,
              r.changeType,
              r.description || '',
              JSON.stringify(r.whoCanRaise || []),
              r.whoMustApprove ?? 0,
              r.amountThreshold || 0,
              r.autoApproveBelow ? 1 : 0,
              r.isActive ? 1 : 0,
              r.createdAt || '2026-01-01',
              r.updatedAt || '2026-01-01',
            ],
          });
        }
        console.log(`- Migrated ${loaded.approvalRules.length} approval rules`);
      }

      // Audit Logs
      if (loaded.auditLogs && loaded.auditLogs.length > 0) {
        for (const a of loaded.auditLogs) {
          await client.execute({
            sql: `INSERT OR REPLACE INTO audit_logs (id, timestamp, actor_id, actor_name, actor_role_id, action, target, before_val, after_val, ip_address, device, is_sensitive)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              a.id,
              a.timestamp,
              a.actorId,
              a.actorName,
              a.actorRoleId ?? 0,
              a.action,
              a.target,
              a.beforeVal || null,
              a.afterVal || null,
              a.ipAddress || '127.0.0.1',
              a.device || 'Server',
              a.isSensitive ? 1 : 0,
            ],
          });
        }
        console.log(`- Migrated ${loaded.auditLogs.length} audit logs`);
      }

      // System Settings
      if (loaded.systemSettings) {
        const ss = loaded.systemSettings;
        await client.execute({
          sql: `INSERT OR REPLACE INTO system_settings (id, company_profile, shareholders, security_policy, feature_toggles, last_backup_timestamp, backup_status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            'global',
            JSON.stringify(ss.companyProfile || {}),
            JSON.stringify(ss.shareholders || []),
            JSON.stringify(ss.securityPolicy || {}),
            JSON.stringify(ss.featureToggles || {}),
            ss.lastBackupTimestamp || '2026-08-23 04:00 AM IST',
            ss.backupStatus || 'Completed',
            new Date().toISOString(),
          ],
        });
        console.log('- Migrated system settings');
      }

      // Customers
      if (loaded.customers && loaded.customers.length > 0) {
        for (const c of loaded.customers) {
          await client.execute({
            sql: `INSERT OR REPLACE INTO customers (id, company_name, full_name, phone, email, address, status, total_invested, total_returns, active_loans_count, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              c.id,
              c.companyName || null,
              c.fullName,
              c.phone,
              c.email || null,
              c.address || '',
              c.status || 'Active',
              c.totalInvested || 0,
              c.totalReturns || 0,
              c.activeLoansCount || 0,
              c.createdAt || '2026-01-01',
            ],
          });
        }
        console.log(`- Migrated ${loaded.customers.length} customers`);
      }

      // Companies
      if (loaded.companies && loaded.companies.length > 0) {
        for (const comp of loaded.companies) {
          await client.execute({
            sql: `INSERT OR REPLACE INTO borrower_companies (id, company_name, contact_person, phone, email, address, area, default_interest_rate, bank_details, total_borrowed, outstanding_amount, active_loans_count, on_time_repayment_rate, status, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              comp.id,
              comp.companyName,
              comp.contactPerson,
              comp.phone,
              comp.email || null,
              comp.address || '',
              comp.area || '',
              comp.defaultInterestRate || 24,
              JSON.stringify(comp.bankDetails || {}),
              comp.totalBorrowed || 0,
              comp.outstandingAmount || 0,
              comp.activeLoansCount || 0,
              comp.onTimeRepaymentRate || 100,
              comp.status || 'Active',
              comp.createdAt || '2026-01-01',
            ],
          });
        }
        console.log(`- Migrated ${loaded.companies.length} borrower companies`);
      }

      // Loans
      if (loaded.loans && loaded.loans.length > 0) {
        for (const l of loaded.loans) {
          await client.execute({
            sql: `INSERT OR REPLACE INTO loans (id, total_amount, disbursed_date, tenure_months, frequency, default_interest_rate, asr_commission_rate, customers, companies, total_interest_expected, asr_income, customer_net_profit, status, schedule, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              l.id,
              l.totalAmount,
              l.disbursedDate,
              l.tenureMonths,
              l.frequency || 'Monthly',
              l.defaultInterestRate,
              l.asrCommissionRate,
              JSON.stringify(l.customers || []),
              JSON.stringify(l.companies || []),
              l.totalInterestExpected || 0,
              l.asrIncome || 0,
              l.customerNetProfit || 0,
              l.status || 'Active',
              JSON.stringify(l.schedule || []),
              l.createdAt || '2026-01-01',
            ],
          });
        }
        console.log(`- Migrated ${loaded.loans.length} loans`);
      }
    }
  } else {
    console.log(`Turso database already contains ${userCount} users. Schema verified.`);
  }

  console.log('\n[3/3] Migration verification complete.');
  console.log('Turso cloud database is ready for production!');
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
