import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const records = [
  { sNo: 1, date: '2026-07-09', name: 'NGMM Marketing', paid: 850000, interest: 150000, total: 1000000 },
  { sNo: 2, date: '2026-07-09', name: 'Jai Sri Krishnar Textiles - Thiruvallur', paid: 1000000, interest: 250000, total: 1250000 },
  { sNo: 3, date: '2026-07-09', name: 'The Bell Match - 09/07/2026', paid: 2125000, interest: 375000, total: 2500000 },
  { sNo: 4, date: '2026-07-11', name: 'Raaj Associates', paid: 420000, interest: 80000, total: 500000 },
  { sNo: 5, date: '2026-07-15', name: 'Green Drive Auto Services P Ltd', paid: 1275000, interest: 225000, total: 1500000 },
  { sNo: 6, date: '2026-07-15', name: 'Concord Exotic Voyages P Ltd 15/07/26', paid: 1760000, interest: 240000, total: 2000000 },
  { sNo: 7, date: '2026-07-16', name: 'DSM Proteins - 2.5L', paid: 3500000, interest: 500000, total: 4000000 },
  { sNo: 8, date: '2026-07-17', name: 'Raam Gada Centre (17/07/2026)', paid: 2625000, interest: 375000, total: 3000000 },
  { sNo: 9, date: '2026-07-18', name: 'Stepup999', paid: 1800000, interest: 200000, total: 2000000 },
  { sNo: 10, date: '2026-07-18', name: 'Sree Rajalakshmi Processing Mills', paid: 750000, interest: 250000, total: 1000000 },
  { sNo: 11, date: '2026-07-20', name: 'Venkateshwaran Easwaran (Rajalakshmi Pr', paid: 2250000, interest: 750000, total: 3000000 },
  { sNo: 12, date: '2026-07-23', name: 'Roditte', paid: 915000, interest: 85000, total: 1000000 },
  { sNo: 13, date: '2026-07-24', name: 'KSR Reality', paid: 2765000, interest: 735000, total: 3500000 },
  { sNo: 14, date: '2026-07-25', name: 'Simple Resolution', paid: 8850000, interest: 1150000, total: 10000000 },
];

async function run() {
  const allLoansRes = await client.execute('SELECT l.id, l.customer_id, l.code_no, l.total_amount, l.start_date, c.name FROM loans l JOIN customers c ON c.id = l.customer_id ORDER BY l.id');
  console.log(`Loaded ${allLoansRes.rows.length} total loans from DB.`);

  for (const rec of records) {
    const key = rec.name.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const tokens = key.split(/\s+/).filter(t => t.length > 2 && !['ltd', 'pvt', 'textiles', 'the', 'company', 'centre', 'enterprises'].includes(t));

    const matches = allLoansRes.rows.filter(row => {
      const rowName = String(row.name).toLowerCase();
      return tokens.some(tok => rowName.includes(tok));
    });

    console.log(`\n[Record #${rec.sNo}] ${rec.name} | Paid: ₹${rec.paid.toLocaleString('en-IN')} | Interest: ₹${rec.interest.toLocaleString('en-IN')} | Total: ₹${rec.total.toLocaleString('en-IN')} | Date: ${rec.date}`);
    if (matches.length === 0) {
      console.log('  No customer loan found in DB.');
    } else {
      matches.forEach(m => {
        const amtMatch = Number(m.total_amount) === rec.total ? ' [EXACT TOTAL MATCH]' : '';
        console.log(`  -> Loan ID: ${m.id} | Code: ${m.code_no} | Total: ₹${Number(m.total_amount).toLocaleString('en-IN')} | Start: ${m.start_date} | Cust: ${m.name}${amtMatch}`);
      });
    }
  }
}

run().catch(console.error);
