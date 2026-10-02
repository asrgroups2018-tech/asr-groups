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

async function fixLoanAmounts() {
  console.log('Fixing loan total_amount to match exact sum of installments...');
  
  const insts = await client.execute('SELECT loan_id, SUM(amount_due) as sum_due, COUNT(*) as cnt FROM installments GROUP BY loan_id');
  const instMap = new Map();
  insts.rows.forEach(r => instMap.set(r.loan_id, { sum: Number(r.sum_due || 0), cnt: Number(r.cnt || 0) }));

  const loans = await client.execute('SELECT id, total_amount, disbursed_amount, interest_amount FROM loans');
  
  let updatedCount = 0;
  for (const l of loans.rows) {
    const lid = String(l.id);
    const instInfo = instMap.get(lid);
    if (!instInfo) continue;

    const correctTotal = instInfo.sum;
    const currentTotal = Number(l.total_amount || 0);
    const currentDisb = l.disbursed_amount != null ? Number(l.disbursed_amount) : null;
    const currentInt = l.interest_amount != null ? Number(l.interest_amount) : null;

    let newDisb = currentDisb;
    let newInt = currentInt;

    // If disbursed + interest does not equal correct total, reset them to null
    if (newDisb != null && newInt != null && (newDisb + newInt !== correctTotal)) {
      newDisb = null;
      newInt = null;
    }

    if (currentTotal !== correctTotal || currentDisb !== newDisb || currentInt !== newInt) {
      await client.execute({
        sql: 'UPDATE loans SET total_amount = ?, disbursed_amount = ?, interest_amount = ? WHERE id = ?',
        args: [correctTotal, newDisb, newInt, lid],
      });
      console.log(`Updated loan ${lid}: total_amount ${currentTotal} -> ${correctTotal}, disb: ${newDisb}, int: ${newInt}`);
      updatedCount++;
    }
  }

  console.log(`Successfully fixed ${updatedCount} loans in database!`);
}

fixLoanAmounts().catch(console.error);
