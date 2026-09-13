'use client';

import React, { useState } from 'react';
import { formatINR, numberToWordsINR } from '@/lib/utils/formatCurrency';

export interface MoneyDisplayProps {
  amount: number | null | undefined;
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'custom';
  className?: string;
  amountClassName?: string;
  prefix?: string;
  suffix?: string;
  showTooltip?: boolean;
  tooltipPosition?: 'top' | 'bottom';
  align?: 'left' | 'center' | 'right';
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amount,
  size = 'md',
  className = '',
  amountClassName = '',
  prefix = '',
  suffix = '',
  showTooltip = true,
  tooltipPosition,
  align,
}) => {
  const num = Number(amount || 0);
  const formattedAmount = formatINR(num);
  const words = numberToWordsINR(num);

  const [dynamicAlign, setDynamicAlign] = useState<'left' | 'right' | 'center'>('center');
  const [dynamicPos, setDynamicPos] = useState<'top' | 'bottom'>('top');

  const sizeClasses: Record<string, string> = {
    '2xs': 'text-[10px]',
    xs: 'text-xs',
    sm: 'text-sm font-semibold',
    md: 'text-base font-bold',
    lg: 'text-lg font-bold',
    xl: 'text-xl font-bold',
    '2xl': 'text-2xl font-bold',
    '3xl': 'text-3xl sm:text-4xl font-bold',
    custom: '',
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (typeof window === 'undefined') return;

    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const rightSpace = windowWidth - rect.right;
    const leftSpace = rect.left;
    const topSpace = rect.top;

    // Check if inside a scrollable container with overflow
    const scrollParent = el.closest('.overflow-y-auto, .overflow-auto, [class*="overflow-y"], [class*="overflow-auto"]');

    if (scrollParent) {
      const parentRect = scrollParent.getBoundingClientRect();
      const spaceAboveInParent = rect.top - parentRect.top;
      const spaceRightInParent = parentRect.right - rect.right;
      const spaceLeftInParent = rect.left - parentRect.left;

      // Vertical: if less than 85px from the top of the scroll container, open DOWNWARDS
      if (!tooltipPosition) {
        if (spaceAboveInParent < 85) {
          setDynamicPos('bottom');
        } else {
          setDynamicPos('top');
        }
      }

      // Horizontal: if close to right edge of scroll container
      if (!align) {
        if (spaceRightInParent < 220 || rightSpace < 290) {
          setDynamicAlign('right');
        } else if (spaceLeftInParent < 220 || leftSpace < 290) {
          setDynamicAlign('left');
        } else {
          setDynamicAlign('center');
        }
      }
    } else {
      // Standard viewport-based positioning
      if (!tooltipPosition) {
        if (topSpace < 120) {
          setDynamicPos('bottom');
        } else {
          setDynamicPos('top');
        }
      }

      if (!align) {
        if (rightSpace < 290) {
          setDynamicAlign('right');
        } else if (leftSpace < 290) {
          setDynamicAlign('left');
        } else {
          setDynamicAlign('center');
        }
      }
    }
  };

  const currentPos = tooltipPosition || dynamicPos;
  const currentAlign = align || dynamicAlign;
  const isTop = currentPos === 'top';

  const alignBoxClasses: Record<string, string> = {
    left: 'left-0 items-start',
    right: 'right-0 items-end',
    center: 'left-1/2 -translate-x-1/2 items-center',
  };

  const alignNotchClasses: Record<string, string> = {
    left: 'left-5',
    right: 'right-5',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <span
      onMouseEnter={handleMouseEnter}
      className={`group/money relative inline-flex items-center cursor-help select-none ${className}`}
    >
      <span
        className={`font-mono transition-all decoration-dotted group-hover/money:underline underline-offset-4 decoration-[#C5A059]/70 ${sizeClasses[size] || ''} ${amountClassName}`}
      >
        {prefix}{formattedAmount}{suffix}
      </span>

      {showTooltip && words && (
        <span
          className={`pointer-events-none absolute hidden group-hover/money:flex flex-col z-[100] animate-in fade-in zoom-in-95 duration-150 ${alignBoxClasses[currentAlign]} ${
            isTop ? 'bottom-full mb-2.5' : 'top-full mt-2.5'
          }`}
          style={{ minWidth: '180px', maxWidth: '290px', width: 'max-content' }}
        >
          {/* Main Card Content */}
          <div className="relative z-10 px-3.5 py-2 bg-[#1A0B16] border border-[#C5A059]/70 rounded-xl shadow-2xl shadow-black/95 backdrop-blur-xl text-center w-full">
            <div className="flex items-center justify-center gap-1.5 text-[9px] uppercase tracking-wider font-mono font-bold text-[#C5A059] mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-pulse shrink-0" />
              <span>Amount in Words</span>
            </div>
            <p className="text-xs font-sans font-medium text-amber-50/95 leading-snug whitespace-normal break-words text-center">
              {words}
            </p>
          </div>

          {/* Pointer Notch */}
          <div
            className={`absolute ${alignNotchClasses[currentAlign]} w-2.5 h-2.5 rotate-45 bg-[#1A0B16] border-[#C5A059]/70 ${
              isTop
                ? '-bottom-1 border-r border-b relative z-20'
                : '-top-1 border-l border-t relative z-20'
            }`}
          />
        </span>
      )}
    </span>
  );
};
