import { Loan } from '@/lib/types';
import { isPaidStatus } from '@/lib/utils/statusMapping';
import { getLoanPrincipal } from '@/lib/reportAccounting';

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
  sourceKey?: 'PORTFOLIO_FUNDING' | 'CUSTOMER_RECEIVABLES' | 'COLLECTIONS' | 'CALCULATED' | 'MANUAL';
}

export interface BalanceSheetDocument {
  id?: string;
  title: string;
  asOfDate: string;
  entries: BalanceSheetEntry[];
  updatedAt?: string;
  updatedBy?: string;
}

const isPaid = isPaidStatus;

const entry = (
  id: string,
  side: BalanceSheetSide,
  groupName: string,
  label: string,
  amount: number,
  sortOrder: number,
  sourceKey: BalanceSheetEntry['sourceKey'] = 'MANUAL',
): BalanceSheetEntry => ({
  id,
  side,
  groupName,
  label,
  amount: sourceKey === 'CALCULATED' ? Number(amount) || 0 : Math.max(0, Number(amount) || 0),
  openingBalance: 0,
  openingBalanceType: 'DEBIT',
  sortOrder,
  sourceKey,
});

/**
 * The first balance sheet is seeded from the existing portfolio so the report
 * is useful immediately. Once saved, the document is fully user-maintained.
 *
 * Portfolio funding = receivables + collections, which gives the opening
 * statement a transparent, balanced basis without inventing external data.
 */
export function buildDefaultBalanceSheet(loans: Loan[], asOfDate = new Date().toISOString().slice(0, 10)): BalanceSheetDocument {
  const activeLoans = loans.filter((loan) => !loan.startDate || loan.startDate <= asOfDate);
  // A loan can carry an opening ledger balance as well as installment rows.
  // When installment rows exist, they are the loan receivable and the opening
  // balance must not be added again (older migrated loans may contain both).
  // Opening-only accounts without installments use their debit opening balance.
  const portfolio = activeLoans.reduce((sum, loan) => {
    const installmentTotal = (loan.installments || []).reduce(
      (installmentSum, installment) => installmentSum + Math.max(0, Number(installment.amountDue) || 0),
      0,
    );
    if (installmentTotal > 0) return sum + installmentTotal;
    const opening = Math.max(0, Number(loan.openingBalance) || 0);
    return sum + (loan.openingBalanceType === 'CREDIT' ? 0 : opening);
  }, 0);
  const collected = loans.reduce(
    (sum, loan) => sum + (activeLoans.includes(loan) ? (loan.installments || []).reduce(
      (installmentSum, installment) => installmentSum + (isPaid(installment.status) && (!installment.recdDate || installment.recdDate <= asOfDate) ? Math.max(0, Number(installment.amountDue) || 0) : 0),
      0,
    ) : 0),
    0,
  );
  const receivables = Math.max(0, portfolio - collected);
  const principalFunding = activeLoans.reduce((sum, loan) => sum + getLoanPrincipal(loan), 0);
  const openingDebitBalance = activeLoans.reduce((sum, loan) => {
    if (!loan.isOpeningBalanceOnly || loan.openingBalanceType === 'CREDIT') return sum;
    return sum + Math.max(0, Number(loan.openingBalance) || 0);
  }, 0);
  const openingCreditBalance = activeLoans.reduce((sum, loan) => {
    if (!loan.isOpeningBalanceOnly || loan.openingBalanceType !== 'CREDIT') return sum;
    return sum + Math.max(0, Number(loan.openingBalance) || 0);
  }, 0);
  const normalPortfolio = activeLoans.reduce((sum, loan) => {
    if (loan.isOpeningBalanceOnly) return sum;
    const installmentTotal = (loan.installments || []).reduce(
      (installmentSum, installment) => installmentSum + Math.max(0, Number(installment.amountDue) || 0),
      0,
    );
    return sum + (installmentTotal > 0 ? installmentTotal : Math.max(0, Number(loan.totalAmount) || 0));
  }, 0);
  const profitOrLoss = normalPortfolio - principalFunding;

  return {
    id: undefined,
    title: 'Balance Sheet',
    asOfDate,
    entries: [
      entry('liability-capital-funding', 'liabilities', 'Capital Account', 'Portfolio Funding', principalFunding, 10, 'PORTFOLIO_FUNDING'),
      entry('liability-external-funding', 'liabilities', 'Loans (Liability)', 'External Funding', 0, 20),
      entry('liability-current-payables', 'liabilities', 'Current Liabilities', 'Pending Payouts', 0, 30),
      entry('liability-branches', 'liabilities', 'Branch / Divisions', 'Head Office', 0, 40),
      ...(profitOrLoss >= 0
        ? [entry('liability-profit-loss', 'liabilities', 'Profit & Loss A/c', 'Current Period Surplus', profitOrLoss, 50, 'CALCULATED')]
        : []),
      ...(openingDebitBalance > 0
        ? [entry('liability-opening-adjustment', 'liabilities', 'Capital Account', 'Opening Balance Adjustment', openingDebitBalance, 25, 'CALCULATED')]
        : []),
      ...(openingCreditBalance > 0
        ? [entry('liability-customer-credit', 'liabilities', 'Current Liabilities', 'Customer Credit Balances', openingCreditBalance, 41, 'CALCULATED')]
        : []),
      entry('asset-fixed-assets', 'assets', 'Fixed Assets', 'Computer & Office Equipment', 0, 10),
      entry('asset-investments', 'assets', 'Investments', 'Business Investments', 0, 20),
      entry('asset-loans-advances', 'assets', 'Loans & Advances', 'Customer Receivables', receivables, 10, 'CUSTOMER_RECEIVABLES'),
      ...(profitOrLoss < 0
        ? [entry('asset-profit-debit', 'assets', 'Profit & Loss A/c', 'Debit Balance', Math.abs(profitOrLoss), 30, 'CALCULATED')]
        : []),
      entry('asset-cash-bank', 'assets', 'Current Assets', 'Cash & Bank (Collections)', collected + openingCreditBalance, 20, 'COLLECTIONS'),
    ],
  };
}

export function sumBalanceSheetSide(entries: BalanceSheetEntry[], side: BalanceSheetSide): number {
  return entries
    .filter((item) => item.side === side)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

