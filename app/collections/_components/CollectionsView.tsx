'use client';

import React, { useMemo, useState } from 'react';
import {
  Banknote,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatINR } from '@/lib/utils/formatCurrency';
import { CollectionSheet } from './CollectionSheet';
import { IncomeRegister } from './IncomeRegister';
import { ExpenseRegister } from './ExpenseRegister';
import { LedgerSummary } from './LedgerSummary';
import type { Loan } from '@/lib/types';

/* ─── Shared helpers (exported for sub-components) ─── */
export const PAID_STATUSES = new Set(['PASS', 'NEFT', 'CASH', 'CLS', 'PAID']);
export const BOUNCE_STATUSES = new Set(['RET', 'RET NEFT', 'RET PASS', 'BOUNCE']);
export const isPaid = (s: string) => PAID_STATUSES.has(String(s || '').trim().toUpperCase());
export const isBounce = (s: string) => BOUNCE_STATUSES.has(String(s || '').trim().toUpperCase());
export const dateKey = (v: string) => String(v || '').slice(0, 10);

export type Period = 'all' | 'daily' | 'weekly' | 'monthly' | 'custom';
export interface DateRange { from: string; to: string; }
export interface CollectionStats {
  dueToday: number; dueThisWeek: number; dueThisMonth: number;
  collectedToday: number; collectedThisWeek: number; collectedThisMonth: number;
  pendingToday: number; pendingThisMonth: number;
  disbursedThisMonth: number; disbursedTotal: number;
  bounceTotal: number; bounceThisMonth: number;
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}
function monthStart(date: string): string { return `${date.slice(0, 7)}-01`; }
function monthEnd(dateStr: string): string {
  const d = new Date(`${monthStart(dateStr)}T00:00:00`);
  d.setMonth(d.getMonth() + 1); d.setDate(0);
  return d.toISOString().slice(0, 10);
}

export function buildStats(loans: Loan[]): CollectionStats {
  const today = new Date().toISOString().slice(0, 10);
  const wStart = weekStart(today); const wEnd = addDays(wStart, 6);
  const mStart = monthStart(today); const mEnd = monthEnd(today);
  let dueToday = 0, dueThisWeek = 0, dueThisMonth = 0;
  let collectedToday = 0, collectedThisWeek = 0, collectedThisMonth = 0;
  let bounceTotal = 0, bounceThisMonth = 0, disbursedThisMonth = 0, disbursedTotal = 0;
  for (const loan of loans) {
    const loanStart = dateKey(loan.startDate || '');
    const disbursed = Number(loan.disbursedAmount || 0) || Math.max(0, Number(loan.totalAmount || 0) - Number(loan.interestAmount || 0));
    disbursedTotal += disbursed;
    if (loanStart >= mStart && loanStart <= mEnd) disbursedThisMonth += disbursed;
    for (const inst of loan.installments || []) {
      const due = Number(inst.amountDue || 0);
      const dDate = dateKey(inst.dueDate || ''); const rDate = dateKey(inst.recdDate || '');
      if (dDate === today) dueToday += due;
      if (dDate >= wStart && dDate <= wEnd) dueThisWeek += due;
      if (dDate >= mStart && dDate <= mEnd) dueThisMonth += due;
      if (isPaid(inst.status)) {
        if (rDate === today) collectedToday += due;
        if (rDate >= wStart && rDate <= wEnd) collectedThisWeek += due;
        if (rDate >= mStart && rDate <= mEnd) collectedThisMonth += due;
      }
      if (isBounce(inst.status)) {
        bounceTotal += due;
        if (dDate >= mStart && dDate <= mEnd) bounceThisMonth += due;
      }
    }
  }
  return { dueToday, dueThisWeek, dueThisMonth, collectedToday, collectedThisWeek, collectedThisMonth, pendingToday: Math.max(0, dueToday - collectedToday), pendingThisMonth: Math.max(0, dueThisMonth - collectedThisMonth), disbursedThisMonth, disbursedTotal, bounceTotal, bounceThisMonth };
}

