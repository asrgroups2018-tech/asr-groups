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

  const updatePosition = useCallback((el: HTMLElement) => {
    if (typeof window === 'undefined') return;

    const rect = el.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const rightSpace = windowWidth - rect.right;
    const leftSpace = rect.left;
    const topSpace = rect.top;

    // Check if inside a scrollable container
    const scrollParent = el.closest(
      '.overflow-y-auto, .overflow-auto, [class*="overflow-y"], [class*="overflow-auto"], .overflow-x-auto'
    );

    if (scrollParent) {
      const parentRect = scrollParent.getBoundingClientRect();
      const spaceAboveInParent = rect.top - parentRect.top;
      const spaceRightInParent = parentRect.right - rect.right;
      const spaceLeftInParent = rect.left - parentRect.left;

      if (!tooltipPosition) {
        if (spaceAboveInParent < 90 || topSpace < 110) {
          setDynamicPos('bottom');
        } else {
          setDynamicPos('top');
        }
      }

      if (!align) {
        if (spaceRightInParent < 160 || rightSpace < 200) {
          setDynamicAlign('right');
        } else if (spaceLeftInParent < 160 || leftSpace < 200) {
          setDynamicAlign('left');
        } else {
          setDynamicAlign('center');
        }
      }
    } else {
      if (!tooltipPosition) {
        if (topSpace < 120) {
          setDynamicPos('bottom');
        } else {
          setDynamicPos('top');
        }
      }

      if (!align) {
        if (rightSpace < 220) {
          setDynamicAlign('right');
        } else if (leftSpace < 220) {
          setDynamicAlign('left');
        } else {
          setDynamicAlign('center');
        }
      }
    }
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

  const currentPos = tooltipPosition || dynamicPos;
  const currentAlign = align || dynamicAlign;
  const isTop = currentPos === 'top';

  const alignBoxClasses: Record<string, string> = {
    left: 'left-0 items-start',
    right: 'right-0 items-end',
    center: 'left-1/2 -translate-x-1/2 items-center',
  };

  const alignNotchClasses: Record<string, string> = {
    left: 'left-4',
    right: 'right-4',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <>
      <span
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        title={words ? `Click or tap to view: ${words}` : undefined}
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
            className={`hidden sm:flex-col sm:absolute z-[150] transition-all duration-150 ${alignBoxClasses[currentAlign]} ${
              isTop ? 'bottom-full mb-2.5' : 'top-full mt-2.5'
            } ${
              isOpen
                ? 'sm:flex opacity-100 scale-100 pointer-events-auto'
                : 'sm:hidden group-hover/money:sm:flex opacity-0 group-hover/money:opacity-100 group-hover/money:scale-100 scale-95 pointer-events-none'
            }`}
            style={{
              minWidth: '200px',
              maxWidth: '320px',
              width: 'max-content',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main Card Content */}
            <div className="relative z-10 px-3.5 py-2.5 bg-[#1A0B16] border border-[#C5A059]/80 rounded-xl shadow-2xl shadow-black/95 backdrop-blur-xl text-center w-full">
              <div className="flex items-center justify-between gap-1.5 text-[9px] uppercase tracking-wider font-mono font-bold text-[#C5A059] mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-pulse shrink-0" />
                  <span>Amount in Words</span>
                </div>
              </div>
              <p className="text-xs font-sans font-semibold text-amber-50 leading-snug whitespace-normal break-words text-center select-text">
                {words}
              </p>
            </div>

            {/* Pointer Notch */}
            <div
              className={`absolute ${alignNotchClasses[currentAlign]} w-2.5 h-2.5 rotate-45 bg-[#1A0B16] border-[#C5A059]/80 ${
                isTop
                  ? '-bottom-1 border-r border-b relative z-20'
                  : '-top-1 border-l border-t relative z-20'
              }`}
            />
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

