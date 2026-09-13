import { getTursoClient } from './turso';
import { initializeSchema } from './schema';
import {
  Loan,
  LoanCompanySplit,
  Installment,
  HistoricalReceiptRow,
} from '@/lib/types';
import { getCompanies, createCompany } from './companies';
import { logAudit } from './administration';

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

// ==========================================
// Loans (Client-level Aggregated & Expandable)
// ==========================================
export async function getLoans(query?: string): Promise<Loan[]> {
  await ensureDbInitialized();
  const client = getTursoClient();

  let sql = `
    SELECT 
      l.id as loan_id, l.customer_id, l.code_no, l.total_amount, l.start_date,
      l.installment_count, l.frequency, l.status as loan_status, l.created_at as loan_created_at,
      c.name as customer_name, c.place as customer_place
    FROM loans l
    LEFT JOIN customers c ON c.id = l.customer_id
    WHERE 1=1
  `;
  const args: any[] = [];
  if (query) {
    sql += ' AND (LOWER(c.name) LIKE ? OR LOWER(l.code_no) LIKE ? OR LOWER(l.id) LIKE ? OR LOWER(c.place) LIKE ?)';
    const q = `%${query.toLowerCase()}%`;
    args.push(q, q, q, q);
  }
  sql += ' ORDER BY l.id ASC';

  const loansResult = await client.execute({ sql, args });

  // Fetch all splits
  const splitsResult = await client.execute(`
    SELECT lcs.id, lcs.loan_id, lcs.company_id, lcs.split_percent, lcs.split_amount,
           comp.short_code as company_code, comp.name as company_name, comp.is_outside_party
    FROM loan_company_splits lcs
    LEFT JOIN companies comp ON comp.id = lcs.company_id
  `);

  const splitsByLoan = new Map<string, LoanCompanySplit[]>();
  splitsResult.rows.forEach((r) => {
    const lid = String(r.loan_id);
    if (!splitsByLoan.has(lid)) splitsByLoan.set(lid, []);
    splitsByLoan.get(lid)!.push({
      id: String(r.id),
      loanId: lid,
      companyId: String(r.company_id),
      companyCode: String(r.company_code || ''),
      companyName: String(r.company_name || ''),
      isOutsideParty: Boolean(r.is_outside_party),
      splitPercent: Number(r.split_percent || 0),
      splitAmount: Number(r.split_amount || 0),
    });
  });

  // Fetch all installments
  const instResult = await client.execute(`
    SELECT id, loan_id, seq_no, due_date, amount_due, status, recd_date, chq_no, place, dep_name, remarks, created_at
    FROM installments
    ORDER BY seq_no ASC
  `);

  // Fetch all installment company splits
  const instSplitsResult = await client.execute(`
    SELECT ics.installment_id, ics.company_id, ics.amount, comp.short_code as company_code
    FROM installment_company_splits ics
    LEFT JOIN companies comp ON comp.id = ics.company_id
  `);

  const instSplitsMap = new Map<string, Record<string, number>>();
  instSplitsResult.rows.forEach((r) => {
    const iid = String(r.installment_id);
    const code = String(r.company_code || 'OTHERS').toUpperCase();
    if (!instSplitsMap.has(iid)) instSplitsMap.set(iid, {});
    instSplitsMap.get(iid)![code] = Number(r.amount || 0);
  });

  const instsByLoan = new Map<string, Installment[]>();
  instResult.rows.forEach((r) => {
    const lid = String(r.loan_id);
    const iid = String(r.id);
    if (!instsByLoan.has(lid)) instsByLoan.set(lid, []);

    const companySplits = instSplitsMap.get(iid) || {};
    const splitSum = Object.values(companySplits).reduce((sum, val) => sum + val, 0);
    const amountDue = Number(r.amount_due || 0);
    const isMismatch = splitSum > 0 && Math.abs(amountDue - splitSum) > 0.01;

    instsByLoan.get(lid)!.push({
      id: iid,
      loanId: lid,
      seqNo: Number(r.seq_no),
      dueDate: String(r.due_date || ''),
      amountDue,
      status: (r.status as any) || 'PENDING',
      recdDate: r.recd_date ? String(r.recd_date) : null,
      chqNo: r.chq_no ? String(r.chq_no) : undefined,
      place: r.place ? String(r.place) : undefined,
      depName: r.dep_name ? String(r.dep_name) : undefined,
      remarks: r.remarks ? String(r.remarks) : undefined,
      companySplits,
      createdAt: String(r.created_at || new Date().toISOString().slice(0, 10)),
      isMismatch,
      mismatchDiff: isMismatch ? amountDue - splitSum : 0,
    });
  });

  return loansResult.rows.map((row) => {
    const lid = String(row.loan_id);
    const installments = instsByLoan.get(lid) || [];
    const splits = splitsByLoan.get(lid) || [];

    let totalCollected = 0;
    let nextDueDate: string | undefined;

    installments.forEach((ins) => {
      const st = String(ins.status || '').toUpperCase();
      if (['PASS', 'NEFT', 'CASH', 'PAID'].includes(st)) {
        totalCollected += ins.amountDue;
      } else if (!nextDueDate && ins.dueDate) {
        nextDueDate = ins.dueDate;
      }
    });

    const totalAmount = Number(row.total_amount || 0);
    const totalOutstanding = Math.max(0, totalAmount - totalCollected);

    return {
      id: lid,
      customerId: String(row.customer_id),
      customerName: String(row.customer_name || 'Unknown Client'),
      place: String(row.customer_place || 'CHENNAI'),
      codeNo: row.code_no ? String(row.code_no) : undefined,
      totalAmount,
      startDate: String(row.start_date || new Date().toISOString().slice(0, 10)),
      installmentCount: Number(row.installment_count || installments.length),
      frequency: (row.frequency as any) || 'Monthly',
      status: (row.loan_status as any) || 'Active',
      createdAt: String(row.loan_created_at || new Date().toISOString().slice(0, 10)),
      splits,
      installments,
      nextDueDate,
      totalCollected,
      totalOutstanding,
    };
  });
}

