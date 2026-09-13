'use client';

import React, { useState } from 'react';
import { Building2, ShieldCheck, ExternalLink, Percent, IndianRupee } from 'lucide-react';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';

export interface CompanySplitData {
  id?: string;
  companyId?: string;
  companyCode: string;
  companyName?: string;
  splitPercent: number;
  splitAmount: number;
  isOutsideParty?: boolean;
}

interface CompanySplitBadgeProps {
  split: CompanySplitData;
  size?: 'xs' | 'sm' | 'md';
}

export const CompanySplitBadge: React.FC<CompanySplitBadgeProps> = ({
  split,
  size = 'sm',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [dynamicPos, setDynamicPos] = useState<'top' | 'bottom'>('top');
  const [dynamicAlign, setDynamicAlign] = useState<'left' | 'right' | 'center'>('center');

  const isOutside = Boolean(split.isOutsideParty);
  const displayName = split.companyName || split.companyCode;
  const percent = Number(split.splitPercent) || 0;
  const amount = Number(split.splitAmount) || 0;

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px]',
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  }[size];

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsHovered(true);
    if (typeof window === 'undefined') return;

    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const rightSpace = windowWidth - rect.right;
    const leftSpace = rect.left;

    // Check closest table, card, or scroll container
    const tableContainer = el.closest('table, .overflow-x-auto, [class*="overflow"]');
    if (tableContainer) {
      const parentRect = tableContainer.getBoundingClientRect();
      const spaceAbove = rect.top - parentRect.top;
      // If less than 150px space above inside container -> Open downwards
      if (spaceAbove < 150) {
        setDynamicPos('bottom');
      } else {
        setDynamicPos('top');
      }
    } else {
      if (rect.top < 180) {
        setDynamicPos('bottom');
      } else {
        setDynamicPos('top');
      }
    }

    // Horizontal check
    if (rightSpace < 160) {
      setDynamicAlign('right');
    } else if (leftSpace < 160) {
      setDynamicAlign('left');
    } else {
      setDynamicAlign('center');
    }
  };

  const isTop = dynamicPos === 'top';

  const alignClasses: Record<string, string> = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  const notchClasses: Record<string, string> = {
    left: 'left-5',
    right: 'right-5',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={(e) => handleMouseEnter(e as any)}
      onBlur={() => setIsHovered(false)}
    >
      {/* Interactive Trigger Badge */}
      <div
        className={`inline-flex items-center gap-1 font-mono font-bold rounded-md border transition-all duration-150 cursor-pointer select-none ${sizeClasses} ${
          isOutside
            ? 'bg-amber-50 text-amber-900 border-amber-200/90 hover:bg-amber-100 hover:border-amber-400 hover:shadow-xs'
            : 'bg-[#701A35]/10 text-[#701A35] border-[#701A35]/25 hover:bg-[#701A35]/18 hover:border-[#701A35]/50 hover:shadow-xs'
        }`}
      >
        <span className="tracking-tight">{split.companyCode}</span>
        {percent > 0 && (
          <span
            className={`font-semibold opacity-90 ${
              isOutside ? 'text-amber-700' : 'text-[#701A35]'
            }`}
          >
            {percent}%
          </span>
        )}
      </div>

      {/* Modern Popover / Tooltip with rich UI/UX */}
      {isHovered && (
        <div
          role="tooltip"
          className={`absolute ${alignClasses[dynamicAlign]} ${
            isTop ? 'bottom-full mb-2.5' : 'top-full mt-2.5'
          } z-[100] w-64 pointer-events-none animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="relative bg-[#180B14] text-white rounded-xl p-3.5 border border-[#C5A059]/50 shadow-2xl shadow-black/80 backdrop-blur-md">
            {/* Header: Company Code & Entity Tag */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-[#C5A059]/20 text-[#EED8A1] border border-[#C5A059]/30 flex items-center justify-center font-mono font-bold text-[10px]">
                  {split.companyCode.slice(0, 2)}
                </span>
                <span className="text-xs font-bold font-serif text-slate-100 truncate max-w-[120px]">
                  {displayName}
                </span>
              </div>

              <span
                className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                  isOutside
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {isOutside ? 'Outside Partner' : 'ASR Group'}
              </span>
            </div>

            {/* Financial Metrics Breakdown */}
            <div className="pt-2.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Percent className="w-3 h-3 text-[#C5A059]" />
                  Company Share
                </span>
                <span className="font-mono font-bold text-slate-100">
                  {percent}%
                </span>
              </div>

              {/* Progress Bar for Allocation */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOutside
                      ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                      : 'bg-gradient-to-r from-[#C5A059] to-[#EED8A1]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <IndianRupee className="w-3 h-3 text-emerald-400" />
                  Amount Funded
                </span>
                <span
                  className="font-mono font-bold text-[#EED8A1] text-xs block cursor-help"
                  title={numberToWordsINR(amount)}
                >
                  ₹{amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Pointer Triangle / Arrow */}
            <div
              className={`absolute ${notchClasses[dynamicAlign]} w-3 h-3 bg-[#180B14] border-[#C5A059]/50 rotate-45 ${
                isTop
                  ? '-bottom-1.5 border-r border-b'
                  : '-top-1.5 border-l border-t'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
