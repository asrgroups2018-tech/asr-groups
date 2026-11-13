import { BalanceSheetDocument, BalanceSheetEntry, BalanceSheetSide, buildDefaultBalanceSheet } from '@/lib/balanceSheet';
import { AuditActor } from '@/lib/types';
import { logAudit } from './administration';
import { getLoans } from './loans';
import { getTursoClient } from './turso';
import { initializeSchema } from './schema';

let schemaInitialized = false;

async function ensureDbInitialized() {
  if (schemaInitialized) return;
  await initializeSchema(getTursoClient());
  schemaInitialized = true;
}

function normalizeEntry(value: unknown, index: number): BalanceSheetEntry {
  const item = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const side: BalanceSheetSide = item.side === 'assets' ? 'assets' : 'liabilities';
  const sourceKey = ['PORTFOLIO_FUNDING', 'CUSTOMER_RECEIVABLES', 'COLLECTIONS'].includes(String(item.sourceKey))
    ? String(item.sourceKey) as BalanceSheetEntry['sourceKey']
    : 'MANUAL';
  return {
    id: String(item.id || `entry-${index + 1}`),
    side,
    groupName: String(item.groupName || 'Other Accounts').trim().slice(0, 120) || 'Other Accounts',
    label: String(item.label || 'New Ledger').trim().slice(0, 160) || 'New Ledger',
    amount: Math.max(0, Number(item.amount) || 0),
    openingBalance: Math.max(0, Number(item.openingBalance) || 0),
    openingBalanceType: String(item.openingBalanceType || 'DEBIT').toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT',
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
    sourceKey,
  };
}

function normalizeDocument(value: unknown, id?: string): BalanceSheetDocument {
  const document = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const entries = Array.isArray(document.entries) ? document.entries.slice(0, 500).map(normalizeEntry) : [];
  const asOfDate = String(document.asOfDate || '').slice(0, 10);
  return {
    id: id || (document.id ? String(document.id) : undefined),
    title: String(document.title || 'Balance Sheet').trim().slice(0, 160) || 'Balance Sheet',
    asOfDate: /^\d{4}-\d{2}-\d{2}$/.test(asOfDate) ? asOfDate : new Date().toISOString().slice(0, 10),
    entries,
  };
}

function addSourceKeys(document: BalanceSheetDocument): BalanceSheetDocument {
  const sourceById: Record<string, BalanceSheetEntry['sourceKey']> = {
    'liability-capital-funding': 'PORTFOLIO_FUNDING',
    'asset-loans-advances': 'CUSTOMER_RECEIVABLES',
    'asset-cash-bank': 'COLLECTIONS',
  };
  return {
    ...document,
    entries: document.entries.map((entry) => ({ ...entry, sourceKey: entry.sourceKey === 'MANUAL' ? sourceById[entry.id] || 'MANUAL' : entry.sourceKey })),
  };
}

function recalculateLinkedEntries(document: BalanceSheetDocument, loans: Awaited<ReturnType<typeof getLoans>>): BalanceSheetDocument {
  const generated = buildDefaultBalanceSheet(loans, document.asOfDate);
  const generatedBySource = new Map(generated.entries.filter((entry) => entry.sourceKey && entry.sourceKey !== 'MANUAL').map((entry) => [entry.sourceKey, entry]));
  return {
    ...document,
    entries: document.entries.map((entry) => {
      const calculated = entry.sourceKey ? generatedBySource.get(entry.sourceKey) : undefined;
      return calculated ? { ...entry, amount: calculated.amount } : entry;
    }),
  };
}