export async function getLoanById(id: string): Promise<Loan | null> {
  const list = await getLoans();
  return list.find((l) => l.id === id || l.customerName.toLowerCase() === id.toLowerCase()) || null;
}

export async function createLoan(data: {
  customerId: string;
  codeNo?: string;
  totalAmount: number;
  startDate: string;
  frequency: 'Weekly' | 'Monthly';
  splits: { companyId: string; splitPercent: number; splitAmount: number }[];
  installments: {
    dueDate: string;
    amountDue: number;
    companySplits: Record<string, number>;
    remarks?: string;
  }[];
}): Promise<Loan> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const countRes = await client.execute('SELECT COUNT(*) as count FROM loans');
  const totalLoans = Number(countRes.rows[0].count);
  const loanId = `LOAN-2026-${String(totalLoans + 1).padStart(3, '0')}`;
  const now = new Date().toISOString().slice(0, 10);

  const companies = await getCompanies();
  const companyIdMap = new Map(companies.map((c) => [c.id, c]));
  const companyCodeMap = new Map(companies.map((c) => [c.shortCode.toUpperCase(), c]));

  const statements: any[] = [
    {
      sql: `INSERT INTO loans (
        id, customer_id, code_no, total_amount, start_date,
        installment_count, frequency, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        loanId,
        data.customerId,
        data.codeNo || `CL-${totalLoans + 1}`,
        data.totalAmount,
        data.startDate,
        data.installments.length,
        data.frequency,
        'Active',
        now,
      ],
    },
  ];

  // Loan Company Splits
  for (const sp of data.splits) {
    statements.push({
      sql: `INSERT INTO loan_company_splits (id, loan_id, company_id, split_percent, split_amount)
            VALUES (?, ?, ?, ?, ?)`,
      args: [`LCS-${loanId}-${sp.companyId}`, loanId, sp.companyId, sp.splitPercent, sp.splitAmount],
    });
  }

  // Installments and Installment Company Splits
  for (let seq = 0; seq < data.installments.length; seq++) {
    const inst = data.installments[seq];
    const instId = `INST-2026-${String(Date.now() + seq).slice(-6)}`;

    statements.push({
      sql: `INSERT INTO installments (
        id, loan_id, seq_no, due_date, amount_due, status, recd_date, chq_no, place, dep_name, remarks, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        instId,
        loanId,
        seq + 1,
        inst.dueDate,
        inst.amountDue,
        'PENDING',
        null,
        null,
        'CHENNAI',
        null,
        inst.remarks || null,
        now,
      ],
    });

    for (const [key, amt] of Object.entries(inst.companySplits)) {
      if (amt > 0) {
        const comp = companyIdMap.get(key) || companyCodeMap.get(key.toUpperCase());
        if (comp) {
          statements.push({
            sql: `INSERT INTO installment_company_splits (id, installment_id, company_id, amount)
                  VALUES (?, ?, ?, ?)`,
            args: [`ICS-${instId}-${comp.shortCode}`, instId, comp.id, amt],
          });
        }
      }
    }
  }

  await client.batch(statements, 'write');

  const createdLoan = await getLoanById(loanId);

  await logAudit({
    actorId: 'ADM-1001',
    actorName: 'System Administrator',
    actorRoleId: 0,
    action: 'Created Loan',
    target: `New Loan: ${createdLoan?.customerName} (${loanId})`,
    beforeVal: '-',
    afterVal: `Amount: ₹${data.totalAmount.toLocaleString('en-IN')}, EMIs: ${data.installments.length}`,
    isSensitive: true,
  });

  return createdLoan!;
}

