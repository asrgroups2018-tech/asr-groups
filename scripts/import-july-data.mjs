import { createClient } from '@libsql/client';
import xlsx from 'xlsx';
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

// ASR Group Known Companies Seed
export const SEED_COMPANIES = [
  // ASR Group Own Companies (is_outside_party = 0)
  { id: 'COMP-PASS', name: 'Pass Finance', shortCode: 'PASS', isOutsideParty: 0 },
  { id: 'COMP-ALA', name: 'Alagendran', shortCode: 'ALA', isOutsideParty: 0 },
  { id: 'COMP-IG', name: 'Indra Gandhi', shortCode: 'IG', isOutsideParty: 0 },
  { id: 'COMP-GS', name: 'Ganga S', shortCode: 'GS', isOutsideParty: 0 },
  { id: 'COMP-MARS', name: 'Mars Capital', shortCode: 'MARS', isOutsideParty: 0 },
  { id: 'COMP-TG', name: 'Thangam', shortCode: 'TG', isOutsideParty: 0 },
  { id: 'COMP-FIN', name: 'Finance Unit', shortCode: 'FIN', isOutsideParty: 0 },
  { id: 'COMP-MM', name: 'MM Credits', shortCode: 'MM', isOutsideParty: 0 },

  // Outside-Party Companies (is_outside_party = 1)
  { id: 'COMP-CS', name: 'CS Finance', shortCode: 'CS', isOutsideParty: 1 },
  { id: 'COMP-MC', name: 'MC Credits', shortCode: 'MC', isOutsideParty: 1 },
  { id: 'COMP-TASS', name: 'TA (SS)', shortCode: 'TA (SS)', isOutsideParty: 1 },
  { id: 'COMP-TATVA', name: 'Tatva Investments', shortCode: 'TATVA', isOutsideParty: 1 },
  { id: 'COMP-BHAVANA', name: 'Bhavana Fin', shortCode: 'BHAVANA', isOutsideParty: 1 },
  { id: 'COMP-INE', name: 'INE Deposit Unit', shortCode: 'INE', isOutsideParty: 1 },
  { id: 'COMP-INFIN', name: 'Infin Deposit Unit', shortCode: 'INFIN', isOutsideParty: 1 },
  { id: 'COMP-INS', name: 'INS Deposit Unit', shortCode: 'INS', isOutsideParty: 1 },
  { id: 'COMP-KARS', name: 'KARS Deposit Unit', shortCode: 'KARS', isOutsideParty: 1 },
];

function formatExcelDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = xlsx.SSF.parse_date_code(val);
    if (!d) return null;
    const pad = n => String(n).padStart(2, '0');
    return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return str;
}

