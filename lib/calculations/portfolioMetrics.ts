/**
 * Business logic for computing All-Time Lifetime Portfolio Metrics and Period-Scoped KPIs.
 */

import { Loan, Installment } from '@/lib/types';
import { isBounceStatus, isPaidStatus, getStatusCategory } from '@/lib/utils/statusMapping';

export interface PortfolioLifetimeMetrics {
  totalDeployed: number;
  totalRecovered: number;
  totalOutstanding: number;
  collectionRate: number;
  activeLoansCount: number;
  totalBorrowersCount: number;
  settledInstallmentsCount: number;
  bouncedInstallmentsCount: number;
  unclassifiedInstallmentsCount: number;
  pendingInstallmentsCount: number;
}

export interface PeriodScopedMetrics {
  periodCollections: number;
  periodCollectedCount: number;
  unpaidPastDueAmount: number;
  unpaidPastDueCount: number;
  bouncedAmount: number;
  bouncedCount: number;
  periodDueAmount: number;
  periodDueCount: number;
}

/**
 * Computes all-time lifetime portfolio metrics that remain invariant to UI date filters.
 */
export function computeLifetimePortfolioMetrics(
  loans: Loan[],
  allInstallments?: Installment[]
): PortfolioLifetimeMetrics {
  // Opening-balance-only accounts represent migrated debt, not new deployment.
  const totalDeployed = loans.reduce(
    (sum, loan) => sum + (loan.isOpeningBalanceOnly ? 0 : Number(loan.totalAmount) || 0),
    0
  );

  // Derive installments from loans if not passed separately
  const installments: Installment[] = allInstallments || loans.flatMap((l) => l.installments || []);

  let totalRecovered = 0;
  let settledCount = 0;
  let bouncedCount = 0;
  let unclassifiedCount = 0;
  let pendingCount = 0;

  installments.forEach((inst) => {
    const amount = Number(inst.amountDue) || 0;
    const cat = getStatusCategory(inst.status);

    if (isPaidStatus(inst.status)) {
      totalRecovered += amount;
      settledCount++;
    } else if (isBounceStatus(inst.status)) {
      bouncedCount++;
    } else if (cat === 'pending') {
      pendingCount++;
    } else {
      unclassifiedCount++;
    }
  });

  const totalOutstanding = loans.reduce((sum, loan) => {
    if (Number.isFinite(Number(loan.totalOutstanding))) return sum + Number(loan.totalOutstanding);
    const opening = Number(loan.openingBalance || 0) * (loan.openingBalanceType === 'CREDIT' ? -1 : 1);
    const scheduled = loan.isOpeningBalanceOnly ? 0 : Number(loan.totalAmount || 0);
    const recovered = (loan.installments || []).reduce(
      (value, installment) => value + (isPaidStatus(installment.status) ? Number(installment.amountDue || 0) : 0),
      0
    );
    return sum + Math.max(0, opening + scheduled - recovered);
  }, 0);
  const collectionRate = totalDeployed > 0 ? (totalRecovered / totalDeployed) * 100 : 0;
  const activeLoansCount = loans.filter((l) => l.status !== 'Closed').length;

  const uniqueBorrowers = new Set(loans.map((l) => l.customerId || l.customerName));

  return {
    totalDeployed,
    totalRecovered,
    totalOutstanding,
    collectionRate: Math.round(collectionRate * 10) / 10,
    activeLoansCount,
    totalBorrowersCount: uniqueBorrowers.size,
    settledInstallmentsCount: settledCount,
    bouncedInstallmentsCount: bouncedCount,
    unclassifiedInstallmentsCount: unclassifiedCount,
    pendingInstallmentsCount: pendingCount,
  };
}

/**
 * Computes period-scoped metrics based on an active date filter.
 */
export function computePeriodScopedMetrics(
  installments: Installment[],
  startDate?: string | null,
  endDate?: string | null,
  referenceDateStr: string = new Date().toISOString().slice(0, 10)
): PeriodScopedMetrics {
  let periodCollections = 0;
  let periodCollectedCount = 0;
  let unpaidPastDueAmount = 0;
  let unpaidPastDueCount = 0;
  let bouncedAmount = 0;
  let bouncedCount = 0;
  let periodDueAmount = 0;
  let periodDueCount = 0;

  installments.forEach((inst) => {
    const dueDate = inst.dueDate || '';
    const receiptDate = inst.recdDate || '';
    const amount = Number(inst.amountDue) || 0;
    const isPaid = isPaidStatus(inst.status);
    const cat = getStatusCategory(inst.status);

    // Check if within date range filter
    const matchesRange =
      (!startDate || dueDate >= startDate) &&
      (!endDate || dueDate <= endDate);

    if (matchesRange) {
      periodDueAmount += amount;
      periodDueCount++;

      const matchesReceiptRange = !startDate && !endDate
        ? true
        : Boolean(receiptDate && (!startDate || receiptDate >= startDate) && (!endDate || receiptDate <= endDate));
      if (isPaid && matchesReceiptRange) {
        periodCollections += amount;
        periodCollectedCount++;
      }

      if (isBounceStatus(inst.status)) {
        bouncedAmount += amount;
        bouncedCount++;
      }
    }

    // Overdue check (due date before reference date and unpaid)
    if (dueDate && dueDate < referenceDateStr && cat === 'pending' && !isBounceStatus(inst.status)) {
      unpaidPastDueAmount += amount;
      unpaidPastDueCount++;
    }
  });

  return {
    periodCollections,
    periodCollectedCount,
    unpaidPastDueAmount,
    unpaidPastDueCount,
    bouncedAmount,
    bouncedCount,
    periodDueAmount,
    periodDueCount,
  };
}
