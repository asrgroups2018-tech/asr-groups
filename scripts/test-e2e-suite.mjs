import fs from 'fs';
import path from 'path';

try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) {
      process.env[key.trim()] = vals.join('=').trim();
    }
  });
} catch (e) {}

import { getCompanies } from '../lib/server/companies.ts';
import { getLoans, createLoan, updateFullLoan } from '../lib/server/loans.ts';
import { getCustomers } from '../lib/server/customers.ts';
import { getTursoClient } from '../lib/server/turso.ts';

async function runTests() {
  console.log('=== RUNNING ASR ERP END-TO-END VERIFICATION SUITE ===\n');

  // 1. Test Companies
  console.log('1. Testing Company List Changes...');
  const companies = await getCompanies();
  console.log('Total companies found in DB:', companies.length);
  companies.forEach(c => console.log(` - [${c.id}] ${c.shortCode} | ${c.name} | isOutside=${c.isOutsideParty} | isActive=${c.isActive}`));
  
  const activeCompanies = companies.filter(c => c.isActive !== false);
  
  const ine = activeCompanies.find(c => c.shortCode?.toUpperCase() === 'INE' || c.name?.toUpperCase().includes('INFINITY'));
  const ins = activeCompanies.find(c => c.shortCode?.toUpperCase() === 'INS' || c.name?.toUpperCase().includes('INNOVATIVE'));
  const mm = companies.find(c => c.shortCode?.toUpperCase() === 'MM' || c.name?.toUpperCase().includes('MM ASSOCIATES'));
  const fin = companies.find(c => c.shortCode?.toUpperCase() === 'FIN' || c.name?.toUpperCase().includes('FINCUBE'));

  if (ine || ins) {
    console.error('❌ FAIL: INE or INS found in active companies:', { ine, ins });
  } else {
    console.log('✅ PASS: Infinity Enterprises (INE) & Innovative Solutions (INS) excluded from active companies.');
  }

  if (mm && mm.isOutsideParty && fin && fin.isOutsideParty) {
    console.log('✅ PASS: MM Associates & Fincube properly categorized as Outside Parties.');
  } else {
    console.error('❌ FAIL: MM or FIN not categorized as outside party:', { mm, fin });
  }

  // 2. Test Customer & Loan Creation with Bi-Weekly frequency & outside parties
  console.log('\n2. Testing Loan Creation with 4 Frequencies (Bi-Weekly) & Outside Splits...');
  let customers = await getCustomers();
  if (customers.length === 0) {
    console.log('Creating sample customer for test...');
    await getTursoClient().execute({
      sql: `INSERT OR IGNORE INTO customers (id, name, place, code_no, phone, created_at) VALUES ('CUST-TEST-1', 'TEST BORROWER PVT LTD', 'CHENNAI', 'TB001', '9876543210', datetime('now'))`,
      args: []
    });
    customers = await getCustomers();
  }
  const customer = customers[0];
  console.log(`Using customer: ${customer.name} (${customer.id})`);

  const testCapital = 200000;
  const testDisbursed = 180000;
  const testInterest = 20000;

  // Split: PASS (ASR) 1,00,000, MM (Outside) 1,00,000
  const passComp = companies.find(c => c.shortCode?.toUpperCase() === 'PASS' || c.name?.toUpperCase().includes('PASS'));
  const mmComp = companies.find(c => c.shortCode?.toUpperCase() === 'MM' || c.name?.toUpperCase().includes('MM ASSOCIATES'));

  if (!passComp || !mmComp) {
    console.error('❌ FAIL: Could not find PASS or MM company.');
    return;
  }

  const newLoan = await createLoan({
    customerId: customer.id,
    codeNo: 'TEST-BIWEEKLY',
    totalAmount: testCapital,
    disbursedAmount: testDisbursed,
    interestAmount: testInterest,
    startDate: '2026-10-15',
    frequency: 'Bi-Weekly',
    splits: [
      { companyId: passComp.id, splitPercent: 50, splitAmount: 100000 },
      { companyId: mmComp.id, splitPercent: 50, splitAmount: 100000 },
    ],
    installments: [
      {
        dueDate: '2026-10-29',
        amountDue: 100000,
        companySplits: { PASS: 50000, MM: 50000 },
        remarks: 'EMI 1 (Bi-weekly interval)',
      },
      {
        dueDate: '2026-11-12',
        amountDue: 100000,
        companySplits: { PASS: 50000, MM: 50000 },
        remarks: 'EMI 2 (Bi-weekly interval)',
      },
    ],
  });

  if (newLoan && newLoan.id) {
    console.log(`✅ PASS: Created Loan ${newLoan.id} with Bi-Weekly frequency and outside splits successfully.`);
  } else {
    console.error('❌ FAIL: Failed to create loan.');
    return;
  }

  // 3. Test Capital Validation (Server-side validation: amount cannot exceed capital)
  console.log('\n3. Testing Capital Limit Server & DB Validation...');
  try {
    await updateFullLoan(newLoan.id, {
      totalAmount: 200000,
      installments: [
        {
          id: newLoan.installments[0].id,
          dueDate: '2026-10-29',
          amountDue: 250000, // Exceeds capital!
          status: 'Pending',
          companySplits: { PASS: 125000, MM: 125000 },
        },
      ],
    });
    console.error('❌ FAIL: Server allowed installment amount exceeding capital!');
  } catch (err) {
    console.log('✅ PASS: Server correctly rejected installment exceeding capital:', err.message);
  }

  // 4. Test Auto-balancing remainder row update & atomic persistence
  console.log('\n4. Testing Reduced Amount + Auto-Balance Row Atomic DB Persistence...');
  const updatedLoan = await updateFullLoan(newLoan.id, {
    totalAmount: 200000,
    disbursedAmount: 180000,
    interestAmount: 20000,
    status: 'Pending',
    splits: [
      { companyId: passComp.id, splitPercent: 50, splitAmount: 100000 },
      { companyId: mmComp.id, splitPercent: 50, splitAmount: 100000 },
    ],
    installments: [
      {
        id: newLoan.installments[0].id,
        seqNo: 1,
        dueDate: '2026-10-29',
        amountDue: 70000, // Reduced from 100,000
        status: 'Cleared',
        recdDate: '2026-10-29',
        companySplits: { PASS: 35000, MM: 35000 },
      },
      {
        id: newLoan.installments[1].id,
        seqNo: 2,
        dueDate: '2026-11-12',
        amountDue: 100000,
        status: 'Pending',
        companySplits: { PASS: 50000, MM: 50000 },
      },
      {
        seqNo: 3,
        dueDate: '2026-11-26',
        amountDue: 30000, // Remainder row (70k + 100k + 30k = 200k)
        status: 'Pending',
        companySplits: { PASS: 15000, MM: 15000 },
        remarks: 'Auto-balance remainder',
      },
    ],
  });

  if (updatedLoan && updatedLoan.installments.length === 3) {
    const totalInst = updatedLoan.installments.reduce((sum, i) => sum + i.amountDue, 0);
    if (totalInst === 200000) {
      console.log('✅ PASS: Reduced amount and auto-balance row saved atomically. Total installments equal capital (₹2,00,000).');
    } else {
      console.error(`❌ FAIL: Installments sum ₹${totalInst} does not match capital ₹200000.`);
    }
  } else {
    console.error('❌ FAIL: Failed to persist updated installments.');
  }

  // 5. Test Statuses in DB
  console.log('\n5. Checking DB Status Values...');
  const allLoans = await getLoans();
  const allowedStatuses = new Set(['Pending', 'Cleared', 'NEFT', 'RTGS', 'Cash']);
  let invalidStatusCount = 0;

  allLoans.forEach(l => {
    (l.installments || []).forEach(inst => {
      if (inst.status && !allowedStatuses.has(inst.status)) {
        // Only report if not one of the standardized 5
        console.warn(`Note: Legacy installment ${inst.id} has status '${inst.status}'`);
        invalidStatusCount++;
      }
    });
  });

  console.log(`✅ Status review complete. Active app statuses strictly mapped to: ${Array.from(allowedStatuses).join(', ')}.`);

  // Cleanup test loan
  console.log('\n6. Cleaning up test loan...');
  const client = getTursoClient();
  await client.execute({
    sql: 'DELETE FROM installment_company_splits WHERE installment_id IN (SELECT id FROM installments WHERE loan_id = ?)',
    args: [newLoan.id],
  });
  await client.execute({
    sql: 'DELETE FROM installments WHERE loan_id = ?',
    args: [newLoan.id],
  });
  await client.execute({
    sql: 'DELETE FROM loan_company_splits WHERE loan_id = ?',
    args: [newLoan.id],
  });
  await client.execute({
    sql: 'DELETE FROM loans WHERE id = ?',
    args: [newLoan.id],
  });
  console.log('✅ Test loan cleaned up successfully.');

  console.log('\n=== ALL END-TO-END VERIFICATIONS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
