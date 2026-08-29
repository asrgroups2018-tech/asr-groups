'use client';

import React from 'react';
import { CheckCircle2, Clock, Ban, AlertCircle, Check, XCircle } from 'lucide-react';

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
  | string;

interface StatusPillProps {
  status: AnyStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  size = 'sm',
  showIcon = true,
}) => {
  const getStatusConfig = (s: string) => {
    switch (s) {
      case 'Active':
      case 'Paid':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />,
        };
      case 'Disbursed':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          text: 'text-purple-700',
          border: 'border-purple-200',
          icon: <Check className="w-3 h-3 text-purple-600 shrink-0" />,
        };
      case 'Pending':
      case 'Under Review':
      case 'Draft':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          text: 'text-amber-800',
          border: 'border-amber-200',
          icon: <Clock className="w-3 h-3 text-amber-600 shrink-0" />,
        };
      case 'Overdue':
      case 'Suspended':
      case 'Blacklisted':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          text: 'text-rose-700',
          border: 'border-rose-200',
          icon: <Ban className="w-3 h-3 text-rose-600 shrink-0" />,
        };
      case 'Closed':
      case 'Inactive':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          text: 'text-slate-700',
          border: 'border-slate-200',
          icon: <Check className="w-3 h-3 text-slate-500 shrink-0" />,
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          text: 'text-slate-700',
          border: 'border-slate-200',
          icon: <AlertCircle className="w-3 h-3 text-slate-500 shrink-0" />,
        };
    }
  };

  const current = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${current.bg} ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {showIcon && current.icon}
      <span>{status}</span>
    </span>
  );
};

