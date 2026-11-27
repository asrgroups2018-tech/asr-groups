import { Loan, ManualReceipt } from '@/lib/types';
import { isPaidStatus } from '@/lib/utils/statusMapping';
import { AccountingLine, ReportPeriod, dateKey, getLoanInterest, getLoanPrincipal, getLoanRepayable } from '@/lib/reportAccounting';
import type { BalanceSheetEntry } from '@/lib/balanceSheet';

export interface BalanceSheetAccounting {
  period: ReportPeriod;
  totalRepayable: number;
  totalCollected: number;
  receivables: number;
  openingProfit: number;
  currentProfit: number;
  closingProfit: number;
  balanceSheetAssets: AccountingLine[];
  balanceSheetLiabilities: AccountingLine[];
}

const money = (value: unknown) => Math.max(0, Number(value) || 0);

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

function installmentDate(installment: Loan['installments'][number]): string {
  return dateKey(installment.recdDate || installment.dueDate || installment.createdAt);
}

function paidAmountThrough(loan: Loan, asOfDate: string): number {
  return (loan.installments || []).reduce((sum, installment) => {
    const date = installmentDate(installment);
    return sum + (isPaidStatus(installment.status) && isOnOrBefore(date, asOfDate) ? money(installment.amountDue) : 0);
  }, 0);
}

function receiptNetThrough(receipts: ManualReceipt[], asOfDate: string, excludedReceiptIds: Set<string>): number {
  return receipts.reduce((sum, receipt) => {
    if (excludedReceiptIds.has(receipt.id)) return sum;
    if (!isOnOrBefore(dateKey(receipt.transactionDate), asOfDate)) return sum;
    const amount = money(receipt.transactionAmount);
    return sum + (receipt.debitCredit === 'CREDIT' ? amount : -amount);
  }, 0);
}

function receiptNetInPeriod(receipts: ManualReceipt[], period: ReportPeriod, excludedReceiptIds: Set<string>): number {
  return receipts.reduce((sum, receipt) => {
    if (excludedReceiptIds.has(receipt.id)) return sum;
    if (!isWithin(dateKey(receipt.transactionDate), period)) return sum;
    const amount = money(receipt.transactionAmount);
    return sum + (receipt.debitCredit === 'CREDIT' ? amount : -amount);
  }, 0);
}

function generalAdvanceReceiptIds(receipts: ManualReceipt[]): Set<string> {
  return new Set(receipts
    .filter((receipt) => !receipt.loanId && receipt.debitCredit === 'DEBIT')
    .map((receipt) => receipt.id));
}

function loanDisbursementReceiptIds(receipts: ManualReceipt[], loans: Loan[], asOfDate: string): Set<string> {
  const usedLoanIds = new Set<string>();
  const excludedReceiptIds = new Set<string>();
  const activeLoans = loans.filter((loan) => (
    !loan.isOpeningBalanceOnly && dateKey(loan.startDate || loan.createdAt) <= asOfDate
  ));

  receipts
    .filter((receipt) => receipt.debitCredit === 'DEBIT' && isOnOrBefore(dateKey(receipt.transactionDate), asOfDate))
    .forEach((receipt) => {
      const receiptDate = dateKey(receipt.transactionDate);
      const amount = money(receipt.transactionAmount);
      const description = [
        receipt.transactionDescription,
        receipt.transactionId,
        receipt.remarks,
      ].join(' ').trim().toLowerCase();

      const matchingLoans = activeLoans.filter((loan) => {
        if (usedLoanIds.has(loan.id) || receiptDate < dateKey(loan.startDate || loan.createdAt)) return false;
        const matchesAmount = Math.abs(amount - getLoanRepayable(loan)) < 0.01 || Math.abs(amount - getLoanPrincipal(loan)) < 0.01;
        if (!matchesAmount) return false;
        const identity = [loan.id, loan.codeNo, loan.customerName].filter(Boolean).join(' ').toLowerCase();
        return !description || description.includes(identity) || identity.split(' ').some((part) => part.length > 2 && description.includes(part));
      });

      const explicitMatches = matchingLoans.filter((loan) => {
        const identity = [loan.id, loan.codeNo, loan.customerName].filter(Boolean).join(' ').toLowerCase();
        return description && identity.split(' ').some((part) => part.length > 2 && description.includes(part));
      });
      const candidateLoans = explicitMatches.length > 0 ? explicitMatches : (description ? [] : matchingLoans);
      if (candidateLoans.length !== 1) return;

      usedLoanIds.add(candidateLoans[0].id);
      excludedReceiptIds.add(receipt.id);
    });

  return excludedReceiptIds;
}

