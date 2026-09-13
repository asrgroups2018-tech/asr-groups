'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
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
  isOpenControlled?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const PRESETS = [
  { id: 'all', label: 'All Dates (No Filter)' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'next_7_days', label: 'Next 7 Days' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'next_30_days', label: 'Next 30 Days' },
  { id: 'prev_month', label: 'Previous Month' },
  { id: 'curr_month', label: 'Current Month' },
  { id: 'custom', label: 'Custom' },
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

  // Active view tab inside picker: 'presets' | 'years' | 'months' | 'days'
  const [activeSegment, setActiveSegment] = useState<'start' | 'end'>('start');
  const [subView, setSubView] = useState<'years' | 'months' | 'days' | 'presets'>('presets');

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
    if (value.startDate) setTempStart(new Date(value.startDate));
    if (value.endDate) setTempEnd(new Date(value.endDate));
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

  const activeDate = activeSegment === 'start' ? tempStart : tempEnd;

  const handlePresetClick = (presetId: string) => {
    const now = new Date();
    let s = new Date(tempStart);
    let e = new Date(tempEnd);

    switch (presetId) {
      case 'all': {
        setActivePreset('all');
        onChange({
          startDate: null,
          endDate: null,
          presetLabel: 'all',
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
        setSubView('days');
        setActivePreset('custom');
        return;
      }
    }

    setTempStart(s);
    setTempEnd(e);
    setActivePreset(presetId);

    // Apply immediately
    onChange({
      startDate: toIsoDate(s),
      endDate: toIsoDate(e),
      presetLabel: presetId,
    });
  };

  const handleYearSelect = (year: number) => {
    if (activeSegment === 'start') {
      const d = new Date(tempStart);
      d.setFullYear(year);
      setTempStart(d);
    } else {
      const d = new Date(tempEnd);
      d.setFullYear(year);
      setTempEnd(d);
    }
    setSubView('months');
    setActivePreset('custom');
  };

  const handleMonthSelect = (monthIdx: number) => {
    if (activeSegment === 'start') {
      const d = new Date(tempStart);
      d.setMonth(monthIdx);
      setTempStart(d);
    } else {
      const d = new Date(tempEnd);
      d.setMonth(monthIdx);
      setTempEnd(d);
    }
    setSubView('days');
    setActivePreset('custom');
  };

  const handleDaySelect = (day: number) => {
    if (activeSegment === 'start') {
      const d = new Date(tempStart);
      d.setDate(day);
      setTempStart(d);
      if (d > tempEnd) {
        setTempEnd(new Date(d));
      }
      setActiveSegment('end');
    } else {
      const d = new Date(tempEnd);
      d.setDate(day);
      if (d < tempStart) {
        setTempStart(new Date(d));
      }
      setTempEnd(d);
    }
    setActivePreset('custom');
  };

  const handleDone = () => {
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
    setIsOpen(false);
  };

  const handleClear = () => {
    setActivePreset('all');
    onChange({
      startDate: null,
      endDate: null,
      presetLabel: 'all',
    });
    setIsOpen(false);
  };

  // Year list 2016 .. 2027
  const yearsList = useMemo(() => {
    const list = [];
    for (let y = 2016; y <= 2027; y++) {
      list.push(y);
    }
    return list;
  }, []);

  // Calendar days generation for active date's month and year
  const daysInMonth = new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(activeDate.getFullYear(), activeDate.getMonth(), 1).getDay();

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
      {/* Trigger Button Matching Project Palette */}
      <div className="flex flex-col">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
          Date Range
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between gap-3 px-3.5 py-2 bg-white border border-[#E6E1D6] hover:border-[#701A35] rounded-xl shadow-2xs text-xs font-semibold text-slate-800 transition-all cursor-pointer min-w-[240px]"
        >
          <span className="truncate font-mono font-medium">{displayText}</span>
          <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
            <CalendarDays className="w-4 h-4 text-[#701A35]" />
          </div>
        </button>
      </div>

      {/* Popover Modal (Styled with ASR Maroon & Gold theme) */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-80 sm:w-96 bg-white rounded-2xl border border-[#E6E1D6] shadow-2xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150 select-none">
          {/* Top Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#EDE8DF]">
            <h3 className="text-sm font-bold text-slate-900 font-serif">
              Date Range
            </h3>
            <div className="flex items-center gap-3">
              {(value.startDate || value.endDate) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleDone}
                className="text-xs font-bold text-[#701A35] hover:text-[#5C142B] hover:underline font-sans cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>

          {/* Dual Date Input Fields */}
          <div className="flex items-center justify-between gap-2 text-xs font-mono">
            {/* Start Date Box */}
            <div
              onClick={() => {
                setActiveSegment('start');
                if (subView === 'presets') setSubView('days');
              }}
              className={`flex-1 flex items-center justify-center gap-1 p-1.5 rounded-lg border cursor-pointer transition-colors ${
                activeSegment === 'start'
                  ? 'border-[#701A35] bg-[#FAF8F5] text-[#701A35] font-bold ring-1 ring-[#701A35]/20'
                  : 'border-[#E6E1D6] bg-white text-slate-700 hover:bg-[#FAF8F5]'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSegment('start');
                  setSubView('years');
                }}
                className={`hover:underline px-1 py-0.5 rounded transition-colors ${
                  subView === 'years' && activeSegment === 'start'
                    ? 'bg-[#701A35] text-white font-bold'
                    : 'text-slate-800'
                }`}
              >
                {tempStart.getFullYear()}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSegment('start');
                  setSubView('months');
                }}
                className={`hover:underline px-1 py-0.5 rounded transition-colors ${
                  subView === 'months' && activeSegment === 'start'
                    ? 'bg-[#701A35] text-white font-bold'
                    : 'text-slate-800'
                }`}
              >
                {MONTH_NAMES[tempStart.getMonth()]}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSegment('start');
                  setSubView('days');
                }}
                className={`hover:underline px-1 py-0.5 rounded transition-colors ${
                  subView === 'days' && activeSegment === 'start'
                    ? 'bg-[#701A35] text-white font-bold'
                    : 'text-slate-800'
                }`}
              >
                {tempStart.getDate()}
              </button>
            </div>

            <span className="text-[#701A35] font-bold">►</span>

            {/* End Date Box */}
            <div
              onClick={() => {
                setActiveSegment('end');
                if (subView === 'presets') setSubView('days');
              }}
              className={`flex-1 flex items-center justify-center gap-1 p-1.5 rounded-lg border cursor-pointer transition-colors ${
                activeSegment === 'end'
                  ? 'border-[#701A35] bg-[#FAF8F5] text-[#701A35] font-bold ring-1 ring-[#701A35]/20'
                  : 'border-[#E6E1D6] bg-white text-slate-700 hover:bg-[#FAF8F5]'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSegment('end');
                  setSubView('years');
                }}
                className={`hover:underline px-1 py-0.5 rounded transition-colors ${
                  subView === 'years' && activeSegment === 'end'
                    ? 'bg-[#701A35] text-white font-bold'
                    : 'text-slate-800'
                }`}
              >
                {tempEnd.getFullYear()}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSegment('end');
                  setSubView('months');
                }}
                className={`hover:underline px-1 py-0.5 rounded transition-colors ${
                  subView === 'months' && activeSegment === 'end'
                    ? 'bg-[#701A35] text-white font-bold'
                    : 'text-slate-800'
                }`}
              >
                {MONTH_NAMES[tempEnd.getMonth()]}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSegment('end');
                  setSubView('days');
                }}
                className={`hover:underline px-1 py-0.5 rounded transition-colors ${
                  subView === 'days' && activeSegment === 'end'
                    ? 'bg-[#701A35] text-white font-bold'
                    : 'text-slate-800'
                }`}
              >
                {tempEnd.getDate()}
              </button>
            </div>
          </div>

          {/* Sub-View: Years Grid */}
          {subView === 'years' && (
            <div className="space-y-2">
              <div className="text-center font-bold text-xs text-slate-700 font-mono">
                Select Year for {activeSegment === 'start' ? 'Start' : 'End'} Date
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                {yearsList.map((y) => {
                  const isSelected = activeDate.getFullYear() === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => handleYearSelect(y)}
                      className={`py-2 rounded-xl text-center font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#701A35] text-white shadow-xs'
                          : 'bg-[#FAF8F5] text-slate-700 hover:bg-[#F4EFE6] border border-[#EDE8DF]'
                      }`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-View: Months Grid */}
          {subView === 'months' && (
            <div className="space-y-2">
              <div className="text-center font-bold text-xs text-slate-700 font-serif">
                Select Month ({activeDate.getFullYear()})
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs font-sans">
                {MONTH_NAMES.map((m, idx) => {
                  const isSelected = activeDate.getMonth() === idx;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleMonthSelect(idx)}
                      className={`py-2 rounded-xl text-center font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#701A35] text-white shadow-xs'
                          : 'bg-[#FAF8F5] text-slate-700 hover:bg-[#F4EFE6] border border-[#EDE8DF]'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-View: Days Calendar Grid */}
          {subView === 'days' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-800 font-serif">
                <span>
                  {MONTH_NAMES[activeDate.getMonth()]} {activeDate.getFullYear()} ({activeSegment === 'start' ? 'Start' : 'End'})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(activeDate);
                      d.setMonth(d.getMonth() - 1);
                      if (activeSegment === 'start') setTempStart(d);
                      else setTempEnd(d);
                    }}
                    className="p-1 rounded hover:bg-[#FAF8F5] text-slate-600 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(activeDate);
                      d.setMonth(d.getMonth() + 1);
                      if (activeSegment === 'start') setTempStart(d);
                      else setTempEnd(d);
                    }}
                    className="p-1 rounded hover:bg-[#FAF8F5] text-slate-600 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Day numbers grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-mono">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <span key={d} className="text-[10px] text-slate-400 font-bold py-1">
                    {d}
                  </span>
                ))}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <span key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isSelected = activeDate.getDate() === dayNum;
                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => handleDaySelect(dayNum)}
                      className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#701A35] text-white shadow-2xs'
                          : 'text-slate-700 hover:bg-[#FAF8F5]'
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[#EDE8DF] pt-3" />

          {/* Quick Preset Buttons Styled with Maroon Theme */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => {
              const isSelected = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetClick(p.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#701A35] text-white font-bold shadow-xs border border-[#701A35]'
                      : 'bg-[#FAF8F5] text-slate-700 hover:bg-[#F4EFE6] border border-[#E6E1D6]'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-200" />}
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
