import { createClient } from '@libsql/client';
import fs from 'fs';

let envUrl = process.env.TURSO_DATABASE_URL;
let envToken = process.env.TURSO_AUTH_TOKEN;

if (!envUrl && fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('TURSO_DATABASE_URL=')) envUrl = trimmed.replace('TURSO_DATABASE_URL=', '').replace(/["']/g, '');
    if (trimmed.startsWith('TURSO_AUTH_TOKEN=')) envToken = trimmed.replace('TURSO_AUTH_TOKEN=', '').replace(/["']/g, '');
  }
}

const client = createClient({ url: envUrl || 'file:local.db', authToken: envToken });

async function check() {
  const instCols = await client.execute('PRAGMA table_info(installment_company_splits)');
  console.log('installment_company_splits cols:', instCols.rows.map(r => r.name));

  const loanCols = await client.execute('PRAGMA table_info(loan_company_splits)');
  console.log('loan_company_splits cols:', loanCols.rows.map(r => r.name));

  const instSplits = await client.execute(`
    SELECT s.*, c.short_code, c.name 
    FROM installment_company_splits s 
    LEFT JOIN companies c ON s.company_id = c.id
  `);
  const uniqueComps = new Set(instSplits.rows.map(r => `${r.company_id} (${r.short_code})`));
  console.log('Unique companies in installment_company_splits:', Array.from(uniqueComps));

  const loanSplits = await client.execute(`
    SELECT s.*, c.short_code, c.name 
    FROM loan_company_splits s 
    LEFT JOIN companies c ON s.company_id = c.id
  `);
  const uniqueLoanComps = new Set(loanSplits.rows.map(r => `${r.company_id} (${r.short_code})`));
  console.log('Unique companies in loan_company_splits:', Array.from(uniqueLoanComps));
}

check().catch(console.error);
