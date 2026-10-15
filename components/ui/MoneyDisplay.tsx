'use client';

import React, { useState, useRef, useEffect } from 'react';
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

export const MoneyDisplay = React.memo<MoneyDisplayProps>(({
  amount,
  size = 'md',
  className = '',
  amountClassName = '',
  prefix = '',
  suffix = '',
  showTooltip = true,
}) => {
  const num = Number(amount || 0);
  const formattedAmount = formatINR(num);
  const words = numberToWordsINR(num);

  const containerRef = useRef<HTMLSpanElement>(null);
  const [isOpen, setIsOpen] = useState(false);

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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showTooltip || !words) return;
    setIsOpen((prev) => !prev);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <>
      <span
        ref={containerRef}
        data-amount-words={showTooltip ? 'true' : 'false'}
        data-amount-words-value={showTooltip ? String(num) : undefined}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={words ? `Amount in words: ${words}` : undefined}
        className={`group/money relative inline-flex items-center cursor-pointer select-none active:scale-[0.98] transition-transform ${className}`}
      >
        <span
          className={`font-mono transition-all decoration-dotted underline decoration-[#C5A059]/60 sm:no-underline sm:group-hover/money:underline underline-offset-4 ${sizeClasses[size] || ''} ${amountClassName}`}
        >
          {prefix}
          {formattedAmount}
          {suffix}
        </span>

      </span>


      {/* ─── Mobile Touch Bottom Sheet Modal (Shown only when tapped on Mobile) ─── */}
      {showTooltip && words && isOpen && (
        <div
          className="fixed inset-0 z-[250] sm:hidden flex flex-col justify-end p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        >
          <div
            className="bg-[#1A0B16] border-2 border-[#C5A059] rounded-2xl p-4 shadow-2xl shadow-black text-center space-y-2 animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#C5A059]/30 pb-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#C5A059]">
                <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse shrink-0" />
                <span>Indian Currency in Words</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-amber-200 flex items-center justify-center text-xs font-bold cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Formatted Number Display */}
            <div className="text-lg font-mono font-bold text-[#EED8A1] pt-1">
              {prefix}{formattedAmount}{suffix}
            </div>

            {/* Amount in Words */}
            <p className="text-sm font-sans font-semibold text-amber-50 leading-relaxed px-1 select-text">
              {words}
            </p>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 mt-2 bg-[#C5A059] hover:bg-[#D4AF37] text-slate-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
});

MoneyDisplay.displayName = 'MoneyDisplay';

