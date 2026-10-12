'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Clock,
} from 'lucide-react';

export interface DateRange {
  startDate: string | null; // ISO 'YYYY-MM-DD'
  endDate: string | null;   // ISO 'YYYY-MM-DD'
  presetLabel?: string;
}

export interface DatePickerProps {
  mode?: 'single' | 'range';
  value?: string | null; // For single date mode: 'YYYY-MM-DD'
  onChange?: (date: string) => void;
  rangeValue?: DateRange;
  onRangeChange?: (range: DateRange) => void;
  label?: string;
  placeholder?: string;
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean; // For inline table cells
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  align?: 'left' | 'right';
  showPresets?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function parseDateString(str: string | null | undefined): Date | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (!trimmed) return null;

  // Handle ISO "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // Handle "DD-MMM-YYYY" or "DD/MM/YYYY"
  const parts = trimmed.split(/[-/]/);
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const mStr = parts[1];
    const y = parseInt(parts[2], 10);
    const fullY = y < 100 ? 2000 + y : y;

    if (!isNaN(d) && !isNaN(fullY)) {
      if (isNaN(Number(mStr))) {
        const mIdx = MONTH_SHORT.findIndex((m) => m.toLowerCase() === mStr.toLowerCase().slice(0, 3));
        if (mIdx !== -1) return new Date(fullY, mIdx, d);
      } else {
        const m = parseInt(mStr, 10);
        if (!isNaN(m)) return new Date(fullY, m - 1, d);
      }
    }
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = parseDateString(dateStr);
  if (!d) return dateStr;
  const day = d.getDate();
  const month = MONTH_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
}

export function formatShortDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = parseDateString(dateStr);
  if (!d) return dateStr;
  const day = d.getDate();
  const month = MONTH_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function getCurrentMonthRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    presetLabel: 'This Month',
  };
}

