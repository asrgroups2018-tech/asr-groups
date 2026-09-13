'use client';

import React from 'react';
import { formatINR, numberToWordsINR } from '@/lib/utils/formatCurrency';

interface MoneyDisplayProps {
  amount: number | null | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  inline?: boolean;
  className?: string;
  amountClassName?: string;
  wordsClassName?: string;
  prefix?: string;
  suffix?: string;
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amount,
  size = 'md',
  inline = false,
  className = '',
  amountClassName = '',
  wordsClassName = '',
  prefix,
  suffix,
}) => {
  const formattedAmount = formatINR(amount);
  const words = numberToWordsINR(amount);

  if (inline) {
    return (
      <span className={`inline-flex items-baseline gap-1.5 flex-wrap ${className}`}>
        <span className={`font-mono font-bold ${amountClassName}`}>
          {prefix}{formattedAmount}{suffix}
        </span>
        <span className={`text-[11px] text-slate-500 font-medium ${wordsClassName}`}>
          ({words})
        </span>
      </span>
    );
  }

  const sizeClasses = {
    xs: { amount: 'text-xs', words: 'text-[10px]' },
    sm: { amount: 'text-sm', words: 'text-[11px]' },
    md: { amount: 'text-base font-bold', words: 'text-xs' },
    lg: { amount: 'text-xl font-bold', words: 'text-xs' },
    xl: { amount: 'text-2xl sm:text-3xl font-bold', words: 'text-xs' },
  }[size];

  return (
    <div className={`flex flex-col ${className}`}>
      <div className={`font-mono font-bold leading-tight ${sizeClasses.amount} ${amountClassName}`}>
        {prefix}{formattedAmount}{suffix}
      </div>
      <div className={`text-slate-500 font-sans leading-tight mt-0.5 ${sizeClasses.words} ${wordsClassName}`}>
        {words}
      </div>
    </div>
  );
};