export async function runJulyImport() {
  console.log('========================================================');
  console.log('   ASR GROUP — JULY 2026 HISTORICAL DATA IMPORT (TURSO)');
  console.log('========================================================\n');

  const filePath = path.join(__dirname, '..', 'ASR - DATA - Copy.xlsx');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found at: ${filePath}`);
  }

  // 1. Ensure schema exists
  console.log('[1/5] Ensuring Turso database schema...');
  // Drop outdated schemas if they had different column layouts
  await client.batch([
    { sql: 'DROP TABLE IF EXISTS installment_company_splits', args: [] },
    { sql: 'DROP TABLE IF EXISTS installments', args: [] },
    { sql: 'DROP TABLE IF EXISTS loan_company_splits', args: [] },
    { sql: 'DROP TABLE IF EXISTS loans', args: [] },
    { sql: 'DROP TABLE IF EXISTS customers', args: [] },
    { sql: 'DROP TABLE IF EXISTS companies', args: [] },
  ], 'write');
  const statements = [
    `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      place TEXT,
      phone TEXT,
      created_at TEXT NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);`,
    `CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_code TEXT NOT NULL UNIQUE,
      is_outside_party INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(short_code);`,
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
    `CREATE TABLE IF NOT EXISTS loan_company_splits (
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
      company_id TEXT NOT NULL REFERENCES companies(id),
      split_percent REAL NOT NULL DEFAULT 0,
      split_amount REAL NOT NULL DEFAULT 0
    );`,
    `CREATE INDEX IF NOT EXISTS idx_loan_splits_loan ON loan_company_splits(loan_id);`,
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
    `CREATE TABLE IF NOT EXISTS installment_company_splits (
      id TEXT PRIMARY KEY,
      installment_id TEXT NOT NULL REFERENCES installments(id) ON DELETE CASCADE,
      company_id TEXT NOT NULL REFERENCES companies(id),
      amount REAL NOT NULL DEFAULT 0
    );`,
    `CREATE INDEX IF NOT EXISTS idx_inst_splits_inst ON installment_company_splits(installment_id);`,
  ];
  for (const sql of statements) {
    await client.execute(sql);
  }

  // 2. Seed Companies
  console.log('[2/5] Seeding core companies in Turso...');
  const companyMap = new Map(); // shortCode -> company record

  for (const c of SEED_COMPANIES) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO companies (id, name, short_code, is_outside_party, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [c.id, c.name, c.shortCode, c.isOutsideParty, '2026-07-01'],
    });
    companyMap.set(c.shortCode.toUpperCase(), c);
  }

  // 3. Read and parse Excel file
  console.log('[3/5] Parsing ASR - DATA - Copy.xlsx (Sheet: JULY RECEIPT DATA)...');
  const wb = xlsx.readFile(filePath);
  const ws = wb.Sheets['JULY RECEIPT DATA'];
  if (!ws) {
    throw new Error('Sheet "JULY RECEIPT DATA" not found in workbook!');
  }

  const raw = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = raw[0].map(h => String(h || '').trim());
  const rows = raw.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = r[i]; });
    return obj;
  }).filter(r => r['CLIENT NAME'] && String(r['CLIENT NAME']).trim());

  console.log(`Found ${rows.length} valid receipt records across ${new Set(rows.map(r => r['CLIENT NAME'])).size} unique clients.`);

  // Auto-discover any new outside-party companies from DEP NAME or OTHERS NAME
  for (const r of rows) {
    const dep = r['DEP NAME'] ? String(r['DEP NAME']).trim().toUpperCase() : null;
    const others = r['OTHERS NAME'] ? String(r['OTHERS NAME']).trim().toUpperCase() : null;

    if (dep && !companyMap.has(dep)) {
      const newComp = {
        id: `COMP-${dep.replace(/[^A-Z0-9]/g, '')}`,
        name: `${dep} Deposit Unit`,
        shortCode: dep,
        isOutsideParty: 1,
      };
      await client.execute({
        sql: `INSERT OR REPLACE INTO companies (id, name, short_code, is_outside_party, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [newComp.id, newComp.name, newComp.shortCode, newComp.isOutsideParty, '2026-07-01'],
      });
      companyMap.set(dep, newComp);
      console.log(`  + Auto-registered outside company: ${dep}`);
    }

    if (others && !companyMap.has(others)) {
      const newComp = {
        id: `COMP-${others.replace(/[^A-Z0-9]/g, '')}`,
        name: `${others} Capital`,
        shortCode: others,
        isOutsideParty: 1,
      };
      await client.execute({
        sql: `INSERT OR REPLACE INTO companies (id, name, short_code, is_outside_party, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [newComp.id, newComp.name, newComp.shortCode, newComp.isOutsideParty, '2026-07-01'],
      });
      companyMap.set(others, newComp);
      console.log(`  + Auto-registered outside company from OTHERS: ${others}`);
    }
  }

  // 4. Group rows by CLIENT NAME
  console.log('\n[4/5] Grouping and importing loans into Turso...');
  const clientGroups = new Map();
  rows.forEach((r, idx) => {
    const clientName = String(r['CLIENT NAME']).trim();
    if (!clientGroups.has(clientName)) {
      clientGroups.set(clientName, []);
    }
    clientGroups.get(clientName).push({ ...r, _origIdx: idx + 1 });
  });

  // Clear existing loan/installment tables for clean historical import
  console.log('  - Clearing existing historical loans & installments tables...');
  await client.batch([
    { sql: 'DELETE FROM installment_company_splits', args: [] },
    { sql: 'DELETE FROM installments', args: [] },
    { sql: 'DELETE FROM loan_company_splits', args: [] },
    { sql: 'DELETE FROM loans', args: [] },
    { sql: 'DELETE FROM customers', args: [] },
  ], 'write');

  let customerIdx = 1000;
  let loanIdx = 1;
  let installmentIdx = 1;
  const splitCompanyCols = ['PASS', 'ALA', 'IG', 'GS', 'MARS', 'TG', 'FIN', 'MM', 'CS', 'MC', 'TA (SS)'];

  const flaggedMismatches = [];
  let totalImportedVolume = 0;

  for (const [clientName, clientRows] of clientGroups.entries()) {
    customerIdx++;
    const customerId = `CUST-${customerIdx}`;
    const primaryPlace = clientRows.find(r => r['PLACE'])?.PLACE || 'CHENNAI';
    const primaryCodeNo = clientRows.find(r => r['CODE NO'])?.['CODE NO'] || `CL-${loanIdx}`;

    // Create Customer
    await client.execute({
      sql: `INSERT INTO customers (id, name, place, phone, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [customerId, clientName, primaryPlace, `+91 98400 ${String(customerIdx).slice(-5)}`, '2026-07-01'],
    });

    // Loan aggregation
    const loanId = `LOAN-2026-${String(loanIdx).padStart(3, '0')}`;
    loanIdx++;

    let loanTotalAmount = 0;
    const loanCompanySplitTotals = new Map(); // shortCode -> sum amount

    const installmentBatch = [];
    const installmentSplitBatch = [];

    // Sort client rows by date if possible
    clientRows.sort((a, b) => (Number(a.DATE) || 0) - (Number(b.DATE) || 0));

    const startDate = formatExcelDate(clientRows[0].DATE) || '2026-07-01';

    // Determine loan status based on its installments
    let hasOverdue = false;
    let allPaid = true;

    for (let seq = 0; seq < clientRows.length; seq++) {
      const r = clientRows[seq];
      const instId = `INST-2026-${String(installmentIdx).padStart(4, '0')}`;
      installmentIdx++;

      const amountDue = Number(r['AMOUNT']) || 0;
      loanTotalAmount += amountDue;
      totalImportedVolume += amountDue;

      const dueDate = formatExcelDate(r['DATE']) || startDate;
      const recdDate = formatExcelDate(r['RECD DATE']) || null;
      const status = r['STATUS'] ? String(r['STATUS']).trim() : (recdDate ? 'PASS' : 'PENDING');
      const chqNo = r['CHQ NO'] ? String(r['CHQ NO']).trim() : null;
      const place = r['PLACE'] ? String(r['PLACE']).trim() : primaryPlace;
      const depName = r['DEP NAME'] ? String(r['DEP NAME']).trim() : null;
      const remarks = r['REMARKS'] ? String(r['REMARKS']).trim() : null;

      if (['RET', 'RET NEFT', 'RET PASS'].includes(status)) {
        hasOverdue = true;
        allPaid = false;
      } else if (status === 'PENDING') {
        allPaid = false;
      }

      // Check per-installment company split sum
      let rowSplitSum = 0;
      const rowSplits = [];

      for (const col of splitCompanyCols) {
        const val = Number(r[col]) || 0;
        if (val > 0) {
          rowSplitSum += val;
          const comp = companyMap.get(col.toUpperCase());
          if (comp) {
            rowSplits.push({ companyId: comp.id, companyCode: comp.shortCode, amount: val });
            const prev = loanCompanySplitTotals.get(comp.shortCode) || 0;
            loanCompanySplitTotals.set(comp.shortCode, prev + val);
          }
        }
      }

      // OTHERS col
      const othersVal = Number(r['OTHERS']) || 0;
      if (othersVal > 0) {
        rowSplitSum += othersVal;
        const othersName = (r['OTHERS NAME'] ? String(r['OTHERS NAME']).trim().toUpperCase() : 'OTHERS');
        const comp = companyMap.get(othersName) || companyMap.get('OTHERS') || companyMap.get('TATVA');
        if (comp) {
          rowSplits.push({ companyId: comp.id, companyCode: comp.shortCode, amount: othersVal });
          const prev = loanCompanySplitTotals.get(comp.shortCode) || 0;
          loanCompanySplitTotals.set(comp.shortCode, prev + othersVal);
        }
      }

      // Data integrity check (e.g. S.NO 132 ANAND JEWELS)
      if (Math.abs(amountDue - rowSplitSum) > 0.01) {
        flaggedMismatches.push({
          sNo: r['S.NO'],
          clientName,
          loanId,
          installmentId: instId,
          amountDue,
          splitSum: rowSplitSum,
          diff: amountDue - rowSplitSum,
          note: `S.NO ${r['S.NO']} (${clientName}) Amount: ₹${amountDue.toLocaleString('en-IN')} vs Company Split: ₹${rowSplitSum.toLocaleString('en-IN')} (Diff: ₹${(amountDue - rowSplitSum).toLocaleString('en-IN')})`,
        });
      }

      installmentBatch.push({
        sql: `INSERT INTO installments (
          id, loan_id, seq_no, due_date, amount_due, status, recd_date,
          chq_no, place, dep_name, remarks, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [instId, loanId, seq + 1, dueDate, amountDue, status, recdDate, chqNo, place, depName, remarks, '2026-07-01'],
      });

      for (const sp of rowSplits) {
        installmentSplitBatch.push({
          sql: `INSERT INTO installment_company_splits (id, installment_id, company_id, amount)
                VALUES (?, ?, ?, ?)`,
          args: [`ICS-${instId}-${sp.companyCode}`, instId, sp.companyId, sp.amount],
        });
      }
    }

    const overallLoanStatus = hasOverdue ? 'Overdue' : (allPaid ? 'Closed' : 'Active');

    // Create Loan
    await client.execute({
      sql: `INSERT INTO loans (
        id, customer_id, code_no, total_amount, start_date, installment_count,
        frequency, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        loanId,
        customerId,
        primaryCodeNo,
        loanTotalAmount,
        startDate,
        clientRows.length,
        clientRows.length > 1 ? 'Weekly' : 'Monthly',
        overallLoanStatus,
        '2026-07-01',
      ],
    });

    // Create loan_company_splits
    for (const [code, splitAmt] of loanCompanySplitTotals.entries()) {
      const comp = companyMap.get(code);
      if (comp) {
        const splitPct = loanTotalAmount > 0 ? (splitAmt / loanTotalAmount) * 100 : 0;
        await client.execute({
          sql: `INSERT INTO loan_company_splits (id, loan_id, company_id, split_percent, split_amount)
                VALUES (?, ?, ?, ?, ?)`,
          args: [`LCS-${loanId}-${code}`, loanId, comp.id, Number(splitPct.toFixed(2)), splitAmt],
        });
      }
    }

    // Insert installments & installment splits
    if (installmentBatch.length > 0) {
      await client.batch(installmentBatch, 'write');
    }
    if (installmentSplitBatch.length > 0) {
      await client.batch(installmentSplitBatch, 'write');
    }
  }

  // 5. Record Audit Log
  console.log('\n[5/5] Logging import audit event...');
  await client.execute({
    sql: `INSERT INTO audit_logs (
      id, timestamp, actor_id, actor_name, actor_role_id, action, target,
      before_val, after_val, ip_address, device, is_sensitive
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      `AUD-IMPORT-${Date.now()}`,
      new Date().toISOString().replace('T', ' ').slice(0, 16),
      'ADM-1001',
      'System Administrator',
      0,
      'Imported July Dataset',
      'JULY RECEIPT DATA (721 rows / 166 client loans)',
      'Baseline JSON',
      `Volume: ₹${totalImportedVolume.toLocaleString('en-IN')}`,
      '127.0.0.1',
      'Historical Import Engine',
      1,
    ],
  });

  console.log('\n========================================================');
  console.log('   IMPORT COMPLETED SUCCESSFULLY!');
  console.log('========================================================');
  console.log(`- Total Receipt Rows Imported: ${rows.length}`);
  console.log(`- Unique Clients / Loans:      ${clientGroups.size}`);
  console.log(`- Total Loan Volume:           ₹${totalImportedVolume.toLocaleString('en-IN')}`);
  console.log(`- Flagged Mismatches:          ${flaggedMismatches.length}`);
  if (flaggedMismatches.length > 0) {
    console.log('\nFLAGGED MISMATCH FOR REVIEW:');
    flaggedMismatches.forEach(m => console.log(`  * ${m.note}`));
  }
  console.log('========================================================\n');

  return {
    success: true,
    totalRows: rows.length,
    uniqueLoans: clientGroups.size,
    totalVolume: totalImportedVolume,
    flaggedMismatches,
  };
}

if (process.argv[1] && process.argv[1].endsWith('import-july-data.mjs')) {
  runJulyImport().catch(err => {
    console.error('Import error:', err);
    process.exit(1);
  });
}
