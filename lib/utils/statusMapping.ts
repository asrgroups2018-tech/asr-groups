/**
 * Standardized status mapping and styling taxonomy for ASR Finance ERP.
 *
 * Taxonomies:
 * - Settled / Paid: PASS, NEFT, CASH, PAID (emerald)
 * - Returned / Bounced: RET, RET NEFT, RET PASS (rose)
 * - Pending Settlement: PENDING, Active (amber)
 * - Unclassified: CLS, CS (neutral gray, unconfirmed business definition)
 */

export type StatusCategory = 'settled' | 'bounced' | 'pending' | 'unclassified' | 'closed' | 'other';

export interface StatusMeta {
  label: string;
  category: StatusCategory;
  isPaid: boolean;
  colorClass: string;
  dotClass: string;
}

export function getStatusCategory(status: string | null | undefined): StatusCategory {
  if (!status) return 'pending';
  const norm = status.trim().toUpperCase();

  if (['PASS', 'NEFT', 'CASH', 'PAID'].includes(norm)) {
    return 'settled';
  }
  if (['RET', 'RET NEFT', 'RET PASS', 'BOUNCED', 'RETURNED'].includes(norm)) {
    return 'bounced';
  }
  if (['CLS', 'CS'].includes(norm)) {
    return 'unclassified';
  }
  if (['PENDING', 'ACTIVE', 'ON TRACK'].includes(norm)) {
    return 'pending';
  }
  if (['CLOSED', 'SETTLED'].includes(norm)) {
    return 'closed';
  }
  return 'other';
}

export function isPaidStatus(status: string | null | undefined): boolean {
  return getStatusCategory(status) === 'settled';
}

export function getStatusMeta(status: string | null | undefined): StatusMeta {
  const norm = (status || 'Pending').trim().toUpperCase();
  const category = getStatusCategory(status);

  switch (category) {
    case 'settled':
      return {
        label: norm === 'PASS' ? 'Settled (PASS)' : norm === 'NEFT' ? 'Settled (NEFT)' : norm === 'CASH' ? 'Settled (CASH)' : 'Paid',
        category: 'settled',
        isPaid: true,
        colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        dotClass: 'bg-emerald-600',
      };
    case 'bounced':
      return {
        label: norm.startsWith('RET') ? `Returned (${norm})` : 'Bounced / Returned',
        category: 'bounced',
        isPaid: false,
        colorClass: 'bg-rose-50 text-rose-800 border-rose-300',
        dotClass: 'bg-rose-600',
      };
    case 'unclassified':
      return {
        label: `Unclassified (${norm})`,
        category: 'unclassified',
        isPaid: false,
        colorClass: 'bg-slate-100 text-slate-700 border-slate-300',
        dotClass: 'bg-slate-500',
      };
    case 'closed':
      return {
        label: 'Closed',
        category: 'closed',
        isPaid: true,
        colorClass: 'bg-slate-100 text-slate-800 border-slate-300',
        dotClass: 'bg-slate-600',
      };
    case 'pending':
    default:
      return {
        label: norm === 'PENDING' ? 'Pending Settlement' : status || 'Pending',
        category: 'pending',
        isPaid: false,
        colorClass: 'bg-amber-50 text-amber-800 border-amber-300',
        dotClass: 'bg-amber-500',
      };
  }
}
