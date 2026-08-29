'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import {
  CalendarDays,
  Calendar,
  CreditCard,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Eye,
  X,
  Search,
  Percent,
  TrendingUp,
  RefreshCw,
  ChevronsUpDown,
} from 'lucide-react';
import { StatusPill } from '@/components/common/StatusPill';
import { RepaymentInstallment, IntermediaryLoan } from '@/lib/types';

export const ScheduleView: React.FC = () => {
  const {
    loans,
    setSelectedLoanId,
    setActiveMainTab,
    updateLoanInstallmentStatus,
    updateLoanInstallmentDate,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Repaid'>('ALL');
  const [expandedLoanIds, setExpandedLoanIds] = useState<Set<string>>(() => {
    // Expand first loan by default
    return new Set(loans.length > 0 ? [loans[0].id] : []);
  });

  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean;
    loanId: string;
    installment: RepaymentInstallment | null;
    newDate: string;
    reason: string;
  }>({
    isOpen: false,
    loanId: '',
    installment: null,
    newDate: '',
    reason: '',
  });

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

  const handleExpandAll = () => {
    setExpandedLoanIds(new Set(loans.map((l) => l.id)));
  };

  const handleCollapseAll = () => {
    setExpandedLoanIds(new Set());
  };

  // Filter loans
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const matchesStatus = statusFilter === 'ALL' || loan.status === statusFilter;
      if (!matchesStatus) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchId = loan.id.toLowerCase().includes(q);
      const matchCust = loan.customers.some((c) => c.customerName.toLowerCase().includes(q));
      const matchComp = loan.companies.some((c) => c.companyName.toLowerCase().includes(q));
      return matchId || matchCust || matchComp;
    });
  }, [loans, statusFilter, searchQuery]);

  // Overall KPI statistics
  const kpiStats = useMemo(() => {
    let totalCapital = 0;
    let totalExpectedInterest = 0;
    let totalCycles = 0;
    let paidCycles = 0;
    let pendingCycles = 0;

    loans.forEach((l) => {
      totalCapital += l.totalAmount || 0;
      totalExpectedInterest += l.totalInterestExpected || 0;
      l.schedule.forEach((inst) => {
        totalCycles += 1;
        if (inst.status === 'Paid') {
          paidCycles += 1;
        } else {
          pendingCycles += 1;
        }
      });
    });

    return {
      totalCapital,
      totalExpectedInterest,
      totalCycles,
      paidCycles,
      pendingCycles,
    };
  }, [loans]);

  const handleOpenReschedule = (loanId: string, inst: RepaymentInstallment) => {
    setRescheduleModal({
      isOpen: true,
      loanId,
      installment: inst,
      newDate: inst.date,
      reason: inst.rescheduledReason || '',
    });
  };

  const handleSaveReschedule = async () => {
    if (!rescheduleModal.installment || !rescheduleModal.newDate) return;
    await updateLoanInstallmentDate(
      rescheduleModal.loanId,
      rescheduleModal.installment.sNo,
      rescheduleModal.newDate,
      rescheduleModal.newDate,
      rescheduleModal.reason
    );
    setRescheduleModal({
      isOpen: false,
      loanId: '',
      installment: null,
      newDate: '',
      reason: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#701A35]/10 text-[#701A35]">
              <CalendarDays className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 font-serif">
              Payment Schedules
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track monthly payment dates and manage collections for each loan.
          </p>
        </div>

        <button
          onClick={() => {
            setActiveMainTab('loans');
          }}
          className="px-4 py-2 bg-[#701A35] hover:bg-[#5C142B] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <CreditCard className="w-4 h-4" />
          <span>+ New Loan</span>
        </button>
      </div>

      {/* Top KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Active Loans
            </span>
            <CreditCard className="w-4 h-4 text-[#701A35]" />
          </div>
          <span className="text-2xl font-bold text-slate-900 font-mono block mt-1">
            {loans.filter((l) => l.status === 'Active').length}
            <span className="text-xs text-slate-400 font-normal ml-1.5">
              / {loans.length} total
            </span>
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Capital: ₹{kpiStats.totalCapital.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Total Interest
            </span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-bold text-amber-700 font-mono block mt-1">
            ₹{kpiStats.totalExpectedInterest.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Across all cycles
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Collected Payments
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-bold text-emerald-700 font-mono block mt-1">
            {kpiStats.paidCycles}
            <span className="text-xs text-slate-400 font-normal ml-1.5">
              / {kpiStats.totalCycles}
            </span>
          </span>
          <span className="text-[11px] text-emerald-600 mt-1 block">
            {kpiStats.totalCycles > 0
              ? `${Math.round((kpiStats.paidCycles / kpiStats.totalCycles) * 100)}% completed`
              : '0%'}
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Pending Payments
            </span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-bold text-slate-800 font-mono block mt-1">
            {kpiStats.pendingCycles}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Awaiting collection
          </span>
        </div>
      </div>

      {/* Filter and Action Controls Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Deal ID, Investor Customer, Borrower Company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#701A35] bg-[#FAF8F5]/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-[#FAF8F5]">
            {(['ALL', 'Active', 'Repaid'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-[#701A35] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All Deals' : st}
              </button>
            ))}
          </div>

          {/* Expand / Collapse All */}
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <button
              onClick={handleExpandAll}
              className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Expand all loan schedules"
            >
              Expand All
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Collapse all loan schedules"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Loan Deals List */}
      {filteredLoans.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <Calendar className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-sm font-bold text-slate-700">No loan schedules found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No loan syndications match "${searchQuery}".`
              : 'Create a syndicated loan deal to automatically generate revolving payment schedules.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLoans.map((loan) => {
            const isExpanded = expandedLoanIds.has(loan.id);
            const totalCycles = loan.schedule.length;
            const paidCount = loan.schedule.filter((i) => i.status === 'Paid').length;
            const nextPending = loan.schedule.find((i) => i.status !== 'Paid');
            const percentPaid = totalCycles > 0 ? Math.round((paidCount / totalCycles) * 100) : 0;
            const monthlyInterest =
              loan.schedule[0]?.interestAmount ||
              Math.round(loan.totalInterestExpected / (loan.tenureMonths || 1));

            return (
              <div
                key={loan.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
              >
                {/* Loan Header Row (Clickable to Expand/Collapse) */}
                <div
                  onClick={() => toggleExpandLoan(loan.id)}
                  className={`p-4 transition-colors cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isExpanded ? 'bg-[#FAF8F5]/80 border-b border-[#E6E1D6]' : 'hover:bg-[#FAF8F5]/50'
                  }`}
                >
                  {/* Left: Expand Toggle & Deal ID & Parties */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <button
                      type="button"
                      aria-label="Expand or collapse schedule"
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/80 transition-colors shrink-0 mt-0.5 sm:mt-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[#701A35]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#701A35] text-white">
                          {loan.id}
                        </span>
                        <StatusPill status={loan.status} />
                        <span className="text-[11px] font-mono text-slate-500">
                          {loan.tenureMonths} Monthly Cycle(s) · {loan.defaultInterestRate}% p.a.
                        </span>
                      </div>

                      {/* Parties Summary */}
                      <div className="flex items-center gap-4 text-xs mt-1.5 flex-wrap">
                        <div className="flex items-center gap-1 text-slate-700">
                          <Users className="w-3.5 h-3.5 text-[#701A35]" />
                          <span className="font-bold">
                            {loan.customers.map((c) => c.customerName).join(', ')}
                          </span>
                        </div>
                        <span className="text-slate-300">→</span>
                        <div className="flex items-center gap-1 text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-amber-700" />
                          <span className="font-bold">
                            {loan.companies.map((c) => c.companyName).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amounts, Next Date, Progress Bar & Actions */}
                  <div className="flex items-center gap-6 justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                    {/* Principal Capital & Interest */}
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">
                        Principal Capital
                      </span>
                      <span className="font-mono font-bold text-sm text-slate-900 block">
                        ₹{loan.totalAmount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-[#701A35] font-mono block">
                        +₹{monthlyInterest.toLocaleString('en-IN')}/mo interest
                      </span>
                    </div>

                    {/* Settlement Progress */}
                    <div className="min-w-[120px] text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">
                        Settled: {paidCount}/{totalCycles} Cycles
                      </span>
                      <div className="w-28 h-2 bg-slate-200 rounded-full overflow-hidden ml-auto mt-1">
                        <div
                          style={{ width: `${percentPaid}%` }}
                          className="h-full bg-emerald-500 transition-all rounded-full"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 block mt-0.5">
                        {percentPaid}% Repaid
                      </span>
                    </div>

                    {/* Next Due Date Badge */}
                    {nextPending && (
                      <div className="hidden sm:block text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">
                          Next Cycle Due
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-xs font-bold inline-block mt-0.5">
                          {nextPending.date}
                        </span>
                      </div>
                    )}

                    {/* Direct View Deal Link */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLoanId(loan.id);
                        setActiveMainTab('loans');
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#701A35] hover:border-[#701A35] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">View Deal</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Section: Embedded Spreadsheet Repayment Schedule */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-white space-y-3 animate-in fade-in duration-150">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-xs">
                          Payment Cycles for #{loan.id}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Investor Return: {(loan.defaultInterestRate - (loan.asrCommissionRate || 0)).toFixed(1)}% p.a.
                      </span>
                    </div>

                    {/* Repayment Spreadsheet Table */}
                    <div className="border border-[#E6E1D6] rounded-xl overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="bg-[#FAF8F5] border-b border-[#E6E1D6] text-[11px] font-mono text-slate-600">
                            <tr>
                              <th className="p-2.5 border-r border-[#E6E1D6] w-12 text-center">Cycle</th>
                              <th className="p-2.5 border-r border-[#E6E1D6] w-36">Due Date</th>
                              <th className="p-2.5 border-r border-[#E6E1D6]">Description</th>
                              <th className="p-2.5 border-r border-[#E6E1D6] text-right font-mono">Principal (₹)</th>
                              <th className="p-2.5 border-r border-[#E6E1D6] text-right font-mono">Interest (₹)</th>
                              <th className="p-2.5 border-r border-[#E6E1D6] text-right font-bold text-slate-900 bg-[#FAF8F5]/80">
                                Total Due (₹)
                              </th>
                              <th className="p-2.5 border-r border-[#E6E1D6] text-center w-28">Status</th>
                              <th className="p-2.5 text-center w-44">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {loan.schedule.map((row) => (
                              <tr key={row.sNo} className="hover:bg-[#FAF8F5]/60 transition-colors">
                                <td className="p-2.5 border-r border-[#E6E1D6] text-center text-slate-500 font-bold">
                                  #{row.sNo}
                                </td>
                                <td className="p-2.5 border-r border-[#E6E1D6]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900">{row.date}</span>
                                    {row.rescheduledReason && (
                                      <span
                                        className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                                        title={`Rescheduled: ${row.rescheduledReason}`}
                                      />
                                    )}
                                  </div>
                                  {row.paidDate && (
                                    <span className="text-[10px] text-emerald-700 font-sans block mt-0.5">
                                      Paid on: {row.paidDate}
                                    </span>
                                  )}
                                  {row.rescheduledReason && (
                                    <span className="text-[10px] text-amber-800 font-sans block truncate max-w-[140px]">
                                      Note: {row.rescheduledReason}
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 border-r border-[#E6E1D6] text-slate-700 font-sans">
                                  Cycle #{row.sNo} Payment
                                </td>
                                <td className="p-2.5 border-r border-[#E6E1D6] text-right text-slate-700">
                                  ₹{row.principalAmount.toLocaleString('en-IN')}
                                </td>
                                <td className="p-2.5 border-r border-[#E6E1D6] text-right text-[#701A35] font-bold">
                                  ₹{row.interestAmount.toLocaleString('en-IN')}
                                </td>
                                <td className="p-2.5 border-r border-[#E6E1D6] text-right font-bold text-slate-900 bg-[#FAF8F5]/40">
                                  ₹{row.totalAmount.toLocaleString('en-IN')}
                                </td>
                                <td className="p-2.5 border-r border-[#E6E1D6] text-center">
                                  <StatusPill status={row.status} />
                                </td>
                                <td className="p-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {row.status === 'Paid' ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>Collected</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => updateLoanInstallmentStatus(loan.id, row.sNo, 'Pending')}
                                          className="px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-md transition-colors cursor-pointer"
                                          title="Mistakenly marked? Click to Undo and revert back to Pending"
                                        >
                                          Undo
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => updateLoanInstallmentStatus(loan.id, row.sNo, 'Paid')}
                                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer shadow-2xs"
                                        title="Mark payment as collected"
                                      >
                                        Collected
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleOpenReschedule(loan.id, row)}
                                      className="px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                      title="Reschedule cycle settlement date"
                                    >
                                      <Calendar className="w-3 h-3" />
                                      <span>Edit Date</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          {/* Totals Footer Row */}
                          <tfoot className="bg-[#FAF8F5] border-t-2 border-[#701A35] font-mono font-bold text-slate-900 text-xs">
                            <tr>
                              <td colSpan={3} className="p-2.5 text-right uppercase tracking-wider font-sans border-r border-[#E6E1D6]">
                                Total per Cycle:
                              </td>
                              <td className="p-2.5 text-right border-r border-[#E6E1D6]">
                                ₹{loan.totalAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="p-2.5 text-right border-r border-[#E6E1D6] text-[#701A35]">
                                ₹{monthlyInterest.toLocaleString('en-IN')}
                              </td>
                              <td className="p-2.5 text-right border-r border-[#E6E1D6] text-[#701A35]">
                                ₹{(loan.totalAmount + monthlyInterest).toLocaleString('en-IN')}
                              </td>
                              <td colSpan={2} className="p-2.5 text-slate-500 font-sans font-normal text-center text-[11px]">
                                {totalCycles} Cycles
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Reschedule Modal */}
      {rescheduleModal.isOpen && rescheduleModal.installment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  Reschedule Cycle #{rescheduleModal.installment.sNo}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Deal: {rescheduleModal.loanId} · Current Date: {rescheduleModal.installment.date}
                </span>
              </div>
              <button
                onClick={() =>
                  setRescheduleModal({
                    isOpen: false,
                    loanId: '',
                    installment: null,
                    newDate: '',
                    reason: '',
                  })
                }
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  New Settlement Due Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={rescheduleModal.newDate}
                  onChange={(e) =>
                    setRescheduleModal((prev) => ({ ...prev, newDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#701A35]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Rescheduling Reason / Borrower Note
                </label>
                <textarea
                  rows={3}
                  value={rescheduleModal.reason}
                  onChange={(e) =>
                    setRescheduleModal((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="e.g. Borrower requested 5-day grace period due to festival banking holiday..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-[#701A35]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() =>
                  setRescheduleModal({
                    isOpen: false,
                    loanId: '',
                    installment: null,
                    newDate: '',
                    reason: '',
                  })
                }
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReschedule}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] shadow-xs cursor-pointer"
              >
                Save New Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
