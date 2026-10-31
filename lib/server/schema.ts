import type { Client } from '@libsql/client';

export const SCHEMA_STATEMENTS = [
  // 1. Customers (The Borrowers)
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    place TEXT,
    code_no TEXT,
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);`,
  `CREATE INDEX IF NOT EXISTS idx_customers_place ON customers(place);`,
  `CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);`,

  `CREATE TABLE IF NOT EXISTS access_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    user_name TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    module_id TEXT NOT NULL,
    action TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    reviewer_id TEXT,
    reviewer_name TEXT,
    reviewer_notes TEXT,
    request_payload TEXT,
    created_at TEXT NOT NULL,
    resolved_at TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);`,
  `CREATE INDEX IF NOT EXISTS idx_access_requests_user ON access_requests(user_id);`,

  // 2. Companies (Funding & Deposit Entities)
  `CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_code TEXT NOT NULL UNIQUE,
    is_outside_party INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    opening_balance REAL NOT NULL DEFAULT 0,
    opening_balance_type TEXT NOT NULL DEFAULT 'DEBIT',
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
    disbursed_amount REAL,
    interest_amount REAL,
    opening_balance REAL NOT NULL DEFAULT 0,
    opening_balance_type TEXT NOT NULL DEFAULT 'DEBIT',
    start_date TEXT,
    installment_count INTEGER NOT NULL DEFAULT 1,
    frequency TEXT NOT NULL DEFAULT 'Monthly',
    status TEXT NOT NULL DEFAULT 'Pending',
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
    status TEXT NOT NULL DEFAULT 'Pending',
    recd_date TEXT,
    chq_no TEXT,
    place TEXT,
    dep_name TEXT,
    bank TEXT,
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
    is_customer INTEGER NOT NULL DEFAULT 0,
    customer_id TEXT REFERENCES customers(id)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
  `CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);`,
  `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`,

  // 9. Auth Sessions
  `CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);`,

  // 10. Permission Matrix
  `CREATE TABLE IF NOT EXISTS permission_matrix (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // 11. Approval Rules
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

  // 12. Audit Logs
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role_id INTEGER NOT NULL DEFAULT 0,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    page_id TEXT,
    page_name TEXT,
    entity_type TEXT,
    entity_id TEXT,
    related_user_id TEXT,
    request_id TEXT,
    before_val TEXT,
    after_val TEXT,
    ip_address TEXT,
    device TEXT,
    is_sensitive INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);`,

  // 13. System Settings
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

  // 14. Approval Requests
  `CREATE TABLE IF NOT EXISTS approval_requests (
    id TEXT PRIMARY KEY,
    rule_id TEXT,
    change_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    requester_id TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    requester_email TEXT,
    requester_role_id INTEGER NOT NULL DEFAULT 2,
    approver_role_id INTEGER NOT NULL DEFAULT 1,
    amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending',
    before_payload TEXT,
    proposed_payload TEXT NOT NULL DEFAULT '{}',
    reviewer_id TEXT,
    reviewer_name TEXT,
    reviewer_notes TEXT,
    created_at TEXT NOT NULL,
    resolved_at TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_approval_reqs_status ON approval_requests(status);`,
  `CREATE INDEX IF NOT EXISTS idx_approval_reqs_change ON approval_requests(change_type);`,
  `CREATE INDEX IF NOT EXISTS idx_approval_reqs_entity ON approval_requests(entity_id);`,

  // 15. Cheques (Standalone Cheque Deposits)
  `CREATE TABLE IF NOT EXISTS cheques (
    id TEXT PRIMARY KEY,
    cheque_number TEXT NOT NULL,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    deposit_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    deposited_at TEXT,
    created_by_id TEXT,
    created_by_name TEXT,
    created_by_email TEXT,
    deposited_by_id TEXT,
    deposited_by_name TEXT,
    deposited_by_email TEXT,
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_cheques_status ON cheques(status);`,
  `CREATE INDEX IF NOT EXISTS idx_cheques_deposit_date ON cheques(deposit_date);`,
  `CREATE INDEX IF NOT EXISTS idx_cheques_customer_name ON cheques(customer_name);`,

  // 16. Standalone generated receipts
  `CREATE TABLE IF NOT EXISTS manual_receipts (
    id TEXT PRIMARY KEY,
    receipt_number TEXT NOT NULL UNIQUE,
    account_number TEXT NOT NULL DEFAULT '',
    transaction_date TEXT NOT NULL,
    transaction_amount REAL NOT NULL DEFAULT 0,
    debit_credit TEXT NOT NULL DEFAULT 'CREDIT',
    payment_mode TEXT NOT NULL,
    cheque_number TEXT NOT NULL DEFAULT '',
    transaction_description TEXT NOT NULL DEFAULT '',
    transaction_id TEXT NOT NULL DEFAULT '',
    remarks TEXT NOT NULL DEFAULT '',
    created_by_id TEXT,
    created_by_name TEXT,
    created_by_email TEXT,
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_manual_receipts_date ON manual_receipts(transaction_date);`,
  `CREATE INDEX IF NOT EXISTS idx_manual_receipts_mode ON manual_receipts(payment_mode);`,

  // 17. Editable Tally-style balance sheet
  `CREATE TABLE IF NOT EXISTS balance_sheet_documents (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    title TEXT NOT NULL,
    as_of_date TEXT NOT NULL,
    entries TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT
  );`,
];

