'use client';

import React from 'react';
import { CheckCircle2, Clock, Check, ArrowRightLeft, Banknote, AlertTriangle } from 'lucide-react';
import { AppStatus } from '@/lib/types';

export type AnyStatus = AppStatus | 'Active' | 'Closed' | 'Overdue' | string;

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
  const raw = String(status || '').trim();
  const normalized = raw.toUpperCase();

  const getStatusConfig = () => {
    // 1. Closed (Loan level fully settled)
    if (['CLOSED', 'SETTLED'].includes(normalized)) {
      return {
        label: 'Closed',
        bg: 'bg-slate-100 text-slate-800 border border-slate-300 font-bold shadow-2xs',
        icon: <Check className="w-3.5 h-3.5 text-slate-700 shrink-0" />,
      };
    }

    // 2. Active / On Track (Loan level ongoing)
    if (['ACTIVE', 'ON TRACK', 'ON_TRACK'].includes(normalized)) {
      return {
        label: 'Active',
        bg: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold shadow-2xs',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />,
      };
    }

    // 3. Overdue (Loan level or installment level delayed)
    if (['OVERDUE', 'DELAYED'].includes(normalized)) {
      return {
        label: 'Overdue',
        bg: 'bg-rose-100 text-rose-950 border border-rose-300 font-bold shadow-2xs',
        icon: <Clock className="w-3.5 h-3.5 text-rose-700 shrink-0" />,
      };
    }

    // 4. Deposited
    if (normalized === 'DEPOSITED') {
      return {
        label: 'Deposited',
        bg: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold shadow-2xs',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />,
      };
    }

    // 5. Cleared (or PASS / PAID)
    if (['CLEARED', 'PASS', 'PAID', 'CLS', 'CS'].includes(normalized)) {
      return {
        label: 'Cleared',
        bg: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold shadow-2xs',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />,
      };
    }

    // 5. NEFT
    if (['NEFT', 'RET NEFT'].includes(normalized)) {
      return {
        label: 'NEFT',
        bg: 'bg-teal-100 text-teal-900 border border-teal-300 font-bold shadow-2xs',
        icon: <ArrowRightLeft className="w-3.5 h-3.5 text-teal-700 shrink-0" />,
      };
    }

    // 6. RTGS
    if (normalized === 'RTGS') {
      return {
        label: 'RTGS',
        bg: 'bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold shadow-2xs',
        icon: <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-700 shrink-0" />,
      };
    }

    // 7. Cash
    if (['CASH', 'CSH'].includes(normalized)) {
      return {
        label: 'Cash',
        bg: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold shadow-2xs',
        icon: <Banknote className="w-3.5 h-3.5 text-emerald-700 shrink-0" />,
      };
    }

    // 8. Pending (default)
    return {
      label: 'Pending',
      bg: 'bg-amber-100 text-amber-950 border border-amber-300 font-bold shadow-2xs',
      icon: <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />,
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