export const DatePicker: React.FC<DatePickerProps> = ({
  mode = 'single',
  value,
  onChange,
  rangeValue,
  onRangeChange,
  label,
  placeholder = 'Select date...',
  theme = 'light',
  size = 'md',
  compact = false,
  disabled = false,
  className = '',
  buttonClassName = '',
  align = 'left',
  showPresets = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Active viewing month & year
  const initialDate = useMemo(() => {
    if (mode === 'single' && value) return parseDateString(value) || new Date();
    if (mode === 'range' && rangeValue?.startDate) return parseDateString(rangeValue.startDate) || new Date();
    return new Date();
  }, [mode, value, rangeValue]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [calendarView, setCalendarView] = useState<'days' | 'months' | 'years'>('days');
  const [yearPage, setYearPage] = useState(() => Math.floor(initialDate.getFullYear() / 12) * 12);

  // Range selecting state: 'start' or 'end'
  const [selectingSegment, setSelectingSegment] = useState<'start' | 'end'>('start');
  const [tempRangeStart, setTempRangeStart] = useState<string | null>(rangeValue?.startDate || null);
  const [tempRangeEnd, setTempRangeEnd] = useState<string | null>(rangeValue?.endDate || null);

  // Sync internal view when opened
  useEffect(() => {
    if (isOpen) {
      setCalendarView('days');
      if (mode === 'single' && value) {
        const d = parseDateString(value);
        if (d) {
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth());
          setYearPage(Math.floor(d.getFullYear() / 12) * 12);
        }
      } else if (mode === 'range') {
        setTempRangeStart(rangeValue?.startDate || null);
        setTempRangeEnd(rangeValue?.endDate || null);
        if (rangeValue?.startDate) {
          const d = parseDateString(rangeValue.startDate);
          if (d) {
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
            setYearPage(Math.floor(d.getFullYear() / 12) * 12);
          }
        }
      }
    }
  }, [isOpen, mode, value, rangeValue]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isDark = theme === 'dark';

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Calendar days calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: { date: Date; iso: string; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, daysInPrevMonth - i);
      days.push({ date: d, iso: toIsoDate(d), isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(viewYear, viewMonth, i);
      days.push({ date: d, iso: toIsoDate(d), isCurrentMonth: true });
    }

    // Next month padding to fill complete grid of 35 or 42
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(viewYear, viewMonth + 1, i);
      days.push({ date: d, iso: toIsoDate(d), isCurrentMonth: false });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Date click handler
  const handleDayClick = (iso: string) => {
    if (mode === 'single') {
      if (onChange) onChange(iso);
      setIsOpen(false);
    } else {
      // Range mode
      if (selectingSegment === 'start' || !tempRangeStart || (tempRangeStart && tempRangeEnd)) {
        setTempRangeStart(iso);
        setTempRangeEnd(null);
        setSelectingSegment('end');
      } else {
        // Selecting end
        const startMs = new Date(tempRangeStart).getTime();
        const endMs = new Date(iso).getTime();
        let finalStart = tempRangeStart;
        let finalEnd = iso;

        if (endMs < startMs) {
          finalStart = iso;
          finalEnd = tempRangeStart;
        }

        setTempRangeStart(finalStart);
        setTempRangeEnd(finalEnd);
        setSelectingSegment('start');

        if (onRangeChange) {
          onRangeChange({
            startDate: finalStart,
            endDate: finalEnd,
            presetLabel: 'Custom',
          });
        }
      }
    }
  };

  const handleSetPreset = (preset: 'this_month' | 'last_month' | 'this_quarter' | 'all') => {
    const now = new Date();
    if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const sIso = toIsoDate(start);
      const eIso = toIsoDate(end);
      setTempRangeStart(sIso);
      setTempRangeEnd(eIso);
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
      if (onRangeChange) onRangeChange({ startDate: sIso, endDate: eIso, presetLabel: 'This Month' });
    } else if (preset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      const sIso = toIsoDate(start);
      const eIso = toIsoDate(end);
      setTempRangeStart(sIso);
      setTempRangeEnd(eIso);
      setViewYear(start.getFullYear());
      setViewMonth(start.getMonth());
      if (onRangeChange) onRangeChange({ startDate: sIso, endDate: eIso, presetLabel: 'Last Month' });
    } else if (preset === 'this_quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1);
      const end = new Date(now.getFullYear(), qMonth + 3, 0);
      const sIso = toIsoDate(start);
      const eIso = toIsoDate(end);
      setTempRangeStart(sIso);
      setTempRangeEnd(eIso);
      setViewYear(start.getFullYear());
      setViewMonth(start.getMonth());
      if (onRangeChange) onRangeChange({ startDate: sIso, endDate: eIso, presetLabel: 'This Quarter' });
    } else if (preset === 'all') {
      setTempRangeStart(null);
      setTempRangeEnd(null);
      if (onRangeChange) onRangeChange({ startDate: null, endDate: null, presetLabel: 'All Dates' });
      setIsOpen(false);
    }
  };

  const handleSelectToday = () => {
    const todayIso = toIsoDate(new Date());
    if (mode === 'single') {
      if (onChange) onChange(todayIso);
      setIsOpen(false);
    } else {
      setTempRangeStart(todayIso);
      setTempRangeEnd(todayIso);
      if (onRangeChange) onRangeChange({ startDate: todayIso, endDate: todayIso, presetLabel: 'Today' });
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    if (mode === 'single') {
      if (onChange) onChange('');
      setIsOpen(false);
    } else {
      setTempRangeStart(null);
      setTempRangeEnd(null);
      if (onRangeChange) onRangeChange({ startDate: null, endDate: null, presetLabel: 'All Dates' });
      setIsOpen(false);
    }
  };

  // Display trigger label
  const triggerLabel = useMemo(() => {
    if (mode === 'single') {
      if (!value) return placeholder;
      return compact ? formatShortDisplayDate(value) : formatDisplayDate(value);
    } else {
      const s = rangeValue?.startDate;
      const e = rangeValue?.endDate;
      if (!s && !e) return placeholder || 'All Dates';
      if (s && e) {
        if (s === e) return formatShortDisplayDate(s);
        return `${formatShortDisplayDate(s)} → ${formatShortDisplayDate(e)}`;
      }
      return formatShortDisplayDate(s || e);
    }
  }, [mode, value, rangeValue, placeholder, compact]);

  const hasValue = mode === 'single' ? Boolean(value) : Boolean(rangeValue?.startDate || rangeValue?.endDate);

  const sizeClass = {
    sm: 'py-1 px-2.5 text-xs',
    md: 'py-2 px-3 text-xs sm:text-sm',
    lg: 'py-2.5 px-4 text-sm sm:text-base font-semibold',
  }[size];

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {label && (
        <label
          className={`block text-xs font-semibold mb-1 ${
            isDark ? 'text-[#EED8A1]' : 'text-slate-700'
          }`}
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 rounded-lg font-mono transition-all cursor-pointer select-none ${sizeClass} ${
          compact ? 'py-1 px-2 text-[11px] leading-none' : ''
        } ${
          isDark
            ? 'bg-[#160810] border border-[#3D1A2C] text-slate-100 hover:border-[#C5A059] focus:border-[#C5A059]'
            : 'bg-white border border-slate-300 text-slate-900 hover:border-[#701A35] focus:border-[#701A35]'
        } ${hasValue ? (isDark ? 'border-[#C5A059]/60 text-[#EED8A1]' : 'border-[#701A35]/50 text-slate-900') : 'text-slate-400'} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <CalendarDays
            className={`shrink-0 ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${
              isDark ? 'text-[#C5A059]' : 'text-[#701A35]'
            }`}
          />
          <span className="truncate">{triggerLabel}</span>
        </div>
        {hasValue && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className={`p-0.5 rounded hover:bg-black/20 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}
            title="Clear date"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* Popover Calendar Container */}
      {isOpen && (
        <div
          className={`absolute z-60 mt-1.5 w-[290px] sm:w-[320px] rounded-2xl shadow-2xl border p-3 sm:p-4 backdrop-blur-md animate-in fade-in zoom-in-95 duration-120 select-none ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${
            isDark
              ? 'bg-[#1D0C17] border-[#4A233A] text-slate-100 shadow-black/80'
              : 'bg-white border-slate-200 text-slate-900 shadow-slate-400/30'
          }`}
        >
          {/* Header with Month & Year navigation and interactive selector buttons */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
            <button
              type="button"
              onClick={() => {
                if (calendarView === 'days') handlePrevMonth();
                else if (calendarView === 'months') setViewYear((y) => y - 1);
                else if (calendarView === 'years') setYearPage((p) => p - 12);
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Interactive Month & Year Buttons */}
            <div className="flex items-center gap-1 font-bold font-serif text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => setCalendarView((v) => (v === 'months' ? 'days' : 'months'))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  calendarView === 'months'
                    ? 'bg-[#C5A059] text-slate-950 font-bold shadow-xs'
                    : isDark
                    ? 'text-[#EED8A1] hover:bg-white/10'
                    : 'text-slate-900 hover:bg-slate-100'
                }`}
                title="Click to choose month"
              >
                <span>{MONTHS[viewMonth]}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    calendarView === 'months' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  setYearPage(Math.floor(viewYear / 12) * 12);
                  setCalendarView((v) => (v === 'years' ? 'days' : 'years'));
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  calendarView === 'years'
                    ? 'bg-[#C5A059] text-slate-950 font-bold shadow-xs'
                    : isDark
                    ? 'text-[#C5A059] hover:bg-white/10'
                    : 'text-[#701A35] hover:bg-slate-100'
                }`}
                title="Click to choose year"
              >
                <span>{calendarView === 'years' ? `${yearPage}–${yearPage + 11}` : viewYear}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    calendarView === 'years' ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (calendarView === 'days') handleNextMonth();
                else if (calendarView === 'months') setViewYear((y) => y + 1);
                else if (calendarView === 'years') setYearPage((p) => p + 12);
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* VIEW MODE: MONTHS SELECTOR GRID */}
          {calendarView === 'months' && (
            <div className="grid grid-cols-3 gap-2 py-2 animate-in fade-in zoom-in-95 duration-100">
              {MONTHS.map((m, idx) => {
                const isSelectedMonth = viewMonth === idx;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setViewMonth(idx);
                      setCalendarView('days');
                    }}
                    className={`py-2.5 px-2 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center ${
                      isSelectedMonth
                        ? 'bg-[#C5A059] text-slate-950 font-bold shadow-xs'
                        : isDark
                        ? 'bg-[#2A1322] hover:bg-white/10 text-slate-200 border border-[#4A233A]'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {/* VIEW MODE: YEARS SELECTOR GRID */}
          {calendarView === 'years' && (
            <div className="grid grid-cols-3 gap-2 py-2 animate-in fade-in zoom-in-95 duration-100">
              {Array.from({ length: 12 }, (_, i) => yearPage + i).map((y) => {
                const isSelectedYear = viewYear === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setViewYear(y);
                      setCalendarView('months');
                    }}
                    className={`py-2.5 px-2 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer text-center ${
                      isSelectedYear
                        ? 'bg-[#C5A059] text-slate-950 font-bold shadow-xs'
                        : isDark
                        ? 'bg-[#2A1322] hover:bg-white/10 text-slate-200 border border-[#4A233A]'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* VIEW MODE: DAYS CALENDAR VIEW */}
          {calendarView === 'days' && (
            <>
              {/* Quick Presets (Range Mode) */}
              {mode === 'range' && showPresets && (
                <div className="grid grid-cols-4 gap-1 mb-2.5 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => handleSetPreset('this_month')}
                    className={`py-1 px-1.5 rounded border transition-colors cursor-pointer text-center ${
                      isDark
                        ? 'bg-[#2A1322] border-[#4A233A] text-[#EED8A1] hover:bg-[#C5A059]/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPreset('last_month')}
                    className={`py-1 px-1.5 rounded border transition-colors cursor-pointer text-center ${
                      isDark
                        ? 'bg-[#2A1322] border-[#4A233A] text-[#EED8A1] hover:bg-[#C5A059]/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Last Month
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPreset('this_quarter')}
                    className={`py-1 px-1.5 rounded border transition-colors cursor-pointer text-center ${
                      isDark
                        ? 'bg-[#2A1322] border-[#4A233A] text-[#EED8A1] hover:bg-[#C5A059]/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Quarter
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPreset('all')}
                    className={`py-1 px-1.5 rounded border transition-colors cursor-pointer text-center ${
                      isDark
                        ? 'bg-[#2A1322] border-[#4A233A] text-slate-400 hover:text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    All Dates
                  </button>
                </div>
              )}

              {/* Weekday column headers */}
              <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] font-bold pb-1.5 text-slate-400">
                {WEEKDAYS.map((wd) => (
                  <div key={wd} className="py-0.5">
                    {wd}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
                {calendarDays.map(({ date, iso, isCurrentMonth }, idx) => {
                  const dayNum = date.getDate();

                  let isSelected = false;
                  let isRangeStart = false;
                  let isRangeEnd = false;
                  let isInRange = false;

                  if (mode === 'single') {
                    const selectedIso = value ? parseDateString(value) ? toIsoDate(parseDateString(value)!) : value : null;
                    isSelected = selectedIso === iso;
                  } else {
                    const sIso = tempRangeStart || rangeValue?.startDate;
                    const eIso = tempRangeEnd || rangeValue?.endDate;

                    isRangeStart = sIso === iso;
                    isRangeEnd = eIso === iso;
                    isSelected = isRangeStart || isRangeEnd;

                    if (sIso && eIso && iso > sIso && iso < eIso) {
                      isInRange = true;
                    }
                  }

                  const isToday = toIsoDate(new Date()) === iso;

                  return (
                    <button
                      key={`${iso}-${idx}`}
                      type="button"
                      onClick={() => handleDayClick(iso)}
                      className={`h-8 w-8 mx-auto rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
                        !isCurrentMonth ? 'opacity-30' : ''
                      } ${
                        isSelected
                          ? isDark
                            ? 'bg-[#C5A059] text-slate-950 font-black shadow-md scale-105 z-10'
                            : 'bg-[#701A35] text-white font-black shadow-md scale-105 z-10'
                          : isInRange
                          ? isDark
                            ? 'bg-[#C5A059]/20 text-[#EED8A1] rounded-none'
                            : 'bg-amber-100 text-amber-950 rounded-none'
                          : isDark
                          ? 'hover:bg-white/10 text-slate-200'
                          : 'hover:bg-slate-100 text-slate-800'
                      } ${isToday && !isSelected ? (isDark ? 'border border-[#C5A059]/50 text-[#C5A059]' : 'border border-[#701A35]/50 text-[#701A35] font-bold') : ''}`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Popover Footer with Today and Clear */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10 text-xs font-mono">
            <button
              type="button"
              onClick={handleSelectToday}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                isDark ? 'text-[#C5A059] hover:bg-white/10' : 'text-[#701A35] hover:bg-slate-100 font-bold'
              }`}
            >
              Today
            </button>

            <button
              type="button"
              onClick={handleClear}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
