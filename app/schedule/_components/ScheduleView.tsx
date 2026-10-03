'use client';

import React, { useState, useMemo, useRef, useEffect, useDeferredValue } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { Loan } from '@/lib/types';
import {
  CalendarDays,
  Calendar,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Eye,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { DateRangePicker, DateRangeValue, getCurrentMonthRange } from '@/components/ui/DateRangePicker';
import { exportLoansToExcel, exportLoansToPDF } from '@/lib/utils/exportLoansLedger';
import { getDerivedLoanStatus } from '@/app/loans/_components/LoansListView';

function parseToDate(dStr: string | null | undefined): Date | null {
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

export const ScheduleView: React.FC = () => {
  const router = useRouter();
  const {
    loans,
    setSelectedLoanId,
    setActiveMainTab,
    updateLoanInstallment,
    showToast,
    isLoading,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Cleared' | 'NEFT' | 'RTGS' | 'Cash'>('ALL');
  
  // Date Range Filter - default to all or current month
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: null,
    endDate: null,
    presetLabel: 'all',
  });

  // Export dropdown state
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Accordion state - all collapsed by default
  const [expandedLoanIds, setExpandedLoanIds] = useState<Set<string>>(new Set());

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle loan expand/collapse
  const toggleExpandLoan = (id: string) => {
    setExpandedLoanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const deferredDateRange = useDeferredValue(dateRange);

  const dateTimestamps = useMemo(() => {
    const startTimestamp = deferredDateRange.startDate ? new Date(deferredDateRange.startDate).setHours(0, 0, 0, 0) : null;
    const endTimestamp = deferredDateRange.endDate ? new Date(deferredDateRange.endDate).setHours(23, 59, 59, 999) : null;
    return { startTimestamp, endTimestamp };
  }, [deferredDateRange]);

  const formattedDateRangeLabel = useMemo(() => {
    if (!dateRange.startDate && !dateRange.endDate) return 'All Dates';
    return `${dateRange.startDate || 'Start'} to ${dateRange.endDate || 'End'}`;
  }, [dateRange]);

  // Filter loans
  const filteredLoans = useMemo(() => {
    const { startTimestamp, endTimestamp } = dateTimestamps;
    const hasDateFilter = startTimestamp !== null && endTimestamp !== null;

    return loans.filter((loan) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL') {
        const normLoan = String(loan.status || '').trim().toUpperCase();
        const normFilter = statusFilter.toUpperCase();
        if (normFilter === 'CLEARED') {
          const isCleared = ['CLEARED', 'CLOSED', 'PAID', 'PASS', 'SETTLED'].includes(normLoan) || (loan.totalCollected || 0) >= loan.totalAmount;
          if (!isCleared) return false;
        } else if (normFilter === 'PENDING') {
          const isPending = ['PENDING', 'ACTIVE', 'ON TRACK', 'DRAFT'].includes(normLoan);
          if (!isPending) return false;
        } else {
          if (normLoan !== normFilter) return false;
        }
      }

      // 2. Date Range Filter
      if (hasDateFilter) {
        const hasInstInRange = (loan.installments || []).some((inst) => {
          const dueD = parseToDate(inst.dueDate);
          const recdD = parseToDate(inst.recdDate);
          const dueMs = dueD ? dueD.getTime() : null;
          const recdMs = recdD ? recdD.getTime() : null;
          return (
            (dueMs !== null && dueMs >= startTimestamp && dueMs <= endTimestamp) ||
            (recdMs !== null && recdMs >= startTimestamp && recdMs <= endTimestamp)
          );
        });
        const startD = parseToDate(loan.startDate);
        const startMs = startD ? startD.getTime() : null;
        const loanStartInRange = startMs !== null && startMs >= startTimestamp && startMs <= endTimestamp;
        if (!hasInstInRange && !loanStartInRange) return false;
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = loan.id.toLowerCase().includes(q);
        const matchCust = (loan.customerName || '').toLowerCase().includes(q);
        const matchCode = (loan.codeNo || '').toLowerCase().includes(q);
        const matchPlace = (loan.place || '').toLowerCase().includes(q);
        if (!matchId && !matchCust && !matchCode && !matchPlace) return false;
      }

      return true;
    });
  }, [loans, statusFilter, dateTimestamps, searchQuery]);

  // Overall KPI statistics
  const kpiStats = useMemo(() => {
    let totalCapital = 0;
    let totalCycles = 0;
    let paidCycles = 0;
    let pendingCycles = 0;

    filteredLoans.forEach((l) => {
      totalCapital += l.totalAmount || 0;
      (l.installments || []).forEach((inst) => {
        totalCycles += 1;
        const isPaid = ['CLEARED', 'NEFT', 'RTGS', 'CASH', 'PASS', 'CLS', 'PAID', 'CLOSED', 'SETTLED', 'Paid'].includes(inst.status?.trim().toUpperCase());
        if (isPaid) {
          paidCycles += 1;
        } else {
          pendingCycles += 1;
        }
      });
    });

    return {
      totalCapital,
      totalCycles,
      paidCycles,
      pendingCycles,
    };
  }, [filteredLoans]);

  if (isLoading && (!loans || loans.length === 0)) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-slate-200 rounded-2xl w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-slate-200 rounded-2xl" />
          <div className="h-28 bg-slate-200 rounded-2xl" />
          <div className="h-28 bg-slate-200 rounded-2xl" />
          <div className="h-28 bg-slate-200 rounded-2xl" />
        </div>
        <div className="h-14 bg-slate-200 rounded-2xl w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#701A35] text-[#EED8A1] shadow-sm flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-950 font-serif">
                Collections & Installment Schedules
              </h1>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Track EMI schedules, payment records, and collection status across active loan portfolios
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Export schedules"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Export</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 z-40 motion-popover">
                <button
                  onClick={async () => {
                    await exportLoansToExcel(filteredLoans, formattedDateRangeLabel);
                    showToast('Excel Exported', 'Schedule spreadsheet downloaded successfully.', 'success');
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors cursor-pointer group text-left btn-press"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Export to Excel (.xlsx)</span>
                </button>

                <button
                  onClick={() => {
                    exportLoansToPDF(filteredLoans, formattedDateRangeLabel);
                    showToast('PDF Exported', 'Schedule PDF report downloaded successfully.', 'success');
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-[#FAF5ED] hover:text-[#701A35] transition-colors cursor-pointer group text-left btn-press"
                >
                  <FileText className="w-4 h-4 text-[#701A35]" />
                  <span className="font-medium">Export to PDF</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setActiveMainTab('loans');
              router.push('/loans');
            }}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-[#C5A059] hover:from-amber-300 hover:to-amber-400 active:scale-98 rounded-xl transition-all shadow-sm flex items-center gap-1.5 self-start md:self-auto cursor-pointer shrink-0"
          >
            <CreditCard className="w-4 h-4 font-bold" />
            <span>New Loan</span>
          </button>
        </div>
      </div>

      {/* Top High-Impact KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 bg-gradient-to-br from-[#701A35]/12 via-[#FAF8F5] to-white rounded-xl border-2 border-[#701A35]/30 shadow-sm hover:border-[#701A35]/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#701A35]">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
              Total Portfolio
            </span>
            <div className="p-1 rounded-lg bg-[#701A35]/10 text-[#701A35]">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <MoneyDisplay
              amount={kpiStats.totalCapital}
              size="lg"
              amountClassName="font-black text-xl text-slate-950 block tracking-tight"
            />
          </div>
          <span className="text-[10px] text-slate-600 font-medium mt-0.5 block">
            Across {filteredLoans.length} borrower facilities
          </span>
        </div>

        <div className="p-3 bg-gradient-to-br from-amber-100/90 via-amber-50 to-white rounded-xl border-2 border-amber-300 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
              Total EMIs
            </span>
            <div className="p-1 rounded-lg bg-amber-100 text-amber-800">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-black text-amber-800 font-mono block tracking-tight">
              {kpiStats.totalCycles}
            </span>
          </div>
          <span className="text-[10px] text-amber-800 font-bold mt-0.5 block">
            Scheduled installments
          </span>
        </div>

        <div className="p-3 bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white rounded-xl border-2 border-emerald-300 shadow-sm hover:border-emerald-400 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-900">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
              Settled Collections
            </span>
            <div className="p-1 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-black text-emerald-700 font-mono block tracking-tight">
              {kpiStats.paidCycles}
              <span className="text-xs text-slate-500 font-normal ml-1.5">
                / {kpiStats.totalCycles}
              </span>
            </span>
          </div>
          <span className="text-[10px] text-emerald-800 font-bold mt-0.5 block">
            {kpiStats.totalCycles > 0
              ? `${Math.round((kpiStats.paidCycles / kpiStats.totalCycles) * 100)}% recovery rate`
              : '0%'}
          </span>
        </div>

        <div className="p-3 bg-gradient-to-br from-rose-100/90 via-rose-50 to-white rounded-xl border-2 border-rose-300 shadow-sm hover:border-rose-400 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-900">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
              Pending Collections
            </span>
            <div className="p-1 rounded-lg bg-rose-100 text-rose-700">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-black text-rose-700 font-mono block tracking-tight">
              {kpiStats.pendingCycles}
            </span>
          </div>
          <span className="text-[10px] text-rose-700 font-bold mt-0.5 block">
            {kpiStats.pendingCycles} Pending Due EMIs
          </span>
        </div>
      </div>

      {/* Main Schedule Loan Accordion List */}
      <div className="space-y-4">
        {/* Controls: Search, Custom Date Range Picker & Status Filters */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-end justify-between gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-1 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1 block">
                Search Schedules
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by borrower, code, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-[#701A35] transition-all"
                />
              </div>
            </div>

            {/* Custom Date Range Picker Component */}
            <div className="min-w-[240px]">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                label="Date Range Filter"
              />
            </div>
          </div>

          {/* Status Tabs (Pending, Cleared, NEFT, RTGS, Cash) */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 flex-wrap">
            {(['ALL', 'Pending', 'Cleared', 'NEFT', 'RTGS', 'Cash'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-[#701A35] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {filter === 'ALL' ? 'All Schedules' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Accordion Cards */}
        {filteredLoans.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 font-serif">No schedule records found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No active repayment schedules match your current search or date filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLoans.map((loan) => {
              const isExpanded = expandedLoanIds.has(loan.id);
              const insts = loan.installments || [];
              const paidCount = insts.filter((i) => ['CLEARED', 'NEFT', 'RTGS', 'CASH', 'PASS', 'CLS', 'CS', 'PAID', 'CLOSED', 'SETTLED', 'Paid'].includes(i.status?.trim().toUpperCase())).length;
              const totalCycles = insts.length;
              const percentPaid = totalCycles > 0 ? Math.round((paidCount / totalCycles) * 100) : 0;
              const nextPending = insts.find((i) => ['PENDING', 'ACTIVE', 'DRAFT'].includes(i.status?.trim().toUpperCase()));

              const isLoanPaid =
                ['CLEARED', 'NEFT', 'RTGS', 'CASH', 'PASS', 'PAID', 'CLOSED', 'SETTLED'].includes(String(loan.status || '').trim().toUpperCase()) ||
                (loan.totalCollected || 0) >= loan.totalAmount;

              return (
                <div
                  key={loan.id}
                  className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${
                    isLoanPaid
                      ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-500/20 shadow-emerald-50'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Accordion Row Header */}
                  <div
                    onClick={() => toggleExpandLoan(loan.id)}
                    className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer transition-colors ${
                      isLoanPaid ? 'hover:bg-emerald-100/70' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-[#701A35]/10 text-[#701A35] shrink-0">
                        <ChevronRight
                          className={`w-4 h-4 font-bold transition-transform duration-120 ${
                            isExpanded ? 'rotate-90 text-[#701A35]' : 'text-slate-400'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm hover:text-[#701A35] font-serif">
                            {loan.customerName}
                          </h3>
                          {loan.codeNo && (
                            <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-600">
                              {loan.codeNo}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {loan.place || 'CHENNAI'}
                          </span>
                          <StatusPill status={getDerivedLoanStatus(loan)} />
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span className="truncate">
                            Companies: {(loan.splits || []).map((s) => (s.companyCode || s.companyName || '').replace(/^ASR\s*[-•]?\s*/i, '')).join(', ') || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-6 justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">
                          Total Amount
                        </span>
                        <MoneyDisplay
                          amount={loan.totalAmount}
                          size="sm"
                          amountClassName="font-bold text-sm text-slate-900 block"
                        />
                      </div>

                      <div className="min-w-[110px] text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">
                          Settled: {paidCount}/{totalCycles}
                        </span>
                        <div className="w-24 sm:w-28 h-2 bg-slate-200 rounded-full overflow-hidden ml-auto mt-1">
                          <div
                            style={{ width: `${percentPaid}%` }}
                            className="h-full bg-emerald-500 transition-all rounded-full"
                          />
                        </div>
                      </div>

                      {nextPending && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-mono block">
                            Next Due
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-xs font-bold inline-block mt-0.5">
                            {nextPending.dueDate}
                          </span>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLoanId(loan.id);
                          setActiveMainTab('loans');
                          router.push(`/loans/${loan.id}`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:text-[#701A35] hover:border-[#701A35] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs btn-press"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Details</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Section with Smooth Grid Accordion */}
                  <div className={`grid-accordion ${isExpanded ? 'open' : ''}`}>
                    <div>
                      <div className="p-4 sm:p-5 bg-white space-y-3">
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                              <thead className="bg-slate-100 border-b-2 border-slate-200 text-[11px] font-mono text-slate-700 font-bold uppercase tracking-wider">
                                <tr>
                                  <th className="p-2.5 border-r border-slate-200 w-12 text-center">EMI #</th>
                                  <th className="p-2.5 border-r border-slate-200 w-28">Due Date</th>
                                  <th className="p-2.5 border-r border-slate-200 text-right font-mono">Amount (₹)</th>
                                  <th className="p-2.5 border-r border-slate-200 text-center w-24">Status</th>
                                  <th className="p-2.5 border-r border-slate-200 w-28">Recd Date</th>
                                  <th className="p-2.5 border-r border-slate-200 w-24">Dep / Mode</th>
                                  <th className="p-2.5 border-r border-slate-200">Remarks</th>
                                  <th className="p-2.5 text-right w-28">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono">
                                {insts.map((row) => {
                                  const isPaid = ['CLEARED', 'NEFT', 'RTGS', 'CASH', 'PASS', 'CLS', 'CS', 'PAID', 'CLOSED', 'SETTLED', 'Paid'].includes(row.status?.trim().toUpperCase());
                                  return (
                                    <tr
                                      key={row.id || row.seqNo}
                                      className={`transition-colors ${
                                        isPaid ? 'bg-emerald-50/70 hover:bg-emerald-100/70' : 'hover:bg-[#FAF5ED]/50'
                                      }`}
                                    >
                                      <td className="p-2.5 border-r border-slate-200 text-center text-slate-500 font-bold">
                                        #{row.seqNo}
                                      </td>
                                      <td className="p-2.5 border-r border-slate-200 font-bold text-slate-800">
                                        {row.dueDate}
                                      </td>
                                      <td className={`p-2.5 border-r border-slate-200 text-right font-bold ${isPaid ? 'bg-emerald-50/70' : ''}`}>
                                        <MoneyDisplay
                                          amount={row.amountDue}
                                          size="sm"
                                          amountClassName={`block font-bold text-right ${isPaid ? 'text-emerald-800' : 'text-slate-900'}`}
                                        />
                                      </td>
                                      <td className="p-2.5 border-r border-slate-200 text-center">
                                        <StatusPill status={row.status} />
                                      </td>
                                      <td className="p-2.5 border-r border-slate-200 text-slate-600">
                                        {row.recdDate || '—'}
                                      </td>
                                      <td className="p-2.5 border-r border-slate-200 font-bold text-slate-700">
                                        {row.depName || row.chqNo || '—'}
                                      </td>
                                      <td className="p-2.5 border-r border-slate-200 text-slate-500 font-sans truncate max-w-[150px]">
                                        {row.remarks || '—'}
                                      </td>
                                      <td className="p-2.5 text-right">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const newStatus = isPaid ? 'Pending' : 'Cleared';
                                            const today = new Date().toISOString().split('T')[0];
                                            await updateLoanInstallment(row.id, {
                                              status: newStatus,
                                              recdDate: newStatus === 'Cleared' ? today : null,
                                            });
                                          }}
                                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer btn-press ${
                                            isPaid
                                              ? 'bg-slate-100 text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200'
                                              : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-2xs'
                                          }`}
                                        >
                                          {isPaid ? 'Undo' : 'Mark Cleared'}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
