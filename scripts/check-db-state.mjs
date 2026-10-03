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

async function main() {
  const instStatus = await client.execute('SELECT DISTINCT status FROM installments');
  console.log('Installment statuses:', instStatus.rows.map(r => r.status));
  
  const loanStatus = await client.execute('SELECT DISTINCT status FROM loans');
  console.log('Loan statuses:', loanStatus.rows.map(r => r.status));
  
  const companies = await client.execute('SELECT id, short_code, name, is_outside_party FROM companies ORDER BY is_outside_party, short_code');
  console.log('Companies:', companies.rows);

  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Tables:', tables.rows.map(r => r.name));
}

main().catch(console.error);
