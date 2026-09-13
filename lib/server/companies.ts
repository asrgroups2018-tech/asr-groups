import { getTursoClient } from './turso';
import { initializeSchema } from './schema';
import { Company } from '@/lib/types';

let schemaInitialized = false;

async function ensureDbInitialized() {
  if (schemaInitialized) return;
  const client = getTursoClient();
  try {
    await initializeSchema(client);
    schemaInitialized = true;
  } catch (err) {
    console.error('Turso Schema initialization warning:', err);
  }
}

export async function getCompanies(): Promise<Company[]> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const compRes = await client.execute('SELECT * FROM companies ORDER BY is_outside_party ASC, short_code ASC');
  const splitsRes = await client.execute('SELECT company_id, split_amount FROM loan_company_splits');
  const instSplitsRes = await client.execute(`
    SELECT ics.company_id, ics.amount, i.status
    FROM installment_company_splits ics
    JOIN installments i ON i.id = ics.installment_id
  `);

  const fundedMap = new Map<string, number>();
  splitsRes.rows.forEach((s) => {
    const cid = String(s.company_id);
    fundedMap.set(cid, (fundedMap.get(cid) || 0) + Number(s.split_amount || 0));
  });

  const collectedMap = new Map<string, number>();
  instSplitsRes.rows.forEach((is) => {
    const cid = String(is.company_id);
    const st = String(is.status || '').toUpperCase();
    if (['PASS', 'NEFT', 'CASH', 'PAID'].includes(st)) {
      collectedMap.set(cid, (collectedMap.get(cid) || 0) + Number(is.amount || 0));
    }
  });

  return compRes.rows.map((r) => {
    const cid = String(r.id);
    const totalFunded = fundedMap.get(cid) || 0;
    const totalCollected = collectedMap.get(cid) || 0;
    const outstanding = Math.max(0, totalFunded - totalCollected);

    return {
      id: cid,
      name: String(r.name),
      shortCode: String(r.short_code),
      isOutsideParty: Boolean(r.is_outside_party),
      totalFunded,
      totalCollected,
      outstandingAmount: outstanding,
      activeLoansCount: 0,
      createdAt: String(r.created_at || new Date().toISOString().slice(0, 10)),
    };
  });
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const list = await getCompanies();
  return list.find((c) => c.id === id || c.shortCode.toUpperCase() === id.toUpperCase()) || null;
}

export async function createCompany(data: { name: string; shortCode: string; isOutsideParty?: boolean }): Promise<Company> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const code = data.shortCode.trim().toUpperCase();
  const id = `COMP-${code.replace(/[^A-Z0-9]/g, '')}`;
  const now = new Date().toISOString().slice(0, 10);

  const newCompany: Company = {
    id,
    name: data.name.trim(),
    shortCode: code,
    isOutsideParty: !!data.isOutsideParty,
    totalFunded: 0,
    totalCollected: 0,
    outstandingAmount: 0,
    createdAt: now,
  };

  await client.execute({
    sql: `INSERT OR REPLACE INTO companies (id, name, short_code, is_outside_party, created_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [newCompany.id, newCompany.name, newCompany.shortCode, newCompany.isOutsideParty ? 1 : 0, now],
  });

  return newCompany;
}
