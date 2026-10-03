import { createClient } from '@libsql/client';
import fs from 'fs';

let envUrl = process.env.TURSO_DATABASE_URL || 'file:local.db';
let envToken = process.env.TURSO_AUTH_TOKEN;

if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('TURSO_DATABASE_URL=')) envUrl = trimmed.replace('TURSO_DATABASE_URL=', '').replace(/["']/g, '');
    if (trimmed.startsWith('TURSO_AUTH_TOKEN=')) envToken = trimmed.replace('TURSO_AUTH_TOKEN=', '').replace(/["']/g, '');
  }
} else if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('TURSO_DATABASE_URL=')) envUrl = trimmed.replace('TURSO_DATABASE_URL=', '').replace(/["']/g, '');
    if (trimmed.startsWith('TURSO_AUTH_TOKEN=')) envToken = trimmed.replace('TURSO_AUTH_TOKEN=', '').replace(/["']/g, '');
  }
}

const client = createClient({ url: envUrl, authToken: envToken });

async function migrate() {
  console.log('--- Starting ASR Database Migration ---');

  // 1. Add bank column to installments if not exists
  try {
    await client.execute('ALTER TABLE installments ADD COLUMN bank TEXT');
    console.log('✓ Added bank column to installments table.');
  } catch (err) {
    if (String(err).includes('duplicate column') || String(err).includes('already exists')) {
      console.log('• bank column already exists in installments.');
    } else {
      console.log('Note on adding bank column:', err.message || err);
    }
  }

  // 2. Add is_active column to companies if not exists
  try {
    await client.execute('ALTER TABLE companies ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
    console.log('✓ Added is_active column to companies table.');
  } catch (err) {
    if (String(err).includes('duplicate column') || String(err).includes('already exists')) {
      console.log('• is_active column already exists in companies.');
    } else {
      console.log('Note on adding is_active column:', err.message || err);
    }
  }

  // 3. Move MM Associates and Fincube to Outside Parties (is_outside_party = 1)
  await client.execute(`
    UPDATE companies 
    SET is_outside_party = 1 
    WHERE id IN ('COMP-MM', 'COMP-FIN') 
       OR short_code IN ('MM', 'FIN')
       OR UPPER(name) LIKE '%MM ASSOCIATES%'
       OR UPPER(name) LIKE '%FINCUBE%'
  `);
  console.log('✓ Updated MM Associates and Fincube to Outside Parties (is_outside_party = 1).');

  // 4. Mark Infinity Enterprises and Innovative Solutions as inactive for new loans
  await client.execute(`
    UPDATE companies 
    SET is_active = 0 
    WHERE id IN ('COMP-INE', 'COMP-INS') 
       OR short_code IN ('INE', 'INS')
       OR UPPER(name) LIKE '%INFINITY ENTERPRISES%'
       OR UPPER(name) LIKE '%INNOVATIVE SOLUTIONS%'
  `);
  console.log('✓ Deactivated Infinity Enterprises and Innovative Solutions from active company list.');

  // 5. Migrate installment statuses to allowed statuses: Pending, Cleared, NEFT, RTGS, Cash
  // Cleared: PASS, CLS, PAID, CS, Paid
  await client.execute(`
    UPDATE installments 
    SET status = 'Cleared' 
    WHERE UPPER(status) IN ('PASS', 'CLS', 'PAID', 'CS', 'CLEARED', 'CLOSED', 'SETTLED')
  `);

  // NEFT: NEFT, RET NEFT
  await client.execute(`
    UPDATE installments 
    SET status = 'NEFT' 
    WHERE UPPER(status) IN ('NEFT', 'RET NEFT')
  `);

  // Cash: CASH
  await client.execute(`
    UPDATE installments 
    SET status = 'Cash' 
    WHERE UPPER(status) IN ('CASH', 'CSH')
  `);

  // RTGS: RTGS
  await client.execute(`
    UPDATE installments 
    SET status = 'RTGS' 
    WHERE UPPER(status) = 'RTGS'
  `);

  // Pending: PENDING, RET, RET PASS, and everything else
  await client.execute(`
    UPDATE installments 
    SET status = 'Pending' 
    WHERE status NOT IN ('Cleared', 'NEFT', 'RTGS', 'Cash')
  `);
  console.log('✓ Migrated all installment statuses to Pending, Cleared, NEFT, RTGS, Cash.');

  // 6. Migrate loan statuses: Cleared or Pending (or RTGS, NEFT, Cash)
  await client.execute(`
    UPDATE loans 
    SET status = 'Cleared' 
    WHERE UPPER(status) IN ('CLOSED', 'CLEARED', 'PAID', 'SETTLED')
  `);
  await client.execute(`
    UPDATE loans 
    SET status = 'Pending' 
    WHERE status NOT IN ('Cleared', 'NEFT', 'RTGS', 'Cash')
  `);
  console.log('✓ Migrated all loan statuses.');

  // Verify
  const compVerify = await client.execute('SELECT id, short_code, name, is_outside_party, is_active FROM companies');
  console.log('Companies post-migration:');
  console.table(compVerify.rows);

  const instStatusVerify = await client.execute('SELECT DISTINCT status, COUNT(*) as count FROM installments GROUP BY status');
  console.log('Installment status distribution post-migration:');
  console.table(instStatusVerify.rows);

  const loanStatusVerify = await client.execute('SELECT DISTINCT status, COUNT(*) as count FROM loans GROUP BY status');
  console.log('Loan status distribution post-migration:');
  console.table(loanStatusVerify.rows);

  console.log('--- Migration Completed Successfully ---');
}

migrate().catch(console.error);
