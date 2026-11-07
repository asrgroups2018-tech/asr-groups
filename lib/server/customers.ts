import { getTursoClient } from './turso';
import { initializeSchema } from './schema';
import { AuditActor, Customer } from '@/lib/types';
import { logAudit } from './administration';

let schemaInitialized = false;

export async function ensureDbInitialized() {
  if (schemaInitialized) return;
  const client = getTursoClient();
  try {
    await initializeSchema(client);
    const tableInfo = await client.execute('PRAGMA table_info(customers)');
    const hasCodeNo = tableInfo.rows.some((row) => String(row.name) === 'code_no');
    if (!hasCodeNo) {
      await client.execute('ALTER TABLE customers ADD COLUMN code_no TEXT');
    }
    const hasClosingBalance = tableInfo.rows.some((row) => String(row.name) === 'closing_balance');
    if (!hasClosingBalance) {
      await client.execute('ALTER TABLE customers ADD COLUMN closing_balance REAL NOT NULL DEFAULT 0');
    }
    await client.execute('CREATE INDEX IF NOT EXISTS idx_customers_code_no ON customers(code_no)');
    try {
      await client.execute('ALTER TABLE customers ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
    } catch {
      // Column may already exist
    }
    schemaInitialized = true;
  } catch (err) {
    console.error('Turso Schema initialization warning:', err);
  }
}

export async function getCustomers(query?: string): Promise<Customer[]> {
  await ensureDbInitialized();
  const client = getTursoClient();

  let sql = 'SELECT * FROM customers WHERE (is_active IS NULL OR is_active != 0)';
  const args: any[] = [];
  if (query) {
    sql += ' AND (LOWER(name) LIKE ? OR LOWER(place) LIKE ? OR phone LIKE ? OR LOWER(id) LIKE ? OR LOWER(COALESCE(code_no, \'\')) LIKE ?)';
    const q = `%${query.toLowerCase()}%`;
    args.push(q, q, q, q, q);
  }
  sql += ' ORDER BY name ASC';

  // Fetch the directory and its aggregates in one read batch to avoid
  // sequential hosted-database round trips on the customers page.
  const [custResult, loansResult, instResult] = await client.batch([
    { sql, args },
    { sql: 'SELECT id, customer_id, total_amount, status, opening_balance, opening_balance_type, is_opening_balance_only FROM loans', args: [] },
    { sql: 'SELECT loan_id, amount_due, status FROM installments', args: [] },
  ], 'read');

  const customerLoansMap = new Map<string, any[]>();
  loansResult.rows.forEach((l) => {
    const cid = String(l.customer_id);
    if (!customerLoansMap.has(cid)) customerLoansMap.set(cid, []);
    customerLoansMap.get(cid)!.push(l);
  });

  const loanInstMap = new Map<string, any[]>();
  instResult.rows.forEach((inst) => {
    const lid = String(inst.loan_id);
    if (!loanInstMap.has(lid)) loanInstMap.set(lid, []);
    loanInstMap.get(lid)!.push(inst);
  });

  return custResult.rows.map((row) => {
    const cid = String(row.id);
    const userLoans = customerLoansMap.get(cid) || [];
    const totalBorrowed = userLoans.reduce((sum, l) => sum + Number(l.total_amount || 0), 0);

    let totalRepaid = 0;
    userLoans.forEach((l) => {
      const insts = loanInstMap.get(String(l.id)) || [];
      insts.forEach((ins) => {
        const st = String(ins.status || '').toUpperCase();
        if (['PASS', 'NEFT', 'CASH', 'PAID'].includes(st)) {
          totalRepaid += Number(ins.amount_due || 0);
        }
      });
    });

    const outstanding = userLoans.reduce((sum, loan) => {
      const loanInstallments = loanInstMap.get(String(loan.id)) || [];
      const loanCollected = loanInstallments.reduce((collected, installment) => {
        const status = String(installment.status || '').trim().toUpperCase();
        return ['CLEARED', 'NEFT', 'RTGS', 'CASH', 'PASS', 'PAID', 'CLS', 'CS', 'SETTLED', 'CLOSED'].includes(status)
          ? collected + Number(installment.amount_due || 0)
          : collected;
      }, 0);
      const opening = Number(loan.opening_balance || 0) * (String(loan.opening_balance_type || 'DEBIT').toUpperCase() === 'CREDIT' ? -1 : 1);
      const scheduled = Number(loan.is_opening_balance_only || 0) ? 0 : Number(loan.total_amount || 0);
      return sum + Math.max(0, opening + scheduled - loanCollected);
    }, 0);
    const hasOverdue = userLoans.some((l) => l.status === 'Overdue');
    const isClosed = userLoans.length > 0 && userLoans.every((l) => l.status === 'Closed');

    return {
      id: cid,
      name: String(row.name),
      place: String(row.place || ''),
      codeNo: row.code_no ? String(row.code_no) : cid,
      phone: row.phone ? String(row.phone) : undefined,
      closingBalance: Number(row.closing_balance || 0),
      createdAt: String(row.created_at || new Date().toISOString().slice(0, 10)),
      totalBorrowed,
      totalRepaid,
      outstandingAmount: outstanding,
      activeLoansCount: userLoans.filter((l) => l.status !== 'Closed').length,
      status: hasOverdue ? 'Overdue' : isClosed ? 'Closed' : 'Active',
    };
  });
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const list = await getCustomers();
  const cleanId = String(id || '').trim().toLowerCase();
  return (
    list.find(
      (c) =>
        c.id.toLowerCase() === cleanId ||
        c.name.toLowerCase() === cleanId ||
        (c.codeNo && c.codeNo.toLowerCase() === cleanId)
    ) || null
  );
}

export async function createCustomer(data: { name: string; place?: string; codeNo?: string; phone?: string; closingBalance?: number }, actor?: AuditActor): Promise<Customer> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const sequenceRes = await client.execute(`
    SELECT MAX(CAST(SUBSTR(id, 6) AS INTEGER)) AS max_sequence
    FROM customers
    WHERE UPPER(SUBSTR(id, 1, 5)) = 'CUST-'
      AND SUBSTR(id, 6) <> ''
      AND SUBSTR(id, 6) NOT GLOB '*[^0-9]*'
  `);
  const highestSequence = Math.max(1000, Number(sequenceRes.rows[0]?.max_sequence || 0));
  let nextSequence = highestSequence + 1;
  const requestedCodeId = data.codeNo?.trim()
    ? (data.codeNo.trim().startsWith('CUST-') ? data.codeNo.trim() : `CUST-${data.codeNo.trim()}`)
    : undefined;
  const now = new Date().toISOString().slice(0, 10);

  let newCustomer: Customer | null = null;
  let candidateId = requestedCodeId || `CUST-${nextSequence}`;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate: Customer = {
      id: candidateId,
      name: data.name.trim(),
      place: data.place?.trim() || '',
      codeNo: data.codeNo?.trim() || candidateId,
      phone: data.phone?.trim() || undefined,
      closingBalance: Number(data.closingBalance || 0),
      createdAt: now,
      totalBorrowed: 0,
      totalRepaid: 0,
      outstandingAmount: 0,
      activeLoansCount: 0,
      status: 'Active',
    };

    try {
      await client.execute({
        sql: 'INSERT INTO customers (id, name, place, code_no, phone, closing_balance, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
        args: [candidate.id, candidate.name, candidate.place, candidate.codeNo || null, candidate.phone || null, candidate.closingBalance || 0, candidate.createdAt],
      });
      newCustomer = candidate;
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isIdCollision = /(?:UNIQUE|PRIMARY KEY) constraint failed.*customers\.id|customers\.id.*(?:UNIQUE|PRIMARY KEY)/i.test(message);
      if (!isIdCollision) throw error;

      // A supplied code can already belong to another borrower. Preserve it
      // as Code No, but fall back to a fresh generated customer ID.
      if (candidateId === requestedCodeId) {
        const requestedSequence = candidateId.match(/^CUST-(\d+)$/i);
        if (requestedSequence) {
          nextSequence = Math.max(nextSequence, Number(requestedSequence[1]) + 1);
        }
        candidateId = `CUST-${nextSequence}`;
      } else {
        nextSequence += 1;
        candidateId = `CUST-${nextSequence}`;
      }
    }
  }

  if (!newCustomer) {
    throw new Error('Unable to allocate a unique customer ID. Please retry.');
  }

  await logAudit({
    actorId: actor?.id || 'SYSTEM',
    actorName: actor?.name || 'System',
    actorRoleId: actor?.primaryRoleId ?? 0,
    action: 'Created User',
    target: `Customer: ${newCustomer.name} (${newCustomer.id})`,
    beforeVal: '-',
    afterVal: `Place: ${newCustomer.place}`,
    isSensitive: false,
  });

  return newCustomer;
}

