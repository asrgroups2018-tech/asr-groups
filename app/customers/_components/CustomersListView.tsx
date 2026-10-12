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
  Trash2,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { AddCustomerModal } from './AddCustomerModal';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export const CustomersListView: React.FC = () => {
  const router = useRouter();
  const {
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    deleteCustomer,
    loans,
    isLoading,
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

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
          <button
            onClick={() => setCustomerToDelete(c)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete Customer"
          >
            <Trash2 className="w-3.5 h-3.5" />
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

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={() => {
            setSelectedCustomerId(c.id);
            router.push(`/customers/${c.id}`);
          }}
          className="flex-1 py-1.5 px-3 text-xs font-semibold text-[#701A35] bg-[#FAF5ED] hover:bg-[#F3ECE0] border border-[#E2D2B0] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View Profile</span>
        </button>
        <button
          onClick={() => setCustomerToDelete(c)}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
          title="Delete Customer"
        >
          <Trash2 className="w-3.5 h-3.5" />
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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#701A35] text-[#EED8A1] shadow-sm flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-950 font-serif">
                Customers Directory
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Borrower directory, active facilities, and loan history tracking
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-gold px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Customer</span>
        </button>
      </div>

      {/* ─── Metric Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-[#701A35]/10 via-[#FAF8F5] to-white p-3 rounded-xl border-2 border-[#701A35]/30 shadow-sm hover:border-[#701A35]/50 transition-all">
          <span className="text-[10px] font-bold text-[#701A35] uppercase tracking-wider font-mono">
            Total Borrowed Portfolio
          </span>
          <div className="mt-1">
            <MoneyDisplay
              amount={totalBorrowedSum}
              size="lg"
              amountClassName="text-[#701A35] font-black text-xl block tracking-tight"
            />
          </div>
          <span className="text-[10px] text-slate-600 font-medium mt-0.5 block">
            Sum across all borrower loan facilities
          </span>
        </div>

        <div className="bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white p-3 rounded-xl border-2 border-emerald-300 shadow-sm hover:border-emerald-400 transition-all">
          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider font-mono">
            Active Contracts
          </span>
          <div className="mt-1">
            <span className="text-xl font-black font-mono text-emerald-700 block tracking-tight">
              {loans.length} Loans
            </span>
          </div>
          <span className="text-[10px] text-emerald-800 font-bold mt-0.5 block">
            Disbursed active loan contracts
          </span>
        </div>

        <div className="bg-gradient-to-br from-amber-100/90 via-amber-50 to-white p-3 rounded-xl border-2 border-amber-300 shadow-sm hover:border-amber-400 transition-all">
          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider font-mono">
            Total Customers
          </span>
          <div className="mt-1">
            <span className="text-xl font-black font-mono text-amber-800 block tracking-tight">
              {customers.length} Clients
            </span>
          </div>
          <span className="text-[10px] text-amber-800 font-bold mt-0.5 block">
            Registered borrower profiles
          </span>
        </div>
      </div>

      {/* ─── Customers DataTable ─── */}
      {customers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center space-y-3">
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer Profile"
        itemName={customerToDelete?.name}
        itemCode={customerToDelete?.id}
        message="Are you sure you want to delete this customer? This action will remove the customer profile from the directory."
        confirmText="Delete Customer"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