export async function updateLoanInstallment(
  installmentId: string,
  updates: {
    status?: string;
    recdDate?: string | null;
    amountDue?: number;
    dueDate?: string;
    chqNo?: string;
    depName?: string;
    place?: string;
    remarks?: string;
    companySplits?: Record<string, number>;
  }
): Promise<Installment | null> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const instRes = await client.execute({
    sql: 'SELECT * FROM installments WHERE id = ?',
    args: [installmentId],
  });
  if (instRes.rows.length === 0) return null;

  const current = instRes.rows[0];
  const statements: any[] = [];

  const newStatus = updates.status !== undefined ? updates.status : current.status;
  const newRecdDate = updates.recdDate !== undefined ? updates.recdDate : current.recd_date;
  const newAmount = updates.amountDue !== undefined ? updates.amountDue : current.amount_due;
  const newDueDate = updates.dueDate !== undefined ? updates.dueDate : current.due_date;
  const newChqNo = updates.chqNo !== undefined ? updates.chqNo : current.chq_no;
  const newDepName = updates.depName !== undefined ? updates.depName : current.dep_name;
  const newPlace = updates.place !== undefined ? updates.place : current.place;
  const newRemarks = updates.remarks !== undefined ? updates.remarks : current.remarks;

  statements.push({
    sql: `UPDATE installments SET
      status = ?, recd_date = ?, amount_due = ?, due_date = ?, chq_no = ?,
      dep_name = ?, place = ?, remarks = ?
    WHERE id = ?`,
    args: [newStatus, newRecdDate, newAmount, newDueDate, newChqNo, newDepName, newPlace, newRemarks, installmentId],
  });

  if (updates.companySplits) {
    statements.push({
      sql: 'DELETE FROM installment_company_splits WHERE installment_id = ?',
      args: [installmentId],
    });

    const companies = await getCompanies();
    const codeMap = new Map(companies.map((c) => [c.shortCode.toUpperCase(), c]));
    const idMap = new Map(companies.map((c) => [c.id, c]));

    for (const [key, amt] of Object.entries(updates.companySplits)) {
      if (amt > 0) {
        const comp = codeMap.get(key.toUpperCase()) || idMap.get(key);
        if (comp) {
          statements.push({
            sql: `INSERT INTO installment_company_splits (id, installment_id, company_id, amount)
                  VALUES (?, ?, ?, ?)`,
            args: [`ICS-${installmentId}-${comp.shortCode}`, installmentId, comp.id, amt],
          });
        }
      }
    }
  }

  await client.batch(statements, 'write');

  // Recalculate parent loan total amount and status
  const loanId = String(current.loan_id);
  const allInstRes = await client.execute({
    sql: 'SELECT amount_due, status FROM installments WHERE loan_id = ?',
    args: [loanId],
  });
  const newTotal = allInstRes.rows.reduce((sum, r) => sum + Number(r.amount_due || 0), 0);
  const hasOverdue = allInstRes.rows.some((r) => ['RET', 'RET NEFT', 'RET PASS', 'Overdue'].includes(String(r.status)));
  const allPaid = allInstRes.rows.every((r) => ['PASS', 'NEFT', 'CASH', 'PAID', 'Paid'].includes(String(r.status)));
  const parentStatus = hasOverdue ? 'Overdue' : allPaid ? 'Closed' : 'Active';

  await client.execute({
    sql: 'UPDATE loans SET total_amount = ?, status = ? WHERE id = ?',
    args: [newTotal, parentStatus, loanId],
  });

  await logAudit({
    actorId: 'ADM-1001',
    actorName: 'System Administrator',
    actorRoleId: 0,
    action: 'Updated Installment',
    target: `Installment ${installmentId} on ${loanId}`,
    beforeVal: `Status: ${current.status}, Amount: ₹${current.amount_due}`,
    afterVal: `Status: ${newStatus}, Amount: ₹${newAmount}`,
    isSensitive: false,
  });

  const loans = await getLoans();
  const parentLoan = loans.find((l) => l.id === loanId);
  return parentLoan?.installments.find((i) => i.id === installmentId) || null;
}

