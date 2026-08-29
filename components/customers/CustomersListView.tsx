'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { CustomerInvestor } from '@/lib/types';
import {
  Users,
  Plus,
  Search,
  TrendingUp,
  Download,
  Trash2,
  Eye,
  Building,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/common/DataTable';
import { StatusPill } from '@/components/common/StatusPill';
import { AddCustomerModal } from './AddCustomerModal';

export const CustomersListView: React.FC = () => {
  const {
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    deleteCustomer,
    showToast,
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const totalInvestedSum = useMemo(
    () => customers.reduce((acc, c) => acc + (c.totalInvested || 0), 0),
    [customers]
  );

  const totalReturnsSum = useMemo(
    () => customers.reduce((acc, c) => acc + (c.totalReturns || 0), 0),
    [customers]
  );

  const columns: ColumnDef<CustomerInvestor>[] = [
    {
      key: 'id',
      header: 'Customer ID',
      sortable: true,
      align: 'left',
      accessor: (c) => c.id,
      render: (c) => (
        <span className="font-mono text-xs font-bold text-slate-700">
          {c.id}
        </span>
      ),
      exportValue: (c) => c.id,
    },
    {
      key: 'fullName',
      header: 'Investor / Company Name',
      sortable: true,
      accessor: (c) => c.fullName,
      render: (c) => (
        <div className="min-w-0">
          <button
            onClick={() => setSelectedCustomerId(c.id)}
            className="font-bold text-[#701A35] hover:underline text-xs block text-left cursor-pointer transition-colors"
          >
            {c.fullName}
          </button>
          {c.companyName ? (
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              {c.companyName}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Individual Financier
            </span>
          )}
        </div>
      ),
      exportValue: (c) => `${c.fullName} ${c.companyName ? `(${c.companyName})` : ''}`,
    },
    {
      key: 'phone',
      header: 'Phone Number',
      sortable: true,
      accessor: (c) => c.phone,
      render: (c) => (
        <span className="font-mono text-xs text-slate-700">
          {c.phone}
        </span>
      ),
      exportValue: (c) => c.phone,
    },
    {
      key: 'email',
      header: 'Email Address',
      sortable: true,
      accessor: (c) => c.email,
      render: (c) => (
        <span className="text-xs text-slate-600 truncate max-w-xs block">
          {c.email}
        </span>
      ),
      exportValue: (c) => c.email,
    },
    {
      key: 'activeLoansCount',
      header: 'Active Deals',
      sortable: true,
      align: 'center',
      accessor: (c) => c.activeLoansCount,
      render: (c) => (
        <span className="font-mono text-xs font-bold text-slate-800">
          {c.activeLoansCount}
        </span>
      ),
    },
    {
      key: 'totalInvested',
      header: 'Total Invested (₹)',
      sortable: true,
      align: 'right',
      accessor: (c) => c.totalInvested,
      render: (c) => (
        <span className="font-mono text-xs font-bold text-slate-900">
          ₹{c.totalInvested.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'totalReturns',
      header: 'Total Returns (₹)',
      sortable: true,
      align: 'right',
      accessor: (c) => c.totalReturns,
      render: (c) => (
        <span className="font-mono text-xs font-bold text-emerald-700">
          ₹{c.totalReturns.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortable: true,
      accessor: (c) => c.status,
      render: (c) => <StatusPill status={c.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      filterable: false,
      render: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedCustomerId(c.id)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#701A35] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            title="View Investor Profile"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Remove customer record ${c.fullName}?`)) {
                deleteCustomer(c.id);
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete Customer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ─── Top Header Card with Summary Metrics ─── */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 font-serif">
              Customers (Investors & Financiers)
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {customers.length} Registered
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Capital providers who finance loan tranches and receive principal with net profit returns
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-200" />
            <span>+ Add Customer (Investor)</span>
          </button>
        </div>
      </div>

      {/* ─── 3 High-Contrast Financial Totals ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Total Capital Supplied
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            ₹{totalInvestedSum.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Capital provided across all syndicated loans</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Total Net Profit Returns
          </span>
          <span className="text-xl font-bold text-emerald-700 font-mono block mt-1">
            ₹{totalReturnsSum.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Disbursed profit earnings returned to investors</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Registered Investors
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            {customers.length} Accounts
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Active individual & corporate financiers</span>
        </div>
      </div>

      {/* ─── Customers DataTable ─── */}
      {customers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-[#E6E1D6] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#701A35]/10 text-[#701A35] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Customer Investors Registered</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Customers provide the investment capital for loans. You can register an investor here or quick-add directly inside the + New Loan Wizard.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-amber-200" />
            <span>+ Register First Customer (Investor)</span>
          </button>
        </div>
      ) : (
        <DataTable
          data={customers}
          columns={columns}
          keyExtractor={(c) => c.id}
          title="Customer Investors Registry"
          searchPlaceholder="Search investor name, company, phone, email..."
          exportFileName="ASR_Customer_Investors"
        />
      )}

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
