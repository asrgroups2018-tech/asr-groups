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
    { sql: 'SELECT id, customer_id, total_amount, status FROM loans', args: [] },
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

    const outstanding = Math.max(0, totalBorrowed - totalRepaid);
    const hasOverdue = userLoans.some((l) => l.status === 'Overdue');
    const isClosed = userLoans.length > 0 && userLoans.every((l) => l.status === 'Closed');

    return {
      id: cid,
      name: String(row.name),
      place: String(row.place || ''),
      codeNo: row.code_no ? String(row.code_no) : cid,
      phone: row.phone ? String(row.phone) : undefined,
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

export async function createCustomer(data: { name: string; place?: string; codeNo?: string; phone?: string }, actor?: AuditActor): Promise<Customer> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const countRes = await client.execute('SELECT COUNT(*) as count FROM customers');
  const total = Number(countRes.rows[0].count);
  const newId = data.codeNo?.trim()
    ? (data.codeNo.trim().startsWith('CUST-') ? data.codeNo.trim() : `CUST-${data.codeNo.trim()}`)
    : `CUST-${1000 + total + 1}`;
  const now = new Date().toISOString().slice(0, 10);

  const newCustomer: Customer = {
    id: newId,
    name: data.name.trim(),
    place: data.place?.trim() || '',
    codeNo: data.codeNo?.trim() || newId,
    phone: data.phone?.trim() || undefined,
    createdAt: now,
    totalBorrowed: 0,
    totalRepaid: 0,
    outstandingAmount: 0,
    activeLoansCount: 0,
    status: 'Active',
  };

  await client.execute({
    sql: 'INSERT INTO customers (id, name, place, code_no, phone, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
    args: [newCustomer.id, newCustomer.name, newCustomer.place, newCustomer.codeNo || null, newCustomer.phone || null, newCustomer.createdAt],
  });

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
    sql: 'UPDATE customers SET name = ?, place = ?, code_no = ?, phone = ? WHERE id = ?',
    args: [updated.name, updated.place, updated.codeNo || null, updated.phone || null, id],
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
