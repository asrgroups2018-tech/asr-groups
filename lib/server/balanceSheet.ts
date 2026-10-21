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
  return {
    id: String(item.id || `entry-${index + 1}`),
    side,
    groupName: String(item.groupName || 'Other Accounts').trim().slice(0, 120) || 'Other Accounts',
    label: String(item.label || 'New Ledger').trim().slice(0, 160) || 'New Ledger',
    amount: Math.max(0, Number(item.amount) || 0),
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

function normalizeDocument(value: unknown): BalanceSheetDocument {
  const document = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const entries = Array.isArray(document.entries) ? document.entries.slice(0, 500).map(normalizeEntry) : [];
  const asOfDate = String(document.asOfDate || '').slice(0, 10);
  return {
    title: String(document.title || 'Balance Sheet').trim().slice(0, 160) || 'Balance Sheet',
    asOfDate: /^\d{4}-\d{2}-\d{2}$/.test(asOfDate) ? asOfDate : new Date().toISOString().slice(0, 10),
    entries,
  };
}

export async function getBalanceSheet(): Promise<BalanceSheetDocument> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const result = await client.execute('SELECT title, as_of_date, entries, updated_at, updated_by FROM balance_sheet_documents WHERE id = 1');
  const row = result.rows[0];

  if (row) {
    const document = normalizeDocument({
      title: row.title,
      asOfDate: row.as_of_date,
      entries: JSON.parse(String(row.entries || '[]')),
    });
    return { ...document, updatedAt: String(row.updated_at || ''), updatedBy: String(row.updated_by || '') };
  }

  const seeded = buildDefaultBalanceSheet(await getLoans());
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO balance_sheet_documents (id, title, as_of_date, entries, updated_at, updated_by)
          VALUES (1, ?, ?, ?, ?, ?)`,
    args: [seeded.title, seeded.asOfDate, JSON.stringify(seeded.entries), now, 'System'],
  });
  return { ...seeded, updatedAt: now, updatedBy: 'System' };
}

export async function updateBalanceSheet(document: BalanceSheetDocument, actor: AuditActor): Promise<BalanceSheetDocument> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const normalized = normalizeDocument(document);
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO balance_sheet_documents (id, title, as_of_date, entries, updated_at, updated_by)
          VALUES (1, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            as_of_date = excluded.as_of_date,
            entries = excluded.entries,
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by`,
    args: [normalized.title, normalized.asOfDate, JSON.stringify(normalized.entries), now, actor.name],
  });

  await logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRoleId: actor.primaryRoleId,
    action: 'Updated Balance Sheet',
    target: `Balance Sheet (${normalized.asOfDate})`,
    pageId: 'reports',
    pageName: 'Financial Reports',
    entityType: 'balance_sheet',
    entityId: 'BALANCE-SHEET-1',
    afterVal: JSON.stringify(normalized),
    isSensitive: false,
  });

  return { ...normalized, updatedAt: now, updatedBy: actor.name };
}

export function parseBalanceSheetPayload(value: unknown): BalanceSheetDocument | null {
  if (!value || typeof value !== 'object') return null;
  const document = value as Record<string, unknown>;
  if (!Array.isArray(document.entries)) return null;
  return normalizeDocument(document);
}

