import { getTursoClient } from './turso';
import { initializeSchema } from './schema';
import { Company } from '@/lib/types';

let schemaInitialized = false;

async function ensureDbInitialized() {
  if (schemaInitialized) return;
  const client = getTursoClient();
  try {
    await initializeSchema(client);
    try {
      await client.execute('ALTER TABLE companies ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
    } catch {
      // Column may already exist
    }
    schemaInitialized = true;
  } catch (err) {
    console.error('Turso Schema initialization warning:', err);
  }
}

export async function getCompanies(): Promise<Company[]> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const compRes = await client.execute('SELECT * FROM companies WHERE (is_active IS NULL OR is_active != 0) ORDER BY is_outside_party ASC, short_code ASC');
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
    if (['CLEARED', 'NEFT', 'RTGS', 'CASH', 'PASS', 'PAID', 'CLOSED', 'SETTLED', 'CLS', 'CS'].includes(st)) {
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
    'MARS SOLUTION': 4,
    'TRIVENI GROUP': 5,
    'GLOBAL SOLITAIRE': 6,
    'ALAGESH': 7,
    'MM ASSOCIATES': 8,
    'FINCUBE VENTURES': 9,
    'CS ASSOCIATES': 10,
    'M CHINNIAH': 11,
    'TATVA ENTERPRISES': 12,
    'BHAVANA CORP': 13,
    'THIRUCHENDURAON ASSOCIATE': 14,
    'INFINITY ENTERPRISES': 15,
    'INNOVATIVE SOLUTIONS': 16,
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
        isActive: r.is_active !== undefined ? Boolean(r.is_active) : true,
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

export function resolveCompany(key: string, companies: Company[]): Company | null {
  if (!key) return null;
  const clean = key.trim().toUpperCase();

  // 1. Direct ID match
  const byId = companies.find((c) => c.id.toUpperCase() === clean);
  if (byId) return byId;

  // 2. Direct shortCode match
  const byCode = companies.find((c) => c.shortCode.toUpperCase() === clean);
  if (byCode) return byCode;

  // 3. Direct name match
  const byName = companies.find((c) => c.name.toUpperCase() === clean);
  if (byName) return byName;

  // 4. Aliases / common alternative codes
  if (clean === 'BHAVNA' || clean === 'BHAVANA' || clean.includes('BHAVAN')) {
    return companies.find((c) => c.id === 'COMP-BHAVNA' || c.shortCode === 'BHAVANA' || c.name.includes('BHAVANA')) || null;
  }
  if (clean === 'TA' || clean === 'TA(SS)' || clean === 'TA (SS)' || clean.includes('THIRUCHENDUR')) {
    return companies.find((c) => c.id === 'COMP-TASS' || c.shortCode === 'TA (SS)' || c.name.includes('THIRUCHENDUR')) || null;
  }
  if (clean === 'IG' || clean === 'INFIN' || clean.includes('INFIN GROUP')) {
    return companies.find((c) => c.id === 'COMP-IG' || c.shortCode === 'IG' || c.name.includes('INFIN')) || null;
  }
  if (clean === 'INE' || clean.includes('INFINITY')) {
    return companies.find((c) => c.id === 'COMP-INE' || c.shortCode === 'INE' || c.name.includes('INFINITY')) || null;
  }
  if (clean === 'INS' || clean.includes('INNOVAT')) {
    return companies.find((c) => c.id === 'COMP-INS' || c.shortCode === 'INS' || c.name.includes('INNOVAT')) || null;
  }
  if (clean === 'PASS' || clean.includes('PASS')) {
    return companies.find((c) => c.id === 'COMP-PASS' || c.shortCode === 'PASS') || null;
  }
  if (clean === 'KARS' || clean.includes('KARS')) {
    return companies.find((c) => c.id === 'COMP-KARS' || c.shortCode === 'KARS') || null;
  }
  if (clean === 'MARS' || clean.includes('MARS')) {
    return companies.find((c) => c.id === 'COMP-MARS' || c.shortCode === 'MARS') || null;
  }
  if (clean === 'MM' || clean.includes('MM')) {
    return companies.find((c) => c.id === 'COMP-MM' || c.shortCode === 'MM') || null;
  }
  if (clean === 'TG' || clean.includes('TRIVENI') || clean.includes('TREVINI')) {
    return companies.find((c) => c.id === 'COMP-TG' || c.shortCode === 'TG') || null;
  }
  if (clean === 'GS' || clean.includes('SOLITAIRE') || clean.includes('SOLITARE')) {
    return companies.find((c) => c.id === 'COMP-GS' || c.shortCode === 'GS') || null;
  }
  if (clean === 'ALA' || clean.includes('ALAGESH')) {
    return companies.find((c) => c.id === 'COMP-ALA' || c.shortCode === 'ALA') || null;
  }
  if (clean === 'FIN' || clean.includes('FINCUBE')) {
    return companies.find((c) => c.id === 'COMP-FIN' || c.shortCode === 'FIN') || null;
  }
  if (clean === 'CS' || clean.includes('CS ASSOC')) {
    return companies.find((c) => c.id === 'COMP-CS' || c.shortCode === 'CS') || null;
  }
  if (clean === 'MC' || clean.includes('CHINNIAH')) {
    return companies.find((c) => c.id === 'COMP-MC' || c.shortCode === 'MC') || null;
  }
  if (clean === 'TATVA' || clean.includes('TATVA')) {
    return companies.find((c) => c.id === 'COMP-TATVA' || c.shortCode === 'TATVA') || null;
  }

  return null;
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
    sql: `INSERT OR REPLACE INTO companies (id, name, short_code, is_outside_party, is_active, created_at)
          VALUES (?, ?, ?, ?, 1, ?)`,
    args: [newCompany.id, newCompany.name, newCompany.shortCode, newCompany.isOutsideParty ? 1 : 0, now],
  });

  return newCompany;
}

export async function deleteCompany(id: string): Promise<boolean> {
  await ensureDbInitialized();
  const client = getTursoClient();
  // Soft-delete company from active directory so loan splits and history are never broken
  await client.execute({
    sql: 'UPDATE companies SET is_active = 0 WHERE id = ?',
    args: [id],
  });
  return true;
}
