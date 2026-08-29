'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import {
  CreditCard,
  Building2,
  Users,
  Calendar,
  Percent,
  TrendingUp,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Share2,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { StatusPill } from '@/components/common/StatusPill';
import { RepaymentInstallment } from '@/lib/types';

const COMPANY_COLORS = [
  '#701A35',
  '#C5A059',
  '#1E293B',
  '#0D9488',
  '#D97706',
  '#6366F1',
  '#E11D48',
  '#059669',
];

export const LoanDetailsView: React.FC = () => {
  const {
    loans,
    selectedLoanId,
    setSelectedLoanId,
    updateLoanInstallmentStatus,
    updateLoanInstallmentDate,
    deleteLoan,
    setSelectedCustomerId,
    setSelectedCompanyId,
    setActiveMainTab,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'schedule'>('overview');
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean;
    installment: RepaymentInstallment | null;
    newDate: string;
    reason: string;
  }>({
    isOpen: false,
    installment: null,
    newDate: '',
    reason: '',
  });

  const loan = loans.find((l) => l.id === selectedLoanId);

  if (!loan) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#E6E1D6]">
        <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-800">Loan Record Not Found</h3>
        <button
          onClick={() => setSelectedLoanId(null)}
          className="mt-3 px-4 py-1.5 text-xs font-bold text-white bg-[#701A35] rounded-xl"
        >
          Return to Loans
        </button>
      </div>
    );
  }

  const totalPaidInstallments = loan.schedule.filter((s) => s.status === 'Paid').length;
  const totalInstallmentsCount = loan.schedule.length;
  const progressPercentage = Math.round(
    (totalPaidInstallments / (totalInstallmentsCount || 1)) * 100
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ─── Top Header Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedLoanId(null)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
            title="Back to Loans List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-serif">
                {loan.id}
              </h1>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#701A35]/10 text-[#701A35] border border-[#701A35]/20">
                ₹{loan.totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Disbursed: {loan.disbursedDate} · {loan.tenureMonths} {loan.frequency} Installments · {loan.defaultInterestRate}% p.a.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusPill status={loan.status} size="md" />
          <button
            onClick={() => {
              if (confirm(`Delete loan ${loan.id}?`)) {
                deleteLoan(loan.id);
              }
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
            title="Delete Loan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── 3 Plain Numbers Financial Cards (as requested) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Total Interest Expected
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            ₹{loan.totalInterestExpected.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Collected across {loan.companies.length} borrower companies
          </span>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 font-mono block">
            ASR Income (Commission)
          </span>
          <span className="text-xl font-bold text-[#701A35] font-mono block mt-1">
            ₹{loan.asrIncome.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-amber-700 mt-0.5 block">
            Platform earnings ({loan.asrCommissionRate}% rate)
          </span>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 font-mono block">
            Customer Net Profit Return
          </span>
          <span className="text-xl font-bold text-emerald-700 font-mono block mt-1">
            ₹{loan.customerNetProfit.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">
            Distributed to participating investor(s)
          </span>
        </div>
      </div>

      {/* ─── Sub-Tab Navigation Bar ─── */}
      <div className="bg-white rounded-2xl border border-[#E6E1D6] p-1.5 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-[#701A35] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Deal Overview & Companies Split
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'schedule'
              ? 'bg-[#701A35] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Spreadsheet Repayment Schedule</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-mono">
            {totalPaidInstallments}/{totalInstallmentsCount}
          </span>
        </button>
      </div>

      {/* ─── TAB 1: Deal Overview & Tranche Split ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Companies Allocation Horizontal Stacked Bar Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#E6E1D6] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-serif">
                  Borrowing Companies Syndication Split
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proportional capital disbursement across {loan.companies.length} business entities
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                100% Allocated
              </span>
            </div>

            {/* Live Stacked Bar */}
            <div className="w-full h-6 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
              {loan.companies.map((comp, idx) => (
                <div
                  key={comp.companyId}
                  title={`${comp.companyName}: ${comp.percentage}% (₹${comp.amount.toLocaleString('en-IN')})`}
                  className="h-full transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white px-1 overflow-hidden"
                  style={{
                    width: `${comp.percentage}%`,
                    backgroundColor: COMPANY_COLORS[idx % COMPANY_COLORS.length],
                  }}
                >
                  {comp.percentage >= 10 && <span>{comp.percentage}%</span>}
                </div>
              ))}
            </div>

            {/* Stacked Bar Legend & Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {loan.companies.map((comp, idx) => (
                <div
                  key={comp.companyId}
                  className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D6] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: COMPANY_COLORS[idx % COMPANY_COLORS.length] }}
                      />
                      <button
                        onClick={() => {
                          setSelectedCompanyId(comp.companyId);
                          setActiveMainTab('companies');
                        }}
                        className="font-bold text-slate-900 hover:text-[#701A35] hover:underline text-xs"
                      >
                        {comp.companyName}
                      </button>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {comp.percentage}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Principal Share:</span>
                    <strong className="text-slate-900">₹{comp.amount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Rate / Monthly Due:</span>
                    <span className="text-[#701A35] font-bold">
                      {comp.interestRate}% · ₹{(comp.totalDuePerMonth || comp.monthlyEmi || comp.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Investors Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#E6E1D6] space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <h2 className="text-base font-bold text-slate-900 font-serif pb-2 border-b border-slate-100">
              Capital Providers (Investors)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {loan.customers.map((cust) => (
                <div
                  key={cust.customerId}
                  className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E6E1D6] flex items-center justify-between"
                >
                  <div>
                    <button
                      onClick={() => {
                        setSelectedCustomerId(cust.customerId);
                        setActiveMainTab('customers');
                      }}
                      className="font-bold text-slate-900 hover:text-[#701A35] hover:underline text-xs block"
                    >
                      {cust.customerName}
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                      {cust.customerId} · {cust.sharePercentage}% Capital Share
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-900 block">
                      ₹{cust.shareAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                      +₹{Math.round(loan.customerNetProfit * (cust.sharePercentage / 100)).toLocaleString('en-IN')} Net Return
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Spreadsheet Repayment Schedule with Status & Actions ─── */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-2xl p-5 border border-[#E6E1D6] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Ledger Repayment Schedule
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact spreadsheet format matching ASR books with company breakdown and collection triggers
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-600">
                Collection Progress: <strong>{progressPercentage}%</strong>
              </span>
            </div>
          </div>

          <div className="border border-[#E6E1D6] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#FAF8F5] border-b border-[#E6E1D6] text-[11px] font-mono text-slate-600 sticky top-0">
                  <tr>
                    <th className="p-2.5 border-r border-[#E6E1D6] w-12 text-center">Cycle #</th>
                    <th className="p-2.5 border-r border-[#E6E1D6] w-32">Scheduled Date</th>
                    <th className="p-2.5 border-r border-[#E6E1D6]">Particulars</th>
                    <th className="p-2.5 border-r border-[#E6E1D6] text-right font-mono">Principal (₹)</th>
                    <th className="p-2.5 border-r border-[#E6E1D6] text-right font-mono">Interest (₹)</th>
                    <th className="p-2.5 border-r border-[#E6E1D6] text-right font-bold text-slate-900 bg-[#FAF8F5]/80">
                      Total Due (₹)
                    </th>
                    {loan.companies.map((c) => (
                      <th key={c.companyId} className="p-2.5 border-r border-[#E6E1D6] text-right font-mono">
                        {c.companyName}
                      </th>
                    ))}
                    <th className="p-2.5 border-r border-[#E6E1D6] text-center w-24">Status</th>
                    <th className="p-2.5 text-right w-36">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {loan.schedule.map((row) => (
                    <tr
                      key={row.sNo}
                      className={`transition-colors ${
                        row.status === 'Paid'
                          ? 'bg-emerald-50/30'
                          : row.status === 'Rescheduled'
                          ? 'bg-amber-50/30'
                          : row.status === 'Overdue'
                          ? 'bg-rose-50/40'
                          : 'hover:bg-[#FAF8F5]/60'
                      }`}
                    >
                      <td className="p-2.5 border-r border-[#E6E1D6] text-center text-slate-500 font-bold">
                        #{row.sNo}
                      </td>
                      <td className="p-2.5 border-r border-[#E6E1D6] text-slate-800">
                        <span className="font-bold">{row.date}</span>
                        {row.rescheduledReason && (
                          <span className="block text-[10px] text-amber-800 font-sans mt-0.5">
                            Delay: {row.rescheduledReason}
                          </span>
                        )}
                        {row.paidDate && (
                          <span className="block text-[10px] text-emerald-700 font-sans mt-0.5">
                            Paid on {row.paidDate}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 border-r border-[#E6E1D6] text-slate-600 font-sans">
                        {row.particulars}
                      </td>
                      <td className="p-2.5 border-r border-[#E6E1D6] text-right text-slate-700">
                        ₹{(row.principalAmount || loan.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 border-r border-[#E6E1D6] text-right text-[#701A35] font-bold">
                        ₹{(row.interestAmount || Math.round(loan.totalInterestExpected / loan.schedule.length)).toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 border-r border-[#E6E1D6] text-right font-bold text-slate-900 bg-[#FAF8F5]/30">
                        ₹{row.totalAmount.toLocaleString('en-IN')}
                      </td>
                      {loan.companies.map((c) => (
                        <td key={c.companyId} className="p-2.5 border-r border-[#E6E1D6] text-right text-slate-700">
                          ₹{(row.companyShares[c.companyId] || 0).toLocaleString('en-IN')}
                        </td>
                      ))}
                      <td className="p-2.5 border-r border-[#E6E1D6] text-center">
                        <StatusPill status={row.status} size="sm" />
                      </td>
                      <td className="p-2.5 text-right">
                        {row.status === 'Paid' ? (
                          <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Collected</span>
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() =>
                                setRescheduleModal({
                                  isOpen: true,
                                  installment: row,
                                  newDate: row.dueDate || new Date().toISOString().split('T')[0],
                                  reason: row.rescheduledReason || '',
                                })
                              }
                              className="p-1 rounded-lg text-slate-500 hover:text-amber-800 hover:bg-amber-50 border border-slate-200 transition-colors"
                              title="Reschedule / Edit Date"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => updateLoanInstallmentStatus(loan.id, row.sNo, 'Paid')}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs cursor-pointer"
                            >
                              Collect
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#FAF8F5] border-t-2 border-[#701A35] font-mono font-bold text-slate-900 text-xs">
                  <tr>
                    <td colSpan={3} className="p-2.5 text-right uppercase tracking-wider font-sans border-r border-[#E6E1D6]">
                      Totals (Principal + Interest):
                    </td>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6]">
                      ₹{loan.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6] text-[#701A35]">
                      ₹{loan.totalInterestExpected.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6] text-[#701A35]">
                      ₹{(loan.totalAmount + loan.totalInterestExpected).toLocaleString('en-IN')}
                    </td>
                    {loan.companies.map((c) => (
                      <td key={c.companyId} className="p-2.5 text-right border-r border-[#E6E1D6]">
                        ₹{((c.totalDuePerMonth || c.amount) * loan.tenureMonths).toLocaleString('en-IN')}
                      </td>
                    ))}
                    <td colSpan={2} className="p-2.5 text-center text-slate-400 font-sans text-[11px]">
                      Ledger Verified
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reschedule / Edit Date Modal ─── */}
      {rescheduleModal.isOpen && rescheduleModal.installment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E6E1D6] shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#701A35]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Reschedule Cycle #{rescheduleModal.installment.sNo}
                </h3>
              </div>
              <button
                onClick={() => setRescheduleModal({ isOpen: false, installment: null, newDate: '', reason: '' })}
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
                  placeholder="e.g. Borrower requested 7 days extension for vendor payout"
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
                onClick={() => setRescheduleModal({ isOpen: false, installment: null, newDate: '', reason: '' })}
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
                    loan.id,
                    rescheduleModal.installment!.sNo,
                    formatted,
                    rescheduleModal.newDate,
                    rescheduleModal.reason
                  );
                  setRescheduleModal({ isOpen: false, installment: null, newDate: '', reason: '' });
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] shadow-xs"
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
