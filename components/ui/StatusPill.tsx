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
        bg: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold shadow-2xs',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />,
      };
    }

    // 2. Confirmed Returned / Bounced / Overdue
    if (['RET', 'RET NEFT', 'RET PASS', 'OVERDUE', 'BOUNCED', 'SUSPENDED', 'BLACKLISTED'].includes(normalized)) {
      return {
        label: status,
        bg: 'bg-rose-100 text-rose-900 border border-rose-300 font-bold shadow-2xs',
        icon: <Ban className="w-3.5 h-3.5 text-rose-700 shrink-0" />,
      };
    }

    // 3. Pending
    if (['PENDING', 'UNDER REVIEW', 'DRAFT'].includes(normalized)) {
      return {
        label: normalized === 'PENDING' ? 'Pending' : status,
        bg: 'bg-amber-100 text-amber-950 border border-amber-300 font-bold shadow-2xs',
        icon: <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />,
      };
    }

    // 4. Unclassified (CLS, CS) — explicitly neutral gray until confirmed
    if (['CLS', 'CS'].includes(normalized)) {
      return {
        label: `${status} · Unclassified`,
        bg: 'bg-slate-100 text-slate-800 border border-slate-300 font-semibold shadow-2xs',
        icon: <HelpCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />,
      };
    }

    // 5. Closed / Inactive
    if (['CLOSED', 'INACTIVE'].includes(normalized)) {
      return {
        label: status,
        bg: 'bg-slate-100 text-slate-800 border border-slate-300 font-bold shadow-2xs',
        icon: <Check className="w-3.5 h-3.5 text-slate-700 shrink-0" />,
      };
    }

    // 6. Default Fallback
    return {
      label: status,
      bg: 'bg-slate-100 text-slate-800 border border-slate-300 font-semibold shadow-2xs',
      icon: <AlertCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />,
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


