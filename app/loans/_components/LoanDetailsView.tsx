'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { EditLoanExcelModal } from './EditLoanExcelModal';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { StatusPill } from '@/components/ui/StatusPill';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { getDerivedLoanStatus } from './LoansListView';

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
  const router = useRouter();
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
    isLoading,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'schedule'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const cleanSelectedId = String(selectedLoanId || '').trim().toLowerCase();
  const loan = loans.find(
    (l) =>
      l.id.toLowerCase() === cleanSelectedId ||
      (l.codeNo && l.codeNo.toLowerCase() === cleanSelectedId) ||
      l.customerName.toLowerCase() === cleanSelectedId
  );

  if (!loan) {
    if (isLoading) {
      return (
        <div className="space-y-6 animate-pulse">
          <div className="h-28 bg-slate-200 rounded-2xl w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-28 bg-slate-200 rounded-2xl" />
            <div className="h-28 bg-slate-200 rounded-2xl" />
            <div className="h-28 bg-slate-200 rounded-2xl" />
          </div>
          <div className="h-64 bg-slate-200 rounded-2xl w-full" />
        </div>
      );
    }
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-800">Loan Record Not Found</h3>
        <button
          onClick={() => {
            setSelectedLoanId(null);
            router.push('/loans');
          }}
          className="mt-3 px-4 py-1.5 text-xs font-bold text-white bg-[#701A35] rounded-xl cursor-pointer"
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── Top Header Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedLoanId(null);
              router.push('/loans');
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 shadow-2xs"
            title="Back to Loans List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-950 font-serif">
                {loan.customerName || loan.id}
              </h1>
              <div className="flex items-center gap-1.5 flex-wrap">
                <MoneyDisplay
                  amount={loan.totalAmount}
                  size="sm"
                  amountClassName="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#701A35]/10 text-[#701A35] border border-[#701A35]/20 inline-block"
                />
                {loan.disbursedAmount != null && loan.disbursedAmount > 0 && (
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 inline-block">
                    Disbursed: ₹{loan.disbursedAmount.toLocaleString('en-IN')}
                  </span>
                )}
                {loan.interestAmount != null && loan.interestAmount > 0 && (
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 inline-block">
                    Interest: ₹{loan.interestAmount.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5 font-mono">
              Code: {loan.codeNo || '—'} · Start Date: {loan.startDate} · {loan.installmentCount} {loan.frequency} EMIs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Prominent Edit Loan in Excel Grid Button */}
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Edit loan and payment schedule"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#701A35]" />
            <span>Edit Loan & Schedule</span>
          </button>

          <StatusPill status={getDerivedLoanStatus(loan)} size="md" />
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer shadow-2xs btn-press"
            title="Delete Loan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Financial Summary Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-[#701A35]/12 via-[#FAF8F5] to-white p-3 rounded-xl border-2 border-[#701A35]/30 shadow-sm hover:border-[#701A35]/50 transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#701A35] font-mono block">
            Total Loan Amount
          </span>
          <div className="mt-1">
            <MoneyDisplay
              amount={loan.totalAmount}
              size="lg"
              amountClassName="text-[#701A35] font-black text-xl block tracking-tight"
            />
          </div>
          <span className="text-[10px] text-slate-600 font-medium mt-0.5 block">
            Gross repayable across {splits.length} partner companies
          </span>
        </div>

        <div className="bg-gradient-to-br from-indigo-100/80 via-indigo-50/40 to-white p-3 rounded-xl border-2 border-indigo-200/90 shadow-sm hover:border-indigo-300 transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-950 font-mono block">
            Paid / Disbursed
          </span>
          <div className="mt-1">
            {loan.disbursedAmount != null && loan.disbursedAmount > 0 ? (
              <MoneyDisplay
                amount={loan.disbursedAmount}
                size="lg"
                amountClassName="text-indigo-950 font-black text-xl block tracking-tight"
              />
            ) : (
              <span className="text-xl font-black text-slate-400 font-mono block tracking-tight">—</span>
            )}
          </div>
          <span className="text-[10px] text-indigo-800 font-medium mt-0.5 block">
            Net capital handed to borrower
          </span>
        </div>

        <div className="bg-gradient-to-br from-amber-100/90 via-amber-50 to-white p-3 rounded-xl border-2 border-amber-300 shadow-sm hover:border-amber-400 transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 font-mono block">
            Interest Amount (ASR Margin)
          </span>
          <div className="mt-1">
            {loan.interestAmount != null && loan.interestAmount > 0 ? (
              <MoneyDisplay
                amount={loan.interestAmount}
                size="lg"
                amountClassName="text-[#701A35] font-black text-xl block tracking-tight"
              />
            ) : (
              <span className="text-xl font-black text-slate-400 font-mono block tracking-tight">—</span>
            )}
          </div>
          <span className="text-[10px] text-amber-800 font-bold mt-0.5 block">
            {loan.interestAmount != null && loan.interestAmount > 0 && loan.totalAmount > 0
              ? `${((loan.interestAmount / loan.totalAmount) * 100).toFixed(1)}% upfront margin`
              : 'Upfront fee / margin'}
          </span>
        </div>

        <div className="bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white p-3 rounded-xl border-2 border-emerald-300 shadow-sm hover:border-emerald-400 transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 font-mono block">
            Payments Completed
          </span>
          <div className="mt-1">
            <span className="text-xl font-black text-emerald-700 font-mono block tracking-tight">
              {totalPaidInstallments} / {totalInstallmentsCount} Settled
            </span>
          </div>
          <span className="text-[10px] text-emerald-800 font-bold mt-0.5 block">
            {progressPercentage}% recovery rate (₹{(loan.totalCollected ?? 0).toLocaleString('en-IN')})
          </span>
        </div>
      </div>

      {/* ─── Sub-Tab Navigation Bar ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5 sm:pb-0 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold btn-press transition-all duration-120 whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#701A35] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Funding Breakdown
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold btn-press transition-all duration-120 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-[#701A35] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span>Payment Schedule</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-mono">
              {totalPaidInstallments}/{totalInstallmentsCount}
            </span>
          </button>
        </div>

        <button
          onClick={() => setIsEditModalOpen(true)}
          className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs btn-press"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#701A35]" />
          <span>Edit Loan & Schedule</span>
        </button>
      </div>

      {/* ─── TAB 1: Deal Overview & Tranche Split ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Companies Allocation Horizontal Stacked Bar Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-950 font-serif">
                  Funding Company Splits
                </h2>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
              {splits.map((comp, idx) => (
                <div
                  key={comp.id || idx}
                  className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-1.5"
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
                      <MoneyDisplay
                        amount={comp.splitAmount}
                        size="sm"
                        amountClassName="text-slate-900 font-bold block"
                      />
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
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-950 font-serif">
                Payment Schedule
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                All scheduled EMI payments and collection records
              </p>
            </div>
            <span className="text-xs font-mono text-slate-600">
              Collected: <strong>{progressPercentage}%</strong>
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 border-b-2 border-slate-200 text-[11px] font-mono text-slate-700 font-bold uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="p-2.5 border-r border-slate-200 w-12 text-center">#</th>
                    <th className="p-2.5 border-r border-slate-200 w-28">Due Date</th>
                    <th className="p-2.5 border-r border-slate-200 text-right font-mono">Amount Due (₹)</th>
                    <th className="p-2.5 border-r border-slate-200 text-center w-24">Status</th>
                    <th className="p-2.5 border-r border-slate-200 w-28">Payment Date</th>
                    <th className="p-2.5 border-r border-slate-200 w-28">Payment Mode</th>
                    <th className="p-2.5 border-r border-slate-200 w-24">Deposit Name</th>
                    <th className="p-2.5 border-r border-slate-200">Notes</th>
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
                          : 'hover:bg-[#FAF5ED]/50'
                      }`}
                    >
                      <td className="p-2.5 border-r border-slate-200 text-center text-slate-500 font-bold">
                        #{row.seqNo}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-800 font-bold">
                        {row.dueDate}
                      </td>
                      {(() => {
                        const isPaid = ['PASS', 'NEFT', 'CASH', 'PAID', 'CLOSED', 'SETTLED', 'Paid'].includes(row.status?.trim().toUpperCase());
                        return (
                          <td className={`p-2.5 border-r border-slate-200 text-right font-bold ${isPaid ? 'bg-emerald-50/70' : ''}`}>
                            <MoneyDisplay
                              amount={row.amountDue}
                              size="sm"
                              amountClassName={`block font-bold text-right ${isPaid ? 'text-emerald-800' : 'text-slate-900'}`}
                            />
                          </td>
                        );
                      })()}
                      <td className="p-2.5 border-r border-slate-200 text-center">
                        <StatusPill status={row.status} size="sm" />
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-600">
                        {row.recdDate || '—'}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-600 truncate max-w-[100px]">
                        {row.chqNo || '—'}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-700 font-bold">
                        {row.depName || '—'}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-500 font-sans truncate max-w-[150px]">
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
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer btn-press ${
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
                <tfoot className="bg-slate-100 border-t-2 border-slate-200 font-mono font-bold text-slate-900 text-xs">
                  <tr>
                    <td colSpan={2} className="p-2.5 text-right uppercase tracking-wider font-sans border-r border-slate-200">
                      Total Due:
                    </td>
                    <td className="p-2.5 text-right border-r border-slate-200 text-[#701A35]">
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

      {/* Custom Application Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          await deleteLoan(loan.id);
          setSelectedLoanId(null);
          setIsDeleteModalOpen(false);
          router.push('/loans');
        }}
        title="Delete Loan"
        message={`Are you sure you want to delete loan ${loan.id} for ${loan.customerName}? All installments, company splits, and ledger history will be permanently deleted.`}
        itemName={loan.customerName}
        itemCode={loan.id}
        itemAmount={loan.totalAmount}
        confirmText="Delete Loan"
        variant="danger"
      />
    </div>
  );
};
