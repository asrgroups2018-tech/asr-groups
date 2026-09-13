import { createClient } from '@libsql/client';
import xlsx from 'xlsx';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const client = createClient({
  url: envVars.TURSO_DATABASE_URL,
  authToken: envVars.TURSO_AUTH_TOKEN,
});

function cleanKey(k) {
  return String(k || '').trim().toUpperCase();
}

function formatExcelDate(serial) {
  if (!serial) return '2026-07-01';
  if (typeof serial === 'string' && serial.includes('-')) return serial;
  const num = Number(serial);
  if (isNaN(num)) return '2026-07-01';
  const utc_days = Math.floor(num - 25569);
  const date_info = new Date(utc_days * 86400 * 1000);
  const year = date_info.getFullYear();
  const month = String(date_info.getMonth() + 1).padStart(2, '0');
  const day = String(date_info.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const normalizeCustomerName = (rawName) => {
  const n = String(rawName || '').trim().toUpperCase();
  if (n === 'CON CORD') return 'CON CORD VOYAGES';
  if (n === 'DSK HOSPITAL') return 'DSK HOSPITAL PVT LTD';
  if (n === 'DSM PROTIENS') return 'DSM PROTEINS';
  if (n === 'STEPUP 999') return 'STEP UP 999';
  if (n === 'OMKARFILLING') return 'OMKAR FILLING';
  if (n === 'IVL MATRIC') return 'IVL MATRIC HR SEC SCHOOL';
  if (n === 'AEDEN FRUIT') return 'AEDEN FRUITS INTERNATIONAL PVT LTD';
  return n;
};

export async function runUnmergeAndRenumberMigration() {
  console.log('====================================================');
  console.log('  STARTING UNMERGE & LOAN ID RENUMBERING MIGRATION  ');
  console.log('====================================================\n');

  const wb = xlsx.readFile('ASR - DATA - Copy.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = xlsx.utils.sheet_to_json(sheet);

  const cleanedRows = rawRows.map((r, idx) => {
    const obj = {};
    for (const [k, v] of Object.entries(r)) {
      obj[cleanKey(k)] = typeof v === 'string' ? v.trim() : v;
    }
    obj._rawIndex = idx + 2;
    obj.DATE_STR = formatExcelDate(obj.DATE);
    obj.AMOUNT_NUM = Number(obj.AMOUNT) || 0;
    obj.NORMALIZED_CLIENT = normalizeCustomerName(obj['CLIENT NAME']);
    return obj;
  });

  console.log(`Loaded ${cleanedRows.length} raw receipt rows from July dataset.`);

  // 1. Fetch Companies to map company codes to company IDs
  const companiesRes = await client.execute('SELECT * FROM companies');
  const companyCodeMap = new Map();
  companiesRes.rows.forEach(c => {
    companyCodeMap.set(String(c.short_code).toUpperCase(), String(c.id));
  });

  // Ensure default company map has keys
  const companyCols = [
    { key: 'PASS', code: 'PASS' },
    { key: 'ALA', code: 'ALA' },
    { key: 'IG', code: 'IG' },
    { key: 'GS', code: 'GS' },
    { key: 'MARS', code: 'MARS' },
    { key: 'TG', code: 'TG' },
    { key: 'FIN', code: 'FIN' },
    { key: 'MM', code: 'MM' },
    { key: 'CS', code: 'CS' },
    { key: 'MC', code: 'MC' },
    { key: 'TA (SS)', code: 'TA (SS)' },
    { key: 'TA(SS)', code: 'TA (SS)' },
  ];

  // 2. Partition rows into distinct unmerged loans
  const clientGroups = new Map();
  for (const r of cleanedRows) {
    const cname = r.NORMALIZED_CLIENT;
    if (!cname) continue;
    if (!clientGroups.has(cname)) clientGroups.set(cname, []);
    clientGroups.get(cname).push(r);
  }

  const unmergedLoanDefs = [];

  for (const [clientName, rows] of clientGroups.entries()) {
    rows.sort((a, b) => (Number(a.DATE) || 0) - (Number(b.DATE) || 0));

    // Handle specific multi-facility clients
    if (clientName === 'AEDEN FRUITS INTERNATIONAL PVT LTD') {
      // 4 distinct facility streams:
      // (1) Facility KL0029 Stream A (₹4.5L PASS+TASS, Chq 001268-001271)
      // (2) Facility KL0029 Stream B (₹2.0L GS+MARS, Chq 001239-001242)
      // (3) Facility KL0019 Stream A (₹3.0L PASS+IG, Chq 000996-001000)
      // (4) Facility KL0019 Stream B (₹3.5L ALA+GS+MARS, Chq 001014-001017, 000936)
      const kl29A = rows.filter(r => r['CODE NO'] === 'KL0029' && r.AMOUNT_NUM === 450000);
      const kl29B = rows.filter(r => r['CODE NO'] === 'KL0029' && r.AMOUNT_NUM === 200000);
      const kl19A = rows.filter(r => r['CODE NO'] === 'KL0019' && r.AMOUNT_NUM === 300000);
      const kl19B = rows.filter(r => r['CODE NO'] === 'KL0019' && r.AMOUNT_NUM === 350000);

      if (kl29A.length) unmergedLoanDefs.push({ clientName, codeNo: 'KL0029', place: kl29A[0].PLACE || 'KL', rows: kl29A });
      if (kl29B.length) unmergedLoanDefs.push({ clientName, codeNo: 'KL0029', place: kl29B[0].PLACE || 'KL', rows: kl29B });
      if (kl19A.length) unmergedLoanDefs.push({ clientName, codeNo: 'KL0019', place: kl19A[0].PLACE || 'KERALA', rows: kl19A });
      if (kl19B.length) unmergedLoanDefs.push({ clientName, codeNo: 'KL0019', place: kl19B[0].PLACE || 'KERALA', rows: kl19B });
    } else if (clientName === 'THE BELL MATCH COMPANY') {
      // 8 distinct facility codes (BMC004 to BMC0011)
      const byCode = new Map();
      rows.forEach(r => {
        const c = r['CODE NO'] || 'BMC004';
        if (!byCode.has(c)) byCode.set(c, []);
        byCode.get(c).push(r);
      });
      for (const [c, cRows] of byCode.entries()) {
        unmergedLoanDefs.push({ clientName, codeNo: c, place: cRows[0].PLACE || 'SIVAKASI', rows: cRows });
      }
    } else if (clientName === 'JAI SRI KRISHNAR TEXTILES') {
      // 3 distinct facilities: TN0067 (IG), TN0068 (MARS), TN0069 (GS)
      // 2 installment rows per week (8 EMIs each)
      const byCode = new Map();
      rows.forEach(r => {
        const c = r['CODE NO'] || 'TN0067';
        if (!byCode.has(c)) byCode.set(c, []);
        byCode.get(c).push(r);
      });
      for (const [c, cRows] of byCode.entries()) {
        unmergedLoanDefs.push({ clientName, codeNo: c, place: cRows[0].PLACE || 'AMBATTUR', rows: cRows });
      }
    } else if (clientName === 'CON CORD VOYAGES') {
      // 2 facility codes: KL0001 (5 EMIs) and KL0034 (2 EMIs)
      const byCode = new Map();
      rows.forEach(r => {
        const c = r['CODE NO'] || 'KL0001';
        if (!byCode.has(c)) byCode.set(c, []);
        byCode.get(c).push(r);
      });
      for (const [c, cRows] of byCode.entries()) {
        unmergedLoanDefs.push({ clientName, codeNo: c, place: cRows[0].PLACE || 'KERALA', rows: cRows });
      }
    } else if (clientName === 'DSK HOSPITAL PVT LTD') {
      // 2 facility codes: TN0002 (2 EMIs) and TN0045 (1 EMI)
      const byCode = new Map();
      rows.forEach(r => {
        const c = r['CODE NO'] || 'TN0002';
        if (!byCode.has(c)) byCode.set(c, []);
        byCode.get(c).push(r);
      });
      for (const [c, cRows] of byCode.entries()) {
        unmergedLoanDefs.push({ clientName, codeNo: c, place: cRows[0].PLACE || 'CHENNAI', rows: cRows });
      }
    } else if (clientName === 'DSM PROTEINS') {
      // TN0050, TN0051, TN0074
      const byCode = new Map();
      rows.forEach(r => {
        const c = r['CODE NO'] || 'TN0050';
        if (!byCode.has(c)) byCode.set(c, []);
        byCode.get(c).push(r);
      });
      for (const [c, cRows] of byCode.entries()) {
        unmergedLoanDefs.push({ clientName, codeNo: c, place: cRows[0].PLACE || 'CHENNAI', rows: cRows });
      }
    } else if (clientName === 'CEE KEY GOLD & DIAMONDS') {
      const streamA = rows.filter(r => r['DEP NAME'] === 'PASS');
      const streamB = rows.filter(r => r['DEP NAME'] === 'ALA');
      unmergedLoanDefs.push({ clientName, codeNo: streamA[0]['CODE NO'], place: streamA[0].PLACE, rows: streamA });
      unmergedLoanDefs.push({ clientName, codeNo: streamB[0]['CODE NO'], place: streamB[0].PLACE, rows: streamB });
    } else if (clientName === 'TRIVANDRUM MOTORS P LTD') {
      const streamA = rows.filter(r => r.AMOUNT_NUM === 300000);
      const streamB = rows.filter(r => r.AMOUNT_NUM === 250000);
      unmergedLoanDefs.push({ clientName, codeNo: streamA[0]['CODE NO'], place: streamA[0].PLACE, rows: streamA });
      unmergedLoanDefs.push({ clientName, codeNo: streamB[0]['CODE NO'], place: streamB[0].PLACE, rows: streamB });
    } else if (clientName === 'WINNER ENTERPRISE') {
      const streamA = rows.filter(r => r['CHQ NO'] && String(r['CHQ NO']).startsWith('00015'));
      const streamB = rows.filter(r => r['CHQ NO'] && String(r['CHQ NO']).startsWith('00016'));
      unmergedLoanDefs.push({ clientName, codeNo: streamA[0]['CODE NO'], place: streamA[0].PLACE, rows: streamA });
      unmergedLoanDefs.push({ clientName, codeNo: streamB[0]['CODE NO'], place: streamB[0].PLACE, rows: streamB });
    } else if (clientName === 'MUKKU AND COMPANY') {
      const streamA = rows.filter(r => r.AMOUNT_NUM === 100000);
      const streamB = rows.filter(r => r.AMOUNT_NUM === 200000 || r.AMOUNT_NUM === 20000);
      unmergedLoanDefs.push({ clientName, codeNo: streamA[0]['CODE NO'], place: streamA[0].PLACE, rows: streamA });
      unmergedLoanDefs.push({ clientName, codeNo: streamB[0]['CODE NO'], place: streamB[0].PLACE, rows: streamB });
    } else if (clientName === 'STAR GLASS HOUSE') {
      const dailyStream = rows.filter(r => r.AMOUNT_NUM === 30000);
      const weeklyStream = rows.filter(r => r.AMOUNT_NUM !== 30000);
      unmergedLoanDefs.push({ clientName, codeNo: dailyStream[0]['CODE NO'], place: dailyStream[0].PLACE, rows: dailyStream });
      unmergedLoanDefs.push({ clientName, codeNo: weeklyStream[0]['CODE NO'], place: weeklyStream[0].PLACE, rows: weeklyStream });
    } else if (clientName === 'RAAM GADA CENTRE') {
      const streamA = rows.filter(r => r['DEP NAME'] === 'ALA');
      const streamB = rows.filter(r => r['DEP NAME'] === 'PASS');
      unmergedLoanDefs.push({ clientName, codeNo: streamA[0]['CODE NO'], place: streamA[0].PLACE, rows: streamA });
      unmergedLoanDefs.push({ clientName, codeNo: streamB[0]['CODE NO'], place: streamB[0].PLACE, rows: streamB });
    } else if (clientName === 'FRESH DAIRY PRODUCT INDIA P LTD') {
      const streamKars = rows.filter(r => r['DEP NAME'] === 'KARS');
      const streamPass = rows.filter(r => r['DEP NAME'] === 'PASS');
      const streamIns = rows.filter(r => r['DEP NAME'] === 'INS');
      unmergedLoanDefs.push({ clientName, codeNo: streamKars[0]['CODE NO'], place: streamKars[0].PLACE, rows: streamKars });
      unmergedLoanDefs.push({ clientName, codeNo: streamPass[0]['CODE NO'], place: streamPass[0].PLACE, rows: streamPass });
      unmergedLoanDefs.push({ clientName, codeNo: streamIns[0]['CODE NO'], place: streamIns[0].PLACE, rows: streamIns });
    } else if (clientName === 'HGV FOODS P LTD') {
      ['PASS', 'GS', 'IG', 'MARS', 'ALA'].forEach(dep => {
        const sRows = rows.filter(r => r['DEP NAME'] === dep);
        if (sRows.length > 0) unmergedLoanDefs.push({ clientName, codeNo: sRows[0]['CODE NO'], place: sRows[0].PLACE, rows: sRows });
      });
    } else if (clientName === 'BVP COATINGS P LTD') {
      ['PASS', 'GS', 'IG', 'ALA', 'MARS'].forEach(dep => {
        const sRows = rows.filter(r => r['DEP NAME'] === dep);
        if (sRows.length > 0) unmergedLoanDefs.push({ clientName, codeNo: sRows[0]['CODE NO'], place: sRows[0].PLACE, rows: sRows });
      });
    } else if (clientName === 'PADMANABAN NATARAJAN') {
      ['IG', 'PASS', 'ALA', 'MARS', 'GS'].forEach(dep => {
        const sRows = rows.filter(r => r['DEP NAME'] === dep);
        if (sRows.length > 0) unmergedLoanDefs.push({ clientName, codeNo: sRows[0]['CODE NO'], place: sRows[0].PLACE, rows: sRows });
      });
    } else if (clientName === 'PADMANADAN') {
      ['ALA', 'GS', 'IG', 'PASS'].forEach(dep => {
        const sRows = rows.filter(r => r['DEP NAME'] === dep);
        if (sRows.length > 0) unmergedLoanDefs.push({ clientName, codeNo: sRows[0]['CODE NO'], place: sRows[0].PLACE, rows: sRows });
      });
    } else if (['AFCOM HOLDING LIMITED', 'CLASSIC MOBILES', 'KSR REALTY', 'MD GARMENTS GOLD', 'SIMPLE RESOLUTIONS', 'SUNRISE', 'VENUS SURGICALS', 'VISHNU PRASAD RESEARCH CENTRE', 'UTSARVA JEWELS'].includes(clientName)) {
      // Multi-tranche / bullet notes
      if (clientName === 'UTSARVA JEWELS') {
        const streamA = rows.filter(r => r.FIN > 0);
        const streamB = rows.filter(r => !r.FIN);
        unmergedLoanDefs.push({ clientName, codeNo: streamA[0]['CODE NO'], place: streamA[0].PLACE, rows: streamA });
        unmergedLoanDefs.push({ clientName, codeNo: streamB[0]['CODE NO'], place: streamB[0].PLACE, rows: streamB });
      } else {
        rows.forEach(r => {
          unmergedLoanDefs.push({ clientName, codeNo: r['CODE NO'], place: r.PLACE, rows: [r] });
        });
      }
    } else {
      // Standard single loan
      unmergedLoanDefs.push({ clientName, codeNo: rows[0]['CODE NO'], place: rows[0].PLACE, rows });
    }
  }

  console.log(`Total Unmerged Loans Identified: ${unmergedLoanDefs.length}`);

  // Sort unmerged loans in chronological order (start_date ASC, clientName ASC)
  unmergedLoanDefs.forEach(l => {
    l.startDate = l.rows[0].DATE_STR;
    l.totalAmount = l.rows.reduce((s, r) => s + r.AMOUNT_NUM, 0);
  });
  unmergedLoanDefs.sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
    return a.clientName.localeCompare(b.clientName);
  });

  // 3. Create Clean Customers Map
  const uniqueCustomerNames = Array.from(new Set(unmergedLoanDefs.map(l => l.clientName)));
  const customerIdMap = new Map();
  const customerStatements = [];

  uniqueCustomerNames.forEach((cname, idx) => {
    const cid = `CUST-${String(idx + 1).padStart(4, '0')}`;
    customerIdMap.set(cname, cid);
    const place = unmergedLoanDefs.find(l => l.clientName === cname)?.place || 'CHENNAI';
    customerStatements.push({
      sql: `INSERT INTO customers (id, name, place, phone, created_at) VALUES (?, ?, ?, ?, ?)`,
      args: [cid, cname, place, `+91 98400 ${String(idx + 1).padStart(5, '0')}`, '2026-07-01']
    });
  });

  // 4. Build Loans, Installments, Splits Statements
  const loanStatements = [];
  const installmentStatements = [];
  const loanSplitStatements = [];
  const installmentSplitStatements = [];

  let instCounter = 1;

  unmergedLoanDefs.forEach((loanDef, idx) => {
    const loanId = `LN2026${String(idx + 1).padStart(4, '0')}`;
    loanDef.assignedLoanId = loanId;
    const customerId = customerIdMap.get(loanDef.clientName);
    const startDate = loanDef.startDate;
    const totalAmount = loanDef.totalAmount;
    const installmentCount = loanDef.rows.length;
    const frequency = installmentCount >= 20 ? 'Daily' : installmentCount >= 2 ? 'Weekly' : 'Monthly';

    // Status: Check installments
    const hasOverdue = loanDef.rows.some(r => ['RET', 'RET NEFT', 'RET PASS', 'OVERDUE'].includes(String(r.STATUS || '').toUpperCase()));
    const allPaid = loanDef.rows.every(r => ['PASS', 'NEFT', 'CASH', 'PAID'].includes(String(r.STATUS || '').toUpperCase()));
    const status = hasOverdue ? 'Overdue' : allPaid ? 'Closed' : 'Active';

    loanStatements.push({
      sql: `INSERT INTO loans (id, customer_id, code_no, total_amount, start_date, installment_count, frequency, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [loanId, customerId, loanDef.codeNo || `CL-${idx + 1}`, totalAmount, startDate, installmentCount, frequency, status, '2026-07-01']
    });

    // Aggregate overall loan company splits
    const companyTotals = new Map();

    loanDef.rows.forEach((r, sIdx) => {
      const instId = `INST-2026-${String(instCounter).padStart(4, '0')}`;
      instCounter++;

      const amountDue = r.AMOUNT_NUM;
      const dueDate = r.DATE_STR;
      const st = String(r.STATUS || 'PENDING').trim().toUpperCase();
      const chqNo = r['CHQ NO'] ? String(r['CHQ NO']).trim() : null;
      const place = r.PLACE ? String(r.PLACE).trim() : 'CHENNAI';
      const depName = r['DEP NAME'] ? String(r['DEP NAME']).trim() : null;
      const remarks = r.REMARKS ? String(r.REMARKS).trim() : null;
      const recdDate = ['PASS', 'NEFT', 'CASH', 'PAID'].includes(st) ? dueDate : null;

      installmentStatements.push({
        sql: `INSERT INTO installments (id, loan_id, seq_no, due_date, amount_due, status, recd_date, chq_no, place, dep_name, remarks, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [instId, loanId, sIdx + 1, dueDate, amountDue, st, recdDate, chqNo, place, depName, remarks, '2026-07-01']
      });

      // Installment company splits
      companyCols.forEach(col => {
        const amt = Number(r[col.key]) || 0;
        if (amt > 0) {
          const compId = companyCodeMap.get(col.code);
          if (compId) {
            companyTotals.set(compId, (companyTotals.get(compId) || 0) + amt);
            installmentSplitStatements.push({
              sql: `INSERT INTO installment_company_splits (id, installment_id, company_id, amount) VALUES (?, ?, ?, ?)`,
              args: [`ICS-${instId}-${col.code}`, instId, compId, amt]
            });
          }
        }
      });
    });

    // Loan Company Splits
    for (const [compId, compAmt] of companyTotals.entries()) {
      const splitPct = totalAmount > 0 ? (compAmt / totalAmount) * 100 : 0;
      loanSplitStatements.push({
        sql: `INSERT INTO loan_company_splits (id, loan_id, company_id, split_percent, split_amount) VALUES (?, ?, ?, ?, ?)`,
        args: [`LCS-${loanId}-${compId}`, loanId, compId, Number(splitPct.toFixed(2)), compAmt]
      });
    }
  });

  console.log(`Generated Statements:`);
  console.log(`  - Customers: ${customerStatements.length}`);
  console.log(`  - Loans: ${loanStatements.length} (${unmergedLoanDefs[0].assignedLoanId} to ${unmergedLoanDefs[unmergedLoanDefs.length - 1].assignedLoanId})`);
  console.log(`  - Installments: ${installmentStatements.length}`);
  console.log(`  - Loan Company Splits: ${loanSplitStatements.length}`);
  console.log(`  - Installment Company Splits: ${installmentSplitStatements.length}`);

  // 5. Execute Atomic Migration
  console.log('\nExecuting atomic database rewrite in Turso...');

  // Clear existing loan & customer tables cleanly
  await client.batch([
    { sql: 'DELETE FROM installment_company_splits', args: [] },
    { sql: 'DELETE FROM installments', args: [] },
    { sql: 'DELETE FROM loan_company_splits', args: [] },
    { sql: 'DELETE FROM loans', args: [] },
    { sql: 'DELETE FROM customers', args: [] },
  ], 'write');

  // Insert in batches of 100 to avoid packet size limits
  const allInserts = [
    ...customerStatements,
    ...loanStatements,
    ...installmentStatements,
    ...loanSplitStatements,
    ...installmentSplitStatements,
  ];

  const BATCH_SIZE = 100;
  for (let i = 0; i < allInserts.length; i += BATCH_SIZE) {
    const batch = allInserts.slice(i, i + BATCH_SIZE);
    await client.batch(batch, 'write');
  }

  // 6. Record Audit Log Entry
  const auditId = `AUD-UNMERGE-MIGRATION-${Date.now()}`;
  await client.execute({
    sql: `INSERT INTO audit_logs (id, timestamp, actor_id, actor_name, actor_role_id, action, target, before_val, after_val, ip_address, device, is_sensitive)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      auditId,
      new Date().toISOString().replace('T', ' ').slice(0, 19),
      'ADM-1001',
      'System Administrator (Super User)',
      0,
      'Unmerged & Renumbered Loans',
      `Full July Portfolio Migration (${unmergedLoanDefs.length} distinct loans)`,
      '166 merged loans (LOAN-2026-001 to LOAN-2026-166)',
      `${unmergedLoanDefs.length} unmerged loans (${unmergedLoanDefs[0].assignedLoanId} to ${unmergedLoanDefs[unmergedLoanDefs.length - 1].assignedLoanId})`,
      '127.0.0.1',
      'System Migration Script',
      1
    ]
  });

  // 7. Verify Integrity
  console.log('\nVerifying database integrity...');
  const verifyLoans = await client.execute('SELECT COUNT(*) as count FROM loans');
  const verifyInsts = await client.execute('SELECT COUNT(*) as count, SUM(amount_due) as total FROM installments');
  const verifyCusts = await client.execute('SELECT COUNT(*) as count FROM customers');

  console.log(`  ✓ Loans: ${verifyLoans.rows[0].count}`);
  console.log(`  ✓ Installments: ${verifyInsts.rows[0].count} | Total Volume: ₹${Number(verifyInsts.rows[0].total).toLocaleString('en-IN')}`);
  console.log(`  ✓ Customers: ${verifyCusts.rows[0].count}`);

  console.log('\n====================================================');
  console.log('  MIGRATION COMPLETED SUCCESSFULLY!                ');
  console.log('====================================================\n');
}

if (process.argv[1] && process.argv[1].includes('migrate-unmerge-and-renumber.mjs')) {
  runUnmergeAndRenumberMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
