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
  const lcs = await client.execute('SELECT count(*) as count FROM loan_company_splits');
  const ics = await client.execute('SELECT count(*) as count FROM installment_company_splits');
  const comp = await client.execute('SELECT id, name, short_code FROM companies');
  const lcsSample = await client.execute('SELECT * FROM loan_company_splits LIMIT 10');
  const icsSample = await client.execute('SELECT * FROM installment_company_splits LIMIT 10');

  console.log('loan_company_splits count:', lcs.rows[0]);
  console.log('installment_company_splits count:', ics.rows[0]);
  console.log('\nCompanies:', comp.rows);
  console.log('\nSample loan_company_splits:', lcsSample.rows);
  console.log('\nSample installment_company_splits:', icsSample.rows);

  // Check distinct company_ids in loan_company_splits and installment_company_splits
  const lcsDistinct = await client.execute('SELECT company_id, count(DISTINCT loan_id) as loanCount, sum(split_amount) as totalFunded FROM loan_company_splits GROUP BY company_id');
  console.log('\nLCS aggregated by company_id:', lcsDistinct.rows);

  const icsDistinct = await client.execute(`
    SELECT ics.company_id, count(DISTINCT i.loan_id) as loanCount, sum(ics.amount) as totalInstAmount
    FROM installment_company_splits ics
    JOIN installments i ON i.id = ics.installment_id
    GROUP BY ics.company_id
  `);
  console.log('\nICS aggregated by company_id:', icsDistinct.rows);
}

check().catch(console.error);
