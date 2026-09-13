'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import {
  CreditCard,
  Building2,
  Users,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
  X,
  Edit3,
} from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { Installment } from '@/lib/types';
import { EditLoanExcelModal } from './EditLoanExcelModal';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';

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
    updateLoanInstallment,
    deleteLoan,
    setSelectedCustomerId,
    setSelectedCompanyId,
    setActiveMainTab,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'schedule'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  const installments = loan.installments || [];
  const splits = loan.splits || [];
  const totalPaidInstallments = installments.filter((s) => s.status === 'PASS' || s.status === 'CLS').length;
  const totalInstallmentsCount = installments.length;
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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 font-serif">
                {loan.customerName || loan.id}
              </h1>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#701A35]/10 text-[#701A35] border border-[#701A35]/20">
                  ₹{loan.totalAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  ({numberToWordsINR(loan.totalAmount)})
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Code: {loan.codeNo || '—'} · Disbursed: {loan.startDate} · {loan.installmentCount} {loan.frequency} EMIs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Prominent Edit Loan in Excel Grid Button */}
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-2 bg-[#FAF8F5] border border-[#701A35]/30 hover:bg-[#701A35] hover:text-white text-[#701A35] text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Edit loan and payment schedule"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Loan & Schedule</span>
          </button>

          <StatusPill status={loan.status} size="md" />
          <button
            onClick={() => {
              if (confirm(`Delete loan for ${loan.customerName}?`)) {
                deleteLoan(loan.id);
                setSelectedLoanId(null);
              }
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
            title="Delete Loan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── 3 Financial Summary Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Total Loan Amount
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            ₹{loan.totalAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-600 font-medium block leading-snug">
            {numberToWordsINR(loan.totalAmount)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Funded across {splits.length} partner companies
          </span>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 font-mono block">
            Payments Completed
          </span>
          <span className="text-xl font-bold text-[#701A35] font-mono block mt-1">
            {totalPaidInstallments} / {totalInstallmentsCount} Settled
          </span>
          <span className="text-[11px] text-amber-900 font-medium block leading-snug">
            ₹{(loan.totalCollected ?? 0).toLocaleString('en-IN')} ({numberToWordsINR(loan.totalCollected ?? 0)})
          </span>
          <span className="text-[10px] text-amber-700 mt-0.5 block">
            {progressPercentage}% of EMIs settled
          </span>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 font-mono block">
            Borrower Details
          </span>
          <span className="text-base font-bold text-emerald-800 block mt-1 truncate">
            {loan.customerName}
          </span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block font-mono">
            Frequency: {loan.frequency}
          </span>
        </div>
      </div>

      {/* ─── Sub-Tab Navigation Bar ─── */}
      <div className="bg-white rounded-2xl border border-[#E6E1D6] p-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-[#701A35] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Funding Breakdown
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
            <span>Payment Schedule</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-mono">
              {totalPaidInstallments}/{totalInstallmentsCount}
            </span>
          </button>
        </div>

        <button
          onClick={() => setIsEditModalOpen(true)}
          className="px-3 py-1.5 text-xs font-bold text-[#701A35] hover:bg-[#FAF8F5] rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit Loan & Schedule</span>
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
                  Funding Company Splits
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Capital funded across {splits.length} partner companies
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                100% Allocated
              </span>
            </div>

            {/* Live Stacked Bar */}
            <div className="w-full h-6 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
              {splits.map((comp, idx) => (
                <div
                  key={comp.id || idx}
                  className="h-full transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white px-1 overflow-hidden"
                  style={{
                    width: `${comp.splitPercent}%`,
                    backgroundColor: COMPANY_COLORS[idx % COMPANY_COLORS.length],
                  }}
                >
                  {comp.splitPercent >= 10 && <span>{comp.splitPercent}%</span>}
                </div>
              ))}
            </div>

            {/* Stacked Bar Legend & Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {splits.map((comp, idx) => (
                <div
                  key={comp.id || idx}
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
                        className="font-bold text-slate-900 hover:text-[#701A35] hover:underline text-xs cursor-pointer"
                      >
                        {comp.companyName || comp.companyCode}
                      </button>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {comp.splitPercent}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Amount Funded:</span>
                    <div className="text-right">
                      <strong className="text-slate-900 block">₹{comp.splitAmount.toLocaleString('en-IN')}</strong>
                      <span className="text-[10px] text-slate-500 font-sans block">{numberToWordsINR(comp.splitAmount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Spreadsheet Repayment Schedule ─── */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-2xl p-5 border border-[#E6E1D6] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Payment Schedule
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All scheduled EMI payments and collection records
              </p>
            </div>
            <span className="text-xs font-mono text-slate-600">
              Collected: <strong>{progressPercentage}%</strong>
            </span>
          </div>

          <div className="border border-[#E6E1D6] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#FAF8F5] border-b border-[#E6E1D6] text-[11px] font-mono text-slate-600 sticky top-0">
                  <tr>
                    <th className="p-2.5 border-r border-[#E6E1D6] w-12 text-center">#</th>
                    <th className="p-2.5 border-r border-[#E6E1D6] w-28">Due Date</th>
                    <th className="p-2.5 border-r border-[#E6E1D6] text-right font-mono">Amount Due (₹)</th>
                    <th className="p-2.5 border-r border-[#E6E1D6] text-center w-24">Status</th>
                    <th className="p-2.5 border-r border-[#E6E1D6] w-28">Payment Date</th>
                    <th className="p-2.5 border-r border-[#E6E1D6] w-28">Payment Mode</th>
                    <th className="p-2.5 border-r border-[#E6E1D6] w-24">Deposit Name</th>
                    <th className="p-2.5 border-r border-[#E6E1D6]">Notes</th>
                    <th className="p-2.5 text-right w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {installments.map((row) => (
                    <tr
                      key={row.id || row.seqNo}
                      className={`transition-colors ${
                        row.status === 'PASS' || row.status === 'CLS'
                          ? 'bg-emerald-50/30'
                          : row.status === 'RET' || row.status === 'RET NEFT' || row.status === 'RET PASS'
                          ? 'bg-rose-50/40'
                          : 'hover:bg-[#FAF8F5]/60'
                      }`}
                    >
                      <td className="p-2.5 border-r border-[#E6E1D6] text-center text-slate-500 font-bold">
                        #{row.seqNo}
                      </td>
                      <td className="p-2.5 border-r border-[#E6E1D6] text-slate-800 font-bold">
                        {row.dueDate}
                      </td>
                      <td className="p-2.5 border-r border-[#E6E1D6] text-right font-bold text-slate-900">
                        <span className="block">₹{row.amountDue.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-slate-500 font-sans block leading-tight font-normal">
                          {numberToWordsINR(row.amountDue)}
                        </span>
                      </td>
                      <td className="p-2.5 border-r border-[#E6E1D6] text-center">
                        <StatusPill status={row.status} size="sm" />
                      </td>
                      <td className="p-2.5 border-r border-[#E6E1D6] text-slate-600">
                        {row.recdDate || '—'}
                      </td>
                      <td className="p-2.5 border-r border-[#E6E1D6] text-slate-600 truncate max-w-[100px]">
                        {row.chqNo || '—'}
                      </td>
                      <td className="p-2.5 border-r border-[#E6E1D6] text-slate-700 font-bold">
                        {row.depName || '—'}
                      </td>
                      <td className="p-2.5 border-r border-[#E6E1D6] text-slate-500 font-sans truncate max-w-[150px]">
                        {row.remarks || '—'}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
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
                          {row.status === 'PASS' ? 'Undo' : 'Mark Paid'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#FAF8F5] border-t-2 border-[#701A35] font-mono font-bold text-slate-900 text-xs">
                  <tr>
                    <td colSpan={2} className="p-2.5 text-right uppercase tracking-wider font-sans border-r border-[#E6E1D6]">
                      Total Due:
                    </td>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6] text-[#701A35]">
                      ₹{loan.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={6} className="p-2.5 text-center text-slate-400 font-sans text-[11px]">
                      {installments.length} Scheduled Installments
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Excel Spreadsheet Edit Modal */}
      <EditLoanExcelModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        loan={loan}
      />
    </div>
  );
};
