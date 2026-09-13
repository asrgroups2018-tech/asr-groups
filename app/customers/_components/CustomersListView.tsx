'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { Customer } from '@/lib/types';
import {
  Users,
  Plus,
  Eye,
  MapPin,
  Phone,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { AddCustomerModal } from './AddCustomerModal';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';

export const CustomersListView: React.FC = () => {
  const {
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    loans,
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Compute stats
  const totalBorrowedSum = useMemo(() => {
    return loans.reduce((acc, l) => acc + (l.totalAmount || 0), 0);
  }, [loans]);

  const columns: ColumnDef<Customer>[] = [
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
      key: 'name',
      header: 'Customer / Client Name',
      sortable: true,
      align: 'left',
      accessor: (c) => c.name,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E6E1D6] flex items-center justify-center font-bold text-xs text-[#701A35]">
            {c.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <button
              onClick={() => setSelectedCustomerId(c.id)}
              className="font-bold text-slate-900 text-xs hover:text-[#701A35] hover:underline block text-left cursor-pointer"
            >
              {c.name}
            </button>
            <span className="text-[10px] text-slate-400 font-mono block">
              {c.place ? `Place: ${c.place}` : 'ASR Client'}
            </span>
          </div>
        </div>
      ),
      exportValue: (c) => c.name,
    },
    {
      key: 'place',
      header: 'Place / City',
      sortable: true,
      accessor: (c) => c.place || '—',
      render: (c) => (
        <span className="text-xs text-slate-700 font-semibold">{c.place || '—'}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      accessor: (c) => c.phone || '—',
      render: (c) => (
        <span className="font-mono text-xs text-slate-600">{c.phone || '—'}</span>
      ),
    },
    {
      key: 'totalBorrowed',
      header: 'Total Borrowed (₹)',
      sortable: true,
      align: 'right',
      accessor: (c) => c.totalBorrowed || 0,
      render: (c) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-900 block">
            ₹{(c.totalBorrowed || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500 font-sans block leading-tight">
            {numberToWordsINR(c.totalBorrowed || 0)}
          </span>
        </div>
      ),
      exportValue: (c) => c.totalBorrowed || 0,
    },
    {
      key: 'activeLoansCount',
      header: 'Active Loans',
      sortable: true,
      align: 'center',
      accessor: (c) => c.activeLoansCount || 0,
      render: (c) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
          {c.activeLoansCount || 0}
        </span>
      ),
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
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
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
              Customers
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage borrowing clients and view their total loan portfolios
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-200" />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* ─── 3 High-Contrast Financial Totals ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Total Borrowed Portfolio
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            ₹{totalBorrowedSum.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-600 font-medium block leading-snug">
            {numberToWordsINR(totalBorrowedSum)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Sum across all customer loans</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Active Contracts
          </span>
          <span className="text-xl font-bold text-emerald-700 font-mono block mt-1">
            {loans.length} Loans
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Disbursed active contracts</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Total Customers
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            {customers.length} Clients
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Registered borrower parties</span>
        </div>
      </div>

      {/* ─── Customers DataTable ─── */}
      {customers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-[#E6E1D6] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#701A35]/10 text-[#701A35] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Customers Registered</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Customers are the borrowers who receive loans.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-amber-200" />
            <span>Add First Customer</span>
          </button>
        </div>
      ) : (
        <DataTable
          data={customers}
          columns={columns}
          keyExtractor={(c) => c.id}
          title="Customer Borrowers Registry"
          searchPlaceholder="Search client name, place, phone..."
          exportFileName="ASR_Customer_Registry"
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
