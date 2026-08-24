'use client';

import React from 'react';
import { UserStatus } from '@/lib/types';
import { CheckCircle2, Clock, Ban } from 'lucide-react';

interface StatusPillProps {
  status: UserStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  size = 'sm',
  showIcon = true,
}) => {
  const configs: Record<
    UserStatus,
    {
      bg: string;
      text: string;
      border: string;
      icon: React.ReactNode;
    }
  > = {
    Active: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />,
    },
    Pending: {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <Clock className="w-3 h-3 text-amber-600 shrink-0" />,
    },
    Suspended: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: <Ban className="w-3 h-3 text-rose-600 shrink-0" />,
    },
  };

  const current = configs[status] || configs.Active;

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
