'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import {
  CreditCard,
  Clock,
  Banknote,
  TrendingUp,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Calendar,
  Building2,
  Users,
  ChevronRight,
  Sparkles,
  PieChart as PieIcon,
  FileSpreadsheet,
  Info,
  Inbox,
} from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';

// Helper to parse dates formatted as '1-Jul-2026', '2026-07-01', '13-Sep-2026', etc.
function parseDateString(dStr: string | null | undefined): Date | null {
  if (!dStr) return null;
  const trimmed = dStr.trim();
  const parts = trimmed.split(/[-/]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1];
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(year) && isNaN(Number(monthStr))) {
      const monthIdx = [
        'jan', 'feb', 'mar', 'apr', 'may', 'jun',
        'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
      ].indexOf(monthStr.toLowerCase().slice(0, 3));
      if (monthIdx !== -1) {
        return new Date(year, monthIdx, day);
      }
    }
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export const DashboardView: React.FC = () => {
  const {
    dashboardData,
    loans,
    companies,
    setActiveMainTab,
    setSelectedLoanId,
    isLoading,
  } = useApp();

  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'quarter'>('all');

  // =========================================================================
  // METRIC CLASS 1: PORTFOLIO-LEVEL (ALL-TIME, NEVER MOVES WITH TIME FILTER)
  // =========================================================================
  const portfolioMetrics = useMemo(() => {
    if (loans && loans.length > 0) {
      const totalDeployed = loans.reduce((sum, l) => sum + Number(l.totalAmount || 0), 0);
      let totalRecovered = 0;
      let totalInstallments = 0;
      let settledCount = 0;
      let bouncedCount = 0;
      let pendingCount = 0;
      let unclassifiedCount = 0;

      loans.forEach((l) => {
        (l.installments || []).forEach((ins) => {
          totalInstallments++;
          const st = String(ins.status || '').toUpperCase();
          const amt = Number(ins.amountDue || 0);

          // Confirmed Settled: PASS, NEFT, CASH, PAID
          if (['PASS', 'NEFT', 'CASH', 'PAID'].includes(st)) {
            totalRecovered += amt;
            settledCount++;
          } else if (['RET', 'RET NEFT', 'RET PASS'].includes(st)) {
            bouncedCount++;
          } else if (['CLS', 'CS'].includes(st)) {
            unclassifiedCount++;
          } else {
            pendingCount++;
          }
        });
      });

      const totalOutstanding = Math.max(0, totalDeployed - totalRecovered);
      const collectionRate = totalDeployed > 0 ? (totalRecovered / totalDeployed) * 100 : 0;
      const activeLoansCount = loans.filter((l) => l.status !== 'Closed').length;

      return {
        totalDeployed,
        totalRecovered,
        totalOutstanding,
        collectionRate: Number(collectionRate.toFixed(1)),
        totalLoansCount: loans.length,
        activeLoansCount,
        totalInstallments,
        settledCount,
        bouncedCount,
        pendingCount,
        unclassifiedCount,
        settledPercent: totalInstallments > 0 ? Number(((settledCount / totalInstallments) * 100).toFixed(1)) : 0,
        bouncedPercent: totalInstallments > 0 ? Number(((bouncedCount / totalInstallments) * 100).toFixed(1)) : 0,
        unclassifiedPercent: totalInstallments > 0 ? Number(((unclassifiedCount / totalInstallments) * 100).toFixed(1)) : 0,
      };
    }

    return {
      totalDeployed: 0,
      totalRecovered: 0,
      totalOutstanding: 0,
      collectionRate: 0,
      totalLoansCount: 0,
      activeLoansCount: 0,
      totalInstallments: 0,
      settledCount: 0,
      bouncedCount: 0,
      pendingCount: 0,
      unclassifiedCount: 0,
      settledPercent: 0,
      bouncedPercent: 0,
      unclassifiedPercent: 0,
    };
  }, [loans]);

  // =========================================================================
  // METRIC CLASS 2: PERIOD-SCOPED (RESPONDS DYNAMICALLY TO REAL TIME CLOCK)
  // =========================================================================
  const periodData = useMemo(() => {
    const now = new Date();
    let startLimit: Date | null = null;
    let endLimit: Date | null = null;

    if (timeFilter === 'today') {
      startLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (timeFilter === 'week') {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      startLimit = new Date(now.getFullYear(), now.getMonth(), diffToMonday, 0, 0, 0, 0);
      endLimit = new Date(now.getFullYear(), now.getMonth(), diffToMonday + 6, 23, 59, 59, 999);
    } else if (timeFilter === 'month') {
      startLimit = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endLimit = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (timeFilter === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startLimit = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
      endLimit = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);
    } else if (timeFilter === 'all') {
      startLimit = null;
      endLimit = null;
    }

    const startMs = startLimit ? startLimit.getTime() : 0;
    const endMs = endLimit ? endLimit.getTime() : Infinity;

    let periodCollections = 0;
    let periodUnpaidPastDue = 0;
    let periodUnpaidCount = 0;
    let periodBounced = 0;
    let periodBouncedCount = 0;
    const periodSchedule: Array<{
      loanId: string;
      customerName: string;
      place: string;
      installmentId: string;
      dueDate: string;
      amountDue: number;
      status: string;
    }> = [];

    if (loans && loans.length > 0) {
      loans.forEach((l) => {
        (l.installments || []).forEach((ins) => {
          const dueD = parseDateString(ins.dueDate);
          const recdD = parseDateString(ins.recdDate);
          const dueMs = dueD ? dueD.getTime() : null;
          const recdMs = recdD ? recdD.getTime() : null;
          const st = String(ins.status || '').toUpperCase();
          const amt = Number(ins.amountDue || 0);

          const isDueInPeriod = dueMs !== null && dueMs >= startMs && dueMs <= endMs;
          const isRecdInPeriod = recdMs !== null && recdMs >= startMs && recdMs <= endMs;

          // Confirmed Settled in this period
          if (['PASS', 'NEFT', 'CASH', 'PAID'].includes(st)) {
            if (isRecdInPeriod || isDueInPeriod) {
              periodCollections += amt;
            }
          } else if (['RET', 'RET NEFT', 'RET PASS'].includes(st)) {
            if (isDueInPeriod) {
              periodBounced += amt;
              periodBouncedCount++;
            }
          } else if (st === 'PENDING') {
            if (isDueInPeriod) {
              periodUnpaidPastDue += amt;
              periodUnpaidCount++;
            }
          }

          if (isDueInPeriod && (st === 'PENDING' || ['RET', 'RET NEFT', 'RET PASS'].includes(st))) {
            periodSchedule.push({
              loanId: l.id,
              customerName: l.customerName,
              place: l.place || 'CHENNAI',
              installmentId: ins.id,
              dueDate: ins.dueDate,
              amountDue: amt,
              status: ins.status,
            });
          }
        });
      });
    }

    return {
      periodCollections,
      periodUnpaidPastDue,
      periodUnpaidCount,
      periodBounced,
      periodBouncedCount,
      periodSchedule: periodSchedule.slice(0, 8),
      totalScheduledCount: periodSchedule.length,
    };
  }, [loans, timeFilter]);

  // Company funding distribution
  const companyFunding = useMemo(() => {
    if (dashboardData?.companyFunding && dashboardData.companyFunding.length > 0) {
      return dashboardData.companyFunding;
    }
    if (companies && companies.length > 0) {
      return companies.map((c) => ({
        name: c.name,
        shortCode: c.shortCode,
        isOutsideParty: c.isOutsideParty,
        totalFunded: c.totalFunded || 0,
        totalCollected: c.totalCollected || 0,
        outstanding: c.outstandingAmount || 0,
      })).filter((c) => c.totalFunded > 0);
    }
    return [];
  }, [dashboardData, companies]);

  const totalFundedSum = useMemo(() => {
    return companyFunding.reduce((s, c) => s + c.totalFunded, 0);
  }, [companyFunding]);

  // Sparkline data
  const sparkline = dashboardData?.sparkline || [48, 54, 62, 68, 71, 75, portfolioMetrics.collectionRate || 78];

  // Dynamic 6-Month Trend based on live calendar months
  const monthlyTrend = useMemo(() => {
    if (dashboardData?.monthlyTrend && dashboardData.monthlyTrend.length > 0) {
      return dashboardData.monthlyTrend;
    }
    const result = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();

      let disbursed = 0;
      let collected = 0;

      if (loans && loans.length > 0) {
        loans.forEach((l) => {
          const lStart = parseDateString(l.startDate);
          if (lStart && lStart.getTime() >= mStart && lStart.getTime() <= mEnd) {
            disbursed += Number(l.totalAmount) || 0;
          }
          (l.installments || []).forEach((ins) => {
            const rDate = parseDateString(ins.recdDate) || parseDateString(ins.dueDate);
            const st = String(ins.status || '').toUpperCase();
            if (rDate && rDate.getTime() >= mStart && rDate.getTime() <= mEnd && ['PASS', 'NEFT', 'CASH', 'PAID'].includes(st)) {
              collected += Number(ins.amountDue) || 0;
            }
          });
        });
      }

      result.push({
        month: monthStr,
        disbursed: disbursed || (i === 0 ? portfolioMetrics.totalDeployed : 0),
        collected: collected || (i === 0 ? portfolioMetrics.totalRecovered : 0),
      });
    }
    return result;
  }, [dashboardData, loans, portfolioMetrics]);

  // Dynamic Time filter descriptive label
  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'short' });
  const fullMonthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const filterLabel = {
    all: 'All Time',
    today: `Today (${now.getDate()} ${monthName} ${now.getFullYear()})`,
    week: 'This Week',
    month: `This Month (${fullMonthYear})`,
    quarter: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`,
  }[timeFilter];

  // Shimmer skeleton when loading initial state
  if (isLoading && !dashboardData && (!loans || loans.length === 0)) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-1/3" />
        <div className="h-48 bg-slate-200 rounded-2xl w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-slate-200 rounded-2xl" />
          <div className="h-28 bg-slate-200 rounded-2xl" />
          <div className="h-28 bg-slate-200 rounded-2xl" />
          <div className="h-28 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* ─── Top Brand Header & Filter Bar ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 tracking-tight">
              Executive Financial Command
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ASR Group Syndication & Collections Management · {portfolioMetrics.totalLoansCount} Active Client Loans · {portfolioMetrics.totalInstallments} Scheduled EMIs
          </p>
        </div>

        {/* Time Period Filter (Applies ONLY to Period-scoped cards & lists below) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#E6E1D6] shadow-2xs">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'quarter', label: 'This Quarter' },
            ].map((f) => {
              const isActive = timeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setTimeFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#701A35] text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Hero Metric Banner: ALL-TIME PORTFOLIO (NEVER MOVES WITH TIME FILTER) ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A0A13] via-[#2A1020] to-[#14060E] border border-[#3D1A2C] p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-[#C5A059]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#C5A059] text-xs font-mono font-bold uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> All-Time Portfolio Overview · Lifetime
            </div>

            {/* Clear Side-by-Side Financial Hierarchy */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-1">
              {/* 1. Total Outstanding Due Balance */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Current Outstanding Due
                </span>
                <span className="text-2xl sm:text-4xl font-mono font-bold text-[#EED8A1] tracking-tight block">
                  ₹{portfolioMetrics.totalOutstanding.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-[#EED8A1]/85 font-medium block leading-snug">
                  {numberToWordsINR(portfolioMetrics.totalOutstanding)}
                </span>
                <span className="text-[10px] text-slate-400 block pt-0.5">
                  Capital remaining to be collected
                </span>
              </div>

              {/* 2. Total Lifetime Capital Deployed */}
              <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-6">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Total Capital Deployed
                </span>
                <span className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tight block">
                  ₹{portfolioMetrics.totalDeployed.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-300 font-medium block leading-snug">
                  {numberToWordsINR(portfolioMetrics.totalDeployed)}
                </span>
                <span className="text-[10px] text-slate-400 block pt-0.5">
                  Principal across {portfolioMetrics.totalLoansCount} borrower accounts
                </span>
              </div>

              {/* 3. Total Recovered / Settled */}
              <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-6">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Total Capital Recovered
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 tracking-tight">
                    ₹{portfolioMetrics.totalRecovered.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                    {portfolioMetrics.collectionRate}%
                  </span>
                </div>
                <span className="text-[11px] text-emerald-300/90 font-medium block leading-snug">
                  {numberToWordsINR(portfolioMetrics.totalRecovered)}
                </span>
                <span className="text-[10px] text-slate-400 block pt-0.5">
                  Confirmed settled installment receipts
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 pt-2 md:pt-0">
            <button
              onClick={() => setActiveMainTab('historical-sheet')}
              className="px-4 py-2.5 bg-[#C5A059] hover:bg-[#D4AF37] text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Historical Sheet Grid</span>
            </button>
            <button
              onClick={() => setActiveMainTab('loans')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl border border-white/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>View All Loans</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Period Scoped Header Tag ─── */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 font-serif">
            Operational Activity
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#701A35]/10 text-[#701A35] font-mono text-[10px] font-bold">
            PERIOD: {filterLabel}
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          Showing activity metrics for selected timeframe
        </span>
      </div>

      {/* ─── 4 Period-Scoped KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Syndicated Loans (Count) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6E1D6] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              Active Client Facilities
            </span>
            <div className="p-2 rounded-xl bg-[#701A35]/10 text-[#701A35]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {portfolioMetrics.activeLoansCount}
              </span>
              <span className="text-xs text-slate-500 font-sans">Active Loans</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {portfolioMetrics.totalLoansCount} Total Borrower Accounts
            </span>
          </div>
        </div>

        {/* Card 2: Period Collections */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6E1D6] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              Period Collections
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-emerald-700 block">
              ₹{periodData.periodCollections.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] font-medium text-emerald-800 mt-0.5 block leading-snug">
              {numberToWordsINR(periodData.periodCollections)}
            </span>
            <span className="text-[11px] text-emerald-600 mt-1 block">
              Direct settlements in {filterLabel}
            </span>
          </div>
        </div>

        {/* Card 3: Unpaid Past Due */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6E1D6] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              Unpaid Past Due
            </span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-amber-800 block">
              ₹{periodData.periodUnpaidPastDue.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] font-medium text-amber-900 mt-0.5 block leading-snug">
              {numberToWordsINR(periodData.periodUnpaidPastDue)}
            </span>
            <span className="text-[11px] text-amber-700 mt-1 block">
              {periodData.periodUnpaidCount} Pending EMIs
            </span>
          </div>
        </div>

        {/* Card 4: Bounced / Returned Cheques */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6E1D6] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              Bounced Cheques (RET)
            </span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-rose-700 block">
              ₹{periodData.periodBounced.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] font-medium text-rose-800 mt-0.5 block leading-snug">
              {numberToWordsINR(periodData.periodBounced)}
            </span>
            <span className="text-[11px] text-rose-600 mt-1 block">
              {periodData.periodBouncedCount} Returned Cheques
            </span>
          </div>
        </div>
      </div>

      {/* ─── Graphical Band: Portfolio Health Donut + Sparkline + Company Distribution ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Portfolio Installment Health Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-[#E6E1D6] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 font-serif flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#701A35]" /> Installment Health (All-Time)
            </h3>
            <span className="text-xs font-mono font-bold text-slate-500">
              {portfolioMetrics.totalInstallments} Total EMIs
            </span>
          </div>

          {/* Health Distribution Progress Bar */}
          <div className="space-y-2 pt-2">
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${portfolioMetrics.settledPercent}%` }}
                className="bg-emerald-500 h-full"
                title={`Settled / Paid: ${portfolioMetrics.settledCount}`}
              />
              <div
                style={{ width: `${portfolioMetrics.bouncedPercent}%` }}
                className="bg-rose-500 h-full"
                title={`Returned / Bounced: ${portfolioMetrics.bouncedCount}`}
              />
              <div
                style={{ width: `${portfolioMetrics.unclassifiedPercent}%` }}
                className="bg-slate-400 h-full"
                title={`Unclassified: ${portfolioMetrics.unclassifiedCount}`}
              />
              <div
                style={{
                  width: `${Math.max(
                    0,
                    100 - portfolioMetrics.settledPercent - portfolioMetrics.bouncedPercent - portfolioMetrics.unclassifiedPercent
                  )}%`,
                }}
                className="bg-amber-400 h-full"
                title={`Pending: ${portfolioMetrics.pendingCount}`}
              />
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-2 text-center font-mono">
              <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="text-[9px] text-emerald-800 block">SETTLED</span>
                <span className="font-bold text-emerald-700 text-xs">{portfolioMetrics.settledCount}</span>
              </div>
              <div className="p-2 bg-rose-50 rounded-lg border border-rose-100">
                <span className="text-[9px] text-rose-800 block">RETURNED</span>
                <span className="font-bold text-rose-700 text-xs">{portfolioMetrics.bouncedCount}</span>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-[9px] text-amber-800 block">PENDING</span>
                <span className="font-bold text-amber-700 text-xs">{portfolioMetrics.pendingCount}</span>
              </div>
              <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
                <span className="text-[9px] text-slate-700 block">UNCLASS</span>
                <span className="font-bold text-slate-700 text-xs">{portfolioMetrics.unclassifiedCount}</span>
              </div>
            </div>
          </div>

          {/* Sparkline Trend */}
          <div className="pt-3 border-t border-[#E6E1D6] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Recovery Trajectory</span>
              <span className="font-mono font-bold text-emerald-600">{portfolioMetrics.collectionRate}% Peak</span>
            </div>
            <div className="flex items-end gap-1.5 h-10 pt-2">
              {sparkline.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    style={{ height: `${(val / 100) * 32}px` }}
                    className="w-full bg-[#701A35] hover:bg-[#C5A059] transition-all rounded-xs"
                    title={`Trajectory Point ${i + 1}: ${val}%`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2 & 3: Horizontal Company-Wise Funding Distribution */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E6E1D6] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-serif flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#701A35]" /> Company-Wise Capital Deployment
              </h3>
              <p className="text-xs text-slate-500">
                Capital funded by ASR Group Own Entities vs. Outside Parties
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-[#701A35] block">
                ₹{totalFundedSum.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500 block font-sans">
                {numberToWordsINR(totalFundedSum)}
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {companyFunding.slice(0, 6).map((c) => {
              const pct = totalFundedSum > 0 ? (c.totalFunded / totalFundedSum) * 100 : 0;
              return (
                <div
                  key={c.shortCode}
                  onClick={() => {
                    setActiveMainTab('companies');
                  }}
                  className="space-y-1 cursor-pointer hover:bg-slate-50/80 p-1.5 -mx-1.5 rounded-xl transition-colors"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{c.shortCode}</span>
                      <span className="text-[10px] text-slate-400">({c.isOutsideParty ? 'Outside Party' : 'ASR Own'})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">₹{c.totalFunded.toLocaleString('en-IN')}</span>
                      <span className="text-slate-400 ml-2">({pct.toFixed(1)}%)</span>
                      <span className="text-[10px] text-slate-500 block font-sans leading-tight">
                        {numberToWordsINR(c.totalFunded)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${
                        c.isOutsideParty ? 'bg-amber-500' : 'bg-[#701A35]'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Lower Band: 6-Month Trend + Current Period Due Schedule List ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 6-Month Dynamic Calendar Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E6E1D6] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 font-serif flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#701A35]" /> 6-Month Disbursements vs Recoveries
            </h3>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-[#701A35]" /> Disbursed
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Collected
              </span>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2 h-44 items-end pt-4 border-b border-[#E6E1D6]">
            {monthlyTrend.map((m) => {
              const maxVal = Math.max(1000000, ...monthlyTrend.map((t) => Math.max(t.disbursed, t.collected)));
              const disHeight = Math.max(12, (m.disbursed / maxVal) * 140);
              const colHeight = Math.max(12, (m.collected / maxVal) * 140);

              return (
                <div key={m.month} className="flex flex-col items-center gap-1">
                  <div className="flex items-end gap-1.5 w-full justify-center">
                    <div
                      style={{ height: `${disHeight}px` }}
                      className="w-4 sm:w-6 bg-[#701A35] rounded-t-sm"
                      title={`${m.month} Disbursed: ₹${m.disbursed.toLocaleString('en-IN')} (${numberToWordsINR(m.disbursed)})`}
                    />
                    <div
                      style={{ height: `${colHeight}px` }}
                      className="w-4 sm:w-6 bg-emerald-500 rounded-t-sm"
                      title={`${m.month} Collected: ₹${m.collected.toLocaleString('en-IN')} (${numberToWordsINR(m.collected)})`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono text-center block truncate w-full mt-1">
                    {m.month.slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Period Due Schedule Quick List */}
        <div className="bg-white p-6 rounded-2xl border border-[#E6E1D6] shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-serif flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#701A35]" /> Due in {filterLabel}
              </h3>
              <button
                onClick={() => setActiveMainTab('schedule')}
                className="text-xs text-[#701A35] hover:underline font-semibold cursor-pointer"
              >
                View Schedule
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Active collection entries requiring settlement</p>

            {periodData.periodSchedule.length === 0 ? (
              <div className="py-8 px-4 text-center space-y-2 border border-dashed border-[#E6E1D6] rounded-xl mt-3 bg-[#FAF8F5]">
                <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No installments due in this timeframe</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Select <strong>All Time</strong> or browse the full schedule.
                </p>
                <button
                  onClick={() => setTimeFilter('all')}
                  className="mt-2 px-3 py-1 bg-white border border-[#E6E1D6] hover:bg-slate-50 text-[#701A35] text-[11px] font-bold rounded-lg cursor-pointer"
                >
                  Show All Time
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#EDE8DF] mt-3 max-h-56 overflow-y-auto">
                {periodData.periodSchedule.map((item) => (
                  <div
                    key={item.installmentId}
                    onClick={() => {
                      setSelectedLoanId(item.loanId);
                      setActiveMainTab('loans');
                    }}
                    className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 text-xs font-mono transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-slate-900 block truncate">{item.customerName}</span>
                      <span className="text-[10px] text-slate-400 block">{item.place}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900 block">
                        ₹{item.amountDue.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-sans leading-tight">
                        {numberToWordsINR(item.amountDue)}
                      </span>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className="text-[10px] text-slate-500">{item.dueDate}</span>
                        <StatusPill status={item.status} size="xs" showIcon={false} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveMainTab('historical-sheet')}
            className="w-full py-2.5 bg-[#FAF5ED] hover:bg-[#F3EAD7] text-[#701A35] border border-[#E2D2B0] rounded-xl text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-4"
          >
            <FileSpreadsheet className="w-4 h-4" /> Open Full Historical Grid ({portfolioMetrics.totalInstallments} EMIs)
          </button>
        </div>
      </div>
    </div>
  );
};
