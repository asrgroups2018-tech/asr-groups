'use client';

import React, { useState, useEffect } from 'react';
import { IndianRupee } from 'lucide-react';
import { numberToIndianWords, formatIndianCommas, parseFormattedNumber } from '@/lib/utils/numberToWords';

export interface AmountInputProps {
  id?: string;
  name?: string;
  value: number | '' | null | undefined;
  onChange: (val: number) => void;
  placeholder?: string;
  label?: string;
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  min?: number;
  max?: number;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  showWords?: boolean;
  wordsClassName?: string;
  presets?: number[];
  onPresetClick?: (val: number) => void;
  error?: string | null;
  autoFocus?: boolean;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder = 'e.g. 1,00,000',
  label,
  theme = 'dark',
  size = 'md',
  min,
  max,
  disabled = false,
  required = false,
  className = '',
  inputClassName = '',
  showWords = true,
  wordsClassName = '',
  presets,
  onPresetClick,
  error,
  autoFocus = false,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value === null || value === undefined || value === '' || value === 0) return '';
    return formatIndianCommas(value);
  });

  // Synchronize when external value changes
  useEffect(() => {
    if (value === null || value === undefined || value === '' || value === 0) {
      if (displayValue !== '') {
        setDisplayValue('');
      }
    } else {
      const parsedCurrent = parseFormattedNumber(displayValue);
      if (parsedCurrent !== value) {
        setDisplayValue(formatIndianCommas(value));
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawText = e.target.value;
    // Allow digits and at most one decimal point
    const cleanDigits = rawText.replace(/[^0-9.]/g, '');
    const num = parseFormattedNumber(cleanDigits);

    if (cleanDigits === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    const formatted = formatIndianCommas(cleanDigits);
    setDisplayValue(formatted);
    onChange(num);
  };

  const currentNum = parseFormattedNumber(displayValue);
  const words = showWords && currentNum > 0 ? numberToIndianWords(currentNum) : '';

  const isDark = theme === 'dark';

  const sizeClasses = {
    sm: 'py-1.5 pl-7 pr-3 text-xs',
    md: 'py-2.5 pl-8 pr-3 text-sm',
    lg: 'py-3 pl-9 pr-4 text-base sm:text-lg font-bold',
  }[size];

  const symbolSizeClasses = {
    sm: 'left-2.5 text-xs',
    md: 'left-3 text-sm',
    lg: 'left-3.5 text-base sm:text-lg font-bold',
  }[size];

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className={`block text-xs font-semibold ${
            isDark ? 'text-[#EED8A1]' : 'text-slate-700'
          }`}
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        <span
          className={`absolute top-1/2 -translate-y-1/2 pointer-events-none font-mono font-bold ${symbolSizeClasses} ${
            isDark ? 'text-[#C5A059]' : 'text-slate-500'
          }`}
        >
          ₹
        </span>

        <input
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          className={`w-full rounded-lg font-mono transition-all focus:outline-hidden ${sizeClasses} ${
            isDark
              ? 'bg-[#160810] border border-[#3D1A2C] text-[#EED8A1] placeholder-slate-500 focus:border-[#C5A059] focus:bg-[#1A0A13]'
              : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#701A35] focus:ring-1 focus:ring-[#701A35]'
          } ${error ? 'border-rose-500! focus:border-rose-500!' : ''} ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${inputClassName}`}
        />
      </div>

      {/* Amount in Words in Indian Rupees */}
      {showWords && words && (
        <p
          className={`text-[11px] font-medium tracking-wide animate-in fade-in duration-150 ${
            isDark ? 'text-amber-300/90' : 'text-emerald-700'
          } ${wordsClassName}`}
        >
          {words}
        </p>
      )}

      {/* Inline Validation Error */}
      {error && (
        <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-0.5">
          <span>⚠️</span> {error}
        </p>
      )}

      {/* Preset Quick-Buttons */}
      {presets && presets.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap pt-1">
          <span className="text-[10px] sm:text-[11px]">Presets:</span>
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                if (onPresetClick) onPresetClick(preset);
                else {
                  setDisplayValue(formatIndianCommas(preset));
                  onChange(preset);
                }
              }}
              className={`px-2 py-0.5 rounded font-mono text-[10px] sm:text-[11px] cursor-pointer transition-colors ${
                isDark
                  ? 'bg-[#160810] hover:bg-[#C5A059]/20 hover:text-[#EED8A1] border border-[#3D1A2C]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              ₹{preset >= 100000 ? `${(preset / 100000).toFixed(0)} Lakh` : formatIndianCommas(preset)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
