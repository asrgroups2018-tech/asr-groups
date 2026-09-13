import { createClient } from '@libsql/client';
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

async function verify() {
  console.log('=== VERIFYING POST-MIGRATION STATE ===\n');

  // 1. Foreign Key Check
  const fkCheck = await client.execute('PRAGMA foreign_key_check');
  console.log('Foreign key check violations:', fkCheck.rows.length === 0 ? '✓ 0 violations' : fkCheck.rows);

  // 2. Loans Range & Count
  const loansRes = await client.execute('SELECT id, customer_id, code_no, total_amount, start_date FROM loans ORDER BY id ASC');
  console.log(`Loans Count: ${loansRes.rows.length}`);
  console.log(`First 3 Loans:`, loansRes.rows.slice(0, 3));
  console.log(`Last 3 Loans:`, loansRes.rows.slice(-3));

  // 3. Installments Count & Volume
  const instRes = await client.execute('SELECT COUNT(*) as count, SUM(amount_due) as total FROM installments');
  console.log(`Installments Count: ${instRes.rows[0].count} (Expected: 721)`);
  console.log(`Installments Total Volume: ₹${Number(instRes.rows[0].total).toLocaleString('en-IN')} (Expected: ₹14,65,15,195)`);

  // 4. Customers Count
  const custRes = await client.execute('SELECT COUNT(*) as count FROM customers');
  console.log(`Customers Count: ${custRes.rows[0].count} (Expected: 159)`);

  // 5. Check AEDEN FRUITS INTERNATIONAL PVT LTD loans
  const aedenRes = await client.execute(`
    SELECT l.id, l.code_no, l.total_amount, l.installment_count, c.name as customer_name
    FROM loans l
    JOIN customers c ON c.id = l.customer_id
    WHERE c.name = 'AEDEN FRUITS INTERNATIONAL PVT LTD'
    ORDER BY l.id ASC
  `);
  console.log(`\nAEDEN FRUITS INTERNATIONAL PVT LTD loans (${aedenRes.rows.length}):`);
  console.log(aedenRes.rows);

  // 6. Check Audit Logs
  const auditRes = await client.execute('SELECT id, action, target, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 5');
  console.log(`\nRecent Audit Logs:`, auditRes.rows);
}

verify().catch(console.error);
