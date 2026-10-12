'use client';

import React, { useState, useRef, useEffect, useMemo, useTransition } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Layers,
  Check,
} from 'lucide-react';

export interface DateRangeValue {
  startDate: string | null; // 'YYYY-MM-DD'
  endDate: string | null;   // 'YYYY-MM-DD'
  presetLabel?: string;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (val: DateRangeValue) => void;
  className?: string;
  label?: string;
  isOpenControlled?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDateForDisplay(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const month = MONTH_NAMES[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getCurrentMonthRange(): { start: Date; end: Date; startIso: string; endIso: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start,
    end,
    startIso: toIsoDate(start),
    endIso: toIsoDate(end),
  };
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  // Tab mode: 'presets' | 'calendar' | 'month-year'
  const [activeTab, setActiveTab] = useState<'presets' | 'calendar' | 'month-year'>('presets');
  const [activeSegment, setActiveSegment] = useState<'start' | 'end'>('start');

  // Working calendar view anchor date
  const [calendarAnchor, setCalendarAnchor] = useState<Date>(() => {
    if (value.startDate) return new Date(value.startDate);
    return new Date();
  });

  // Internal working dates while popover is open
  const [tempStart, setTempStart] = useState<Date>(() => {
    if (value.startDate) return new Date(value.startDate);
    return getCurrentMonthRange().start;
  });
  const [tempEnd, setTempEnd] = useState<Date>(() => {
    if (value.endDate) return new Date(value.endDate);
    return getCurrentMonthRange().end;
  });
  const [activePreset, setActivePreset] = useState<string>(() => {
    if (value.presetLabel) return value.presetLabel;
    if (!value.startDate && !value.endDate) return 'all';
    return 'curr_month';
  });

  // Sync internal state when external value changes
  useEffect(() => {
    if (value.startDate) {
      const s = new Date(value.startDate);
      setTempStart(s);
      setCalendarAnchor(new Date(s.getFullYear(), s.getMonth(), 1));
    }
    if (value.endDate) {
      setTempEnd(new Date(value.endDate));
    }
    if (value.presetLabel) {
      setActivePreset(value.presetLabel);
    } else if (!value.startDate && !value.endDate) {
      setActivePreset('all');
    }
  }, [value.startDate, value.endDate, value.presetLabel]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePresetClick = (presetId: string) => {
    const now = new Date();
    let s = new Date(tempStart);
    let e = new Date(tempEnd);

    switch (presetId) {
      case 'all': {
        setActivePreset('all');
        startTransition(() => {
          onChange({
            startDate: null,
            endDate: null,
            presetLabel: 'all',
          });
        });
        return;
      }
      case 'today': {
        s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        e = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      }
      case 'yesterday': {
        s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        e = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      }
      case 'tomorrow': {
        s = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        e = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      }
      case 'last_7_days': {
        s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        e = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      }
      case 'next_7_days': {
        s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        e = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6);
        break;
      }
      case 'last_30_days': {
        s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        e = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      }
      case 'next_30_days': {
        s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        e = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 29);
        break;
      }
      case 'prev_month': {
        s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        e = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      }
      case 'curr_month': {
        s = new Date(now.getFullYear(), now.getMonth(), 1);
        e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      }
      case 'custom': {
        setActiveTab('calendar');
        setActivePreset('custom');
        return;
      }
    }

    setTempStart(s);
    setTempEnd(e);
    setCalendarAnchor(new Date(s.getFullYear(), s.getMonth(), 1));
    setActivePreset(presetId);

    // Apply smoothly via startTransition
    startTransition(() => {
      onChange({
        startDate: toIsoDate(s),
        endDate: toIsoDate(e),
        presetLabel: presetId,
      });
    });
  };

  const handleDaySelect = (dayDate: Date) => {
    let newStart = tempStart;
    let newEnd = tempEnd;

    if (activeSegment === 'start') {
      newStart = dayDate;
      if (dayDate > tempEnd) {
        newEnd = dayDate;
      }
      setTempStart(newStart);
      setTempEnd(newEnd);
      setActiveSegment('end');
    } else {
      if (dayDate < tempStart) {
        newStart = dayDate;
        newEnd = tempStart;
      } else {
        newEnd = dayDate;
      }
      setTempStart(newStart);
      setTempEnd(newEnd);
      setActiveSegment('start');
    }
    setActivePreset('custom');

    startTransition(() => {
      onChange({
        startDate: toIsoDate(newStart),
        endDate: toIsoDate(newEnd),
        presetLabel: 'custom',
      });
    });
  };

  const handleMonthYearSelect = (monthIdx: number, year: number) => {
    const s = new Date(year, monthIdx, 1);
    const e = new Date(year, monthIdx + 1, 0);
    setTempStart(s);
    setTempEnd(e);
    setCalendarAnchor(s);
    setActivePreset('custom');
    setActiveTab('calendar');

    startTransition(() => {
      onChange({
        startDate: toIsoDate(s),
        endDate: toIsoDate(e),
        presetLabel: 'custom',
      });
    });
  };

  const handleClear = () => {
    setActivePreset('all');
    startTransition(() => {
      onChange({
        startDate: null,
        endDate: null,
        presetLabel: 'all',
      });
    });
    setIsOpen(false);
  };

  const handleDone = () => {
    startTransition(() => {
      if (activePreset === 'all') {
        onChange({
          startDate: null,
          endDate: null,
          presetLabel: 'all',
        });
      } else {
        onChange({
          startDate: toIsoDate(tempStart),
          endDate: toIsoDate(tempEnd),
          presetLabel: activePreset,
        });
      }
    });
    setIsOpen(false);
  };

  // Calendar calculations
  const currentYear = calendarAnchor.getFullYear();
  const currentMonthIdx = calendarAnchor.getMonth();
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonthIdx, 1).getDay();

