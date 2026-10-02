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

async function migrateCompanies() {
  console.log('--- Migrating Companies in Database ---');

  // Clean up any old duplicate BHAVANA
  await client.execute(`DELETE FROM companies WHERE id = 'COMP-BHAVANA' OR short_code = 'BHAVANA'`);

  // Ensure COMP-TATVA exists
  await client.execute(`
    INSERT OR REPLACE INTO companies (id, name, short_code, is_outside_party, created_at)
    VALUES ('COMP-TATVA', 'Tatva Investments', 'TATVA', 1, datetime('now'))
  `);

  // Ensure COMP-BHAVNA exists
  await client.execute(`
    INSERT OR REPLACE INTO companies (id, name, short_code, is_outside_party, created_at)
    VALUES ('COMP-BHAVNA', 'Bhavna Fin', 'BHAVNA', 1, datetime('now'))
  `);

  // Remove any OTHERS company if it exists in companies table
  await client.execute(`DELETE FROM companies WHERE short_code = 'OTHERS' OR id = 'COMP-OTHERS'`);

  const comps = await client.execute('SELECT * FROM companies ORDER BY id');
  console.log('Updated Companies in DB:');
  for (const c of comps.rows) {
    console.log(`  - ID: ${c.id}, Name: ${c.name}, Code: ${c.short_code}, Outside: ${c.is_outside_party}`);
  }
}

migrateCompanies().catch(console.error);
