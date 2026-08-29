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
  FileSpreadsheet,
  Download,
  Filter,
  Eye,
  X,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/common/DataTable';
import { StatusPill } from '@/components/common/StatusPill';
import { RepaymentInstallment, IntermediaryLoan } from '@/lib/types';

interface FlatScheduleItem extends RepaymentInstallment {
  loanId: string;
  loanTotalAmount: number;
  customersSummary: string;
  companiesSummary: string;
  loanStatus: string;
}

export const ScheduleView: React.FC = () => {
  const {
    loans,
    setSelectedLoanId,
    setActiveMainTab,
    updateLoanInstallmentStatus,
    updateLoanInstallmentDate,
    showToast,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Paid' | 'Rescheduled' | 'Overdue'>('ALL');
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

  // Flatten installments across all loans
  const allScheduleItems: FlatScheduleItem[] = useMemo(() => {
    const items: FlatScheduleItem[] = [];
    loans.forEach((loan) => {
      loan.schedule.forEach((inst) => {
        items.push({
          ...inst,
          loanId: loan.id,
          loanTotalAmount: loan.totalAmount,
          customersSummary: loan.customers.map((c) => c.customerName).join(', '),
          companiesSummary: loan.companies.map((c) => c.companyName).join(', '),
          loanStatus: loan.status,
        });
      });
    });
    return items;
  }, [loans]);

  const filteredItems = useMemo(() => {
    if (statusFilter === 'ALL') return allScheduleItems;
    return allScheduleItems.filter((item) => item.status === statusFilter);
  }, [allScheduleItems, statusFilter]);

  const totalUpcomingDue = useMemo(
    () =>
      allScheduleItems
        .filter((i) => i.status !== 'Paid')
        .reduce((acc, i) => acc + (i.totalAmount || 0), 0),
    [allScheduleItems]
  );

  const totalCollectedSum = useMemo(
    () =>
      allScheduleItems
        .filter((i) => i.status === 'Paid')
        .reduce((acc, i) => acc + (i.totalAmount || 0), 0),
    [allScheduleItems]
  );

  const columns: ColumnDef<FlatScheduleItem>[] = [
    {
      key: 'date',
      header: 'Scheduled Date',
      sortable: true,
      accessor: (i) => i.date,
      render: (i) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-900 block">
            {i.date}
          </span>
          {i.rescheduledReason && (
            <span className="text-[10px] text-amber-800 font-sans block mt-0.5">
              Reason: {i.rescheduledReason}
            </span>
          )}
          {i.paidDate && (
            <span className="text-[10px] text-emerald-700 font-sans block mt-0.5">
              Paid: {i.paidDate}
            </span>
          )}
        </div>
      ),
      exportValue: (i) => i.date,
    },
    {
      key: 'loanId',
      header: 'Loan Deal',
      sortable: true,
      accessor: (i) => i.loanId,
      render: (i) => (
        <div>
          <button
            onClick={() => {
              setSelectedLoanId(i.loanId);
              setActiveMainTab('loans');
            }}
            className="font-mono text-xs font-bold text-[#701A35] hover:underline block text-left cursor-pointer"
          >
            {i.loanId}
          </button>
          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
            Cycle #{i.sNo}
          </span>
        </div>
      ),
      exportValue: (i) => `${i.loanId} (Cycle #${i.sNo})`,
    },
    {
      key: 'customersSummary',
      header: 'Customer Investor(s)',
      sortable: true,
      accessor: (i) => i.customersSummary,
      render: (i) => (
        <span className="font-semibold text-slate-900 text-xs block truncate max-w-xs">
          {i.customersSummary}
        </span>
      ),
      exportValue: (i) => i.customersSummary,
    },
    {
      key: 'companiesSummary',
      header: 'Borrower Company(ies)',
      sortable: true,
      accessor: (i) => i.companiesSummary,
      render: (i) => (
        <span className="text-xs text-slate-700 block truncate max-w-xs">
          {i.companiesSummary}
        </span>
      ),
      exportValue: (i) => i.companiesSummary,
    },
    {
      key: 'principalAmount',
      header: 'Principal (₹)',
      sortable: true,
      align: 'right',
      accessor: (i) => i.principalAmount || i.loanTotalAmount,
      render: (i) => (
        <span className="font-mono text-xs text-slate-700">
          ₹{(i.principalAmount || i.loanTotalAmount).toLocaleString('en-IN')}
        </span>
      ),
      exportValue: (i) => i.principalAmount || i.loanTotalAmount,
    },
    {
      key: 'interestAmount',
      header: 'Monthly Interest (₹)',
      sortable: true,
      align: 'right',
      accessor: (i) => i.interestAmount || 0,
      render: (i) => (
        <span className="font-mono text-xs font-bold text-[#701A35]">
          ₹{(i.interestAmount || 0).toLocaleString('en-IN')}
        </span>
      ),
      exportValue: (i) => i.interestAmount || 0,
    },
    {
      key: 'totalAmount',
      header: 'Total Settlement (₹)',
      sortable: true,
      align: 'right',
      accessor: (i) => i.totalAmount,
      render: (i) => (
        <span className="font-mono text-xs font-bold text-slate-900 bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E6E1D6]">
          ₹{i.totalAmount.toLocaleString('en-IN')}
        </span>
      ),
      exportValue: (i) => i.totalAmount,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortable: true,
      accessor: (i) => i.status,
      render: (i) => <StatusPill status={i.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      filterable: false,
      render: (i) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {i.status === 'Paid' ? (
            <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-end gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settled</span>
            </span>
          ) : (
            <>
              <button
                onClick={() =>
                  setRescheduleModal({
                    isOpen: true,
                    loanId: i.loanId,
                    installment: i,
                    newDate: i.dueDate || new Date().toISOString().split('T')[0],
                    reason: i.rescheduledReason || '',
                  })
                }
                className="px-2 py-1 text-xs font-bold text-slate-700 hover:text-amber-800 bg-[#FAF8F5] hover:bg-amber-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Edit / Reschedule Date"
              >
                📅 Edit Date
              </button>
              <button
                onClick={() => updateLoanInstallmentStatus(i.loanId, i.sNo, 'Paid')}
                className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs cursor-pointer"
              >
                Collect
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6 animate-in fade-in duration-200">
      {/* ─── Top Header Card ─── */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 font-serif">
              Revolving Repayment & Settlement Schedule
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {allScheduleItems.length} Cycles
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Credit card-style monthly settlement timeline: full principal + interest paid by companies on scheduled dates
          </p>
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'Pending', 'Paid', 'Rescheduled', 'Overdue'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                statusFilter === st
                  ? 'bg-[#701A35] text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-slate-600 hover:bg-slate-100 border border-[#E6E1D6]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 3 High-Contrast Financial Totals ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Upcoming Settlements Due
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            ₹{totalUpcomingDue.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Pending cycle disbursements & collections</span>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider font-mono">
            Total Settled / Collected
          </span>
          <span className="text-xl font-bold text-emerald-700 font-mono block mt-1">
            ₹{totalCollectedSum.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">Successfully received & distributed</span>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider font-mono">
            Rescheduled / Delayed
          </span>
          <span className="text-xl font-bold text-[#701A35] font-mono block mt-1">
            {allScheduleItems.filter((i) => i.status === 'Rescheduled' || i.status === 'Overdue').length} Cycles
          </span>
          <span className="text-[10px] text-amber-700 mt-0.5 block">Adjusted repayment dates</span>
        </div>
      </div>

      {/* ─── Schedule DataTable ─── */}
      {allScheduleItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-[#E6E1D6] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#701A35]/10 text-[#701A35] flex items-center justify-center mx-auto">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Scheduled Settlements Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Create a loan in the Loans tab to automatically generate monthly revolving credit schedules.
            </p>
          </div>
          <button
            onClick={() => setActiveMainTab('loans')}
            className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>Go to Loans Module</span>
          </button>
        </div>
      ) : (
        <DataTable
          data={filteredItems}
          columns={columns}
          keyExtractor={(i) => `${i.loanId}-${i.sNo}`}
          title="Consolidated Settlement Ledger"
          searchPlaceholder="Search by loan ID, investor, company, or date..."
          exportFileName="ASR_Settlement_Schedule"
        />
      )}

      {/* ─── Reschedule Modal ─── */}
      {rescheduleModal.isOpen && rescheduleModal.installment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E6E1D6] shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#701A35]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Reschedule {rescheduleModal.loanId} · Cycle #{rescheduleModal.installment.sNo}
                </h3>
              </div>
              <button
                onClick={() => setRescheduleModal({ isOpen: false, loanId: '', installment: null, newDate: '', reason: '' })}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Current Scheduled Date:</span>
                <span className="font-mono font-bold text-slate-800 bg-[#FAF8F5] px-2 py-1 rounded border border-[#E6E1D6] block">
                  {rescheduleModal.installment.date}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  New Settlement Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={rescheduleModal.newDate}
                  onChange={(e) =>
                    setRescheduleModal((prev) => ({ ...prev, newDate: e.target.value }))
                  }
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#701A35] font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Delay / Reschedule Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Company requested extension due to delayed billing"
                  value={rescheduleModal.reason}
                  onChange={(e) =>
                    setRescheduleModal((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#701A35] text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRescheduleModal({ isOpen: false, loanId: '', installment: null, newDate: '', reason: '' })}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!rescheduleModal.newDate) {
                    showToast('Validation', 'Please select a new date.', 'warning');
                    return;
                  }
                  const dObj = new Date(rescheduleModal.newDate);
                  const formatted = !isNaN(dObj.getTime())
                    ? `${dObj.getDate()}-${dObj.toLocaleString('en-US', { month: 'short' })}-${dObj.getFullYear()}`
                    : rescheduleModal.newDate;

                  await updateLoanInstallmentDate(
                    rescheduleModal.loanId,
                    rescheduleModal.installment!.sNo,
                    formatted,
                    rescheduleModal.newDate,
                    rescheduleModal.reason
                  );
                  setRescheduleModal({ isOpen: false, loanId: '', installment: null, newDate: '', reason: '' });
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] shadow-xs cursor-pointer"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
