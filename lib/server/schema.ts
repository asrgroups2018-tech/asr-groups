import type { Client } from '@libsql/client';

export const SCHEMA_STATEMENTS = [
  // 1. Customers (The Borrowers)
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    place TEXT,
    phone TEXT,
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);`,
  `CREATE INDEX IF NOT EXISTS idx_customers_place ON customers(place);`,

  // 2. Companies (Funding & Deposit Entities)
  `CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_code TEXT NOT NULL UNIQUE,
    is_outside_party INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(short_code);`,
  `CREATE INDEX IF NOT EXISTS idx_companies_outside ON companies(is_outside_party);`,

  // 3. Loans (Client-level Aggregated Loans)
  `CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    code_no TEXT,
    total_amount REAL NOT NULL,
    start_date TEXT,
    installment_count INTEGER NOT NULL DEFAULT 1,
    frequency TEXT NOT NULL DEFAULT 'Monthly',
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_loans_customer ON loans(customer_id);`,
  `CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);`,
  `CREATE INDEX IF NOT EXISTS idx_loans_start_date ON loans(start_date);`,

  // 4. Loan Company Splits (Contribution Ratios)
  `CREATE TABLE IF NOT EXISTS loan_company_splits (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL REFERENCES companies(id),
    split_percent REAL NOT NULL DEFAULT 0,
    split_amount REAL NOT NULL DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS idx_loan_splits_loan ON loan_company_splits(loan_id);`,
  `CREATE INDEX IF NOT EXISTS idx_loan_splits_company ON loan_company_splits(company_id);`,

  // 5. Installments (EMIs)
  `CREATE TABLE IF NOT EXISTS installments (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    seq_no INTEGER NOT NULL,
    due_date TEXT,
    amount_due REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    recd_date TEXT,
    chq_no TEXT,
    place TEXT,
    dep_name TEXT,
    remarks TEXT,
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_installments_loan ON installments(loan_id);`,
  `CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);`,
  `CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date);`,

  // 6. Installment Company Splits (Per-Installment breakdown)
  `CREATE TABLE IF NOT EXISTS installment_company_splits (
    id TEXT PRIMARY KEY,
    installment_id TEXT NOT NULL REFERENCES installments(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL REFERENCES companies(id),
    amount REAL NOT NULL DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS idx_inst_splits_inst ON installment_company_splits(installment_id);`,
  `CREATE INDEX IF NOT EXISTS idx_inst_splits_comp ON installment_company_splits(company_id);`,

  // 7. Roles Table
  `CREATE TABLE IF NOT EXISTS roles (
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
  );`,

  // 8. Users Table
  `CREATE TABLE IF NOT EXISTS users (
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
  );`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
  `CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);`,
  `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`,

  // 9. Permission Matrix
  `CREATE TABLE IF NOT EXISTS permission_matrix (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // 10. Approval Rules
  `CREATE TABLE IF NOT EXISTS approval_rules (
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
  );`,
  `CREATE INDEX IF NOT EXISTS idx_approval_rules_active ON approval_rules(is_active);`,

  // 11. Audit Logs
  `CREATE TABLE IF NOT EXISTS audit_logs (
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
  );`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);`,

  // 12. System Settings
  `CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY,
    company_profile TEXT NOT NULL,
    shareholders TEXT NOT NULL,
    security_policy TEXT NOT NULL,
    feature_toggles TEXT NOT NULL,
    last_backup_timestamp TEXT,
    backup_status TEXT DEFAULT 'Idle',
    updated_at TEXT NOT NULL
  );`,
];

/**
 * Initializes the database schema in Turso libSQL if tables don't exist yet.
 */
export async function initializeSchema(client: Client): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await client.execute(statement);
  }
}
