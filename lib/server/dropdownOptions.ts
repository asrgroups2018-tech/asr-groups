import { randomUUID } from 'node:crypto';
import { DropdownOption } from '@/lib/types';
import { initializeSchema } from './schema';
import { getTursoClient } from './turso';

export const DROPDOWN_OPTION_TYPES = ['PAYMENT_THROUGH', 'REGISTER_CODE', 'BORROWER_CODE', 'BORROWER_CODE_PREFIX'] as const;
export type DropdownOptionType = (typeof DROPDOWN_OPTION_TYPES)[number];

let schemaInitialized = false;

async function ensureDbInitialized() {
  if (schemaInitialized) return;
  await initializeSchema(getTursoClient());
  schemaInitialized = true;
}

function normalizeType(value: unknown): DropdownOptionType {
  const type = String(value || '').trim().toUpperCase();
  if (!DROPDOWN_OPTION_TYPES.includes(type as DropdownOptionType)) {
    throw new Error(`Unsupported dropdown option type: ${type || 'empty'}`);
  }
  return type as DropdownOptionType;
}

function mapRow(row: any): DropdownOption {
  return {
    id: String(row.id),
    optionType: String(row.option_type),
    value: String(row.value),
    label: String(row.label),
    sortOrder: Number(row.sort_order || 0),
    isActive: Boolean(Number(row.is_active ?? 1)),
    createdAt: String(row.created_at || ''),
  };
}

export async function getDropdownOptions(optionType?: string, includeInactive = false): Promise<DropdownOption[]> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const args: any[] = [];
  let sql = 'SELECT * FROM dropdown_options WHERE 1 = 1';
  if (optionType) {
    sql += ' AND option_type = ?';
    args.push(normalizeType(optionType));
  }
  if (!includeInactive) sql += ' AND is_active = 1';
  sql += ' ORDER BY option_type ASC, sort_order ASC, label COLLATE NOCASE ASC';
  const result = await client.execute({ sql, args });
  return result.rows.map(mapRow);
}

export async function createDropdownOption(data: {
  optionType: string;
  value?: string;
  label: string;
}): Promise<DropdownOption> {
  await ensureDbInitialized();
  const optionType = normalizeType(data.optionType);
  const label = String(data.label || '').trim();
  const value = String(data.value || label).trim().toUpperCase().replace(/\s+/g, '_');
  if (!label || !value) throw new Error('Dropdown option label is required.');

  const client = getTursoClient();
  const id = `OPT-${optionType}-${randomUUID()}`;
  const now = new Date().toISOString();
  const maxResult = await client.execute({
    sql: 'SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM dropdown_options WHERE option_type = ?',
    args: [optionType],
  });
  const sortOrder = Number(maxResult.rows[0]?.max_sort || 0) + 1;

  try {
    await client.execute({
      sql: `INSERT INTO dropdown_options (id, option_type, value, label, sort_order, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, 1, ?)`,
      args: [id, optionType, value, label, sortOrder, now],
    });
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) {
      throw new Error('This dropdown option already exists.');
    }
    throw error;
  }

  return (await getDropdownOptions(optionType, true)).find((option) => option.id === id)!;
}

export async function deactivateDropdownOption(id: string): Promise<boolean> {
  await ensureDbInitialized();
  const result = await getTursoClient().execute({
    sql: 'UPDATE dropdown_options SET is_active = 0 WHERE id = ?',
    args: [String(id || '').trim()],
  });
  return Number(result.rowsAffected || 0) > 0;
}
