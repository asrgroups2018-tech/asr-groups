import { randomUUID } from 'node:crypto';
import { AuditActor, ManualReceipt, ManualReceiptDebitCredit, ManualReceiptPaymentMode } from '@/lib/types';
import { logAudit } from './administration';
import { initializeSchema } from './schema';
import { getTursoClient } from './turso';

export const MANUAL_RECEIPT_PAYMENT_MODES: readonly ManualReceiptPaymentMode[] = [
  'UPI',
  'NEFT',
  'RTGS',
  'CHEQUE',
  'CASH',
  'IMPS',
  'CARD',
  'OTHER',
];

type ManualReceiptInput = Pick<
  ManualReceipt,
  'accountNumber' | 'transactionDate' | 'transactionAmount' | 'debitCredit' | 'paymentMode' |
  'chequeNumber' | 'transactionDescription' | 'transactionId' | 'remarks'
> & { receiptNumber?: string };

let schemaInitialized = false;

async function ensureDbInitialized() {
  if (schemaInitialized) return;
  await initializeSchema(getTursoClient());
  schemaInitialized = true;
}

function mapManualReceiptRow(row: Record<string, unknown>): ManualReceipt {
  const hasActor = row.created_by_id || row.created_by_name || row.created_by_email;

  return {
    id: String(row.id || ''),
    receiptNumber: String(row.receipt_number || ''),
    accountNumber: String(row.account_number || ''),
    transactionDate: String(row.transaction_date || ''),
    transactionAmount: Number(row.transaction_amount || 0),
    debitCredit: String(row.debit_credit || 'CREDIT') as ManualReceiptDebitCredit,
    paymentMode: String(row.payment_mode || 'OTHER') as ManualReceiptPaymentMode,
    chequeNumber: String(row.cheque_number || ''),
    transactionDescription: String(row.transaction_description || ''),
    transactionId: String(row.transaction_id || ''),
    remarks: String(row.remarks || ''),
    createdAt: String(row.created_at || ''),
    createdBy: hasActor
      ? {
          id: String(row.created_by_id || ''),
          name: String(row.created_by_name || ''),
          email: String(row.created_by_email || ''),
        }
      : null,
  };
}

async function getManualReceiptById(id: string): Promise<ManualReceipt | null> {
  const result = await getTursoClient().execute({
    sql: 'SELECT * FROM manual_receipts WHERE id = ? LIMIT 1',
    args: [id],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? mapManualReceiptRow(row) : null;
}

function normalizeManualReceiptInput(data: ManualReceiptInput) {
  const accountNumber = String(data.accountNumber || '').trim();
  const transactionDate = String(data.transactionDate || '').trim();
  const transactionAmount = Number(data.transactionAmount || 0);
  const debitCredit = String(data.debitCredit || '').trim().toUpperCase() as ManualReceiptDebitCredit;
  const paymentMode = String(data.paymentMode || '').trim().toUpperCase() as ManualReceiptPaymentMode;
  const chequeNumber = String(data.chequeNumber || '').trim();
  const transactionDescription = String(data.transactionDescription || '').trim();
  const transactionId = String(data.transactionId || '').trim();
  const remarks = String(data.remarks || '').trim();

  if (!transactionDate) throw new Error('Transaction date is required.');
  if (!Number.isFinite(transactionAmount) || transactionAmount <= 0) {
    throw new Error('Transaction amount must be greater than ₹0.');
  }
  if (!['DEBIT', 'CREDIT'].includes(debitCredit)) throw new Error('Select Debit or Credit.');
  if (!MANUAL_RECEIPT_PAYMENT_MODES.includes(paymentMode)) throw new Error('Select a valid payment mode.');
  if (paymentMode === 'CHEQUE' && !chequeNumber) throw new Error('Cheque number is required for cheque payments.');

  return {
    accountNumber,
    transactionDate,
    transactionAmount,
    debitCredit,
    paymentMode,
    chequeNumber,
    transactionDescription,
    transactionId,
    remarks,
  };
}

export async function getManualReceipts(): Promise<ManualReceipt[]> {
  await ensureDbInitialized();
  const result = await getTursoClient().execute(
    'SELECT * FROM manual_receipts ORDER BY transaction_date DESC, created_at DESC'
  );
  return result.rows.map((row) => mapManualReceiptRow(row as Record<string, unknown>));
}

export async function createManualReceipt(
  data: ManualReceiptInput,
  actor: AuditActor,
): Promise<ManualReceipt> {
  await ensureDbInitialized();

  const normalized = normalizeManualReceiptInput(data);
  const {
    accountNumber,
    transactionDate,
    transactionAmount,
    debitCredit,
    paymentMode,
    chequeNumber,
    transactionDescription,
    transactionId,
    remarks,
  } = normalized;

  const id = `RCT-${randomUUID()}`;
  const receiptNumber = String(data.receiptNumber || '').trim() ||
    `ASR-${transactionDate.replace(/[^0-9]/g, '')}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const createdAt = new Date().toISOString();

  await getTursoClient().execute({
    sql: `INSERT INTO manual_receipts (
      id, receipt_number, account_number, transaction_date, transaction_amount,
      debit_credit, payment_mode, cheque_number, transaction_description,
      transaction_id, remarks, created_by_id, created_by_name, created_by_email, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      receiptNumber,
      accountNumber,
      transactionDate,
      transactionAmount,
      debitCredit,
      paymentMode,
      chequeNumber,
      transactionDescription,
      transactionId,
      remarks,
      actor.id,
      actor.name,
      actor.email || '',
      createdAt,
    ],
  });

  const receipt: ManualReceipt = {
    id,
    receiptNumber,
    accountNumber,
    transactionDate,
    transactionAmount,
    debitCredit,
    paymentMode,
    chequeNumber,
    transactionDescription,
    transactionId,
    remarks,
    createdAt,
    createdBy: { id: actor.id, name: actor.name, email: actor.email || '' },
  };

  await logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRoleId: actor.primaryRoleId,
    action: 'Created Manual Receipt',
    target: `Receipt: ${receipt.receiptNumber}`,
    pageId: 'reports',
    pageName: 'Receipt Book',
    entityType: 'manual_receipt',
    entityId: receipt.id,
    beforeVal: '-',
    afterVal: JSON.stringify(receipt),
    isSensitive: false,
  });

  return receipt;
}

