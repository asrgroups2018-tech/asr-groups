import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log('Ensuring columns disbursed_amount & interest_amount exist in loans...');
  try {
    await client.execute('ALTER TABLE loans ADD COLUMN disbursed_amount REAL DEFAULT NULL');
    console.log('Added disbursed_amount column.');
  } catch (err) {
    console.log('disbursed_amount column already exists or skipped.');
  }

  try {
    await client.execute('ALTER TABLE loans ADD COLUMN interest_amount REAL DEFAULT NULL');
    console.log('Added interest_amount column.');
  } catch (err) {
    console.log('interest_amount column already exists or skipped.');
  }

  // 14 interest loan records from ASR ledger
  const records = [
    { sNo: 1, name: 'NGMM Marketing', paid: 850000, interest: 150000, total: 1000000, search: 'NGMM' },
    { sNo: 2, name: 'Jai Sri Krishnar Textiles - Thiruvallur', paid: 1000000, interest: 250000, total: 1250000, search: 'JAI SRI KRISHNAR' },
    { sNo: 3, name: 'The Bell Match - 09/07/2026', paid: 2125000, interest: 375000, total: 2500000, search: 'BELL MATCH' },
    { sNo: 4, name: 'Raaj Associates', paid: 420000, interest: 80000, total: 500000, search: 'RAAJ ASSOCIATES' },
    { sNo: 5, name: 'Green Drive Auto Services P Ltd', paid: 1275000, interest: 225000, total: 1500000, search: 'GREEN DRIVE' },
    { sNo: 6, name: 'Concord Exotic Voyages P Ltd 15/07/26', paid: 1760000, interest: 240000, total: 2000000, search: 'CON CORD' },
    { sNo: 7, name: 'DSM Proteins - 2.5L', paid: 3500000, interest: 500000, total: 4000000, search: 'DSM PROTEINS' },
    { sNo: 8, name: 'Raam Gada Centre (17/07/2026)', paid: 2625000, interest: 375000, total: 3000000, search: 'RAAM GADA' },
    { sNo: 9, name: 'Stepup999', paid: 1800000, interest: 200000, total: 2000000, search: 'STEP UP 999' },
    { sNo: 10, name: 'Sree Rajalakshmi Processing Mills', paid: 750000, interest: 250000, total: 1000000, search: 'SREE RAJALAKSHIMI' },
    { sNo: 11, name: 'Venkateshwaran Easwaran (Rajalakshmi Pr', paid: 2250000, interest: 750000, total: 3000000, search: 'VENKASTESHWARAN' },
    { sNo: 12, name: 'Roditte', paid: 915000, interest: 85000, total: 1000000, search: 'RODITTE' },
    { sNo: 13, name: 'KSR Reality', paid: 2765000, interest: 735000, total: 3500000, search: 'KSR REALTY' },
    { sNo: 14, name: 'Simple Resolution', paid: 8850000, interest: 1150000, total: 10000000, search: 'SIMPLE RESOLUTIONS' },
  ];

  for (const rec of records) {
    const res = await client.execute({
      sql: `SELECT l.id, l.total_amount, c.name FROM loans l JOIN customers c ON c.id = l.customer_id WHERE UPPER(c.name) LIKE ?`,
      args: [`%${rec.search}%`]
    });

    if (res.rows.length > 0) {
      // Find best match by exact total amount or assign to first loan
      const exactMatch = res.rows.find(r => Number(r.total_amount) === rec.total) || res.rows[0];
      const targetLoanId = String(exactMatch.id);

      await client.execute({
        sql: `UPDATE loans SET disbursed_amount = ?, interest_amount = ? WHERE id = ?`,
        args: [rec.paid, rec.interest, targetLoanId]
      });

      console.log(`Updated [Loan ${targetLoanId}] (${exactMatch.name}) -> Disbursed: ₹${rec.paid.toLocaleString('en-IN')} | Interest: ₹${rec.interest.toLocaleString('en-IN')}`);
    } else {
      console.log(`No match for ${rec.name} (${rec.search})`);
    }
  }

  console.log('\nSeeding complete.');
}

main().catch(console.error);
