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
  const splitsRes = await client.execute('SELECT company_id, loan_id, split_amount FROM loan_company_splits');
  const instSplitsRes = await client.execute(`
    SELECT ics.company_id, ics.amount, i.status, i.loan_id
    FROM installment_company_splits ics
    JOIN installments i ON i.id = ics.installment_id
  `);

  const fundedMap = new Map<string, number>();
  const loanSetMap = new Map<string, Set<string>>();

  splitsRes.rows.forEach((s) => {
    const cid = String(s.company_id);
    const lid = String(s.loan_id);
    fundedMap.set(cid, (fundedMap.get(cid) || 0) + Number(s.split_amount || 0));

    if (!loanSetMap.has(cid)) {
      loanSetMap.set(cid, new Set());
    }
    if (lid) {
      loanSetMap.get(cid)!.add(lid);
    }
  });

  const collectedMap = new Map<string, number>();
  instSplitsRes.rows.forEach((is) => {
    const cid = String(is.company_id);
    const lid = String(is.loan_id);
    const st = String(is.status || '').toUpperCase();
    if (['PASS', 'NEFT', 'CASH', 'PAID'].includes(st)) {
      collectedMap.set(cid, (collectedMap.get(cid) || 0) + Number(is.amount || 0));
    }
    if (!loanSetMap.has(cid)) {
      loanSetMap.set(cid, new Set());
    }
    if (lid) {
      loanSetMap.get(cid)!.add(lid);
    }
  });

  const COMPANY_ORDER: Record<string, number> = {
    'PASS ENTERPRISES': 1,
    'KARS ENTERPRISES': 2,
    'INFIN GROUP': 3,
    'INFINITY ENTERPRISES': 4,
    'INNOVATIVE SOLUTIONS': 5,
    'MARS SOLUTION': 6,
    'MM ASSOCIATES': 7,
    'TRIVENI GROUP': 8,
    'GLOBAL SOLITAIRE': 9,
    'ALAGESH': 10,
    'FINCUBE VENTURES': 11,
    'CS ASSOCIATES': 12,
    'M CHINNIAH': 13,
    'TATVA ENTERPRISES': 14,
    'BHAVANA CORP': 15,
    'THIRUCHENDURAON ASSOCIATE': 16,
  };

  return compRes.rows
    .map((r) => {
      const cid = String(r.id);
      const totalFunded = fundedMap.get(cid) || 0;
      const totalCollected = collectedMap.get(cid) || 0;
      const outstanding = Math.max(0, totalFunded - totalCollected);
      const activeLoansCount = loanSetMap.get(cid)?.size || 0;

      return {
        id: cid,
        name: String(r.name),
        shortCode: String(r.short_code),
        isOutsideParty: Boolean(r.is_outside_party),
        totalFunded,
        totalCollected,
        outstandingAmount: outstanding,
        activeLoansCount,
        createdAt: String(r.created_at || new Date().toISOString().slice(0, 10)),
      };
    })
    .sort((a, b) => {
      const orderA = COMPANY_ORDER[a.name.toUpperCase()] ?? (a.isOutsideParty ? 99 : 50);
      const orderB = COMPANY_ORDER[b.name.toUpperCase()] ?? (b.isOutsideParty ? 99 : 50);
      return orderA - orderB;
    });
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const list = await getCompanies();
  const cleanId = String(id || '').trim().toLowerCase();
  return (
    list.find(
      (c) =>
        c.id.toLowerCase() === cleanId ||
        c.shortCode.toLowerCase() === cleanId ||
        c.name.toLowerCase() === cleanId
    ) || null
  );
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