const AUTH_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);`,
];

let schemaInitialization: Promise<void> | null = null;
let authSchemaInitialization: Promise<void> | null = null;

/**
 * The login path only needs the session table. Keeping this separate from the
 * full application migration prevents a cold Vercel function from running
 * every application DDL statement before it can return a session.
 */
export function initializeAuthSchema(client: Client): Promise<void> {
  if (!authSchemaInitialization) {
    authSchemaInitialization = client.batch(AUTH_SCHEMA_STATEMENTS)
      .then(() => undefined)
      .catch((error) => {
        authSchemaInitialization = null;
        throw error;
      });
  }
  return authSchemaInitialization;
}

/**
 * Initializes the database schema once per server process. A shared promise
 * prevents concurrent API requests from repeating the same remote DDL calls.
 */
export function initializeSchema(client: Client): Promise<void> {
  if (!schemaInitialization) {
    schemaInitialization = (async () => {
      // Run table column migrations for existing databases
      try {
        await client.execute('ALTER TABLE customers ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
      } catch {
        // Column may already exist
      }
      try {
        await client.execute('ALTER TABLE companies ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
      } catch {
        // Column may already exist
      }
      try {
        await client.execute('ALTER TABLE companies ADD COLUMN opening_balance REAL NOT NULL DEFAULT 0');
      } catch {
        // Column may already exist
      }
      try {
        await client.execute("ALTER TABLE companies ADD COLUMN opening_balance_type TEXT NOT NULL DEFAULT 'DEBIT'");
      } catch {
        // Column may already exist
      }
      try {
        await client.execute('ALTER TABLE loans ADD COLUMN disbursed_amount REAL');
      } catch {
        // Column may already exist
      }
      try {
        await client.execute('ALTER TABLE loans ADD COLUMN interest_amount REAL');
      } catch {
        // Column may already exist
      }
      try {
        await client.execute('ALTER TABLE loans ADD COLUMN opening_balance REAL NOT NULL DEFAULT 0');
      } catch {
        // Column may already exist
      }
      try {
        await client.execute("ALTER TABLE loans ADD COLUMN opening_balance_type TEXT NOT NULL DEFAULT 'DEBIT'");
      } catch {
        // Column may already exist
      }

      await client.batch(SCHEMA_STATEMENTS);

      // Add columns introduced after the original schema was deployed.
      // Each statement is intentionally idempotent for existing Turso/SQLite databases.
      for (const statement of [
        'ALTER TABLE approval_requests ADD COLUMN requester_email TEXT',
        'ALTER TABLE access_requests ADD COLUMN request_payload TEXT',
        'ALTER TABLE audit_logs ADD COLUMN page_id TEXT',
        'ALTER TABLE audit_logs ADD COLUMN page_name TEXT',
        'ALTER TABLE audit_logs ADD COLUMN entity_type TEXT',
        'ALTER TABLE audit_logs ADD COLUMN entity_id TEXT',
        'ALTER TABLE audit_logs ADD COLUMN related_user_id TEXT',
        'ALTER TABLE audit_logs ADD COLUMN request_id TEXT',
        'ALTER TABLE cheques ADD COLUMN created_by_id TEXT',
        'ALTER TABLE cheques ADD COLUMN created_by_name TEXT',
        'ALTER TABLE cheques ADD COLUMN created_by_email TEXT',
        'ALTER TABLE cheques ADD COLUMN deposited_by_id TEXT',
        'ALTER TABLE cheques ADD COLUMN deposited_by_name TEXT',
        'ALTER TABLE cheques ADD COLUMN deposited_by_email TEXT',
      ]) {
        try {
          await client.execute(statement);
        } catch {
          // The column already exists.
        }
      }

      // Create these only after the idempotent column migrations above. This
      // keeps upgrades safe for databases created before structured audit
      // context was introduced.
      await client.execute('CREATE INDEX IF NOT EXISTS idx_audit_logs_related_user ON audit_logs(related_user_id)');
      await client.execute('CREATE INDEX IF NOT EXISTS idx_audit_logs_request ON audit_logs(request_id)');

      // Preserve actor information for cheque rows created before the actor
      // columns existed by linking the existing audit trail back to the row.
      try {
        await client.execute(`
          UPDATE cheques
          SET
            created_by_id = COALESCE(created_by_id, (
              SELECT actor_id FROM audit_logs
              WHERE action = 'Logged Cheque'
                AND LOWER(target) = LOWER('Cheque ' || cheques.cheque_number || ' (' || cheques.customer_name || ')')
              ORDER BY timestamp ASC LIMIT 1
            )),
            created_by_name = COALESCE(created_by_name, (
              SELECT actor_name FROM audit_logs
              WHERE action = 'Logged Cheque'
                AND LOWER(target) = LOWER('Cheque ' || cheques.cheque_number || ' (' || cheques.customer_name || ')')
              ORDER BY timestamp ASC LIMIT 1
            )),
            deposited_by_id = COALESCE(deposited_by_id, (
              SELECT actor_id FROM audit_logs
              WHERE action = 'Deposited Cheque'
                AND LOWER(target) = LOWER('Cheque ' || cheques.cheque_number || ' (' || cheques.customer_name || ')')
              ORDER BY timestamp ASC LIMIT 1
            )),
            deposited_by_name = COALESCE(deposited_by_name, (
              SELECT actor_name FROM audit_logs
              WHERE action = 'Deposited Cheque'
                AND LOWER(target) = LOWER('Cheque ' || cheques.cheque_number || ' (' || cheques.customer_name || ')')
              ORDER BY timestamp ASC LIMIT 1
            ))
          WHERE created_by_id IS NULL OR deposited_by_id IS NULL
        `);
        await client.execute(`
          UPDATE cheques
          SET
            created_by_email = COALESCE(created_by_email, (SELECT email FROM users WHERE users.id = cheques.created_by_id LIMIT 1)),
            deposited_by_email = COALESCE(deposited_by_email, (SELECT email FROM users WHERE users.id = cheques.deposited_by_id LIMIT 1))
          WHERE created_by_email IS NULL OR deposited_by_email IS NULL
        `);
      } catch {
        // Actor backfill is best effort; new writes always store the actor.
      }
    })().catch((error) => {
      schemaInitialization = null;
      throw error;
    });
  }
  return schemaInitialization;
}