  // Range day count calculation
  const totalDaysSelected = useMemo(() => {
    if (!value.startDate && !value.endDate) return null;
    const s = new Date(tempStart);
    const e = new Date(tempEnd);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [value.startDate, value.endDate, tempStart, tempEnd]);

  const yearsList = useMemo(() => {
    const list = [];
    for (let y = 2020; y <= 2028; y++) {
      list.push(y);
    }
    return list;
  }, []);

  const isAllDates = !value.startDate && !value.endDate && activePreset === 'all';

  const displayText = useMemo(() => {
    if (!value.startDate && !value.endDate) {
      return 'All Dates (No Filter)';
    }
    const startStr = formatDateForDisplay(value.startDate);
    const endStr = formatDateForDisplay(value.endDate);
    if (startStr === endStr) return startStr;
    return `${startStr} – ${endStr}`;
  }, [value.startDate, value.endDate]);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <div className="flex flex-col">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
          Date Range
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between gap-3 px-3.5 py-2 bg-white border border-[#E6E1D6] hover:border-[#701A35] rounded-xl shadow-2xs text-xs font-semibold text-slate-800 transition-all duration-120 cursor-pointer min-w-[240px] btn-press"
        >
          <span className="truncate font-mono font-medium">{displayText}</span>
          <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
            <CalendarDays className="w-4 h-4 text-[#701A35]" />
          </div>
        </button>
      </div>

      {/* Popover Modal (Smooth, Lag-free, Responsive Enterprise Layout) */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-[360px] sm:w-[420px] bg-white rounded-2xl border border-[#E6E1D6] shadow-2xl p-4 space-y-3.5 motion-popover select-none">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#EDE8DF]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#701A35]/10 text-[#701A35] flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-serif">
                Date Range Filter
              </h3>
            </div>

            <div className="flex items-center gap-2.5">
              {(value.startDate || value.endDate) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer btn-press px-2 py-0.5 rounded-lg hover:bg-rose-50 transition-colors duration-120"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleDone}
                className="px-3.5 py-1 bg-[#701A35] hover:bg-[#5C142B] text-white text-xs font-bold rounded-lg shadow-2xs transition-all duration-120 cursor-pointer btn-press"
              >
                Done
              </button>
            </div>
          </div>

          {/* Connected Range Display Card (From ➔ To) */}
          <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E6E1D6] flex items-center justify-between gap-2 text-xs">
            {/* Start Date Box */}
            <button
              type="button"
              onClick={() => {
                setActiveSegment('start');
                setActiveTab('calendar');
              }}
              className={`flex-1 p-2 rounded-lg border text-left transition-all duration-140 cursor-pointer btn-press ${
                activeSegment === 'start' && activeTab === 'calendar'
                  ? 'bg-white border-[#701A35] text-[#701A35] shadow-2xs ring-2 ring-[#701A35]/25'
                  : 'bg-white/80 border-slate-200 hover:bg-white text-slate-700'
              }`}
            >
              <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400 font-mono">
                From Date
              </span>
              <span className="block font-mono font-bold text-xs truncate mt-0.5">
                {isAllDates ? 'Earliest' : formatDateForDisplay(toIsoDate(tempStart))}
              </span>
            </button>

            <ArrowRight className="w-4 h-4 text-[#701A35] shrink-0 transition-transform duration-120" />

            {/* End Date Box */}
            <button
              type="button"
              onClick={() => {
                setActiveSegment('end');
                setActiveTab('calendar');
              }}
              className={`flex-1 p-2 rounded-lg border text-left transition-all duration-140 cursor-pointer btn-press ${
                activeSegment === 'end' && activeTab === 'calendar'
                  ? 'bg-white border-[#701A35] text-[#701A35] shadow-2xs ring-2 ring-[#701A35]/25'
                  : 'bg-white/80 border-slate-200 hover:bg-white text-slate-700'
              }`}
            >
              <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400 font-mono">
                To Date
              </span>
              <span className="block font-mono font-bold text-xs truncate mt-0.5">
                {isAllDates ? 'Latest' : formatDateForDisplay(toIsoDate(tempEnd))}
              </span>
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-140 cursor-pointer btn-press flex items-center justify-center gap-1.5 ${
                activeTab === 'presets'
                  ? 'bg-white text-[#701A35] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Presets</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-140 cursor-pointer btn-press flex items-center justify-center gap-1.5 ${
                activeTab === 'calendar'
                  ? 'bg-white text-[#701A35] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#701A35]" />
              <span>Calendar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('month-year')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-140 cursor-pointer btn-press flex items-center justify-center gap-1.5 ${
                activeTab === 'month-year'
                  ? 'bg-white text-[#701A35] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Month/Year</span>
            </button>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 1: CLEAN ORGANIZED 2-COLUMN PRESETS GRID (LAG-FREE SMOOTH SELECTION)
             ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'presets' && (
            <div className="space-y-3 transition-opacity duration-150 ease-out">
              {/* Primary Full Width Option: All Dates */}
              <button
                type="button"
                onClick={() => handlePresetClick('all')}
                className={`w-full p-2.5 rounded-xl border text-left transition-all duration-140 ease-out flex items-center justify-between cursor-pointer btn-press ${
                  isAllDates
                    ? 'bg-[#701A35] text-white border-[#701A35] shadow-xs'
                    : 'bg-[#FAF8F5] text-slate-800 border-[#E6E1D6] hover:bg-[#F4EFE6]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-colors duration-140 ${
                      isAllDates ? 'bg-white/20 text-[#EED8A1]' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    ∞
                  </div>
                  <div>
                    <span className="text-xs font-bold block">All Dates (No Filter)</span>
                    <span
                      className={`text-[10px] block transition-colors duration-140 ${
                        isAllDates ? 'text-amber-200' : 'text-slate-500'
                      }`}
                    >
                      Show full lifetime database records
                    </span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 flex items-center justify-center transition-all duration-140 ${
                    isAllDates ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-[#EED8A1]" />
                </div>
              </button>

              {/* Symmetrical 2-Column Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* Column 1: Historical / Standard */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block px-1">
                    Past & Recent
                  </span>

                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'last_7_days', label: 'Last 7 Days' },
                    { id: 'last_30_days', label: 'Last 30 Days' },
                    { id: 'curr_month', label: 'Current Month' },
                    { id: 'prev_month', label: 'Previous Month' },
                  ].map((p) => {
                    const isSelected = activePreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePresetClick(p.id)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-medium transition-all duration-140 ease-out flex items-center justify-between cursor-pointer btn-press border ${
                          isSelected
                            ? 'bg-[#701A35] text-white font-bold border-[#701A35] shadow-xs'
                            : 'bg-[#FAF8F5] text-slate-700 hover:bg-[#F4EFE6] border-[#E6E1D6]'
                        }`}
                      >
                        <span className="truncate">{p.label}</span>
                        <span
                          className={`w-4 h-4 shrink-0 flex items-center justify-center transition-all duration-140 ${
                            isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 text-[#EED8A1] stroke-[3]" />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Column 2: Forward Looking / Custom */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block px-1">
                    Future & Custom
                  </span>

                  {[
                    { id: 'tomorrow', label: 'Tomorrow' },
                    { id: 'next_7_days', label: 'Next 7 Days' },
                    { id: 'next_30_days', label: 'Next 30 Days' },
                  ].map((p) => {
                    const isSelected = activePreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePresetClick(p.id)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-medium transition-all duration-140 ease-out flex items-center justify-between cursor-pointer btn-press border ${
                          isSelected
                            ? 'bg-[#701A35] text-white font-bold border-[#701A35] shadow-xs'
                            : 'bg-[#FAF8F5] text-slate-700 hover:bg-[#F4EFE6] border-[#E6E1D6]'
                        }`}
                      >
                        <span className="truncate">{p.label}</span>
                        <span
                          className={`w-4 h-4 shrink-0 flex items-center justify-center transition-all duration-140 ${
                            isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 text-[#EED8A1] stroke-[3]" />
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('calendar');
                      setActivePreset('custom');
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold transition-all duration-140 ease-out flex items-center justify-between cursor-pointer btn-press border border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100 shadow-2xs"
                  >
                    <span>Custom Picker</span>
                    <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 2: INTERACTIVE CALENDAR WITH SMOOTH RANGE HIGHLIGHTING
             ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'calendar' && (
            <div className="space-y-3 transition-opacity duration-150 ease-out">
              {/* Calendar Navigation Header */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => {
                    setCalendarAnchor(new Date(currentYear, currentMonthIdx - 1, 1));
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer btn-press transition-colors duration-120"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-center">
                  <span className="font-serif font-bold text-sm text-slate-900 block">
                    {FULL_MONTH_NAMES[currentMonthIdx]} {currentYear}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Selecting: <strong className="text-[#701A35] font-bold">{activeSegment === 'start' ? 'Start Date' : 'End Date'}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCalendarAnchor(new Date(currentYear, currentMonthIdx + 1, 1));
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer btn-press transition-colors duration-120"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E1D6]">
                {/* Day of Week Header */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 font-mono mb-1">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <span key={d} className="py-0.5">
                      {d}
                    </span>
                  ))}
                </div>

                {/* Day Cells */}
                <div className="grid grid-cols-7 gap-1 text-xs font-mono">
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <span key={`empty-${i}`} className="h-7 w-7" />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const cellDate = new Date(currentYear, currentMonthIdx, dayNum);
                    const cellIso = toIsoDate(cellDate);
                    const startIso = toIsoDate(tempStart);
                    const endIso = toIsoDate(tempEnd);

                    const isStart = cellIso === startIso;
                    const isEnd = cellIso === endIso;
                    const isInRange = cellDate > tempStart && cellDate < tempEnd;

                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => handleDaySelect(cellDate)}
                        className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer btn-press transition-all duration-120 ${
                          isStart || isEnd
                            ? 'bg-[#701A35] text-white scale-105 shadow-2xs font-bold'
                            : isInRange
                            ? 'bg-[#701A35]/12 text-[#701A35] font-semibold rounded-none'
                            : 'text-slate-700 hover:bg-amber-100/70 hover:scale-105'
                        }`}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 3: QUICK MONTH & YEAR JUMP MATRIX
             ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'month-year' && (
            <div className="space-y-3 transition-opacity duration-150 ease-out">
              {/* Year Chips */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block mb-1.5">
                  Select Year
                </span>
                <div className="grid grid-cols-5 gap-1.5 text-xs font-mono">
                  {yearsList.map((y) => {
                    const isSelected = currentYear === y;
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          setCalendarAnchor(new Date(y, currentMonthIdx, 1));
                        }}
                        className={`py-1.5 rounded-lg font-bold text-center transition-all duration-120 cursor-pointer btn-press ${
                          isSelected
                            ? 'bg-[#701A35] text-white shadow-2xs'
                            : 'bg-[#FAF8F5] text-slate-700 hover:bg-[#F3EFE6] border border-[#E6E1D6]'
                        }`}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Month Grid */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block mb-1.5">
                  Select Month in {currentYear}
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-xs font-sans">
                  {MONTH_NAMES.map((m, idx) => {
                    const isSelected = currentMonthIdx === idx;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleMonthYearSelect(idx, currentYear)}
                        className={`py-2 rounded-xl font-bold text-center transition-all duration-120 cursor-pointer btn-press ${
                          isSelected
                            ? 'bg-[#701A35] text-white shadow-2xs'
                            : 'bg-[#FAF8F5] text-slate-700 hover:bg-[#F3EFE6] border border-[#E6E1D6]'
                        }`}
                      >
                        {FULL_MONTH_NAMES[idx]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer Info Strip */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span className="transition-all duration-140">
              {isAllDates
                ? 'All Dates Active'
                : totalDaysSelected
                ? `${totalDaysSelected} Days Selected`
                : 'Custom Selection'}
            </span>
            <span className="text-slate-400">Auto-applies instantly</span>
          </div>
        </div>
      )}
    </div>
  );
};