async function migrateLegacyDocument(): Promise<void> {
  const client = getTursoClient();
  const existing = await client.execute('SELECT title, as_of_date, entries, updated_at, updated_by FROM balance_sheet_documents WHERE id = 1');
  if (!existing.rows[0]) return;
  const row = existing.rows[0];
  const id = 'balance-sheet-main';
  const already = await client.execute({ sql: 'SELECT id FROM balance_sheet_reports WHERE id = ?', args: [id] });
  if (already.rows.length > 0) return;
  let entries: unknown[] = [];
  try { entries = JSON.parse(String(row.entries || '[]')); } catch { entries = []; }
  const now = new Date().toISOString();
  const migrated = addSourceKeys(normalizeDocument({ title: row.title, asOfDate: row.as_of_date, entries }, id));
  await client.execute({
    sql: `INSERT INTO balance_sheet_reports (id, title, as_of_date, entries, created_at, updated_at, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, migrated.title, migrated.asOfDate, JSON.stringify(migrated.entries), now, String(row.updated_at || now), String(row.updated_by || 'System')],
  });
}

async function ensureMainDocument(): Promise<void> {
  const client = getTursoClient();
  const result = await client.execute('SELECT id FROM balance_sheet_reports ORDER BY created_at ASC LIMIT 1');
  if (result.rows.length > 0) return;
  const seeded = buildDefaultBalanceSheet(await getLoans());
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO balance_sheet_reports (id, title, as_of_date, entries, created_at, updated_at, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['balance-sheet-main', seeded.title, seeded.asOfDate, JSON.stringify(seeded.entries), now, now, 'System'],
  });
}

function mapReportRow(row: any): BalanceSheetDocument {
  let entries: unknown[] = [];
  try { entries = JSON.parse(String(row.entries || '[]')); } catch { entries = []; }
  const document = addSourceKeys(normalizeDocument({ id: row.id, title: row.title, asOfDate: row.as_of_date, entries }, String(row.id)));
  return { ...document, updatedAt: String(row.updated_at || ''), updatedBy: String(row.updated_by || '') };
}

async function refreshUntouchedMainReportDate(loans: Awaited<ReturnType<typeof getLoans>>): Promise<void> {
  if (loans.length === 0) return;
  const client = getTursoClient();
  const result = await client.execute({ sql: 'SELECT id, title, as_of_date, updated_by FROM balance_sheet_reports WHERE id = ?', args: ['balance-sheet-main'] });
  const row = result.rows[0];
  if (!row || String(row.title || '') !== 'Balance Sheet' || String(row.updated_by || '') !== 'System') return;

  const asOfDate = String(row.as_of_date || '').slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const hasLaterLoan = loans.some((loan) => String(loan.startDate || loan.createdAt || '').slice(0, 10) > asOfDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate) || !hasLaterLoan || asOfDate >= today) return;

  await client.execute({
    sql: 'UPDATE balance_sheet_reports SET as_of_date = ?, updated_at = ? WHERE id = ?',
    args: [today, new Date().toISOString(), 'balance-sheet-main'],
  });
}

export async function getBalanceSheets(): Promise<BalanceSheetDocument[]> {
  await ensureDbInitialized();
  await migrateLegacyDocument();
  await ensureMainDocument();
  const loans = await getLoans();
  await refreshUntouchedMainReportDate(loans);
  const result = await getTursoClient().execute('SELECT id, title, as_of_date, entries, updated_at, updated_by FROM balance_sheet_reports ORDER BY as_of_date DESC, created_at ASC');
  return result.rows.map((row) => recalculateLinkedEntries(mapReportRow(row), loans));
}

export async function getBalanceSheet(id?: string): Promise<BalanceSheetDocument> {
  const documents = await getBalanceSheets();
  return documents.find((document) => document.id === id) || documents[0];
}

export async function createBalanceSheet(data: { title?: string; asOfDate?: string }, actor: AuditActor): Promise<BalanceSheetDocument> {
  await ensureDbInitialized();
  const asOfDate = /^\d{4}-\d{2}-\d{2}$/.test(String(data.asOfDate || '')) ? String(data.asOfDate) : new Date().toISOString().slice(0, 10);
  const id = `balance-sheet-${Date.now()}`;
  const seeded = buildDefaultBalanceSheet(await getLoans(), asOfDate);
  const title = String(data.title || 'Balance Sheet').trim() || 'Balance Sheet';
  const now = new Date().toISOString();
  await getTursoClient().execute({
    sql: `INSERT INTO balance_sheet_reports (id, title, as_of_date, entries, created_at, updated_at, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, title, asOfDate, JSON.stringify(seeded.entries), now, now, actor.name],
  });
  return { ...seeded, id, title, updatedAt: now, updatedBy: actor.name };
}

export async function updateBalanceSheet(document: BalanceSheetDocument, actor: AuditActor): Promise<BalanceSheetDocument> {
  await ensureDbInitialized();
  const id = String(document.id || 'balance-sheet-main');
  const normalized = addSourceKeys(normalizeDocument({ ...document, id }, id));
  const now = new Date().toISOString();
  await getTursoClient().execute({
    sql: `INSERT INTO balance_sheet_reports (id, title, as_of_date, entries, created_at, updated_at, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET title = excluded.title, as_of_date = excluded.as_of_date,
            entries = excluded.entries, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    args: [id, normalized.title, normalized.asOfDate, JSON.stringify(normalized.entries), now, now, actor.name],
  });
  await logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRoleId: actor.primaryRoleId,
    action: 'Updated Balance Sheet',
    target: `Balance Sheet (${normalized.title} · ${normalized.asOfDate})`,
    pageId: 'reports',
    pageName: 'Financial Reports',
    entityType: 'balance_sheet',
    entityId: id,
    afterVal: JSON.stringify(normalized),
    isSensitive: false,
  });
  return { ...normalized, updatedAt: now, updatedBy: actor.name };
}

export function parseBalanceSheetPayload(value: unknown): BalanceSheetDocument | null {
  if (!value || typeof value !== 'object') return null;
  const document = value as Record<string, unknown>;
  if (!Array.isArray(document.entries)) return null;
  return normalizeDocument(document, document.id ? String(document.id) : undefined);
}
