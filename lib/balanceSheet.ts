import { Loan } from '@/lib/types';

export type BalanceSheetSide = 'liabilities' | 'assets';

export interface BalanceSheetEntry {
  id: string;
  side: BalanceSheetSide;
  groupName: string;
  label: string;
  amount: number;
  openingBalance?: number;
  openingBalanceType?: 'DEBIT' | 'CREDIT';
  sortOrder: number;
}

export interface BalanceSheetDocument {
  title: string;
  asOfDate: string;
  entries: BalanceSheetEntry[];
  updatedAt?: string;
  updatedBy?: string;
}

const PAID_STATUSES = new Set([
  'PASS',
  'NEFT',
  'RTGS',
  'CASH',
  'CLS',
  'PAID',
  'CLEARED',
  'CLOSED',
  'SETTLED',
  'CS',
]);

const isPaid = (status: string | undefined) => PAID_STATUSES.has(String(status || '').trim().toUpperCase());

const entry = (
  id: string,
  side: BalanceSheetSide,
  groupName: string,
  label: string,
  amount: number,
  sortOrder: number,
): BalanceSheetEntry => ({
  id,
  side,
  groupName,
  label,
  amount: Math.max(0, Number(amount) || 0),
  openingBalance: 0,
  openingBalanceType: 'DEBIT',
  sortOrder,
});

/**
 * The first balance sheet is seeded from the existing portfolio so the report
 * is useful immediately. Once saved, the document is fully user-maintained.
 *
 * Portfolio funding = receivables + collections, which gives the opening
 * statement a transparent, balanced basis without inventing external data.
 */
export function buildDefaultBalanceSheet(loans: Loan[]): BalanceSheetDocument {
  const portfolio = loans.reduce((sum, loan) => sum + Math.max(0, Number(loan.totalAmount) || 0), 0);
  const collected = loans.reduce(
    (sum, loan) => sum + (loan.installments || []).reduce(
      (installmentSum, installment) => installmentSum + (isPaid(installment.status) ? Math.max(0, Number(installment.amountDue) || 0) : 0),
      0,
    ),
    0,
  );
  const receivables = Math.max(0, portfolio - collected);
  const funding = receivables + collected;

  return {
    title: 'Balance Sheet',
    asOfDate: new Date().toISOString().slice(0, 10),
    entries: [
      entry('liability-capital-funding', 'liabilities', 'Capital Account', 'Portfolio Funding', funding, 10),
      entry('liability-external-funding', 'liabilities', 'Loans (Liability)', 'External Funding', 0, 20),
      entry('liability-current-payables', 'liabilities', 'Current Liabilities', 'Pending Payouts', 0, 30),
      entry('liability-branches', 'liabilities', 'Branch / Divisions', 'Head Office', 0, 40),
      entry('liability-profit-loss', 'liabilities', 'Profit & Loss A/c', 'Current Period Surplus', 0, 50),
      entry('asset-fixed-assets', 'assets', 'Fixed Assets', 'Computer & Office Equipment', 0, 10),
      entry('asset-investments', 'assets', 'Investments', 'Business Investments', 0, 20),
      entry('asset-loans-advances', 'assets', 'Loans & Advances', 'Customer Receivables', receivables, 10),
      entry('asset-cash-bank', 'assets', 'Current Assets', 'Cash & Bank (Collections)', collected, 20),
    ],
  };
}

export function sumBalanceSheetSide(entries: BalanceSheetEntry[], side: BalanceSheetSide): number {
  return entries
    .filter((item) => item.side === side)
    .reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0);
}

