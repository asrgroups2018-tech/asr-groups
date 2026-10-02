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

async function run() {
  console.log('--- UPDATING COMPANIES REGISTRY IN TURSO ---');

  // Delete redundant COMP-INFIN if exists, transferring any splits to COMP-IG
  await client.execute(`UPDATE loan_company_splits SET company_id = 'COMP-IG' WHERE company_id = 'COMP-INFIN'`);
  await client.execute(`UPDATE installment_company_splits SET company_id = 'COMP-IG' WHERE company_id = 'COMP-INFIN'`);
  await client.execute(`DELETE FROM companies WHERE id = 'COMP-INFIN' OR short_code = 'INFIN'`);

  const OFFICIAL_16_COMPANIES = [
    // 10 ASR Group Internal Companies
    { id: 'COMP-PASS', code: 'PASS', name: 'PASS ENTERPRISES', isOutside: 0 },
    { id: 'COMP-KARS', code: 'KARS', name: 'KARS ENTERPRISES', isOutside: 0 },
    { id: 'COMP-IG', code: 'IG', name: 'INFIN GROUP', isOutside: 0 },
    { id: 'COMP-INE', code: 'INE', name: 'INFINITY ENTERPRISES', isOutside: 0 },
    { id: 'COMP-INS', code: 'INS', name: 'INNOVATIVE SOLUTIONS', isOutside: 0 },
    { id: 'COMP-MARS', code: 'MARS', name: 'MARS SOLUTION', isOutside: 0 },
    { id: 'COMP-MM', code: 'MM', name: 'MM ASSOCIATES', isOutside: 0 },
    { id: 'COMP-TG', code: 'TG', name: 'TRIVENI GROUP', isOutside: 0 },
    { id: 'COMP-GS', code: 'GS', name: 'GLOBAL SOLITAIRE', isOutside: 0 },
    { id: 'COMP-ALA', code: 'ALA', name: 'ALAGESH', isOutside: 0 },
    // 6 Outside Parties
    { id: 'COMP-FIN', code: 'FIN', name: 'FINCUBE VENTURES', isOutside: 1 },
    { id: 'COMP-CS', code: 'CS', name: 'CS ASSOCIATES', isOutside: 1 },
    { id: 'COMP-MC', code: 'MC', name: 'M CHINNIAH', isOutside: 1 },
    { id: 'COMP-TATVA', code: 'TATVA', name: 'TATVA ENTERPRISES', isOutside: 1 },
    { id: 'COMP-BHAVNA', code: 'BHAVANA', name: 'BHAVANA CORP', isOutside: 1 },
    { id: 'COMP-TASS', code: 'TA (SS)', name: 'THIRUCHENDURAON ASSOCIATE', isOutside: 1 },
  ];

  for (const c of OFFICIAL_16_COMPANIES) {
    await client.execute({
      sql: `INSERT INTO companies (id, name, short_code, is_outside_party, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              short_code = excluded.short_code,
              is_outside_party = excluded.is_outside_party`,
      args: [c.id, c.name, c.code, c.isOutside],
    });
  }

  const allComps = await client.execute('SELECT id, name, short_code, is_outside_party FROM companies ORDER BY is_outside_party ASC, id ASC');
  console.log(`\nSuccessfully registered ${allComps.rows.length} Official Companies:`);
  for (const c of allComps.rows) {
    console.log(`  • [${c.id}] Code: "${c.short_code}" -> "${c.name}" | Outside: ${c.is_outside_party === 1 ? 'YES' : 'NO'}`);
  }
}

run().catch(console.error);
