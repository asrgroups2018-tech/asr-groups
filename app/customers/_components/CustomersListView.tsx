'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { Customer } from '@/lib/types';
import {
  Users,
  Plus,
  Eye,
  MapPin,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { AddCustomerModal } from './AddCustomerModal';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';

export const CustomersListView: React.FC = () => {
  const router = useRouter();
  const {
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    loans,
    isLoading,
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Compute live loan sums per customer
  const enrichedCustomers = useMemo(() => {
    return customers.map((c) => {
      const custLoans = loans.filter((l) => l.customerId === c.id);
      const totalBorrowed = custLoans.reduce((sum, l) => sum + (l.totalAmount || 0), 0);
      const activeCount = custLoans.filter((l) => l.status !== 'Closed').length;

      return {
        ...c,
        totalBorrowed: totalBorrowed > 0 ? totalBorrowed : (c.totalBorrowed || 0),
        activeLoansCount: activeCount > 0 ? activeCount : (c.activeLoansCount || custLoans.length),
      };
    });
  }, [customers, loans]);

  const totalBorrowedSum = useMemo(
    () => enrichedCustomers.reduce((acc, c) => acc + (c.totalBorrowed || 0), 0),
    [enrichedCustomers]
  );

  const activeLoansTotal = useMemo(
    () => enrichedCustomers.reduce((acc, c) => acc + (c.activeLoansCount || 0), 0),
    [enrichedCustomers]
  );

  const columns: ColumnDef<Customer>[] = [
    {
      key: 'name',
      header: 'Customer Name',
      sortable: true,
      accessor: (c) => c.name,
      render: (c) => (
        <div className="min-w-0">
          <button
            onClick={() => {
              setSelectedCustomerId(c.id);
              router.push(`/customers/${c.id}`);
            }}
            className="font-bold text-[#701A35] hover:underline text-xs block text-left cursor-pointer transition-colors"
          >
            {c.name}
          </button>
          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
            ID: {c.id}
          </span>
        </div>
      ),
      exportValue: (c) => c.name,
    },
    {
      key: 'place',
      header: 'Place / Region',
      sortable: true,
      accessor: (c) => c.place || '-',
      render: (c) => (
        <span className="text-xs text-slate-600 flex items-center gap-1 font-mono">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {c.place || 'CHENNAI'}
        </span>
      ),
      exportValue: (c) => c.place || '',
    },
    {
      key: 'totalBorrowed',
      header: 'Total Borrowed (₹)',
      sortable: true,
      align: 'right',
      accessor: (c) => c.totalBorrowed || 0,
      render: (c) => (
        <MoneyDisplay
          amount={c.totalBorrowed || 0}
          size="sm"
          amountClassName="text-slate-900 font-bold block text-right"
        />
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
            onClick={() => {
              setSelectedCustomerId(c.id);
              router.push(`/customers/${c.id}`);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#701A35] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const renderCustomerMobileCard = (c: Customer) => (
    <div className="p-4 space-y-3 bg-white hover:bg-[#FAF8F5]/60 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4
            onClick={() => {
              setSelectedCustomerId(c.id);
              router.push(`/customers/${c.id}`);
            }}
            className="text-sm font-bold text-slate-900 truncate hover:text-[#701A35] cursor-pointer"
          >
            {c.name}
          </h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="font-mono text-[10px] bg-[#FAF5ED] text-[#701A35] border border-[#E2D2B0] px-2 py-0.5 rounded font-bold">
              {c.id}
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1 font-mono">
              <MapPin className="w-3 h-3 text-slate-400" />
              {c.place || 'CHENNAI'}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
            {c.activeLoansCount || 0} {c.activeLoansCount === 1 ? 'Loan' : 'Loans'}
          </span>
        </div>
      </div>

      <div className="p-2.5 bg-[#FAF8F5] border border-[#E6E1D6] rounded-xl flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">Total Borrowed:</span>
        <MoneyDisplay
          amount={c.totalBorrowed || 0}
          size="sm"
          amountClassName="font-bold text-slate-900"
        />
      </div>

      <div className="flex items-center justify-end pt-1">
        <button
          onClick={() => {
            setSelectedCustomerId(c.id);
            router.push(`/customers/${c.id}`);
          }}
          className="w-full py-1.5 px-3 text-xs font-semibold text-[#701A35] bg-[#FAF5ED] hover:bg-[#F3ECE0] border border-[#E2D2B0] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View Customer Profile</span>
        </button>
      </div>
    </div>
  );

  if (isLoading && (!customers || customers.length === 0)) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-slate-200 rounded-2xl w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-28 bg-slate-200 rounded-xl" />
          <div className="h-28 bg-slate-200 rounded-xl" />
          <div className="h-28 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-80 bg-slate-200 rounded-2xl w-full" />
      </div>
    );
  }

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
          <p className="text-xs text-slate-500 mt-0.5">
            Borrower Directory & Portfolio Overview
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
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
          <div className="mt-1">
            <MoneyDisplay
              amount={totalBorrowedSum}
              size="xl"
              amountClassName="text-slate-900 font-bold block"
            />
          </div>
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
          searchPlaceholder="Search client name or place..."
          exportFileName="ASR_Customer_Registry"
          mobileCardRender={renderCustomerMobileCard}
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