export async function updateManualReceipt(id: string, data: ManualReceiptInput, actor: AuditActor): Promise<ManualReceipt> {
  await ensureDbInitialized();
  const existing = await getManualReceiptById(id);
  if (!existing) throw new Error('Receipt not found.');

  const normalized = normalizeManualReceiptInput(data);
  await getTursoClient().execute({
    sql: `UPDATE manual_receipts SET
      account_number = ?, transaction_date = ?, transaction_amount = ?, debit_credit = ?,
      payment_mode = ?, cheque_number = ?, transaction_description = ?, transaction_id = ?, remarks = ?
      WHERE id = ?`,
    args: [
      normalized.accountNumber,
      normalized.transactionDate,
      normalized.transactionAmount,
      normalized.debitCredit,
      normalized.paymentMode,
      normalized.chequeNumber,
      normalized.transactionDescription,
      normalized.transactionId,
      normalized.remarks,
      id,
    ],
  });

  const updated = await getManualReceiptById(id);
  if (!updated) throw new Error('Unable to load the updated receipt.');
  await logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRoleId: actor.primaryRoleId,
    action: 'Updated Manual Receipt',
    target: `Receipt: ${updated.receiptNumber}`,
    pageId: 'reports',
    pageName: 'Receipt Book',
    entityType: 'manual_receipt',
    entityId: updated.id,
    beforeVal: JSON.stringify(existing),
    afterVal: JSON.stringify(updated),
    isSensitive: false,
  });
  return updated;
}

export async function deleteManualReceipt(id: string, actor: AuditActor): Promise<void> {
  await ensureDbInitialized();
  const existing = await getManualReceiptById(id);
  if (!existing) throw new Error('Receipt not found.');

  await getTursoClient().execute({
    sql: 'DELETE FROM manual_receipts WHERE id = ?',
    args: [id],
  });
  await logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRoleId: actor.primaryRoleId,
    action: 'Deleted Manual Receipt',
    target: `Receipt: ${existing.receiptNumber}`,
    pageId: 'reports',
    pageName: 'Receipt Book',
    entityType: 'manual_receipt',
    entityId: existing.id,
    beforeVal: JSON.stringify(existing),
    afterVal: 'Deleted',
    isSensitive: false,
  });
}
