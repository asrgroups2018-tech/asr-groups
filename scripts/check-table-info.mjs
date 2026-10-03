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
}

const client = createClient({ url: envUrl, authToken: envToken });

async function main() {
  const instCols = await client.execute("PRAGMA table_info(installments)");
  console.log('Installments table columns:', instCols.rows.map(r => r.name));
  
  const loanCols = await client.execute("PRAGMA table_info(loans)");
  console.log('Loans table columns:', loanCols.rows.map(r => r.name));

  const compCols = await client.execute("PRAGMA table_info(companies)");
  console.log('Companies table columns:', compCols.rows.map(r => r.name));
}

main().catch(console.error);
