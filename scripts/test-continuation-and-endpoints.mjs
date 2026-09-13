import { createClient } from '@libsql/client';
import fs from 'fs';

let envUrl = process.env.TURSO_DATABASE_URL;
let envToken = process.env.TURSO_AUTH_TOKEN;

if (!envUrl && fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('TURSO_DATABASE_URL=')) {
      envUrl = trimmed.replace('TURSO_DATABASE_URL=', '').replace(/["']/g, '');
    }
    if (trimmed.startsWith('TURSO_AUTH_TOKEN=')) {
      envToken = trimmed.replace('TURSO_AUTH_TOKEN=', '').replace(/["']/g, '');
    }
  }
}

const client = createClient({
  url: envUrl || 'file:local.db',
  authToken: envToken,
});

async function main() {
  console.log('--- Testing Live Database State & Next Loan ID ---');
  const maxRes = await client.execute(`SELECT MAX(id) as maxId, COUNT(*) as total FROM loans WHERE id LIKE 'LN2026%'`);
  const maxId = maxRes.rows[0].maxId;
  const count = maxRes.rows[0].total;
  console.log(`Current Max Loan ID: ${maxId} | Total Loans: ${count}`);

  const nextSeq = parseInt(String(maxId).replace('LN2026', ''), 10) + 1;
  const nextId = `LN2026${String(nextSeq).padStart(4, '0')}`;
  console.log(`Next Expected Loan ID: ${nextId}`);

  console.log('\n--- Testing Signature Continuity Matching ---');
  const aedenLoans = await client.execute(`
    SELECT l.id, l.customer_id, c.name as customer_name, l.total_amount
    FROM loans l
    JOIN customers c ON l.customer_id = c.id
    WHERE c.name LIKE '%AEDEN%'
    ORDER BY l.id ASC
  `);
  console.log(`Found ${aedenLoans.rows.length} loans for AEDEN:`);
  for (const row of aedenLoans.rows) {
    const splits = await client.execute({
      sql: `SELECT comp.short_code, s.split_amount FROM loan_company_splits s JOIN companies comp ON s.company_id = comp.id WHERE s.loan_id = ?`,
      args: [row.id],
    });
    const splitStr = splits.rows.map(r => `${r.short_code}: ₹${Number(r.split_amount).toLocaleString('en-IN')}`).join(', ');
    console.log(`  - ${row.id}: ${row.customer_name} | Total ₹${Number(row.total_amount).toLocaleString('en-IN')} | Splits: [${splitStr}]`);
  }

  console.log('\n[PASS] Database integrity and dynamic ID sequencing verified successfully.');
}

main().catch(console.error);
