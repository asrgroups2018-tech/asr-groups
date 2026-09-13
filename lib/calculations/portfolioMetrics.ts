/**
 * Business logic for computing All-Time Lifetime Portfolio Metrics and Period-Scoped KPIs.
 */

import { Loan, Installment } from '@/lib/types';
import { isPaidStatus, getStatusCategory } from '@/lib/utils/statusMapping';

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
  // Total Capital Deployed is sum of distinct loan total_amounts
  const totalDeployed = loans.reduce((sum, l) => sum + (Number(l.totalAmount) || 0), 0);

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

    if (cat === 'settled') {
      totalRecovered += amount;
      settledCount++;
    } else if (cat === 'bounced') {
      bouncedCount++;
    } else if (cat === 'unclassified') {
      unclassifiedCount++;
    } else if (cat === 'pending') {
      pendingCount++;
    }
  });

  const totalOutstanding = Math.max(0, totalDeployed - totalRecovered);
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
    const amount = Number(inst.amountDue) || 0;
    const cat = getStatusCategory(inst.status);

    // Check if within date range filter
    const matchesRange =
      (!startDate || dueDate >= startDate) &&
      (!endDate || dueDate <= endDate);

    if (matchesRange) {
      periodDueAmount += amount;
      periodDueCount++;

      if (cat === 'settled') {
        periodCollections += amount;
        periodCollectedCount++;
      }
      if (cat === 'bounced') {
        bouncedAmount += amount;
        bouncedCount++;
      }
    }

    // Overdue check (due date before reference date and unpaid)
    if (dueDate && dueDate < referenceDateStr && cat === 'pending') {
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