function bookedInterestThrough(loans: Loan[], asOfDate: string): number {
  return loans.reduce((sum, loan) => {
    const startDate = dateKey(loan.startDate || loan.createdAt);
    return sum + (!loan.isOpeningBalanceOnly && startDate && startDate <= asOfDate ? getLoanInterest(loan) : 0);
  }, 0);
}

function bookedInterestInPeriod(loans: Loan[], period: ReportPeriod): number {
  return loans.reduce((sum, loan) => {
    const startDate = dateKey(loan.startDate || loan.createdAt);
    return sum + (!loan.isOpeningBalanceOnly && isWithin(startDate, period) ? getLoanInterest(loan) : 0);
  }, 0);
}

function openingBalanceSigned(loan: Loan): number {
  const amount = money(loan.openingBalance);
  return loan.openingBalanceType === 'CREDIT' ? -amount : amount;
}

export function buildBalanceSheetAccounting(
  loans: Loan[],
  receipts: ManualReceipt[],
  period: ReportPeriod,
  balanceSheetEntries: BalanceSheetEntry[] = [],
): BalanceSheetAccounting {
  const requestedPeriod = {
    fromDate: dateKey(period.fromDate),
    toDate: dateKey(period.toDate),
  };
  const safePeriod = requestedPeriod.fromDate <= requestedPeriod.toDate
    ? requestedPeriod
    : { fromDate: requestedPeriod.toDate, toDate: requestedPeriod.fromDate };
  const activeLoans = loans.filter((loan) => dateKey(loan.startDate || loan.createdAt) <= safePeriod.toDate);
  const normalLoans = activeLoans.filter((loan) => !loan.isOpeningBalanceOnly);
  const openingLoans = activeLoans.filter((loan) => loan.isOpeningBalanceOnly);

  const normalRepayable = normalLoans.reduce((sum, loan) => sum + getLoanRepayable(loan), 0);
  const openingDebitBalance = openingLoans.reduce((sum, loan) => {
    if (loan.openingBalanceType === 'CREDIT') return sum;
    return sum + Math.max(0, openingBalanceSigned(loan) - paidAmountThrough(loan, safePeriod.toDate));
  }, 0);
  const openingDebitAdjustment = openingLoans.reduce((sum, loan) => {
    if (loan.openingBalanceType === 'CREDIT') return sum;
    return sum + Math.max(0, openingBalanceSigned(loan));
  }, 0);
  const openingCreditBalance = openingLoans.reduce((sum, loan) => sum + Math.max(0, -openingBalanceSigned(loan)), 0);
  const normalCollected = normalLoans.reduce((sum, loan) => sum + paidAmountThrough(loan, safePeriod.toDate), 0);
  const totalCollected = activeLoans.reduce((sum, loan) => sum + paidAmountThrough(loan, safePeriod.toDate), 0);
  const totalRepayable = normalRepayable + openingDebitBalance;
  const normalReceivables = Math.max(0, normalRepayable - normalCollected);
  const receivables = normalReceivables + openingDebitBalance;
  const priorDate = previousDate(safePeriod.fromDate);
  const excludedReceiptIds = loanDisbursementReceiptIds(receipts, loans, safePeriod.toDate);
  const generalAdvanceIds = generalAdvanceReceiptIds(receipts);
  const profitReceiptIds = new Set([...excludedReceiptIds, ...generalAdvanceIds]);
  const openingProfit = bookedInterestThrough(loans, priorDate) + receiptNetThrough(receipts, priorDate, profitReceiptIds);
  const currentProfit = bookedInterestInPeriod(loans, safePeriod) + receiptNetInPeriod(receipts, safePeriod, profitReceiptIds);
  const closingProfit = openingProfit + currentProfit;
  const manualCapitalCredit = balanceSheetEntries
    .filter((entry) => (
      entry.side === 'liabilities'
      && (
        entry.groupName.trim().toLowerCase() === 'capital account'
        || (
          entry.groupName.trim().toLowerCase() === 'loans (liability)'
          && entry.label.trim().toLowerCase().includes('capital')
          && !entry.label.trim().toLowerCase().includes('funding')
        )
      )
      && (!entry.sourceKey || entry.sourceKey === 'MANUAL')
    ))
    .reduce((sum, entry) => sum + Math.max(0, Number(entry.amount) || 0), 0);
  const principalFunded = normalLoans.reduce((sum, loan) => sum + getLoanPrincipal(loan), 0);
  const receiptNet = receiptNetThrough(receipts, safePeriod.toDate, excludedReceiptIds);
  const generalAdvanceBalance = receipts.reduce((sum, receipt) => {
    if (receipt.loanId || !isOnOrBefore(dateKey(receipt.transactionDate), safePeriod.toDate)) return sum;
    const amount = money(receipt.transactionAmount);
    return sum + (receipt.debitCredit === 'DEBIT' ? amount : -amount);
  }, 0);
  const availableFunding = manualCapitalCredit + openingCreditBalance;
  // Cash is the net result of all funding and cash movements. Do not clamp the
  // funding position before collections are added: a collection can settle a
  // temporary funding shortfall in the same period.
  const netCashPosition = availableFunding - principalFunded + totalCollected + receiptNet;
  const cashBalance = Math.max(0, netCashPosition);
  const bankOverdraft = Math.max(0, -netCashPosition);

  const assets: AccountingLine[] = [
    { id: 'asset-receivables', side: 'assets', groupName: 'Loans & Advances', label: 'Customer Receivables', amount: normalReceivables, sortOrder: 10, sourceKey: 'CUSTOMER_RECEIVABLES' },
    { id: 'asset-cash-bank', side: 'assets', groupName: 'Current Assets', label: 'Cash-in-Hand & Bank', amount: cashBalance, sortOrder: 20, sourceKey: 'COLLECTIONS' },
  ];
  if (generalAdvanceBalance > 0) {
    assets.push({ id: 'asset-general-advances', side: 'assets', groupName: 'Loans & Advances', label: 'General Advances', amount: generalAdvanceBalance, sortOrder: 20, sourceKey: 'CALCULATED' });
  }
  if (openingDebitBalance > 0) {
    assets.push({ id: 'asset-opening-receivables', side: 'assets', groupName: 'Loans & Advances', label: 'Opening Customer Balances', amount: openingDebitBalance, sortOrder: 15, sourceKey: 'CALCULATED' });
  }
  if (closingProfit < 0) {
    assets.push({ id: 'asset-profit-debit', side: 'assets', groupName: 'Profit & Loss A/c', label: 'Debit Balance', amount: Math.abs(closingProfit), sortOrder: 30, sourceKey: 'CALCULATED' });
  } else if (openingProfit < 0) {
    assets.push({ id: 'asset-profit-opening-debit', side: 'assets', groupName: 'Profit & Loss A/c', label: 'Opening Balance', amount: Math.abs(openingProfit), sortOrder: 29, sourceKey: 'CALCULATED' });
  }

  const liabilities: AccountingLine[] = [];
  if (closingProfit >= 0) {
    if (openingProfit > 0) {
      liabilities.push({ id: 'liability-profit-opening', side: 'liabilities', groupName: 'Profit & Loss A/c', label: 'Opening Balance', amount: openingProfit, sortOrder: 30, sourceKey: 'CALCULATED' });
    }
    if (currentProfit !== 0) {
      liabilities.push({ id: 'liability-profit-current', side: 'liabilities', groupName: 'Profit & Loss A/c', label: 'Current Period', amount: currentProfit, sortOrder: 31, sourceKey: 'CALCULATED' });
    }
  }
  if (openingDebitAdjustment > 0) {
    liabilities.push({ id: 'liability-opening-adjustment', side: 'liabilities', groupName: 'Capital Account', label: 'Opening Balance Adjustment', amount: openingDebitAdjustment, sortOrder: 25, sourceKey: 'CALCULATED' });
  }
  if (openingCreditBalance > 0) {
    liabilities.push({ id: 'liability-customer-credit', side: 'liabilities', groupName: 'Current Liabilities', label: 'Customer Credit Balances', amount: openingCreditBalance, sortOrder: 41, sourceKey: 'CALCULATED' });
  }
  if (bankOverdraft > 0) {
    liabilities.push({ id: 'liability-bank-overdraft', side: 'liabilities', groupName: 'Current Liabilities', label: 'Bank Overdraft', amount: bankOverdraft, sortOrder: 40, sourceKey: 'CALCULATED' });
  }
  if (generalAdvanceBalance < 0) {
    liabilities.push({ id: 'liability-general-advance-credit', side: 'liabilities', groupName: 'Current Liabilities', label: 'General Advance Credits', amount: Math.abs(generalAdvanceBalance), sortOrder: 42, sourceKey: 'CALCULATED' });
  }

  return {
    period: safePeriod,
    totalRepayable,
    totalCollected,
    receivables,
    openingProfit,
    currentProfit,
    closingProfit,
    balanceSheetAssets: assets,
    balanceSheetLiabilities: liabilities,
  };
}
