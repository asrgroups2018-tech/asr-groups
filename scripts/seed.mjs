import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('Error: TURSO_DATABASE_URL is not defined in environment.');
  process.exit(1);
}

const client = createClient({
  url,
  authToken,
});

async function runSeed() {
  console.log('--- SEEDING TURSO CLOUD DATABASE ---');
  // Re-run migration script
  const { default: migrate } = await import('./migrate.mjs');
  console.log('Seed completed successfully.');
}

runSeed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
