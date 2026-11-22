/**
 * Standardized status mapping and styling taxonomy for ASR Finance ERP.
 *
 * Allowed statuses only:
 * 1. Pending (amber)
 * 2. Cleared (emerald)
 * 3. NEFT (sky/emerald)
 * 4. RTGS (indigo/emerald)
 * 5. Cash (emerald)
 */

import { AppStatus } from '@/lib/types';

export const ALLOWED_STATUSES: AppStatus[] = ['Pending', 'Cleared', 'NEFT', 'RTGS', 'Cash'];

// Keep legacy payment aliases in one place so summaries and ledgers agree.
const PAID_STATUSES = new Set([
  'CLEARED', 'PASS', 'PAID', 'CLS', 'CS', 'CLOSED', 'SETTLED',
  'NEFT', 'RTGS', 'CASH', 'CSH',
]);

const BOUNCE_STATUSES = new Set(['RET', 'RET NEFT', 'RET PASS', 'BOUNCE', 'BOUNCED', 'RETURNED']);

export function isPaidStatus(status: string | null | undefined): boolean {
  return PAID_STATUSES.has(String(status || '').trim().toUpperCase());
}

export function isBounceStatus(status: string | null | undefined): boolean {
  return BOUNCE_STATUSES.has(String(status || '').trim().toUpperCase());
}

export type StatusCategory = 'cleared' | 'neft' | 'rtgs' | 'cash' | 'pending' | 'other';

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

  // Returned instruments are unpaid even when the return mode contains a
  // payment rail such as NEFT or PASS.
  if (isBounceStatus(norm)) return 'pending';

  if (norm === 'CLEARED' || norm === 'PASS' || norm === 'PAID' || norm === 'CLS' || norm === 'CS' || norm === 'CLOSED' || norm === 'SETTLED') {
    return 'cleared';
  }
  if (norm === 'NEFT') {
    return 'neft';
  }
  if (norm === 'RTGS') {
    return 'rtgs';
  }
  if (norm === 'CASH' || norm === 'CSH') {
    return 'cash';
  }
  if (norm === 'PENDING' || norm === 'ACTIVE' || norm === 'ON TRACK' || norm === 'RET' || norm === 'RET PASS' || norm === 'OVERDUE' || norm === 'DRAFT') {
    return 'pending';
  }
  return 'other';
}

export function getStatusMeta(status: string | null | undefined): StatusMeta {
  const category = getStatusCategory(status);

  switch (category) {
    case 'cleared':
      return {
        label: 'Cleared',
        category: 'cleared',
        isPaid: true,
        colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        dotClass: 'bg-emerald-600',
      };
    case 'neft':
      return {
        label: 'NEFT',
        category: 'neft',
        isPaid: true,
        colorClass: 'bg-teal-50 text-teal-800 border-teal-300',
        dotClass: 'bg-teal-600',
      };
    case 'rtgs':
      return {
        label: 'RTGS',
        category: 'rtgs',
        isPaid: true,
        colorClass: 'bg-indigo-50 text-indigo-800 border-indigo-300',
        dotClass: 'bg-indigo-600',
      };
    case 'cash':
      return {
        label: 'Cash',
        category: 'cash',
        isPaid: true,
        colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        dotClass: 'bg-emerald-600',
      };
    case 'pending':
    default:
      return {
        label: 'Pending',
        category: 'pending',
        isPaid: false,
        colorClass: 'bg-amber-50 text-amber-800 border-amber-300',
        dotClass: 'bg-amber-500',
      };
  }
}
