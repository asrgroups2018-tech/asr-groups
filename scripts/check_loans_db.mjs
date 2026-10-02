import { createClient } from '@libsql/client';
import fs from 'fs';

let envVars = {};
const envFile = fs.existsSync('.env') ? '.env' : fs.existsSync('.env.local') ? '.env.local' : null;
if (envFile) {
  const envContent = fs.readFileSync(envFile, 'utf-8');
  envVars = Object.fromEntries(
    envContent.split('\n')
      .filter(l => l.trim() && !l.startsWith('#'))
      .map(l => {
        const idx = l.indexOf('=');
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
}

const client = createClient({
  url: envVars.TURSO_DATABASE_URL || 'file:local.db',
  authToken: envVars.TURSO_AUTH_TOKEN,
});

async function run() {
  const loans = await client.execute('SELECT id, customer_id, total_amount, disbursed_amount, interest_amount FROM loans');
  const insts = await client.execute('SELECT loan_id, SUM(amount_due) as sum_due, COUNT(*) as cnt FROM installments GROUP BY loan_id');
  const instMap = new Map();
  insts.rows.forEach(r => instMap.set(r.loan_id, { sum: r.sum_due, cnt: r.cnt }));

  console.log('--- LOANS VS INSTALLMENT SUMS ---');
  for (const l of loans.rows) {
    const instInfo = instMap.get(l.id) || { sum: 0, cnt: 0 };
    console.log(l.id, '| DB total_amount:', l.total_amount, '| Inst sum:', instInfo.sum, '| Inst cnt:', instInfo.cnt, '| Disbursed:', l.disbursed_amount, '| Interest:', l.interest_amount);
  }
}
run();