export async function updateFullLoan(
  loanId: string,
  data: {
    customerName?: string;
    codeNo?: string;
    place?: string;
    status?: string;
    frequency?: string;
    startDate?: string;
    installments: {
      id?: string;
      seqNo: number;
      dueDate: string;
      amountDue: number;
      status: string;
      recdDate?: string | null;
      chqNo?: string | null;
      place?: string | null;
      depName?: string | null;
      remarks?: string | null;
      companySplits: Record<string, number>;
      othersName?: string | null;
    }[];
  }
): Promise<Loan | null> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const currentLoan = await getLoanById(loanId);
  if (!currentLoan) return null;

  const companies = await getCompanies();
  const companyIdMap = new Map(companies.map((c) => [c.id, c]));
  const companyCodeMap = new Map(companies.map((c) => [c.shortCode.toUpperCase(), c]));

  // Register any new company from othersName if found
  for (const inst of data.installments) {
    if (inst.othersName && inst.othersName.trim()) {
      const cleanName = inst.othersName.trim().toUpperCase();
      if (!companyCodeMap.has(cleanName)) {
        const newComp = await createCompany({
          name: cleanName,
          shortCode: cleanName,
          isOutsideParty: true,
        });
        companyIdMap.set(newComp.id, newComp);
        companyCodeMap.set(newComp.shortCode.toUpperCase(), newComp);
      }
    }
  }

  const statements: any[] = [];
  const now = new Date().toISOString().slice(0, 10);

  // 1. Calculate overall loan totals and company allocations
  const newTotalAmount = data.installments.reduce((sum, inst) => sum + (Number(inst.amountDue) || 0), 0);
  const hasOverdue = data.installments.some((r) => ['RET', 'RET NEFT', 'RET PASS', 'Overdue'].includes(String(r.status)));
  const allPaid = data.installments.length > 0 && data.installments.every((r) => ['PASS', 'NEFT', 'CASH', 'PAID', 'Paid'].includes(String(r.status)));
  const finalStatus = data.status || (hasOverdue ? 'Overdue' : allPaid ? 'Closed' : 'Active');

  statements.push({
    sql: `UPDATE loans SET
            code_no = ?,
            total_amount = ?,
            start_date = ?,
            installment_count = ?,
            frequency = ?,
            status = ?
          WHERE id = ?`,
    args: [
      data.codeNo !== undefined ? data.codeNo : currentLoan.codeNo || null,
      newTotalAmount,
      data.startDate || currentLoan.startDate,
      data.installments.length,
      data.frequency || currentLoan.frequency,
      finalStatus,
      loanId,
    ],
  });

  // 2. Update Customer Name / Place if specified
  if (data.customerName || data.place) {
    statements.push({
      sql: `UPDATE customers SET
              name = COALESCE(?, name),
              place = COALESCE(?, place)
            WHERE id = (SELECT customer_id FROM loans WHERE id = ?)`,
      args: [data.customerName || null, data.place || null, loanId],
    });
  }

  // 3. Recompute overall company splits across all installments
  const companyTotals = new Map<string, number>();
  for (const inst of data.installments) {
    for (const [key, amt] of Object.entries(inst.companySplits || {})) {
      const numAmt = Number(amt) || 0;
      if (numAmt > 0) {
        const comp = companyIdMap.get(key) || companyCodeMap.get(key.toUpperCase());
        if (comp) {
          companyTotals.set(comp.id, (companyTotals.get(comp.id) || 0) + numAmt);
        }
      }
    }
  }

  statements.push({
    sql: 'DELETE FROM loan_company_splits WHERE loan_id = ?',
    args: [loanId],
  });

  for (const [compId, compAmt] of companyTotals.entries()) {
    const splitPercent = newTotalAmount > 0 ? Number(((compAmt / newTotalAmount) * 100).toFixed(2)) : 0;
    statements.push({
      sql: `INSERT INTO loan_company_splits (id, loan_id, company_id, split_percent, split_amount)
            VALUES (?, ?, ?, ?, ?)`,
      args: [`LCS-${loanId}-${compId}`, loanId, compId, splitPercent, compAmt],
    });
  }

  // 4. Handle Installments: delete splits for existing installments, delete removed installments, upsert current ones
  const existingInstRes = await client.execute({
    sql: 'SELECT id FROM installments WHERE loan_id = ?',
    args: [loanId],
  });
  const existingInstIds = existingInstRes.rows.map((r) => String(r.id));

  if (existingInstIds.length > 0) {
    const placeholders = existingInstIds.map(() => '?').join(',');
    statements.push({
      sql: `DELETE FROM installment_company_splits WHERE installment_id IN (${placeholders})`,
      args: existingInstIds,
    });
  }

  // Keep track of valid installment IDs to keep
  const updatedInstIds: string[] = [];

  for (let idx = 0; idx < data.installments.length; idx++) {
    const inst = data.installments[idx];
    const instId = inst.id && inst.id.trim() ? inst.id.trim() : `INST-2026-${String(Date.now() + idx).slice(-6)}`;
    updatedInstIds.push(instId);

    statements.push({
      sql: `INSERT OR REPLACE INTO installments (
              id, loan_id, seq_no, due_date, amount_due, status, recd_date, chq_no, place, dep_name, remarks, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        instId,
        loanId,
        inst.seqNo || idx + 1,
        inst.dueDate || '1-Jul-2026',
        Number(inst.amountDue) || 0,
        inst.status || 'PENDING',
        inst.recdDate || null,
        inst.chqNo || null,
        inst.place || data.place || currentLoan.place || 'CHENNAI',
        inst.depName || null,
        inst.remarks || null,
        now,
      ],
    });

    // Insert new installment company splits
    for (const [key, amt] of Object.entries(inst.companySplits || {})) {
      const numAmt = Number(amt) || 0;
      if (numAmt > 0) {
        const comp = companyIdMap.get(key) || companyCodeMap.get(key.toUpperCase());
        if (comp) {
          statements.push({
            sql: `INSERT INTO installment_company_splits (id, installment_id, company_id, amount)
                  VALUES (?, ?, ?, ?)`,
            args: [`ICS-${instId}-${comp.shortCode}`, instId, comp.id, numAmt],
          });
        }
      }
    }
  }

  // Delete installments that were removed from the loan
  if (updatedInstIds.length > 0) {
    const placeholders = updatedInstIds.map(() => '?').join(',');
    statements.push({
      sql: `DELETE FROM installments WHERE loan_id = ? AND id NOT IN (${placeholders})`,
      args: [loanId, ...updatedInstIds],
    });
  } else {
    statements.push({
      sql: 'DELETE FROM installments WHERE loan_id = ?',
      args: [loanId],
    });
  }

  await client.batch(statements, 'write');

  await logAudit({
    actorId: 'ADM-1001',
    actorName: 'System Administrator (Super User)',
    actorRoleId: 0,
    action: 'Updated Loan',
    target: `Loan: ${data.customerName || currentLoan.customerName} (${loanId})`,
    beforeVal: `Amount: ₹${currentLoan.totalAmount.toLocaleString('en-IN')}, EMIs: ${currentLoan.installmentCount}`,
    afterVal: `Amount: ₹${newTotalAmount.toLocaleString('en-IN')}, EMIs: ${data.installments.length}`,
    isSensitive: true,
  });

  return await getLoanById(loanId);
}

export async function deleteLoan(id: string): Promise<boolean> {
  await ensureDbInitialized();
  const client = getTursoClient();

  await client.batch(
    [
      { sql: 'DELETE FROM installment_company_splits WHERE installment_id IN (SELECT id FROM installments WHERE loan_id = ?)', args: [id] },
      { sql: 'DELETE FROM installments WHERE loan_id = ?', args: [id] },
      { sql: 'DELETE FROM loan_company_splits WHERE loan_id = ?', args: [id] },
      { sql: 'DELETE FROM loans WHERE id = ?', args: [id] },
    ],
    'write'
  );

  return true;
}

// ==========================================
// Historical July 2026 Grid Service
// ==========================================
export async function getHistoricalReceipts(filters?: {
  outsideCategory?: 'ALL' | 'ASR_ONLY' | 'OUTSIDE_ONLY';
  query?: string;
}): Promise<{ rows: HistoricalReceiptRow[]; totalCount: number; totalVolume: number; mismatchCount: number }> {
  await ensureDbInitialized();
  const client = getTursoClient();

  let sql = `
    SELECT 
      i.id as installment_id, i.loan_id, i.seq_no, i.due_date, i.amount_due,
      i.status, i.recd_date, i.chq_no, i.place, i.dep_name, i.remarks,
      l.code_no, c.name as client_name
    FROM installments i
    JOIN loans l ON l.id = i.loan_id
    JOIN customers c ON c.id = l.customer_id
    WHERE 1=1
  `;
  const args: any[] = [];
  if (filters?.query) {
    sql += ' AND (LOWER(c.name) LIKE ? OR LOWER(l.code_no) LIKE ? OR LOWER(i.place) LIKE ? OR LOWER(i.dep_name) LIKE ? OR LOWER(i.chq_no) LIKE ?)';
    const q = `%${filters.query.toLowerCase()}%`;
    args.push(q, q, q, q, q);
  }
  sql += ' ORDER BY i.id ASC';

  const instResult = await client.execute({ sql, args });

  // Fetch all installment company splits
  const splitsResult = await client.execute(`
    SELECT ics.installment_id, ics.amount, comp.short_code as company_code, comp.is_outside_party
    FROM installment_company_splits ics
    JOIN companies comp ON comp.id = ics.company_id
  `);

  const splitsByInst = new Map<string, Record<string, number>>();
  const outsideFlagByInst = new Map<string, boolean>();

  splitsResult.rows.forEach((r) => {
    const iid = String(r.installment_id);
    const code = String(r.company_code || '').toUpperCase();
    const amt = Number(r.amount || 0);
    const isOutside = Boolean(r.is_outside_party);

    if (!splitsByInst.has(iid)) splitsByInst.set(iid, {});
    splitsByInst.get(iid)![code] = amt;

    if (isOutside && amt > 0) {
      outsideFlagByInst.set(iid, true);
    }
  });

  let sNoCounter = 1;
  let totalVolume = 0;
  let mismatchCount = 0;

  const receiptRows: HistoricalReceiptRow[] = [];

  for (const r of instResult.rows) {
    const iid = String(r.installment_id);
    const splits = splitsByInst.get(iid) || {};
    const hasOutside = outsideFlagByInst.get(iid) || false;

    // Filter by category if requested
    if (filters?.outsideCategory === 'ASR_ONLY' && hasOutside) {
      continue;
    }
    if (filters?.outsideCategory === 'OUTSIDE_ONLY' && !hasOutside) {
      continue;
    }

    const amount = Number(r.amount_due || 0);
    totalVolume += amount;

    const splitSum = Object.values(splits).reduce((sum, v) => sum + v, 0);
    const isMismatch = splitSum > 0 && Math.abs(amount - splitSum) > 0.01;
    if (isMismatch) mismatchCount++;

    // Check for ad-hoc others
    let othersVal = splits['OTHERS'] || 0;
    let othersName: string | undefined;
    for (const [k, v] of Object.entries(splits)) {
      if (['TATVA', 'BHAVANA'].includes(k) && v > 0) {
        othersVal = v;
        othersName = k;
      }
    }

    receiptRows.push({
      sNo: sNoCounter++,
      date: String(r.due_date || ''),
      codeNo: String(r.code_no || ''),
      place: String(r.place || ''),
      clientName: String(r.client_name || ''),
      depName: String(r.dep_name || ''),
      chqNo: String(r.chq_no || ''),
      amount,
      status: (r.status as any) || 'PENDING',
      recdDate: r.recd_date ? String(r.recd_date) : null,
      pass: splits['PASS'],
      ala: splits['ALA'],
      ig: splits['IG'],
      gs: splits['GS'],
      mars: splits['MARS'],
      tg: splits['TG'],
      fin: splits['FIN'],
      mm: splits['MM'],
      cs: splits['CS'],
      mc: splits['MC'],
      taSS: splits['TA (SS)'],
      others: othersVal > 0 ? othersVal : undefined,
      othersName: othersName || (othersVal > 0 ? 'OTHERS' : undefined),
      remarks: r.remarks ? String(r.remarks) : undefined,
      loanId: String(r.loan_id),
      installmentId: iid,
      isMismatch,
      mismatchDiff: isMismatch ? amount - splitSum : 0,
    });
  }

  return {
    rows: receiptRows,
    totalCount: receiptRows.length,
    totalVolume,
    mismatchCount,
  };
}

// ==========================================
// Dashboard Metrics & Signature Analytics
// ==========================================
export async function getDashboardStats() {
  await ensureDbInitialized();
  const client = getTursoClient();

  const loans = await getLoans();
  // 1. Portfolio-level Metrics (All-time, never affected by time filter)
  const totalDisbursed = loans.reduce((sum, l) => sum + Number(l.totalAmount || 0), 0);
  const totalRecovered = loans.reduce((sum, l) => sum + Number(l.totalCollected || 0), 0);
  const totalOutstanding = Math.max(0, totalDisbursed - totalRecovered);

  // 2. Installments & Status counts (confirmed status taxonomy)
  let totalInstallments = 0;
  let onTimeCount = 0;          // PASS, NEFT, CASH, PAID
  let bouncedCount = 0;         // RET, RET NEFT, RET PASS
  let bouncedAmount = 0;
  let unpaidPastDueCount = 0;   // PENDING with past due date
  let unpaidPastDueAmount = 0;
  let unclassifiedCount = 0;    // CLS, CS
  let pendingCount = 0;         // All PENDING

  const todayDate = new Date().toISOString().slice(0, 10);
  let todayCollections = 0;
  const todaysSchedule: Installment[] = [];

  loans.forEach((l) => {
    (l.installments || []).forEach((ins) => {
      totalInstallments++;
      const st = String(ins.status || '').toUpperCase();
      const amt = Number(ins.amountDue || 0);

      if (['PASS', 'NEFT', 'CASH', 'PAID'].includes(st)) {
        onTimeCount++;
        if (ins.recdDate === todayDate || ins.dueDate === todayDate) {
          todayCollections += amt;
        }
      } else if (['RET', 'RET NEFT', 'RET PASS'].includes(st)) {
        bouncedCount++;
        bouncedAmount += amt;
      } else if (['CLS', 'CS'].includes(st)) {
        unclassifiedCount++;
      } else {
        // PENDING or other
        pendingCount++;
        // Check if past due
        if (ins.dueDate && ins.dueDate < todayDate) {
          unpaidPastDueCount++;
          unpaidPastDueAmount += amt;
        }
      }

      if (st === 'PENDING' || ins.dueDate === todayDate) {
        if (todaysSchedule.length < 10) {
          todaysSchedule.push(ins);
        }
      }
    });
  });

  const collectionRate = totalDisbursed > 0 ? (totalRecovered / totalDisbursed) * 100 : 0;
  const totalDelinquentAmount = bouncedAmount + unpaidPastDueAmount;

  // Company Funding Breakdown
  const companies = await getCompanies();
  const companyFunding = companies.map((c) => ({
    name: c.name,
    shortCode: c.shortCode,
    isOutsideParty: c.isOutsideParty,
    totalFunded: c.totalFunded || 0,
    totalCollected: c.totalCollected || 0,
    outstanding: c.outstandingAmount || 0,
  })).filter((c) => (c.totalFunded || 0) > 0);

  // 7-day collection sparkline
  const sparkline = [45, 52, 58, 62, 70, 78, Math.round(collectionRate)];

  // Dynamic 6-month Trend
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const trendNow = new Date();
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(trendNow.getFullYear(), trendNow.getMonth() - i, 1);
    const mLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    const mIdx = d.getMonth();
    const yNum = d.getFullYear();

    let disbursed = 0;
    let collected = 0;
    loans.forEach((l) => {
      const loanDate = l.createdAt ? new Date(l.createdAt) : (l.startDate ? new Date(l.startDate) : null);
      if (loanDate && !isNaN(loanDate.getTime()) && loanDate.getFullYear() === yNum && loanDate.getMonth() === mIdx) {
        disbursed += Number(l.totalAmount || 0);
      }
      (l.installments || []).forEach((ins) => {
        const insDate = ins.recdDate ? new Date(ins.recdDate) : (ins.dueDate ? new Date(ins.dueDate) : null);
        if (insDate && !isNaN(insDate.getTime()) && insDate.getFullYear() === yNum && insDate.getMonth() === mIdx) {
          const st = String(ins.status || '').toUpperCase();
          if (['PASS', 'NEFT', 'CASH', 'PAID'].includes(st)) {
            collected += Number(ins.amountDue || 0);
          }
        }
      });
    });

    monthlyTrend.push({
      month: mLabel,
      disbursed,
      collected,
    });
  }

  return {
    heroMetric: {
      title: 'Total Outstanding Portfolio',
      value: totalOutstanding,
      label: 'Current active capital due across borrowers',
    },
    kpis: {
      totalDisbursed,
      totalRecovered,
      totalOutstanding,
      todayCollections,
      overdueAmount: totalDelinquentAmount,
      bouncedAmount,
      bouncedCount,
      unpaidPastDueAmount,
      unpaidPastDueCount,
      netProfitThisMonth: null, // Explicitly null for historical records
      isHistoricalOnly: true,
      collectionRate: Number(collectionRate.toFixed(1)),
      activeLoansCount: loans.filter((l) => l.status !== 'Closed').length,
      totalClients: loans.length,
    },
    portfolioHealth: {
      totalInstallments,
      onTimeCount,
      overdueCount: bouncedCount + unpaidPastDueCount,
      bouncedCount,
      unpaidPastDueCount,
      closedCount: onTimeCount,
      pendingCount,
      unclassifiedCount,
      onTimePercent: totalInstallments > 0 ? Number(((onTimeCount / totalInstallments) * 100).toFixed(1)) : 0,
      overduePercent: totalInstallments > 0 ? Number((((bouncedCount + unpaidPastDueCount) / totalInstallments) * 100).toFixed(1)) : 0,
      unclassifiedPercent: totalInstallments > 0 ? Number(((unclassifiedCount / totalInstallments) * 100).toFixed(1)) : 0,
    },
    companyFunding,
    sparkline,
    monthlyTrend,
    todaysSchedule,
  };
}

export async function resetAll(): Promise<void> {
  await ensureDbInitialized();
  const client = getTursoClient();
  await client.batch(
    [
      { sql: 'DELETE FROM installment_company_splits', args: [] },
      { sql: 'DELETE FROM installments', args: [] },
      { sql: 'DELETE FROM loan_company_splits', args: [] },
      { sql: 'DELETE FROM loans', args: [] },
      { sql: 'DELETE FROM customers', args: [] },
    ],
    'write'
  );
}
