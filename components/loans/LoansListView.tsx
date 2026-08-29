'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { IntermediaryLoan } from '@/lib/types';
import {
  CreditCard,
  Plus,
  Search,
  TrendingUp,
  Download,
  Trash2,
  Eye,
  Building2,
  Users,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/common/DataTable';
import { StatusPill } from '@/components/common/StatusPill';
import { NewLoanWizardModal } from './NewLoanWizardModal';

export const LoansListView: React.FC = () => {
  const {
    loans,
    selectedLoanId,
    setSelectedLoanId,
    deleteLoan,
    showToast,
  } = useApp();

  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const totalCapitalSum = useMemo(
    () => loans.reduce((acc, l) => acc + (l.totalAmount || 0), 0),
    [loans]
  );

  const totalAsrIncomeSum = useMemo(
    () => loans.reduce((acc, l) => acc + (l.asrIncome || 0), 0),
    [loans]
  );

  const totalCustomerProfitSum = useMemo(
    () => loans.reduce((acc, l) => acc + (l.customerNetProfit || 0), 0),
    [loans]
  );

  const columns: ColumnDef<IntermediaryLoan>[] = [
    {
      key: 'id',
      header: 'Loan ID',
      sortable: true,
      align: 'left',
      accessor: (l) => l.id,
      render: (l) => (
        <button
          onClick={() => setSelectedLoanId(l.id)}
          className="font-mono text-xs font-bold text-[#701A35] hover:underline block text-left cursor-pointer"
        >
          {l.id}
        </button>
      ),
      exportValue: (l) => l.id,
    },
    {
      key: 'customers',
      header: 'Customer (Investor)',
      sortable: true,
      accessor: (l) => l.customers.map((c) => c.customerName).join(', '),
      render: (l) => (
        <div className="min-w-0 max-w-xs">
          <span className="font-bold text-slate-900 text-xs block truncate">
            {l.customers.map((c) => c.customerName).join(', ')}
          </span>
          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
            {l.customers.length === 1 ? 'Single Investor' : `${l.customers.length} Joint Investors`}
          </span>
        </div>
      ),
      exportValue: (l) => l.customers.map((c) => `${c.customerName} (${c.sharePercentage}%)`).join(', '),
    },
    {
      key: 'totalAmount',
      header: 'Amount (₹)',
      sortable: true,
      align: 'right',
      accessor: (l) => l.totalAmount,
      render: (l) => (
        <span className="font-mono text-xs font-bold text-slate-900">
          ₹{l.totalAmount.toLocaleString('en-IN')}
        </span>
      ),
      exportValue: (l) => l.totalAmount,
    },
    {
      key: 'companies',
      header: 'Borrower Companies',
      sortable: true,
      accessor: (l) => l.companies.map((c) => c.companyName).join(', '),
      render: (l) => (
        <div className="min-w-0 max-w-xs">
          <span className="font-semibold text-slate-800 text-xs block truncate">
            {l.companies.map((c) => c.companyName).join(', ')}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
            {l.companies.length} Split(s)
          </span>
        </div>
      ),
      exportValue: (l) => l.companies.map((c) => `${c.companyName} (${c.percentage}%)`).join(', '),
    },
    {
      key: 'totalInterestExpected',
      header: 'Interest (₹)',
      sortable: true,
      align: 'right',
      accessor: (l) => l.totalInterestExpected,
      render: (l) => (
        <span className="font-mono text-xs font-bold text-slate-700">
          ₹{l.totalInterestExpected.toLocaleString('en-IN')}
        </span>
      ),
      exportValue: (l) => l.totalInterestExpected,
    },
    {
      key: 'asrIncome',
      header: 'ASR Fee (₹)',
      sortable: true,
      align: 'right',
      accessor: (l) => l.asrIncome,
      render: (l) => (
        <span className="font-mono text-xs font-bold text-[#701A35]">
          ₹{l.asrIncome.toLocaleString('en-IN')}
        </span>
      ),
      exportValue: (l) => l.asrIncome,
    },
    {
      key: 'disbursedDate',
      header: 'Date',
      sortable: true,
      accessor: (l) => l.disbursedDate,
      render: (l) => (
        <span className="font-mono text-[11px] text-slate-600">
          {l.disbursedDate}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortable: true,
      accessor: (l) => l.status,
      render: (l) => <StatusPill status={l.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      filterable: false,
      render: (l) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedLoanId(l.id)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#701A35] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete loan ${l.id}?`)) {
                deleteLoan(l.id);
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete Loan"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── Top Control Bar ─── */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 font-serif">
              Loans
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage loans, investors, and borrower allocations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-200" />
            <span>+ New Loan</span>
          </button>
        </div>
      </div>

      {/* ─── 3 High-Contrast Financial Totals ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Total Capital
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            ₹{totalCapitalSum.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Across all loans</span>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider font-mono">
            ASR Commission
          </span>
          <span className="text-xl font-bold text-[#701A35] font-mono block mt-1">
            ₹{totalAsrIncomeSum.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-amber-700 mt-0.5 block">Platform fee cut</span>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider font-mono">
            Investor Profit
          </span>
          <span className="text-xl font-bold text-emerald-700 font-mono block mt-1">
            ₹{totalCustomerProfitSum.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">Total customer returns</span>
        </div>
      </div>

      {/* ─── Loans DataTable ─── */}
      {loans.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-[#E6E1D6] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#701A35]/10 text-[#701A35] flex items-center justify-center mx-auto">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Syndicated Loan Deals Created</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Start by creating a new loan deal to syndicate investor capital across borrower companies.
            </p>
          </div>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-amber-200" />
            <span>+ Create Loan Deal</span>
          </button>
        </div>
      ) : (
        <DataTable
          data={loans}
          columns={columns}
          keyExtractor={(l) => l.id}
          title="Syndicated Loans Portfolio"
          searchPlaceholder="Search by loan ID, customer investor, borrower company..."
          exportFileName="ASR_Loans_Portfolio"
        />
      )}

      {/* Guided 5-Step Loan Wizard Modal */}
      <NewLoanWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </div>
  );
};
