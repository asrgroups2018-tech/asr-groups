'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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

  const containerRef = useRef<HTMLSpanElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipCoords, setTooltipCoords] = useState({ top: 0, left: 0 });

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

  const updatePosition = useCallback((el: HTMLElement) => {
    if (typeof window === 'undefined') return;

    const rect = el.getBoundingClientRect();
    const viewportPadding = 12;
    const tooltipWidth = Math.min(280, Math.max(180, window.innerWidth - viewportPadding * 2));
    const estimatedHeight = 72;
    const rightSpace = window.innerWidth - rect.right;
    const leftSpace = rect.left;

    const nextAlign = align || (rightSpace < tooltipWidth / 2 + viewportPadding
      ? 'right'
      : leftSpace < tooltipWidth / 2 + viewportPadding
        ? 'left'
        : 'center');
    const idealLeft = nextAlign === 'left'
      ? rect.left
      : nextAlign === 'right'
        ? rect.right - tooltipWidth
        : rect.left + (rect.width - tooltipWidth) / 2;
    const left = Math.min(
      Math.max(viewportPadding, idealLeft),
      Math.max(viewportPadding, window.innerWidth - tooltipWidth - viewportPadding),
    );

    const forcedPosition = tooltipPosition;
    const canOpenAbove = rect.top >= estimatedHeight + viewportPadding;
    const canOpenBelow = rect.bottom + estimatedHeight + viewportPadding <= window.innerHeight;
    const nextPos = forcedPosition || (canOpenAbove || !canOpenBelow ? 'top' : 'bottom');
    const top = nextPos === 'top'
      ? Math.max(viewportPadding, rect.top - estimatedHeight - 10)
      : Math.min(window.innerHeight - estimatedHeight - viewportPadding, rect.bottom + 10);

    setTooltipCoords({ top, left });
  }, [align, tooltipPosition]);

  const handleMouseEnter = () => {
    if (containerRef.current) {
      updatePosition(containerRef.current);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showTooltip || !words) return;
    if (containerRef.current) {
      updatePosition(containerRef.current);
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      if (containerRef.current) updatePosition(containerRef.current);
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [isOpen, updatePosition]);

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
        onMouseEnter={handleMouseEnter}
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

        {/* ─── Desktop Hover/Click Tooltip (Hidden on Mobile) ─── */}
        {showTooltip && words && (
          <span
            role="tooltip"
            className={`hidden sm:block sm:fixed z-[150] transition-opacity duration-150 ${
              isOpen
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 group-hover/money:opacity-100 pointer-events-none'
            }`}
            style={{
              top: tooltipCoords.top,
              left: tooltipCoords.left,
              minWidth: '180px',
              maxWidth: 'min(280px, calc(100vw - 24px))',
              width: 'max-content',
              maxHeight: 'calc(100vh - 24px)',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main Card Content */}
            <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl text-left">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                Amount in words
              </span>
              <p className="mt-1 text-xs font-semibold leading-snug text-white whitespace-normal break-words select-text">
                {words}
              </p>
            </div>
          </span>
        )}
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
};

