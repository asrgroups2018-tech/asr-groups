'use client';

import React from 'react';
import { CheckCircle2, Clock, Ban, AlertCircle, Check, HelpCircle, AlertTriangle } from 'lucide-react';

export type AnyStatus =
  | 'Active'
  | 'Pending'
  | 'Suspended'
  | 'Disbursed'
  | 'Closed'
  | 'Draft'
  | 'Paid'
  | 'Overdue'
  | 'Inactive'
  | 'Under Review'
  | 'Blacklisted'
  | 'PASS'
  | 'NEFT'
  | 'CASH'
  | 'CLS'
  | 'CS'
  | 'RET'
  | 'RET NEFT'
  | 'RET PASS'
  | 'PENDING'
  | string;

interface StatusPillProps {
  status: AnyStatus;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  size = 'sm',
  showIcon = true,
}) => {
  const normalized = String(status || '').trim().toUpperCase();

  const getStatusConfig = () => {
    // 1. Confirmed Paid / Settled
    if (['PASS', 'NEFT', 'CASH', 'PAID', 'SETTLED', 'ACTIVE'].includes(normalized)) {
      const label = ['PASS', 'NEFT', 'CASH', 'PAID'].includes(normalized) ? `${status}` : status;
      return {
        label,
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/90 font-semibold',
        icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />,
      };
    }

    // 2. Confirmed Returned / Bounced / Overdue
    if (['RET', 'RET NEFT', 'RET PASS', 'OVERDUE', 'BOUNCED', 'SUSPENDED', 'BLACKLISTED'].includes(normalized)) {
      return {
        label: status,
        bg: 'bg-rose-50 text-rose-800 border-rose-200/90 font-semibold',
        icon: <Ban className="w-3 h-3 text-rose-600 shrink-0" />,
      };
    }

    // 3. Pending
    if (['PENDING', 'UNDER REVIEW', 'DRAFT'].includes(normalized)) {
      return {
        label: normalized === 'PENDING' ? 'Pending' : status,
        bg: 'bg-amber-50 text-amber-900 border-amber-200/90 font-semibold',
        icon: <Clock className="w-3 h-3 text-amber-600 shrink-0" />,
      };
    }

    // 4. Unclassified (CLS, CS) — explicitly neutral gray until confirmed
    if (['CLS', 'CS'].includes(normalized)) {
      return {
        label: `${status} · Unclassified`,
        bg: 'bg-slate-100 text-slate-700 border-slate-300 font-medium',
        icon: <HelpCircle className="w-3 h-3 text-slate-500 shrink-0" />,
      };
    }

    // 5. Closed / Inactive
    if (['CLOSED', 'INACTIVE'].includes(normalized)) {
      return {
        label: status,
        bg: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
        icon: <Check className="w-3 h-3 text-slate-500 shrink-0" />,
      };
    }

    // 6. Default Fallback
    return {
      label: status,
      bg: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
      icon: <AlertCircle className="w-3 h-3 text-slate-500 shrink-0" />,
    };
  };

  const current = getStatusConfig();

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-2xs select-none ${sizeClasses[size]} ${current.bg}`}
    >
      {showIcon && current.icon}
      <span>{current.label}</span>
    </span>
  );
};