export function getDateRange(period: Period, anchor: string, custom?: { from: string; to: string }): DateRange {
  if (period === 'all') return { from: '', to: '' };  // no date restriction
  if (period === 'daily') return { from: anchor, to: anchor };
  if (period === 'weekly') return { from: weekStart(anchor), to: addDays(weekStart(anchor), 6) };
  if (period === 'monthly') return { from: monthStart(anchor), to: monthEnd(anchor) };
  return { from: custom?.from || anchor, to: custom?.to || anchor };
}

function fmtPeriodLabel(period: Period, dateRange: DateRange): string {
  if (period === 'all') return 'All Time';
  if (period === 'daily') {
    const d = new Date(`${dateRange.from}T00:00:00`);
    return isNaN(d.getTime()) ? dateRange.from : d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }
  if (period === 'monthly') {
    const d = new Date(`${dateRange.from}T00:00:00`);
    return isNaN(d.getTime()) ? dateRange.from : d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  const fmt = (v: string) => { const d = new Date(`${v}T00:00:00`); return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
  return `${fmt(dateRange.from)} – ${fmt(dateRange.to)}`;
}

type ViewTab = 'sheet' | 'income' | 'expense' | 'ledger';
const TABS: { id: ViewTab; label: string; shortLabel: string; icon: React.ReactNode; color: string }[] = [
  { id: 'sheet',   label: 'Collection Sheet', shortLabel: 'Sheet',   icon: <LayoutGrid className="h-3.5 w-3.5" />,   color: 'bg-[#701A35]' },
  { id: 'income',  label: 'Income (Cr)',       shortLabel: 'Income',  icon: <TrendingUp className="h-3.5 w-3.5" />,   color: 'bg-emerald-700' },
  { id: 'expense', label: 'Expense (Dr)',      shortLabel: 'Expense', icon: <TrendingDown className="h-3.5 w-3.5" />, color: 'bg-blue-700' },
  { id: 'ledger',  label: 'Ledger Summary',   shortLabel: 'Ledger',  icon: <BarChart3 className="h-3.5 w-3.5" />,    color: 'bg-violet-700' },
];

export const CollectionsView: React.FC = () => {
  const { loans } = useApp();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Default: 'all' — show every installment, no mandatory date filter
  const [period, setPeriod] = useState<Period>('all');
  const [anchor, setAnchor] = useState(today);
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [activeTab, setActiveTab] = useState<ViewTab>('sheet');

  const dateRange = useMemo(
    () => getDateRange(period, anchor, { from: customFrom, to: customTo }),
    [period, anchor, customFrom, customTo]
  );
  const periodLabel = useMemo(() => fmtPeriodLabel(period, dateRange), [period, dateRange]);
  const stats = useMemo(() => buildStats(loans), [loans]);
  const isCurrentMonth = anchor.slice(0, 7) === today.slice(0, 7) && period === 'monthly';
  const isToday = anchor === today && period === 'daily';
  const showNavArrows = period !== 'all' && period !== 'custom';

  const navigate = (dir: -1 | 1) => {
    if (period === 'daily') setAnchor(addDays(anchor, dir));
    else if (period === 'weekly') setAnchor(addDays(anchor, dir * 7));
    else if (period === 'monthly') {
      const d = new Date(`${anchor}T00:00:00`);
      d.setMonth(d.getMonth() + dir);
      setAnchor(d.toISOString().slice(0, 10));
    }
  };

  const activeTabMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-4 pb-10">
      {/* ── Compact Page Header ── */}
      <div className="rounded-2xl border border-[#E7DFD2] bg-white shadow-[0_4px_16px_rgba(58,34,22,0.05)]">
        {/* Title row */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEE8DE]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#701A35]">
              <Banknote className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-[#24131B]">Collections Ledger</h1>
              <p className="text-[11px] text-slate-500">{periodLabel}</p>
            </div>
          </div>

          {/* Period controls */}
          <div className="flex items-center gap-2">
            {/* Period type toggle */}
            <div className="flex rounded-xl border border-slate-200 bg-[#FCFBF9] p-0.5 text-[11px] font-bold">
              {(['all', 'daily', 'weekly', 'monthly', 'custom'] as Period[]).map((p) => (
                <button key={p} type="button" onClick={() => setPeriod(p)}
                  className={`rounded-lg px-3 py-1.5 capitalize transition ${period === p ? 'bg-[#701A35] text-white' : 'text-slate-500 hover:text-[#701A35]'}`}>
                  {p === 'all' ? 'All' : p}
                </button>
              ))}
            </div>
            {/* Navigation arrows — hidden for 'all' and 'custom' */}
            {showNavArrows && (
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-slate-200 bg-white p-1.5 hover:border-[#C5A059] transition">
                  <ChevronLeft className="h-4 w-4 text-slate-600" />
                </button>
                <button type="button" onClick={() => navigate(1)} className="rounded-lg border border-slate-200 bg-white p-1.5 hover:border-[#C5A059] transition">
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </button>
                {!isToday && !isCurrentMonth && (
                  <button type="button" onClick={() => setAnchor(today)}
                    className="rounded-lg border border-[#C5A059] bg-[#FBF8F3] px-2.5 py-1.5 text-[11px] font-bold text-[#701A35] hover:bg-[#F5EEE3] transition">
                    Today
                  </button>
                )}
              </div>
            )}
            {period === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-[#FCFBF9] px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-[#C5A059]" />
                <span className="text-slate-400 text-xs">–</span>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-[#FCFBF9] px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-[#C5A059]" />
              </div>
            )}
          </div>
        </div>

        {/* KPI strip - compact single row */}
        <div className="grid grid-cols-3 divide-x divide-[#EEE8DE] sm:grid-cols-6">
          {[
            { label: 'Due Today',      value: formatINR(stats.dueToday),           sub: 'installments',  tone: 'amber' },
            { label: 'Collected Today',value: formatINR(stats.collectedToday),     sub: 'received',      tone: 'green' },
            { label: 'Pending Today',  value: formatINR(stats.pendingToday),       sub: 'outstanding',   tone: 'red'   },
            { label: 'This Week',      value: formatINR(stats.collectedThisWeek),   sub: 'collected',     tone: 'blue'  },
            { label: 'This Month',     value: formatINR(stats.collectedThisMonth),  sub: 'collected',     tone: 'green' },
            { label: 'Bounce/RET',     value: formatINR(stats.bounceThisMonth),    sub: 'this month',    tone: 'red'   },
          ].map(({ label, value, sub, tone }) => {
            const vColors: Record<string, string> = { amber: 'text-amber-700', green: 'text-emerald-700', red: 'text-red-600', blue: 'text-blue-700' };
            return (
              <div key={label} className="px-4 py-3">
                <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</span>
                <strong className={`mt-0.5 block text-sm font-bold tabular-nums ${vColors[tone]}`}>{value}</strong>
                <span className="text-[9px] text-slate-400">{sub}</span>
              </div>
            );
          })}
        </div>

        {/* Tab nav */}
        <div className="flex border-t border-[#EEE8DE]">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-xs font-bold transition ${
                activeTab === tab.id
                  ? `border-[#701A35] text-[#701A35] bg-[#FBF4E9]`
                  : 'border-transparent text-slate-500 hover:text-[#701A35] hover:bg-[#FDFCFA]'
              }`}>
              <span className={`${activeTab === tab.id ? 'text-[#701A35]' : 'text-slate-400'}`}>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'sheet'   && <CollectionSheet dateRange={dateRange} period={period} periodLabel={periodLabel} />}
      {activeTab === 'income'  && <IncomeRegister dateRange={dateRange} period={period} periodLabel={periodLabel} />}
      {activeTab === 'expense' && <ExpenseRegister dateRange={dateRange} period={period} periodLabel={periodLabel} />}
      {activeTab === 'ledger'  && <LedgerSummary dateRange={dateRange} stats={stats} period={period} periodLabel={periodLabel} />}
    </div>
  );
};
