import { Company, Installment, Loan, ManualReceipt } from '@/lib/types';
import { isPaidStatus } from '@/lib/utils/statusMapping';

export interface ReportPeriod {
  fromDate: string;
  toDate: string;
}

export interface AccountingLine {
  id: string;
  side: 'assets' | 'liabilities';
  groupName: string;
  label: string;
  amount: number;
  sortOrder: number;
  sourceKey?: 'PORTFOLIO_FUNDING' | 'CUSTOMER_RECEIVABLES' | 'COLLECTIONS' | 'CALCULATED' | 'MANUAL';
}

export interface PnLLine {
  id: string;
  label: string;
  amount: number;
}

export interface ReportAccounting {
  period: ReportPeriod;
  directIncome: PnLLine[];
  directExpenses: PnLLine[];
  indirectIncome: PnLLine[];
  indirectExpenses: PnLLine[];
  grossProfit: number;
  netProfit: number;
  openingProfit: number;
  closingProfit: number;
  totalRepayable: number;
  principalFunded: number;
  principalRecovered: number;
  interestRecovered: number;
  totalCollected: number;
  receivables: number;
  cashBalance: number;
  bankOverdraft: number;
  capitalLines: PnLLine[];
  balanceSheetAssets: AccountingLine[];
  balanceSheetLiabilities: AccountingLine[];
}

const money = (value: unknown) => Math.max(0, Number(value) || 0);

export function dateKey(value: unknown): string {
  return String(value || '').slice(0, 10);
}

export function getFiscalYearStart(asOfDate: string): string {
  const cleanDate = dateKey(asOfDate) || new Date().toISOString().slice(0, 10);
  const year = Number(cleanDate.slice(0, 4));
  const month = Number(cleanDate.slice(5, 7));
  return `${month >= 4 ? year : year - 1}-04-01`;
}

export function getDefaultReportPeriod(asOfDate = new Date().toISOString().slice(0, 10)): ReportPeriod {
  return { fromDate: getFiscalYearStart(asOfDate), toDate: dateKey(asOfDate) };
}

export function getLoanInterest(loan: Loan): number {
  if (loan.isOpeningBalanceOnly) return 0;
  const explicitInterest = money(loan.interestAmount);
  if (explicitInterest > 0) return explicitInterest;
  const total = money(loan.totalAmount);
  const disbursed = money(loan.disbursedAmount);
  return disbursed > 0 ? Math.max(0, total - disbursed) : 0;
}

export function getLoanPrincipal(loan: Loan): number {
  if (loan.isOpeningBalanceOnly) return 0;
  const disbursed = money(loan.disbursedAmount);
  if (disbursed > 0) return disbursed;
  return Math.max(0, money(loan.totalAmount) - getLoanInterest(loan));
}

function openingBalanceSigned(loan: Loan): number {
  const amount = money(loan.openingBalance);
  return loan.openingBalanceType === 'CREDIT' ? -amount : amount;
}

export function getLoanRepayable(loan: Loan): number {
  if (loan.isOpeningBalanceOnly) return Math.max(0, openingBalanceSigned(loan));
  return money(loan.totalAmount);
}

function isWithin(value: string, period: ReportPeriod): boolean {
  return Boolean(value) && value >= period.fromDate && value <= period.toDate;
}

function isOnOrBefore(value: string, date: string): boolean {
  return Boolean(value) && value <= date;
}

function previousDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function installmentDate(installment: Installment): string {
  return dateKey(installment.recdDate || installment.dueDate || installment.createdAt);
}

function paidAmountThrough(loan: Loan, asOfDate: string): number {
  return (loan.installments || []).reduce((sum, installment) => {
    const date = installmentDate(installment);
    return sum + (isPaidStatus(installment.status) && isOnOrBefore(date, asOfDate) ? money(installment.amountDue) : 0);
  }, 0);
}

function paidAmountInPeriod(loan: Loan, period: ReportPeriod): number {
  return (loan.installments || []).reduce((sum, installment) => {
    const date = installmentDate(installment);
    return sum + (isPaidStatus(installment.status) && isWithin(date, period) ? money(installment.amountDue) : 0);
  }, 0);
}

function interestPortion(loan: Loan, amount: number): number {
  const repayable = money(loan.totalAmount);
  const interest = getLoanInterest(loan);
  return repayable > 0 ? Math.min(amount, amount * (interest / repayable)) : 0;
}

