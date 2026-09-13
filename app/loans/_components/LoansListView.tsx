'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Edit3,
  CalendarDays,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Filter,
  Layers,
} from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { CompanySplitBadge } from '@/components/ui/CompanySplitBadge';
import { NewLoanModal } from '@/app/loans/_components/new-loan/NewLoanModal';
import { EditLoanExcelModal } from './EditLoanExcelModal';
import { ImportReviewModal } from './ImportReviewModal';
import { DateRangePicker, DateRangeValue, getCurrentMonthRange } from '@/components/ui/DateRangePicker';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';

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

type SortField = 'customerName' | 'id' | 'startDate' | 'totalAmount' | 'installmentCount' | 'fundedBy' | 'nextDueDate' | 'status';
type SortDirection = 'asc' | 'desc';

export const LoansListView: React.FC = () => {
  const {
    loans,
    setSelectedLoanId,
    deleteLoan,
    updateLoanInstallment,
    showToast,
  } = useApp();

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedEditLoan, setSelectedEditLoan] = useState<Loan | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Overdue' | 'Closed'>('ALL');
  
  // Date Range Filter
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: null,
    endDate: null,
    presetLabel: 'all',
  });

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Accordion state
  const [expandedLoanIds, setExpandedLoanIds] = useState<Set<string>>(() => {
    return new Set(loans.length > 0 ? [loans[0].id] : []);
  });

  // Close client dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Distinct client list with loan counts
  const clientStats = useMemo(() => {
    const map = new Map<string, number>();
    loans.forEach((l) => {
      map.set(l.customerName, (map.get(l.customerName) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [loans]);

  const filteredClientStats = useMemo(() => {
    if (!clientSearchQuery.trim()) return clientStats;
    const q = clientSearchQuery.toLowerCase();
    return clientStats.filter((c) => c.name.toLowerCase().includes(q));
  }, [clientStats, clientSearchQuery]);

  const toggleClientSelection = (clientName: string) => {
    setSelectedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientName)) next.delete(clientName);
      else next.add(clientName);
      return next;
    });
  };

  const selectAllClients = () => {
    setSelectedClients(new Set(clientStats.map((c) => c.name)));
  };

  const clearAllClients = () => {
    setSelectedClients(new Set());
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const dateTimestamps = useMemo(() => {
    const startTimestamp = dateRange.startDate ? new Date(dateRange.startDate).setHours(0, 0, 0, 0) : null;
    const endTimestamp = dateRange.endDate ? new Date(dateRange.endDate).setHours(23, 59, 59, 999) : null;
    return { startTimestamp, endTimestamp };
  }, [dateRange]);

  // Filtered and Sorted Loans (Strictly Flat: 1 Row = 1 Loan)
  const filteredAndSortedLoans = useMemo(() => {
    const { startTimestamp, endTimestamp } = dateTimestamps;

    const filtered = loans.filter((loan) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && loan.status !== statusFilter) return false;

      // 2. Multi-Select Client Filter
      if (selectedClients.size > 0 && !selectedClients.has(loan.customerName)) {
        return false;
      }

      // 3. Search query (name, code, id, place)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchClient = loan.customerName.toLowerCase().includes(q);
        const matchCode = loan.codeNo?.toLowerCase().includes(q) || false;
        const matchId = loan.id.toLowerCase().includes(q);
        const matchPlace = loan.place?.toLowerCase().includes(q) || false;
        if (!matchClient && !matchCode && !matchId && !matchPlace) return false;
      }

      // 4. Date Range Filter (Evaluates against Loan Start Date or any Installment Due/Recd Date)
      if (startTimestamp !== null && endTimestamp !== null) {
        const loanStartDate = parseToDate(loan.startDate);
        const loanStartMs = loanStartDate ? loanStartDate.getTime() : null;
        const matchesLoanStart = loanStartMs !== null && loanStartMs >= startTimestamp && loanStartMs <= endTimestamp;

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

    // Sort Loans
    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'customerName':
          comparison = a.customerName.localeCompare(b.customerName);
          break;
        case 'id':
          comparison = a.id.localeCompare(b.id, undefined, { numeric: true });
          break;
        case 'startDate': {
          const timeA = parseToDate(a.startDate)?.getTime() || 0;
          const timeB = parseToDate(b.startDate)?.getTime() || 0;
          comparison = timeA - timeB;
          break;
        }
        case 'totalAmount':
          comparison = a.totalAmount - b.totalAmount;
          break;
        case 'installmentCount': {
          const countA = a.installments?.length || a.installmentCount || 0;
          const countB = b.installments?.length || b.installmentCount || 0;
          comparison = countA - countB;
          break;
        }
        case 'fundedBy': {
          const splitA = a.splits?.map((s) => s.companyCode || s.companyName || '').join(',') || '';
          const splitB = b.splits?.map((s) => s.companyCode || s.companyName || '').join(',') || '';
          comparison = splitA.localeCompare(splitB);
          break;
        }
        case 'nextDueDate': {
          const timeA = parseToDate(a.nextDueDate)?.getTime() || 0;
          const timeB = parseToDate(b.nextDueDate)?.getTime() || 0;
          comparison = timeA - timeB;
          break;
        }
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [loans, statusFilter, selectedClients, searchQuery, dateTimestamps, sortField, sortDirection]);

  // Aggregate Metrics based on filtered view
  const totalPortfolioAmount = useMemo(
    () => filteredAndSortedLoans.reduce((sum, l) => sum + (l.totalAmount || 0), 0),
    [filteredAndSortedLoans]
  );
  const totalCollectedAmount = useMemo(
    () => filteredAndSortedLoans.reduce((sum, l) => sum + (l.totalCollected || 0), 0),
    [filteredAndSortedLoans]
  );
  const totalOutstandingAmount = useMemo(
    () => Math.max(0, totalPortfolioAmount - totalCollectedAmount),
    [totalPortfolioAmount, totalCollectedAmount]
  );

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 ml-1 inline-block" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#701A35] font-bold ml-1 inline-block" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#701A35] font-bold ml-1 inline-block" />
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card with Actions */}
      <div className="bg-white p-6 rounded-2xl border border-[#E6E1D6] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#701A35]/10 border border-[#701A35]/20 flex items-center justify-center text-[#701A35]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-serif">
                Client Loans & Payment Schedules
              </h1>
              <p className="text-xs text-slate-500">
                Manage borrower facilities, continuation imports, payment schedules, and partner company splits
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Import Monthly Spreadsheet Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-[#F4F1EA] hover:bg-[#EBE6DC] border border-[#E6E1D6] rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Upload and match monthly receipt spreadsheet (e.g. August 2026)"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#701A35]" />
            <span>Import Spreadsheet</span>
          </button>

          {/* New Loan Button */}
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-[#C5A059] hover:bg-[#D4AF37] active:scale-98 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
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
            {dateRange.startDate ? 'Filtered Loan Amount' : 'Total Portfolio Amount'}
          </span>
          <div className="mt-1">
            <MoneyDisplay
              amount={totalPortfolioAmount}
              size="xl"
              amountClassName="text-slate-900 font-bold block"
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Across {filteredAndSortedLoans.length} loan facilities
          </span>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider font-mono">
            Total Amount Collected
          </span>
          <div className="mt-1">
            <MoneyDisplay
              amount={totalCollectedAmount}
              size="xl"
              amountClassName="text-emerald-700 font-bold block"
            />
          </div>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">
            {totalPortfolioAmount > 0 ? ((totalCollectedAmount / totalPortfolioAmount) * 100).toFixed(1) : 0}% recovery rate
          </span>
        </div>

        <div className="bg-[#FAF5ED] p-4 rounded-xl border border-[#E2D2B0] shadow-2xs">
          <span className="text-[11px] font-bold text-[#701A35] uppercase tracking-wider font-mono">
            Total Balance Due
          </span>
          <div className="mt-1">
            <MoneyDisplay
              amount={totalOutstandingAmount}
              size="xl"
              amountClassName="text-[#701A35] font-bold block"
            />
          </div>
          <span className="text-[10px] text-amber-800 mt-0.5 block">
            Pending collection
          </span>
        </div>
      </div>

      {/* Filters Bar: Multi-Select Client Dropdown, Text Search, Date Range Picker, Status Tabs */}
      <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-1 flex-wrap">
          {/* Multi-Select Client Filter Dropdown */}
          <div className="relative min-w-[220px]" ref={clientDropdownRef}>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1 block">
              Filter by Client ({clientStats.length})
            </label>
            <button
              type="button"
              onClick={() => setIsClientDropdownOpen((prev) => !prev)}
              className="w-full bg-[#FBF9F5] border border-[#E6E1D6] hover:border-[#701A35] rounded-xl px-3 py-2 text-xs text-slate-800 flex items-center justify-between transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Filter className="w-3.5 h-3.5 text-[#701A35] shrink-0" />
                <span className="font-semibold truncate">
                  {selectedClients.size === 0
                    ? 'All Clients'
                    : selectedClients.size === 1
                    ? Array.from(selectedClients)[0]
                    : `${selectedClients.size} Clients Selected`}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isClientDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-80 bg-white border border-[#E6E1D6] rounded-2xl shadow-xl z-50 p-3 space-y-2.5 animate-in fade-in-50 zoom-in-95 duration-100">
                {/* Search inside dropdown */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    className="w-full bg-[#FBF9F5] border border-[#E6E1D6] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#701A35]"
                    autoFocus
                  />
                </div>

                {/* Quick actions */}
                <div className="flex items-center justify-between text-[11px] px-1 font-semibold text-slate-500 border-b border-slate-100 pb-1.5">
                  <button
                    type="button"
                    onClick={selectAllClients}
                    className="hover:text-[#701A35] cursor-pointer"
                  >
                    Select All ({clientStats.length})
                  </button>
                  <button
                    type="button"
                    onClick={clearAllClients}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {/* Clients list */}
                <div className="max-h-60 overflow-y-auto space-y-0.5 divide-y divide-slate-50">
                  {filteredClientStats.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No clients found matching "{clientSearchQuery}"
                    </div>
                  ) : (
                    filteredClientStats.map(({ name, count }) => {
                      const isSelected = selectedClients.has(name);
                      return (
                        <div
                          key={name}
                          onClick={() => toggleClientSelection(name)}
                          className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-50/80 font-bold text-amber-950' : 'hover:bg-[#FAF8F5] text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleClientSelection(name)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-3.5 h-3.5 rounded text-[#701A35] accent-[#701A35] cursor-pointer"
                            />
                            <span className="truncate">{name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                            {count} loan{count > 1 ? 's' : ''}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* General Text Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1 block">
              Search Code / Place / Loan ID
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search loan ID, code, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FBF9F5] border border-[#E6E1D6] rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#701A35]"
              />
            </div>
          </div>

          {/* Date Range Picker */}
          <DateRangePicker
            value={dateRange}
            onChange={(newRange) => setDateRange(newRange)}
          />
        </div>

        {/* Status Filter Tabs & Expand/Collapse */}
        <div className="flex items-center gap-2 self-end xl:self-auto shrink-0">
          <div className="flex items-center bg-[#F4F1EA] p-1 rounded-lg border border-[#E6E1D6] text-xs font-semibold">
            {(['ALL', 'Active', 'Overdue', 'Closed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
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
              className="px-2.5 py-1 text-[11px] font-mono bg-white border border-[#E6E1D6] rounded-md text-slate-600 hover:bg-[#FBF9F5] cursor-pointer"
              title="Expand all loan schedules"
            >
              Expand All
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-2.5 py-1 text-[11px] font-mono bg-white border border-[#E6E1D6] rounded-md text-slate-600 hover:bg-[#FBF9F5] cursor-pointer"
              title="Collapse all loan schedules"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Selected Client Pill Chips & Active Filters Status Bar */}
      {(selectedClients.size > 0 || dateRange.startDate || searchQuery || statusFilter !== 'ALL') && (
        <div className="flex items-center gap-2 flex-wrap text-xs px-1">
          <span className="text-slate-500 font-medium">Active Filters:</span>

          {/* Selected Clients Pills */}
          {Array.from(selectedClients).map((clientName) => (
            <span
              key={clientName}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/70 border border-amber-300 text-amber-950 font-semibold text-[11px]"
            >
              <span>{clientName}</span>
              <button
                type="button"
                onClick={() => toggleClientSelection(clientName)}
                className="hover:text-rose-600 ml-0.5 text-xs font-bold cursor-pointer"
                title={`Remove ${clientName}`}
              >
                ×
              </button>
            </span>
          ))}

          {/* Date Range Pill */}
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

          {/* Search text pill */}
          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] font-semibold">
              <span>Search: "{searchQuery}"</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="hover:text-rose-600 ml-0.5 text-xs font-bold cursor-pointer"
                title="Clear search query"
              >
                ×
              </button>
            </span>
          )}

          {/* Status pill */}
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
              setSelectedClients(new Set());
              setDateRange({ startDate: null, endDate: null, presetLabel: undefined });
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
            className="text-[11px] text-[#701A35] hover:underline font-bold ml-auto cursor-pointer"
          >
            Clear all filters (showing {filteredAndSortedLoans.length} of {loans.length} loans)
          </button>
        </div>
      )}

      {/* Flat Per-Loan Table Grid with Clickable Sort Headers */}
      <div className="bg-white rounded-2xl border border-[#E6E1D6] shadow-xs overflow-hidden">
        {filteredAndSortedLoans.length === 0 ? (
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
                    No loans match the selected date range (
                    <span className="font-mono font-bold text-slate-800">
                      {dateRange.startDate} to {dateRange.endDate}
                    </span>
                    ).
                  </>
                ) : (
                  'No loans match your search or client filter criteria.'
                )}
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedClients(new Set());
                  setDateRange({
                    startDate: null,
                    endDate: null,
                    presetLabel: undefined,
                  });
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="px-4 py-2 bg-white border border-[#E6E1D6] hover:bg-[#FAF8F5] text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                Reset All Filters
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
            {/* Clickable Column Sort Headers */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3.5 bg-[#FAF8F5] border-b border-[#E6E1D6] text-[11px] font-mono font-bold text-slate-600 uppercase tracking-wider select-none">
              {/* Client & Loan ID */}
              <div
                onClick={() => handleSort('customerName')}
                className="col-span-4 sm:col-span-3 flex items-center cursor-pointer hover:text-slate-900 transition-colors"
                title="Sort by Borrower Name"
              >
                <span>Borrower / Loan ID</span>
                {renderSortIndicator('customerName')}
              </div>

              {/* Total Amount */}
              <div
                onClick={() => handleSort('totalAmount')}
                className="col-span-3 sm:col-span-2 text-right flex items-center justify-end cursor-pointer hover:text-slate-900 transition-colors"
                title="Sort by Loan Amount"
              >
                <span>Loan Amount (₹)</span>
                {renderSortIndicator('totalAmount')}
              </div>

              {/* EMIs */}
              <div
                onClick={() => handleSort('installmentCount')}
                className="col-span-2 sm:col-span-1 text-center flex items-center justify-center cursor-pointer hover:text-slate-900 transition-colors"
                title="Sort by Installment Count"
              >
                <span>EMIs</span>
                {renderSortIndicator('installmentCount')}
              </div>

              {/* Funded By */}
              <div
                onClick={() => handleSort('fundedBy')}
                className="hidden sm:flex sm:col-span-3 items-center cursor-pointer hover:text-slate-900 transition-colors"
                title="Sort by Funding Entities"
              >
                <span>Funded By</span>
                {renderSortIndicator('fundedBy')}
              </div>

              {/* Next Due Date */}
              <div
                onClick={() => handleSort('nextDueDate')}
                className="hidden sm:flex sm:col-span-1 items-center justify-center cursor-pointer hover:text-slate-900 transition-colors"
                title="Sort by Next Due Date"
              >
                <span>Next Due</span>
                {renderSortIndicator('nextDueDate')}
              </div>

              {/* Status */}
              <div
                onClick={() => handleSort('status')}
                className="col-span-2 sm:col-span-1 text-center flex items-center justify-center cursor-pointer hover:text-slate-900 transition-colors"
                title="Sort by Loan Status"
              >
                <span>Status</span>
                {renderSortIndicator('status')}
              </div>

              {/* Actions Header */}
              <div className="col-span-1 text-right">
                <span>Actions</span>
              </div>
            </div>

            {/* Flat Loan Rows (1 Row = 1 Loan) */}
            {filteredAndSortedLoans.map((loan) => {
              const isExpanded = expandedLoanIds.has(loan.id);
              const { startTimestamp, endTimestamp } = dateTimestamps;
              const hasDateFilter = startTimestamp !== null && endTimestamp !== null;

              // Check in-range installments count for this loan
              const inRangeCount = hasDateFilter
                ? (loan.installments || []).filter((inst) => {
                    const dueD = parseToDate(inst.dueDate);
                    const recdD = parseToDate(inst.recdDate);
                    const dueMs = dueD ? dueD.getTime() : null;
                    const recdMs = recdD ? recdD.getTime() : null;
                    return (
                      (dueMs !== null && dueMs >= startTimestamp && dueMs <= endTimestamp) ||
                      (recdMs !== null && recdMs >= startTimestamp && recdMs <= endTimestamp)
                    );
                  }).length
                : 0;

              return (
                <div key={loan.id} className="transition-colors hover:bg-[#FCFBF9]">
                  {/* Summary Row */}
                  <div
                    onClick={() => toggleExpand(loan.id)}
                    className="grid grid-cols-12 gap-3 px-5 py-4 items-center cursor-pointer select-none"
                  >
                    {/* Client Name & Loan ID Badge */}
                    <div className="col-span-4 sm:col-span-3 flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(loan.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 shrink-0 cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#701A35]" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs truncate hover:text-[#701A35]">
                            {loan.customerName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] bg-[#FAF5ED] text-[#701A35] border border-[#E2D2B0] px-1.5 py-0.2 rounded font-bold">
                            {loan.id}
                          </span>
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
                      <MoneyDisplay
                        amount={loan.totalAmount}
                        size="sm"
                        amountClassName="font-bold text-slate-900 text-xs block text-right"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        ₹{(loan.totalCollected || 0).toLocaleString('en-IN')} collected
                      </span>
                    </div>

                    {/* EMI Count */}
                    <div className="col-span-2 sm:col-span-1 text-center font-mono text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                        {loan.installmentCount || loan.installments?.length || 0}
                      </span>
                      {hasDateFilter && inRangeCount > 0 && (
                        <span className="block text-[9px] text-amber-700 font-semibold mt-0.5">
                          {inRangeCount} in range
                        </span>
                      )}
                    </div>

                    {/* Funding Companies Split Badges */}
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

                    {/* Actions: Edit Excel, View Details, Delete */}
                    <div className="col-span-1 text-right flex items-center justify-end gap-1">

                      {/* Excel Style Edit Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEditLoan(loan);
                        }}
                        className="p-1.5 text-slate-600 hover:text-[#701A35] hover:bg-[#FAF8F5] border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Edit Loan Schedule"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#701A35]" />
                      </button>

                      {/* View Details */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLoanId(loan.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="View Loan Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete loan ${loan.id} for ${loan.customerName}?`)) {
                            deleteLoan(loan.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Loan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Accordion Expanded Sub-Table: Installments / EMIs with Date Range Highlights */}
                  {isExpanded && (
                    <div className="bg-[#FAF8F5] px-6 py-4 border-t border-[#E6E1D6] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#701A35]" />
                          Payment Schedule ({loan.installments.length} EMIs)
                        </span>
                        <div className="flex items-center gap-2">
                          {hasDateFilter && (
                            <span className="text-[11px] font-mono text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-lg font-bold">
                              Highlighting dates in range ({dateRange.startDate} to {dateRange.endDate})
                            </span>
                          )}
                          <span className="text-xs font-mono text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-[#E6E1D6]">
                            Loan ID: <strong className="text-slate-800">{loan.id}</strong>
                          </span>
                        </div>
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

                              // Date Range Match check for highlighting
                              const dueD = parseToDate(inst.dueDate);
                              const recdD = parseToDate(inst.recdDate);
                              const dueMs = dueD ? dueD.getTime() : null;
                              const recdMs = recdD ? recdD.getTime() : null;
                              const isDueInRange =
                                startTimestamp !== null &&
                                endTimestamp !== null &&
                                dueMs !== null &&
                                dueMs >= startTimestamp &&
                                dueMs <= endTimestamp;
                              const isRecdInRange =
                                startTimestamp !== null &&
                                endTimestamp !== null &&
                                recdMs !== null &&
                                recdMs >= startTimestamp &&
                                recdMs <= endTimestamp;
                              const isInRange = isDueInRange || isRecdInRange;

                              return (
                                <tr
                                  key={inst.id}
                                  className={`font-mono transition-colors ${
                                    isInRange
                                      ? 'bg-amber-50/80 border-l-4 border-amber-400 font-semibold text-amber-950'
                                      : inst.isMismatch
                                      ? 'bg-rose-50/50'
                                      : 'hover:bg-[#FCFBF9]'
                                  }`}
                                >
                                  <td className="p-2.5 text-center font-bold text-slate-500">
                                    #{inst.seqNo}
                                  </td>
                                  <td className="p-2.5 text-slate-800 font-semibold">
                                    <div className="flex items-center gap-1.5">
                                      <span>{inst.dueDate}</span>
                                      {isInRange && (
                                        <span className="text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-bold">
                                          IN RANGE
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-right font-mono">
                                    <MoneyDisplay
                                      amount={inst.amountDue}
                                      size="sm"
                                      amountClassName="font-bold text-slate-900 block text-right"
                                    />
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
                                      {Object.entries(inst.companySplits || {}).map(([code, amt]) => (
                                        <span
                                          key={code}
                                          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-semibold border border-slate-200"
                                        >
                                          <strong>{code}:</strong> ₹{Number(amt).toLocaleString('en-IN')}
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

      {/* Monthly Import Continuation Review Modal */}
      <ImportReviewModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
