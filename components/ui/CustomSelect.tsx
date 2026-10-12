'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption<T extends string = string> {
  value: T;
  label: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  colorClass?: string;
}

interface CustomSelectProps<T extends string = string> {
  value: T;
  options: (CustomSelectOption<T> | T)[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function CustomSelect<T extends string = string>({
  value,
  options,
  onChange,
  placeholder = 'Select option',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  size = 'sm',
  disabled = false,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: CustomSelectOption<T>[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt as T, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value) || {
    value,
    label: value || placeholder,
  };

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 transition-all cursor-pointer shadow-2xs hover:border-[#701A35] focus:outline-2 focus:outline-[#701A35] ${
          size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${buttonClassName}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {selectedOption.icon}
          <span className="truncate">{selectedOption.label}</span>
          {selectedOption.badge}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-[#701A35]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 mt-1 min-w-[140px] bg-white rounded-xl border border-[#D0C8B8] shadow-xl p-1 z-50 motion-popover animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#701A35] text-white font-bold'
                    : 'text-slate-800 hover:bg-[#FAF5ED] hover:text-[#701A35]'
                } ${opt.colorClass || ''}`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.icon}
                  <span className="truncate">{opt.label}</span>
                  {opt.badge}
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-amber-200" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