function receiptLabel(receipt: ManualReceipt): string {
  const text = `${receipt.transactionDescription || ''} ${receipt.remarks || ''}`.trim();
  if (/delay|late|penalty/i.test(text)) return 'Delay Interest';
  return text || receipt.paymentMode.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function groupReceipts(receipts: ManualReceipt[], period: ReportPeriod, debitCredit: 'DEBIT' | 'CREDIT'): PnLLine[] {
  const totals = new Map<string, number>();
  receipts
    .filter((receipt) => receipt.debitCredit === debitCredit && isWithin(dateKey(receipt.transactionDate), period))
    .forEach((receipt) => {
      const label = receiptLabel(receipt);
      totals.set(label, (totals.get(label) || 0) + money(receipt.transactionAmount));
    });
  return Array.from(totals.entries())
    .map(([label, amount]) => ({ id: `${debitCredit}-${label}`, label, amount }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function receiptNetThrough(receipts: ManualReceipt[], asOfDate: string): number {
  return receipts.reduce((sum, receipt) => {
    if (!isOnOrBefore(dateKey(receipt.transactionDate), asOfDate)) return sum;
    const amount = money(receipt.transactionAmount);
    return sum + (receipt.debitCredit === 'CREDIT' ? amount : -amount);
  }, 0);
}

function bookedInterestThrough(loans: Loan[], asOfDate: string): number {
  return loans.reduce((sum, loan) => {
    const startDate = dateKey(loan.startDate || loan.createdAt);
    return sum + (startDate && startDate <= asOfDate ? getLoanInterest(loan) : 0);
  }, 0);
}

function bookedInterestInPeriod(loans: Loan[], period: ReportPeriod): number {
  return loans.reduce((sum, loan) => {
    const startDate = dateKey(loan.startDate || loan.createdAt);
    return sum + (isWithin(startDate, period) ? getLoanInterest(loan) : 0);
  }, 0);
}

function capitalLines(loans: Loan[], companies: Company[], asOfDate: string): PnLLine[] {
  const amounts = new Map<string, number>();
  const names = new Map<string, string>();

  companies.forEach((company) => {
    names.set(company.id, company.name);
    const opening = money(company.openingBalance) * (company.openingBalanceType === 'CREDIT' ? 1 : -1);
    if (opening) {
      const openingId = `${company.id}:opening`;
      amounts.set(openingId, opening);
      names.set(openingId, `${company.name} · Opening Balance`);
    }
  });

  loans
    .filter((loan) => dateKey(loan.startDate || loan.createdAt) <= asOfDate)
    .forEach((loan) => {
      // Opening customer balances are represented as customer receivables or
      // customer credit balances below. They are not new capital funding.
      if (loan.isOpeningBalanceOnly) return;
      const principal = getLoanPrincipal(loan);
      const repayable = money(loan.totalAmount);
      if (!loan.splits?.length || principal <= 0) {
        amounts.set('UNALLOCATED:funding', (amounts.get('UNALLOCATED:funding') || 0) + principal);
        names.set('UNALLOCATED:funding', 'Unallocated Capital');
        return;
      }
      loan.splits.forEach((split) => {
        const proportion = repayable > 0 ? money(split.splitAmount) / repayable : money(split.splitPercent) / 100;
        const fundingId = `${split.companyId}:funding`;
        amounts.set(fundingId, (amounts.get(fundingId) || 0) + principal * proportion);
        if (!names.has(fundingId)) names.set(fundingId, split.companyName || split.companyCode || split.companyId);
      });
    });

  return Array.from(amounts.entries())
    .map(([id, amount]) => ({ id, label: names.get(id) || id, amount }))
    .filter((line) => Math.abs(line.amount) > 0.005)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function buildReportAccounting(
  loans: Loan[],
  companies: Company[],
  receipts: ManualReceipt[],
  period: ReportPeriod,
): ReportAccounting {
  const requestedPeriod = {
    fromDate: dateKey(period.fromDate) || getFiscalYearStart(period.toDate),
    toDate: dateKey(period.toDate) || new Date().toISOString().slice(0, 10),
  };
  const safePeriod = requestedPeriod.fromDate <= requestedPeriod.toDate
    ? requestedPeriod
    : { fromDate: requestedPeriod.toDate, toDate: requestedPeriod.fromDate };
  const activeLoans = loans.filter((loan) => dateKey(loan.startDate || loan.createdAt) <= safePeriod.toDate);
  const directIncomeAmount = bookedInterestInPeriod(loans, safePeriod);
  const indirectIncome = groupReceipts(receipts, safePeriod, 'CREDIT');
  const indirectExpenses = groupReceipts(receipts, safePeriod, 'DEBIT');
  const grossProfit = directIncomeAmount;
  const netProfit = grossProfit + indirectIncome.reduce((sum, line) => sum + line.amount, 0) - indirectExpenses.reduce((sum, line) => sum + line.amount, 0);
  const priorDate = previousDate(safePeriod.fromDate);
  const openingProfit = bookedInterestThrough(loans, priorDate) + receiptNetThrough(receipts, priorDate);
  const totalRepayable = activeLoans.reduce((sum, loan) => sum + getLoanRepayable(loan), 0);
  const principalFunded = activeLoans.reduce((sum, loan) => sum + getLoanPrincipal(loan), 0);
  const totalCollected = activeLoans.reduce((sum, loan) => sum + paidAmountThrough(loan, safePeriod.toDate), 0);
  const interestRecovered = activeLoans.reduce((sum, loan) => sum + interestPortion(loan, paidAmountThrough(loan, safePeriod.toDate)), 0);
  const principalRecovered = Math.max(0, totalCollected - interestRecovered);
  const receivables = Math.max(0, totalRepayable - totalCollected);
  const capital = capitalLines(activeLoans, companies, safePeriod.toDate);
  const capitalDebitBalance = capital.reduce((sum, line) => sum + (line.amount < 0 ? Math.abs(line.amount) : 0), 0);
  const openingDebitBalance = activeLoans.reduce((sum, loan) => {
    if (!loan.isOpeningBalanceOnly) return sum;
    return sum + Math.max(0, openingBalanceSigned(loan) - paidAmountThrough(loan, safePeriod.toDate));
  }, 0);
  const openingCreditBalance = activeLoans.reduce((sum, loan) => {
    return sum + (loan.isOpeningBalanceOnly ? Math.max(0, -openingBalanceSigned(loan)) : 0);
  }, 0);
  const normalReceivables = Math.max(0, receivables - openingDebitBalance);
  const openingCapitalCredit = companies.reduce((sum, company) => {
    return sum + (company.openingBalanceType === 'CREDIT' ? money(company.openingBalance) : 0);
  }, 0);
  const capitalFundingCash = principalFunded;
  const cashMovement = openingCapitalCredit + openingCreditBalance + capitalFundingCash + receiptNetThrough(receipts, safePeriod.toDate) + totalCollected - principalFunded;
  const cashBalance = Math.max(0, cashMovement);
  const bankOverdraft = Math.max(0, -cashMovement);
  const directIncome: PnLLine[] = directIncomeAmount > 0 ? [{ id: 'interest-received', label: 'Interest Received', amount: directIncomeAmount }] : [];
  const closingProfit = openingProfit + netProfit;
  const assets: AccountingLine[] = [
    { id: 'asset-receivables', side: 'assets', groupName: 'Loans & Advances', label: 'Customer Receivables', amount: normalReceivables, sortOrder: 10, sourceKey: 'CUSTOMER_RECEIVABLES' },
    { id: 'asset-cash-bank', side: 'assets', groupName: 'Current Assets', label: 'Cash-in-Hand & Bank', amount: cashBalance, sortOrder: 20, sourceKey: 'COLLECTIONS' },
  ];
  if (openingDebitBalance > 0) {
    assets.push({ id: 'asset-opening-receivables', side: 'assets', groupName: 'Loans & Advances', label: 'Opening Customer Balances', amount: openingDebitBalance, sortOrder: 15, sourceKey: 'CALCULATED' });
  }
  if (capitalDebitBalance > 0) assets.push({ id: 'asset-capital-debit', side: 'assets', groupName: 'Capital Account', label: 'Debit Balance', amount: capitalDebitBalance, sortOrder: 25, sourceKey: 'CALCULATED' });
  if (closingProfit < 0) assets.push({ id: 'asset-profit-debit', side: 'assets', groupName: 'Profit & Loss A/c', label: 'Debit Balance', amount: Math.abs(closingProfit), sortOrder: 30, sourceKey: 'CALCULATED' });

  const liabilities: AccountingLine[] = capital.map((line, index) => ({
    id: `liability-capital-${line.id}`,
    side: 'liabilities',
    groupName: 'Capital Account',
    label: line.label,
    amount: Math.max(0, line.amount),
    sortOrder: 10 + index,
    sourceKey: 'PORTFOLIO_FUNDING',
  }));
  if (closingProfit >= 0) {
    liabilities.push({ id: 'liability-profit-opening', side: 'liabilities', groupName: 'Profit & Loss A/c', label: 'Opening Balance', amount: Math.max(0, openingProfit), sortOrder: 30, sourceKey: 'CALCULATED' });
    liabilities.push({ id: 'liability-profit-current', side: 'liabilities', groupName: 'Profit & Loss A/c', label: 'Current Period', amount: Math.max(0, netProfit), sortOrder: 31, sourceKey: 'CALCULATED' });
  }
  if (openingDebitBalance > 0) {
    liabilities.push({ id: 'liability-opening-adjustment', side: 'liabilities', groupName: 'Capital Account', label: 'Opening Balance Adjustment', amount: openingDebitBalance, sortOrder: 25, sourceKey: 'CALCULATED' });
  }
  if (openingCreditBalance > 0) {
    liabilities.push({ id: 'liability-customer-credit', side: 'liabilities', groupName: 'Current Liabilities', label: 'Customer Credit Balances', amount: openingCreditBalance, sortOrder: 41, sourceKey: 'CALCULATED' });
  }
  if (bankOverdraft > 0) liabilities.push({ id: 'liability-bank-overdraft', side: 'liabilities', groupName: 'Current Liabilities', label: 'Bank Overdraft', amount: bankOverdraft, sortOrder: 40, sourceKey: 'CALCULATED' });

  return {
    period: safePeriod,
    directIncome,
    directExpenses: [],
    indirectIncome,
    indirectExpenses,
    grossProfit,
    netProfit,
    openingProfit,
    closingProfit,
    totalRepayable,
    principalFunded,
    principalRecovered,
    interestRecovered,
    totalCollected,
    receivables,
    cashBalance,
    bankOverdraft,
    capitalLines: capital,
    balanceSheetAssets: assets,
    balanceSheetLiabilities: liabilities,
  };
}

export function periodCollected(loan: Loan, period: ReportPeriod): number {
  return paidAmountInPeriod(loan, period);
}
