'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import {
  CalendarDays,
  Calendar,
  CreditCard,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Eye,
  Search,
  TrendingUp,
} from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';

export const ScheduleView: React.FC = () => {
  const router = useRouter();
  const {
    loans,
    setSelectedLoanId,
    setActiveMainTab,
    updateLoanInstallment,
    isLoading,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Closed'>('ALL');
  const [expandedLoanIds, setExpandedLoanIds] = useState<Set<string>>(() => {
    return new Set(loans.length > 0 ? [loans[0].id] : []);
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
      const matchCust = (loan.customerName || '').toLowerCase().includes(q);
      const matchCode = (loan.codeNo || '').toLowerCase().includes(q);
      return matchId || matchCust || matchCode;
    });
  }, [loans, statusFilter, searchQuery]);

  // Overall KPI statistics
  const kpiStats = useMemo(() => {
    let totalCapital = 0;
    let totalCycles = 0;
    let paidCycles = 0;
    let pendingCycles = 0;
    let returnedCycles = 0;

    loans.forEach((l) => {
      totalCapital += l.totalAmount || 0;
      (l.installments || []).forEach((inst) => {
        totalCycles += 1;
        if (inst.status === 'PASS' || inst.status === 'CLS') {
          paidCycles += 1;
        } else if (inst.status === 'RET') {
          returnedCycles += 1;
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
      returnedCycles,
    };
  }, [loans]);

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
        <div className="space-y-3">
          <div className="h-24 bg-slate-200 rounded-2xl w-full" />
          <div className="h-24 bg-slate-200 rounded-2xl w-full" />
        </div>
      </div>
    );
  }

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
              Collections & Installment Schedules
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track EMI schedules and manage collection status across all active loan portfolios.
          </p>
        </div>

        <button
          onClick={() => {
            setActiveMainTab('loans');
            router.push('/loans');
          }}
          className="px-4 py-2 bg-[#701A35] hover:bg-[#5C142B] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <CreditCard className="w-4 h-4" />
          <span>Create Loan</span>
        </button>
      </div>

      {/* Top KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Total Portfolio
            </span>
            <CreditCard className="w-4 h-4 text-[#701A35]" />
          </div>
          <div className="mt-1">
            <MoneyDisplay
              amount={kpiStats.totalCapital}
              size="2xl"
              amountClassName="font-bold text-slate-900 block"
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Across {loans.length} client loans
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Total EMIs
            </span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-bold text-amber-700 font-mono block mt-1">
            {kpiStats.totalCycles}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Scheduled installments
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Settled Collections
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
              ? `${Math.round((kpiStats.paidCycles / kpiStats.totalCycles) * 100)}% settled`
              : '0%'}
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Pending / Bounced
            </span>
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-2xl font-bold text-rose-700 font-mono block mt-1">
            {kpiStats.pendingCycles + kpiStats.returnedCycles}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {kpiStats.returnedCycles} Returned · {kpiStats.pendingCycles} Due
          </span>
        </div>
      </div>

      {/* Main Schedule Loan Accordion List */}
      <div className="space-y-4">
        {/* Controls: Search & Status Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by borrower, code, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-[#701A35] transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(['ALL', 'Active', 'Closed'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-[#701A35] text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Accordion Cards */}
        {filteredLoans.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 font-serif">No schedule records found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No active repayment schedules match your current search criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLoans.map((loan) => {
              const isExpanded = expandedLoanIds.has(loan.id);
              const insts = loan.installments || [];
              const paidCount = insts.filter((i) => ['PASS', 'NEFT', 'CASH', 'CLS', 'CS', 'Paid'].includes(i.status)).length;
              const totalCycles = insts.length;
              const percentPaid = totalCycles > 0 ? Math.round((paidCount / totalCycles) * 100) : 0;
              const nextPending = insts.find((i) => i.status === 'PENDING');

              return (
                <div
                  key={loan.id}
                  className="bg-white rounded-2xl border border-[#E6E1D6] shadow-xs overflow-hidden transition-all"
                >
                  {/* Accordion Row Header */}
                  <div
                    onClick={() => toggleExpandLoan(loan.id)}
                    className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-[#701A35]/10 text-[#701A35] shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 font-bold" />
                        ) : (
                          <ChevronRight className="w-4 h-4 font-bold" />
                        )}
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
                          <StatusPill status={loan.status} />
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <Building2 className="w-3.5 h-3.5 text-amber-700" />
                          <span>Companies: {(loan.splits || []).map((s) => s.companyCode || s.companyName).join(', ') || 'N/A'}</span>
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
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLoanId(loan.id);
                          setActiveMainTab('loans');
                          router.push(`/loans/${loan.id}`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#701A35] hover:border-[#701A35] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Details</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 bg-white space-y-3 animate-in fade-in duration-150">
                      <div className="border border-[#E6E1D6] rounded-xl overflow-hidden shadow-2xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                            <thead className="bg-[#FAF8F5] border-b border-[#E6E1D6] text-[11px] font-mono text-slate-600">
                              <tr>
                                <th className="p-2.5 border-r border-[#E6E1D6] w-12 text-center">EMI #</th>
                                <th className="p-2.5 border-r border-[#E6E1D6] w-28">Due Date</th>
                                <th className="p-2.5 border-r border-[#E6E1D6] text-right font-mono">Amount (₹)</th>
                                <th className="p-2.5 border-r border-[#E6E1D6] text-center w-24">Status</th>
                                <th className="p-2.5 border-r border-[#E6E1D6] w-28">Recd Date</th>
                                <th className="p-2.5 border-r border-[#E6E1D6] w-24">Dep Name</th>
                                <th className="p-2.5 border-r border-[#E6E1D6]">Remarks</th>
                                <th className="p-2.5 text-right w-28">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                              {insts.map((row) => (
                                <tr key={row.id || row.seqNo} className="hover:bg-[#FAF8F5]/60 transition-colors">
                                  <td className="p-2.5 border-r border-[#E6E1D6] text-center text-slate-500 font-bold">
                                    #{row.seqNo}
                                  </td>
                                  <td className="p-2.5 border-r border-[#E6E1D6] font-bold text-slate-800">
                                    {row.dueDate}
                                  </td>
                                  <td className="p-2.5 border-r border-[#E6E1D6] text-right font-bold text-slate-900">
                                    <MoneyDisplay
                                      amount={row.amountDue}
                                      size="sm"
                                      amountClassName="block font-bold text-slate-900 text-right"
                                    />
                                  </td>
                                  <td className="p-2.5 border-r border-[#E6E1D6] text-center">
                                    <StatusPill status={row.status} />
                                  </td>
                                  <td className="p-2.5 border-r border-[#E6E1D6] text-slate-600">
                                    {row.recdDate || '—'}
                                  </td>
                                  <td className="p-2.5 border-r border-[#E6E1D6] font-bold text-slate-700">
                                    {row.depName || '—'}
                                  </td>
                                  <td className="p-2.5 border-r border-[#E6E1D6] text-slate-500 font-sans truncate max-w-[150px]">
                                    {row.remarks || '—'}
                                  </td>
                                  <td className="p-2.5 text-right">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const newStatus = row.status === 'PASS' ? 'PENDING' : 'PASS';
                                        const today = new Date().toISOString().split('T')[0];
                                        await updateLoanInstallment(row.id, {
                                          status: newStatus,
                                          recdDate: newStatus === 'PASS' ? today : null,
                                        });
                                      }}
                                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                        row.status === 'PASS'
                                          ? 'bg-slate-100 text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200'
                                          : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-2xs'
                                      }`}
                                    >
                                      {row.status === 'PASS' ? 'Undo' : 'Mark PASS'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
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
      </div>
    </div>
  );
};
