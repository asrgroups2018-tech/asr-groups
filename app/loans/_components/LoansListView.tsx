'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { Loan, Installment } from '@/lib/types';
import {
  CreditCard,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  Trash2,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Filter,
  Edit3,
  CalendarDays,
} from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { CompanySplitBadge } from '@/components/ui/CompanySplitBadge';
import { NewLoanModal } from '@/app/loans/_components/new-loan/NewLoanModal';
import { EditLoanExcelModal } from './EditLoanExcelModal';
import { DateRangePicker, DateRangeValue, getCurrentMonthRange } from '@/components/ui/DateRangePicker';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';

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

export const LoansListView: React.FC = () => {
  const {
    loans,
    setSelectedLoanId,
    deleteLoan,
    updateLoanInstallment,
    showToast,
  } = useApp();

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedEditLoan, setSelectedEditLoan] = useState<Loan | null>(null);
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Overdue' | 'Closed'>('ALL');
  
  // Date Range Filter (Defaults to All Dates so all loans are immediately visible)
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: null,
    endDate: null,
    presetLabel: undefined,
  });

  const [expandedLoanIds, setExpandedLoanIds] = useState<Set<string>>(() => {
    return new Set(loans.length > 0 ? [loans[0].id] : []);
  });

  const toggleExpand = (id: string) => {
    setExpandedLoanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedLoanIds(new Set(loans.map((l) => l.id)));
  };

  const handleCollapseAll = () => {
    setExpandedLoanIds(new Set());
  };

  // Filtered Loans with Client, Status, and Date Range
  const filteredLoans = useMemo(() => {
    const startTimestamp = dateRange.startDate ? new Date(dateRange.startDate).setHours(0, 0, 0, 0) : null;
    const endTimestamp = dateRange.endDate ? new Date(dateRange.endDate).setHours(23, 59, 59, 999) : null;

    return loans.filter((loan) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && loan.status !== statusFilter) return false;

      // 2. Client / Code / Place search query
      if (clientFilter.trim()) {
        const q = clientFilter.toLowerCase();
        const matchClient = loan.customerName.toLowerCase().includes(q);
        const matchCode = loan.codeNo?.toLowerCase().includes(q) || false;
        const matchId = loan.id.toLowerCase().includes(q);
        const matchPlace = loan.place?.toLowerCase().includes(q) || false;
        if (!matchClient && !matchCode && !matchId && !matchPlace) return false;
      }

      // 3. Date Range Filter
      if (startTimestamp !== null && endTimestamp !== null) {
        // Match loan start date
        const loanStartDate = parseToDate(loan.startDate);
        const loanStartMs = loanStartDate ? loanStartDate.getTime() : null;
        const matchesLoanStart = loanStartMs !== null && loanStartMs >= startTimestamp && loanStartMs <= endTimestamp;

        // Match any installment due date or recd date
        const matchesAnyInstallment = (loan.installments || []).some((inst) => {
          const dueD = parseToDate(inst.dueDate);
          const recdD = parseToDate(inst.recdDate);
          const dueMs = dueD ? dueD.getTime() : null;
          const recdMs = recdD ? recdD.getTime() : null;

          const isDueInRange = dueMs !== null && dueMs >= startTimestamp && dueMs <= endTimestamp;
          const isRecdInRange = recdMs !== null && recdMs >= startTimestamp && recdMs <= endTimestamp;
          return isDueInRange || isRecdInRange;
        });

        if (!matchesLoanStart && !matchesAnyInstallment) {
          return false;
        }
      }

      return true;
    });
  }, [loans, clientFilter, statusFilter, dateRange]);

  // Aggregate Metrics based on filtered view
  const totalPortfolioAmount = useMemo(
    () => filteredLoans.reduce((sum, l) => sum + (l.totalAmount || 0), 0),
    [filteredLoans]
  );
  const totalCollectedAmount = useMemo(
    () => filteredLoans.reduce((sum, l) => sum + (l.totalCollected || 0), 0),
    [filteredLoans]
  );
  const totalOutstandingAmount = useMemo(
    () => Math.max(0, totalPortfolioAmount - totalCollectedAmount),
    [totalPortfolioAmount, totalCollectedAmount]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-[#E6E1D6] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#701A35]/10 border border-[#701A35]/20 flex items-center justify-center text-[#701A35]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-serif">
                Client Loans
              </h1>
              <p className="text-xs text-slate-500">
                Manage borrower loans, payment schedules, and partner company splits
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-2.5 text-xs font-bold text-slate-950 bg-[#C5A059] hover:bg-[#D4AF37] active:scale-98 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 font-bold" />
            <span>New Loan</span>
          </button>
        </div>
      </div>

      {/* 3 High-Impact KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            {dateRange.startDate ? 'Filtered Loan Amount' : 'Total Loan Amount'}
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            ₹{totalPortfolioAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-600 font-medium block leading-snug">
            {numberToWordsINR(totalPortfolioAmount)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Across {filteredLoans.length} loans
          </span>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider font-mono">
            Total Amount Collected
          </span>
          <span className="text-xl font-bold text-emerald-700 font-mono block mt-1">
            ₹{totalCollectedAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-emerald-800 font-medium block leading-snug">
            {numberToWordsINR(totalCollectedAmount)}
          </span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">
            {totalPortfolioAmount > 0 ? ((totalCollectedAmount / totalPortfolioAmount) * 100).toFixed(1) : 0}% collected
          </span>
        </div>

        <div className="bg-[#FAF5ED] p-4 rounded-xl border border-[#E2D2B0] shadow-2xs">
          <span className="text-[11px] font-bold text-[#701A35] uppercase tracking-wider font-mono">
            Total Balance Due
          </span>
          <span className="text-xl font-bold text-[#701A35] font-mono block mt-1">
            ₹{totalOutstandingAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-[#701A35] font-medium block leading-snug">
            {numberToWordsINR(totalOutstandingAmount)}
          </span>
          <span className="text-[10px] text-amber-800 mt-0.5 block">
            Pending collection
          </span>
        </div>
      </div>

      {/* Filters & Search Control Bar with Date Range Picker */}
      <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-1">
          {/* Client Name search filter */}
          <div className="relative flex-1 max-w-sm">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1 block">
              Search
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, code, or city..."
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full bg-[#FBF9F5] border border-[#E6E1D6] rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#701A35]"
              />
            </div>
          </div>

          {/* Date Range Picker Component (Matching Reference UI) */}
          <DateRangePicker
            value={dateRange}
            onChange={(newRange) => setDateRange(newRange)}
          />
        </div>

        {/* Status Filter Tabs & Expand/Collapse */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          <div className="flex items-center bg-[#F4F1EA] p-1 rounded-lg border border-[#E6E1D6] text-xs font-semibold">
            {(['ALL', 'Active', 'Overdue', 'Closed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 border-l border-[#E6E1D6] pl-2">
            <button
              onClick={handleExpandAll}
              className="px-2.5 py-1 text-[11px] font-mono bg-white border border-[#E6E1D6] rounded-md text-slate-600 hover:bg-[#FBF9F5]"
              title="Expand all loans"
            >
              Expand All
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-2.5 py-1 text-[11px] font-mono bg-white border border-[#E6E1D6] rounded-md text-slate-600 hover:bg-[#FBF9F5]"
              title="Collapse all loans"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Status Bar */}
      {(dateRange.startDate || clientFilter || statusFilter !== 'ALL') && (
        <div className="flex items-center gap-2 flex-wrap text-xs px-1">
          <span className="text-slate-500 font-medium">Active Filters:</span>
          {dateRange.startDate && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF5ED] border border-[#E2D2B0] text-[#701A35] font-mono text-[11px] font-bold">
              <span>📅 {dateRange.startDate} – {dateRange.endDate}</span>
              <button
                type="button"
                onClick={() => setDateRange({ startDate: null, endDate: null, presetLabel: undefined })}
                className="hover:text-rose-600 ml-0.5 text-xs font-bold cursor-pointer"
                title="Remove date filter"
              >
                ×
              </button>
            </span>
          )}
          {clientFilter && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] font-semibold">
              <span>Search: "{clientFilter}"</span>
              <button
                type="button"
                onClick={() => setClientFilter('')}
                className="hover:text-rose-600 ml-0.5 text-xs font-bold cursor-pointer"
                title="Clear search filter"
              >
                ×
              </button>
            </span>
          )}
          {statusFilter !== 'ALL' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold">
              <span>Status: {statusFilter}</span>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className="hover:text-rose-600 ml-0.5 text-xs font-bold cursor-pointer"
                title="Clear status filter"
              >
                ×
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setDateRange({ startDate: null, endDate: null, presetLabel: undefined });
              setClientFilter('');
              setStatusFilter('ALL');
            }}
            className="text-[11px] text-[#701A35] hover:underline font-bold ml-auto cursor-pointer"
          >
            Clear filters (showing {filteredLoans.length} of {loans.length} loans)
          </button>
        </div>
      )}

      {/* Aggregated Loans Grid */}
      <div className="bg-white rounded-2xl border border-[#E6E1D6] shadow-xs overflow-hidden">
        {filteredLoans.length === 0 ? (
          <div className="p-10 md:p-14 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF5ED] border border-[#E2D2B0] flex items-center justify-center mx-auto text-[#701A35] shadow-xs">
              <CalendarDays className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">
                No Loans Found
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {dateRange.startDate ? (
                  <>
                    No loans found for the selected date range (
                    <span className="font-mono font-bold text-slate-800">
                      {dateRange.startDate} to {dateRange.endDate}
                    </span>
                    ).
                  </>
                ) : (
                  'No loans match your search or filter criteria.'
                )}
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDateRange({
                    startDate: null,
                    endDate: null,
                    presetLabel: undefined,
                  });
                }}
                className="px-4 py-2 bg-white border border-[#E6E1D6] hover:bg-[#FAF8F5] text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                Show All Dates
              </button>

              <button
                type="button"
                onClick={() => {
                  const current = getCurrentMonthRange();
                  setDateRange({
                    startDate: current.startIso,
                    endDate: current.endIso,
                    presetLabel: 'curr_month',
                  });
                }}
                className="px-4 py-2 bg-[#701A35] hover:bg-[#5C142B] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Show Current Month</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#EDE8DF]">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3.5 bg-[#FAF8F5] border-b border-[#E6E1D6] text-[11px] font-mono font-bold text-slate-600 uppercase tracking-wider">
              <div className="col-span-4 sm:col-span-3">Borrower Name</div>
              <div className="col-span-3 sm:col-span-2 text-right">Loan Amount (₹)</div>
              <div className="col-span-2 sm:col-span-1 text-center">EMIs</div>
              <div className="hidden sm:block sm:col-span-3">Funded By</div>
              <div className="hidden sm:block sm:col-span-1 text-center">Next Due Date</div>
              <div className="col-span-2 sm:col-span-1 text-center">Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Loan Rows */}
            {filteredLoans.map((loan) => {
              const isExpanded = expandedLoanIds.has(loan.id);

              return (
                <div key={loan.id} className="transition-colors hover:bg-[#FCFBF9]">
                  {/* Summary Row */}
                  <div
                    onClick={() => toggleExpand(loan.id)}
                    className="grid grid-cols-12 gap-3 px-5 py-4 items-center cursor-pointer select-none"
                  >
                    {/* Client Name & Place */}
                    <div className="col-span-4 sm:col-span-3 flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(loan.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#701A35]" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 text-xs block truncate hover:text-[#701A35]">
                          {loan.customerName}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {loan.codeNo && (
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                              {loan.codeNo}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 truncate">
                            {loan.place || 'CHENNAI'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Total Loan Amount */}
                    <div className="col-span-3 sm:col-span-2 text-right font-mono">
                      <span className="font-bold text-slate-900 text-xs block">
                        ₹{loan.totalAmount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans block leading-tight">
                        {numberToWordsINR(loan.totalAmount)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        ₹{(loan.totalCollected || 0).toLocaleString('en-IN')} collected
                      </span>
                    </div>

                    {/* EMI Count */}
                    <div className="col-span-2 sm:col-span-1 text-center font-mono text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                        {loan.installmentCount}
                      </span>
                    </div>

                    {/* Funding Companies Pills with Modern Interactive Popover */}
                    <div className="hidden sm:flex sm:col-span-3 items-center gap-1.5 flex-wrap">
                      {loan.splits && loan.splits.length > 0 ? (
                        loan.splits.map((sp) => (
                          <CompanySplitBadge key={sp.id} split={sp} size="sm" />
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">ASR Group</span>
                      )}
                    </div>

                    {/* Next Due Date */}
                    <div className="hidden sm:block sm:col-span-1 text-center font-mono text-[11px] text-slate-600">
                      {loan.nextDueDate || '—'}
                    </div>

                    {/* Status */}
                    <div className="col-span-2 sm:col-span-1 text-center">
                      <StatusPill status={loan.status} size="sm" />
                    </div>

                    {/* Actions: Edit, View Details, Delete */}
                    <div className="col-span-1 text-right flex items-center justify-end gap-1">
                      {/* Direct Edit Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEditLoan(loan);
                        }}
                        className="p-1.5 text-slate-600 hover:text-[#701A35] hover:bg-[#FAF8F5] border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Edit Loan"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#701A35]" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLoanId(loan.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete loan ${loan.id} for ${loan.customerName}?`)) {
                            deleteLoan(loan.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Loan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Accordion Expanded Sub-Table: Installments / EMIs */}
                  {isExpanded && (
                    <div className="bg-[#FAF8F5] px-6 py-4 border-t border-[#E6E1D6] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#701A35]" />
                          Payment Schedule ({loan.installments.length} EMIs)
                        </span>
                        <span className="text-xs font-mono text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-[#E6E1D6]">
                          Loan ID: <strong className="text-slate-800">{loan.id}</strong>
                        </span>
                      </div>

                      <div className="border border-[#E2DDD3] rounded-xl overflow-x-auto bg-white shadow-2xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#F4F1EA] border-b border-[#E2DDD3] text-[11px] font-mono font-bold text-slate-600">
                              <th className="p-2.5 text-center w-12">#</th>
                              <th className="p-2.5 w-28">Due Date</th>
                              <th className="p-2.5 text-right w-32">Amount Due (₹)</th>
                              <th className="p-2.5 text-center w-24">Status</th>
                              <th className="p-2.5 w-28">Payment Date</th>
                              <th className="p-2.5">Company Splits</th>
                              <th className="p-2.5 w-28">Cheque / Deposit</th>
                              <th className="p-2.5 w-32">Notes</th>
                              <th className="p-2.5 text-center w-20">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EDE8DF]">
                            {loan.installments.map((inst) => {
                              const isPaid = ['PASS', 'NEFT', 'CASH', 'CLS', 'CS', 'Paid'].includes(inst.status);

                              return (
                                <tr
                                  key={inst.id}
                                  className={`hover:bg-[#FCFBF9] font-mono ${
                                    inst.isMismatch ? 'bg-rose-50/50' : ''
                                  }`}
                                >
                                  <td className="p-2.5 text-center font-bold text-slate-500">
                                    #{inst.seqNo}
                                  </td>
                                  <td className="p-2.5 text-slate-800 font-semibold">{inst.dueDate}</td>
                                  <td className="p-2.5 text-right font-mono">
                                    <span className="font-bold text-slate-900 block">
                                      ₹{inst.amountDue.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-sans block leading-tight">
                                      {numberToWordsINR(inst.amountDue)}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <StatusPill status={inst.status} size="sm" />
                                  </td>
                                  <td className="p-2.5 text-slate-600">
                                    {inst.recdDate || '—'}
                                  </td>
                                  {/* Company Split Badges */}
                                  <td className="p-2.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {Object.entries(inst.companySplits).map(([code, amt]) => (
                                        <span
                                          key={code}
                                          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-semibold border border-slate-200"
                                        >
                                          <strong>{code}:</strong> ₹{amt.toLocaleString('en-IN')}
                                        </span>
                                      ))}
                                      {inst.isMismatch && (
                                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-300">
                                          Diff ₹{inst.mismatchDiff}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-slate-500 text-[11px]">
                                    {inst.chqNo ? `CHQ: ${inst.chqNo}` : ''}
                                    {inst.depName ? ` (DEP: ${inst.depName})` : ''}
                                    {!inst.chqNo && !inst.depName ? '—' : ''}
                                  </td>
                                  <td className="p-2.5 text-slate-500 text-[11px] truncate max-w-[120px]">
                                    {inst.remarks || '—'}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    {!isPaid ? (
                                      <button
                                        onClick={() =>
                                          updateLoanInstallment(inst.id, {
                                            status: 'PASS',
                                            recdDate: new Date().toISOString().slice(0, 10),
                                          })
                                        }
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[10px] font-bold shadow-2xs cursor-pointer"
                                      >
                                        Mark Paid
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-emerald-600 font-bold">Paid</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Guided 5-Step Loan Creation Modal */}
      <NewLoanModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />

      {/* Excel-Style Loan Spreadsheet Editor Modal */}
      <EditLoanExcelModal
        isOpen={!!selectedEditLoan}
        onClose={() => setSelectedEditLoan(null)}
        loan={selectedEditLoan}
      />
    </div>
  );
};
