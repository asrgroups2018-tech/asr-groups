import { getTursoClient } from './turso';
import { initializeSchema } from './schema';
import { Customer } from '@/lib/types';
import { logAudit } from './administration';

let schemaInitialized = false;

export async function ensureDbInitialized() {
  if (schemaInitialized) return;
  const client = getTursoClient();
  try {
    await initializeSchema(client);
    schemaInitialized = true;
  } catch (err) {
    console.error('Turso Schema initialization warning:', err);
  }
}

export async function getCustomers(query?: string): Promise<Customer[]> {
  await ensureDbInitialized();
  const client = getTursoClient();

  let sql = 'SELECT * FROM customers WHERE 1=1';
  const args: any[] = [];
  if (query) {
    sql += ' AND (LOWER(name) LIKE ? OR LOWER(place) LIKE ? OR phone LIKE ? OR LOWER(id) LIKE ?)';
    const q = `%${query.toLowerCase()}%`;
    args.push(q, q, q, q);
  }
  sql += ' ORDER BY name ASC';

  const custResult = await client.execute({ sql, args });

  // Aggregate statistics across loans and installments for each customer
  const loansResult = await client.execute('SELECT id, customer_id, total_amount, status FROM loans');
  const instResult = await client.execute('SELECT loan_id, amount_due, status FROM installments');

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
      place: String(row.place || 'CHENNAI'),
      phone: String(row.phone || '+91 98400 00000'),
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
  return list.find((c) => c.id === id || c.name.toLowerCase() === id.toLowerCase()) || null;
}

export async function createCustomer(data: { name: string; place?: string; phone?: string }): Promise<Customer> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const countRes = await client.execute('SELECT COUNT(*) as count FROM customers');
  const total = Number(countRes.rows[0].count);
  const newId = `CUST-${1000 + total + 1}`;
  const now = new Date().toISOString().slice(0, 10);

  const newCustomer: Customer = {
    id: newId,
    name: data.name.trim(),
    place: data.place?.trim() || 'CHENNAI',
    phone: data.phone?.trim() || '+91 98400 00000',
    createdAt: now,
    totalBorrowed: 0,
    totalRepaid: 0,
    outstandingAmount: 0,
    activeLoansCount: 0,
    status: 'Active',
  };

  await client.execute({
    sql: 'INSERT INTO customers (id, name, place, phone, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [newCustomer.id, newCustomer.name, newCustomer.place, newCustomer.phone, newCustomer.createdAt],
  });

  await logAudit({
    actorId: 'ADM-1001',
    actorName: 'System Administrator',
    actorRoleId: 0,
    action: 'Created User',
    target: `Customer: ${newCustomer.name} (${newCustomer.id})`,
    beforeVal: '-',
    afterVal: `Place: ${newCustomer.place}`,
    isSensitive: false,
  });

  return newCustomer;
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const existing = await getCustomerById(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates };

  await client.execute({
    sql: 'UPDATE customers SET name = ?, place = ?, phone = ? WHERE id = ?',
    args: [updated.name, updated.place, updated.phone, id],
  });

  return updated;
}

export async function deleteCustomer(id: string): Promise<boolean> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const res = await client.execute({
    sql: 'DELETE FROM customers WHERE id = ?',
    args: [id],
  });

  return res.rowsAffected > 0;
}