export async function updateCustomer(id: string, updates: Partial<Customer>, actor?: AuditActor): Promise<Customer | null> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const existing = await getCustomerById(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates };

  await client.execute({
    sql: 'UPDATE customers SET name = ?, place = ?, code_no = ?, phone = ?, closing_balance = ? WHERE id = ?',
    args: [updated.name, updated.place, updated.codeNo || null, updated.phone || null, Number(updated.closingBalance || 0), id],
  });

  await logAudit({
    actorId: actor?.id || 'SYSTEM',
    actorName: actor?.name || 'System',
    actorRoleId: actor?.primaryRoleId ?? 0,
    action: 'Updated User',
    target: `Customer: ${updated.name} (${id})`,
    beforeVal: JSON.stringify(existing),
    afterVal: JSON.stringify(updated),
    isSensitive: true,
  });

  return updated;
}

export async function deleteCustomer(id: string, actor?: AuditActor): Promise<boolean> {
  await ensureDbInitialized();
  const client = getTursoClient();

  // Soft delete customer from active directory so historical loans remain 100% intact
  const res = await client.execute({
    sql: 'UPDATE customers SET is_active = 0 WHERE id = ?',
    args: [id],
  });

  await logAudit({
    actorId: actor?.id || 'SYSTEM',
    actorName: actor?.name || 'System',
    actorRoleId: actor?.primaryRoleId ?? 0,
    action: 'Deleted User',
    target: `Customer ID: ${id}`,
    beforeVal: 'Active',
    afterVal: 'Deactivated / Removed from Directory',
    isSensitive: false,
  });

  return res.rowsAffected > 0;
}
