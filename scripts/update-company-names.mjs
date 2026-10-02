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

async function updateCompanies() {
  console.log('--- Updating Official Company Names in Database ---');

  // Clean up legacy duplicate IDs if present
  await client.execute(`DELETE FROM companies WHERE id IN ('COMP-MM', 'COMP-INS')`);

  // ASR Companies (is_outside_party = 0)
  const asrCompanies = [
    { id: 'COMP-PASS', code: 'PASS', name: 'PASS ENTERPRISES', isOutside: 0, sortOrder: 1 },
    { id: 'COMP-KARS', code: 'KARS', name: 'KARS ENTERPRISES', isOutside: 0, sortOrder: 2 },
    { id: 'COMP-INFIN', code: 'INFIN', name: 'INFIN GROUP', isOutside: 0, sortOrder: 3 },
    { id: 'COMP-INE', code: 'INE', name: 'INFINITY ENTERPRISES', isOutside: 0, sortOrder: 4 },
    { id: 'COMP-IG', code: 'IG', name: 'INNOVATIVE SOLUTIONS', isOutside: 0, sortOrder: 5 },
    { id: 'COMP-MARS', code: 'MARS', name: 'MARS SOLUTION', isOutside: 0, sortOrder: 6 },
    { id: 'COMP-TG', code: 'TG', name: 'TRIVENI GROUP', isOutside: 0, sortOrder: 7 },
    { id: 'COMP-GS', code: 'GS', name: 'GLOBAL SOLITAIRE', isOutside: 0, sortOrder: 8 },
    { id: 'COMP-ALA', code: 'ALA', name: 'ALAGESH', isOutside: 0, sortOrder: 9 },
  ];

  // Outside Companies (is_outside_party = 1)
  const outsideCompanies = [
    { id: 'COMP-FIN', code: 'FIN', name: 'FINCUBE VENTURES', isOutside: 1, sortOrder: 10 },
    { id: 'COMP-CS', code: 'CS', name: 'CS ASSOCIATES', isOutside: 1, sortOrder: 11 },
    { id: 'COMP-MC', code: 'MC', name: 'M CHINNIAH', isOutside: 1, sortOrder: 12 },
    { id: 'COMP-TATVA', code: 'TATVA', name: 'TATVA ENTERPRISES', isOutside: 1, sortOrder: 13 },
    { id: 'COMP-BHAVNA', code: 'BHAVANA', name: 'BHAVANA CORP', isOutside: 1, sortOrder: 14 },
    { id: 'COMP-TASS', code: 'TA (SS)', name: 'THIRUCHENDURAON ASSOCIATE', isOutside: 1, sortOrder: 15 },
  ];

  for (const c of [...asrCompanies, ...outsideCompanies]) {
    await client.execute({
      sql: `INSERT INTO companies (id, name, short_code, is_outside_party, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              short_code = excluded.short_code,
              is_outside_party = excluded.is_outside_party`,
      args: [c.id, c.name, c.code, c.isOutside],
    });
    console.log(`  ✓ Updated ${c.name} (Code: ${c.code}, Outside: ${c.isOutside})`);
  }

  const list = await client.execute('SELECT * FROM companies ORDER BY is_outside_party ASC, id ASC');
  console.log(`\n--- Final Verified Companies Table (${list.rows.length} total) ---`);
  for (const c of list.rows) {
    console.log(`  - [${c.id}] ${c.name} | Code: ${c.short_code} | Outside: ${c.is_outside_party === 1 ? 'YES (Outside)' : 'NO (ASR)'}`);
  }
}

updateCompanies().catch(console.error);
