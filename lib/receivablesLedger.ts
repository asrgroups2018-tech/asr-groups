import { Loan, ManualReceipt } from '@/lib/types';
import { isPaidStatus } from '@/lib/utils/statusMapping';

export interface ReceivablesLedgerRow {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  loanId: string;
  installmentNo?: number;
  dueDate?: string;
  receivedDate?: string;
  status: string;
  debit: number;
  credit: number;
  runningBalance: number;
  reference: string;
  remarks: string;
}

export interface CashLedgerRow {
  id: string;
  date: string;
  particulars: string;
  reference: string;
  mode: string;
  debit: number;
  credit: number;
}

const amount = (value: unknown) => Math.max(0, Number(value) || 0);
const dateKey = (value: unknown) => String(value || '').slice(0, 10);

function loanDate(loan: Loan): string {
  return dateKey(loan.startDate || loan.createdAt);
}

function addRow(
  rows: Omit<ReceivablesLedgerRow, 'runningBalance'>[],
  row: Omit<ReceivablesLedgerRow, 'runningBalance'>,
) {
  if (row.debit <= 0 && row.credit <= 0) return;
  rows.push(row);
}

/**
 * Builds the same debit/credit history represented by Customer Receivables in
 * the balance sheet. Installment schedules are shown as debits and cleared
 * installments as credits, with opening-only accounts handled separately.
 */
export function buildReceivablesLedger(loans: Loan[], asOfDate: string, receipts: ManualReceipt[] = []): ReceivablesLedgerRow[] {
  const rows: Omit<ReceivablesLedgerRow, 'runningBalance'>[] = [];

  loans
    .filter((loan) => {
      const date = loanDate(loan);
      return !date || !asOfDate || date <= asOfDate;
    })
    .forEach((loan) => {
      const baseDate = loanDate(loan);

      if (loan.isOpeningBalanceOnly) {
        const opening = amount(loan.openingBalance);
        const isCredit = loan.openingBalanceType === 'CREDIT';
        addRow(rows, {
          id: `${loan.id}-opening`,
          date: baseDate,
          customerId: loan.customerId,
          customerName: loan.customerName,
          loanId: loan.id,
          status: 'Opening balance',
          debit: isCredit ? 0 : opening,
          credit: isCredit ? opening : 0,
          reference: loan.codeNo || '',
          remarks: 'Opening customer balance',
        });
        return;
      }

      const installments = [...(loan.installments || [])].sort((a, b) =>
        dateKey(a.dueDate).localeCompare(dateKey(b.dueDate)) || Number(a.seqNo || 0) - Number(b.seqNo || 0),
      );

      if (installments.length > 0) {
        installments.forEach((installment) => {
          const due = amount(installment.amountDue);
          const paid = isPaidStatus(installment.status) ? due : 0;
          addRow(rows, {
            id: installment.id || `${loan.id}-installment-${installment.seqNo}`,
            date: dateKey(installment.dueDate || installment.recdDate || baseDate),
            customerId: loan.customerId,
            customerName: loan.customerName,
            loanId: loan.id,
            installmentNo: Number(installment.seqNo || 0) || undefined,
            dueDate: dateKey(installment.dueDate),
            receivedDate: dateKey(installment.recdDate),
            status: String(installment.status || 'PENDING'),
            debit: due,
            credit: paid,
            reference: installment.chqNo || '',
            remarks: installment.remarks || '',
          });
        });
        return;
      }

      const total = amount(loan.totalAmount);
      addRow(rows, {
        id: `${loan.id}-receivable`,
        date: baseDate,
        customerId: loan.customerId,
        customerName: loan.customerName,
        loanId: loan.id,
        status: String(loan.status || 'Scheduled'),
        debit: total,
        credit: 0,
        reference: loan.codeNo || '',
        remarks: 'Loan receivable without installment schedule',
      });
    });

  receipts
    .filter((receipt) => receipt.loanId && (!asOfDate || dateKey(receipt.transactionDate) <= asOfDate))
    .forEach((receipt) => {
      const loan = loans.find((candidate) => candidate.id === receipt.loanId);
      if (!loan || loan.isOpeningBalanceOnly) return;
      const receiptDate = dateKey(receipt.transactionDate || loan.startDate || loan.createdAt);
      if (receiptDate && loanDate(loan) && receiptDate < loanDate(loan)) return;
      const receiptAmount = amount(receipt.transactionAmount);
      addRow(rows, {
        id: `${receipt.id}-receivable`,
        date: receiptDate,
        customerId: loan.customerId,
        customerName: loan.customerName,
        loanId: loan.id,
        status: receipt.debitCredit === 'CREDIT' ? 'Receipt' : 'General advance',
        debit: receipt.debitCredit === 'DEBIT' ? receiptAmount : 0,
        credit: receipt.debitCredit === 'CREDIT' ? receiptAmount : 0,
        reference: receipt.receiptNumber || receipt.transactionId || receipt.accountNumber || '',
        remarks: receipt.transactionDescription || receipt.remarks || 'Linked receipt',
      });
    });

  rows.sort((a, b) => dateKey(a.date).localeCompare(dateKey(b.date)) || a.id.localeCompare(b.id));

  let runningBalance = 0;
  return rows.map((row) => {
    runningBalance += row.debit - row.credit;
    return { ...row, runningBalance };
  });
}

/** Exposes separately saved cash/bank receipts without changing accounting totals. */
export function buildCashLedger(receipts: ManualReceipt[], asOfDate: string): CashLedgerRow[] {
  return receipts
    .filter((receipt) => !asOfDate || dateKey(receipt.transactionDate) <= asOfDate)
    .map((receipt) => ({
      id: receipt.id,
      date: dateKey(receipt.transactionDate),
      particulars: receipt.transactionDescription || receipt.remarks || 'Cash / bank transaction',
      reference: receipt.receiptNumber || receipt.transactionId || receipt.accountNumber || '—',
      mode: receipt.paymentMode,
      debit: receipt.debitCredit === 'DEBIT' ? amount(receipt.transactionAmount) : 0,
      credit: receipt.debitCredit === 'CREDIT' ? amount(receipt.transactionAmount) : 0,
    }))
    .sort((a, b) => dateKey(a.date).localeCompare(dateKey(b.date)) || a.id.localeCompare(b.id));
}
