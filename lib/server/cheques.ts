import { getTursoClient } from './turso';
import { initializeSchema } from './schema';
import { AuditActor, Cheque, ChequeActor, ChequeStatus } from '@/lib/types';
import { logAudit } from './administration';
import { randomUUID } from 'node:crypto';

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

export function mapChequeRow(row: any): Cheque {
  const mapActor = (prefix: 'created_by' | 'deposited_by'): ChequeActor | null => {
    if (!row[`${prefix}_id`] && !row[`${prefix}_name`] && !row[`${prefix}_email`]) return null;
    return {
      id: String(row[`${prefix}_id`] || ''),
      name: String(row[`${prefix}_name`] || ''),
      email: String(row[`${prefix}_email`] || ''),
    };
  };

  return {
    id: String(row.id),
    chequeNumber: String(row.cheque_number),
    customerId: row.customer_id ? String(row.customer_id) : null,
    customerName: String(row.customer_name),
    amount: Number(row.amount || 0),
    depositDate: String(row.deposit_date),
    status: (row.status as ChequeStatus) || 'Pending',
    depositedAt: row.deposited_at ? String(row.deposited_at) : null,
    createdBy: mapActor('created_by'),
    depositedBy: mapActor('deposited_by'),
    createdAt: String(row.created_at),
  };
}

export async function getCheques(filters?: {
  status?: string;
  query?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Cheque[]> {
  await ensureDbInitialized();
  const client = getTursoClient();

  let sql = 'SELECT * FROM cheques WHERE 1=1';
  const args: any[] = [];

  if (filters?.status && filters.status !== 'ALL') {
    sql += ' AND status = ?';
    args.push(filters.status);
  }

  if (filters?.startDate) {
    sql += ' AND deposit_date >= ?';
    args.push(filters.startDate);
  }

  if (filters?.endDate) {
    sql += ' AND deposit_date <= ?';
    args.push(filters.endDate);
  }

  if (filters?.query) {
    sql += ' AND (LOWER(cheque_number) LIKE ? OR LOWER(customer_name) LIKE ? OR LOWER(id) LIKE ?)';
    const q = `%${filters.query.toLowerCase()}%`;
    args.push(q, q, q);
  }

  sql += ' ORDER BY deposit_date ASC, id ASC';

  const res = await client.execute({ sql, args });
  return res.rows.map(mapChequeRow);
}

export async function getChequeById(id: string): Promise<Cheque | null> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const res = await client.execute({
    sql: 'SELECT * FROM cheques WHERE LOWER(id) = LOWER(?) LIMIT 1',
    args: [id.trim()],
  });
  if (res.rows.length === 0) return null;
  return mapChequeRow(res.rows[0]);
}

export async function createCheque(data: {
  chequeNumber: string;
  customerId?: string | null;
  customerName: string;
  amount: number;
  depositDate: string;
}, actor: AuditActor): Promise<Cheque> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const chequeNum = data.chequeNumber.trim();
  const custName = data.customerName.trim().toUpperCase();
  const amt = Number(data.amount) || 0;
  const depDate = data.depositDate.trim();

  if (!chequeNum) {
    throw new Error('Cheque number is required.');
  }
  if (!custName) {
    throw new Error('Customer name is required.');
  }
  if (amt <= 0) {
    throw new Error('Amount must be greater than 0.');
  }
  if (!depDate) {
    throw new Error('Date to deposit is required.');
  }

  const now = new Date().toISOString();
  const year = depDate.slice(0, 4) || String(new Date().getUTCFullYear());
  const id = `CHQ-${year}-${randomUUID()}`;

  await client.execute({
    sql: `INSERT INTO cheques (
            id, cheque_number, customer_id, customer_name, amount, deposit_date, status,
            created_by_id, created_by_name, created_by_email, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      chequeNum,
      data.customerId || null,
      custName,
      amt,
      depDate,
      'Pending',
      actor.id,
      actor.name,
      actor.email || '',
      now,
    ],
  });

  await logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRoleId: actor.primaryRoleId,
    action: 'Logged Cheque',
    target: `Cheque ${chequeNum} (${custName})`,
    beforeVal: '-',
    afterVal: `Amount: ₹${amt.toLocaleString('en-IN')}, Date to Deposit: ${depDate}`,
    isSensitive: false,
  });

  return (await getChequeById(id))!;
}

export async function markChequeDeposited(id: string, depositedAt: string | undefined, actor: AuditActor): Promise<Cheque | null> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const existing = await getChequeById(id);
  if (!existing) return null;

  const actualDepositedAt = depositedAt || new Date().toISOString().slice(0, 10);

  await client.execute({
    sql: `UPDATE cheques SET
            status = 'Deposited', deposited_at = ?,
            deposited_by_id = ?, deposited_by_name = ?, deposited_by_email = ?
          WHERE id = ?`,
    args: [actualDepositedAt, actor.id, actor.name, actor.email || '', existing.id],
  });

  await logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRoleId: actor.primaryRoleId,
    action: 'Deposited Cheque',
    target: `Cheque ${existing.chequeNumber} (${existing.customerName})`,
    beforeVal: 'Status: Pending',
    afterVal: `Status: Deposited on ${actualDepositedAt}`,
    isSensitive: false,
  });

  return await getChequeById(id);
}

export async function deleteCheque(id: string, actor: AuditActor): Promise<boolean> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const existing = await getChequeById(id);
  if (!existing) return false;

  await client.execute({
    sql: 'DELETE FROM cheques WHERE id = ?',
    args: [existing.id],
  });

  await logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRoleId: actor.primaryRoleId,
    action: 'Deleted Cheque',
    target: `Cheque ${existing.chequeNumber} (${existing.customerName})`,
    beforeVal: `Amount: ₹${existing.amount.toLocaleString('en-IN')}, Status: ${existing.status}`,
    afterVal: 'Deleted',
    isSensitive: true,
  });

  return true;
}

export async function getChequeStats(): Promise<{
  totalCheques: number;
  pendingCount: number;
  depositedCount: number;
  totalPendingAmount: number;
  totalDepositedAmount: number;
  nearestUpcomingDate: string | null;
}> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const res = await client.execute('SELECT * FROM cheques ORDER BY deposit_date ASC');
  const all = res.rows.map(mapChequeRow);

  let pendingCount = 0;
  let depositedCount = 0;
  let totalPendingAmount = 0;
  let totalDepositedAmount = 0;
  let nearestUpcomingDate: string | null = null;

  all.forEach((chq) => {
    if (chq.status === 'Pending') {
      pendingCount++;
      totalPendingAmount += chq.amount;
      if (!nearestUpcomingDate || chq.depositDate < nearestUpcomingDate) {
        nearestUpcomingDate = chq.depositDate;
      }
    } else {
      depositedCount++;
      totalDepositedAmount += chq.amount;
    }
  });

  return {
    totalCheques: all.length,
    pendingCount,
    depositedCount,
    totalPendingAmount,
    totalDepositedAmount,
    nearestUpcomingDate,
  };
}
