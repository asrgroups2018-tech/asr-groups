/**
 * Business logic for loan syndication splits and balance validation.
 */

export interface SplitValidationResult {
  isValid: boolean;
  totalSum: number;
  expectedAmount: number;
  diff: number;
}

/**
 * Validates whether an EMI row's individual company split amounts sum exactly to amountDue.
 */
export function validateRowSplits(
  amountDue: number,
  companySplits: Record<string, number>
): SplitValidationResult {
  const splitsArray = Object.values(companySplits || {});
  const totalSum = splitsArray.reduce((sum, val) => sum + (Number(val) || 0), 0);
  const expectedAmount = Number(amountDue) || 0;
  const diff = Math.round((expectedAmount - totalSum) * 100) / 100;
  const isValid = Math.abs(diff) < 0.01;

  return {
    isValid,
    totalSum,
    expectedAmount,
    diff,
  };
}

/**
 * Calculates company split amounts from a total loan amount and percentage distribution.
 * Guarantees that the sum of all splits equals the total amount by assigning rounding remainder to the final entity.
 */
export function calculateCompanySplitsByPercent(
  totalAmount: number,
  companyPcts: Record<string, number>,
  companyCodes: string[]
): Record<string, number> {
  const result: Record<string, number> = {};
  if (companyCodes.length === 0 || totalAmount <= 0) return result;

  let allocatedSum = 0;
  companyCodes.forEach((code, idx) => {
    if (idx === companyCodes.length - 1) {
      result[code] = totalAmount - allocatedSum;
    } else {
      const pct = companyPcts[code] || 0;
      const amount = Math.round((totalAmount * pct) / 100);
      result[code] = amount;
      allocatedSum += amount;
    }
  });

  return result;
}

/**
 * Auto-balances a single EMI row according to the loan's overall company percentage splits.
 */
export function autoBalanceRow(
  amountDue: number,
  companyPcts: Record<string, number>,
  companyCodes: string[]
): Record<string, number> {
  return calculateCompanySplitsByPercent(amountDue, companyPcts, companyCodes);
}

/**
 * Validates that shareholder ownership percentages total exactly 100%.
 */
export function validateShareholderAllocation(
  percentages: number[]
): { isValid: boolean; totalPercent: number; diff: number } {
  const total = percentages.reduce((sum, p) => sum + (Number(p) || 0), 0);
  const diff = Math.round((100 - total) * 100) / 100;
  const isValid = Math.abs(diff) < 0.01;

  return {
    isValid,
    totalPercent: total,
    diff,
  };
}
