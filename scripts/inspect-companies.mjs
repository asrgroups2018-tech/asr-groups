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

async function inspect() {
  const comps = await client.execute('SELECT * FROM companies ORDER BY is_outside_party ASC, name ASC');
  console.log('CURRENT COMPANIES IN DB:');
  for (const c of comps.rows) {
    console.log(`  - [${c.id}] Code: "${c.short_code}", Name: "${c.name}", Outside: ${c.is_outside_party}`);
  }

  const splits = await client.execute(`
    SELECT DISTINCT c.id, c.short_code, c.name, COUNT(s.id) as split_count
    FROM companies c
    LEFT JOIN installment_company_splits s ON s.company_id = c.id
    GROUP BY c.id
  `);
  console.log('\nSPLIT ASSOCIATIONS PER COMPANY:');
  for (const s of splits.rows) {
    console.log(`  - [${s.id}] ${s.short_code} ("${s.name}") -> ${s.split_count} installment splits`);
  }
}

inspect().catch(console.error);
