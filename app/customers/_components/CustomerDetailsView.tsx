'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import {
  Users,
  MapPin,
  ArrowLeft,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';

export const CustomerDetailsView: React.FC = () => {
  const router = useRouter();
  const {
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    loans,
    setSelectedLoanId,
    setActiveMainTab,
    isLoading,
  } = useApp();

  const cleanSelectedId = String(selectedCustomerId || '').trim().toLowerCase();
  const customer = customers.find(
    (c) =>
      c.id.toLowerCase() === cleanSelectedId ||
      c.name.toLowerCase() === cleanSelectedId ||
      (c.codeNo && c.codeNo.toLowerCase() === cleanSelectedId)
  );

  if (!customer) {
    if (isLoading) {
      return (
        <div className="space-y-6 animate-pulse">
          <div className="h-24 bg-slate-200 rounded-2xl w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="h-28 bg-slate-200 rounded-xl" />
            <div className="h-28 bg-slate-200 rounded-xl" />
            <div className="h-28 bg-slate-200 rounded-xl" />
          </div>
          <div className="h-64 bg-slate-200 rounded-2xl w-full" />
        </div>
      );
    }
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#E6E1D6]">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-800">Customer Not Found</h3>
        <button
          onClick={() => {
            setSelectedCustomerId(null);
            router.push('/customers');
          }}
          className="mt-3 px-4 py-1.5 text-xs font-bold text-white bg-[#701A35] rounded-xl cursor-pointer"
        >
          Return to Customers
        </button>
      </div>
    );
  }

  // All loans for this customer
  const customerLoans = loans.filter((l) => l.customerId === customer.id);

  const totalBorrowed = customerLoans.reduce((sum, l) => sum + (l.totalAmount || 0), 0) || customer.totalBorrowed || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── Top Header & Back Button ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedCustomerId(null);
              router.push('/customers');
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
            title="Back to Customers List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-serif">
                {customer.name}
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-bold">
                {customer.id}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Client Profile · Location: <strong className="text-slate-700">{customer.place || 'CHENNAI'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            Active Client Account
          </span>
        </div>
      </div>

      {/* ─── 3 KPI Metric Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Total Loan Portfolio
          </span>
          <div className="mt-1">
            <MoneyDisplay
              amount={totalBorrowed}
              size="xl"
              amountClassName="text-slate-900 font-bold block"
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Total borrowed amount</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Active Loans
          </span>
          <span className="text-xl font-bold text-[#701A35] font-mono block mt-1">
            {customerLoans.length} Loans
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Active client contracts</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Total EMIs
          </span>
          <span className="text-xl font-bold text-emerald-700 font-mono block mt-1">
            {customerLoans.reduce((sum, l) => sum + (l.installments?.length || l.installmentCount || 0), 0)} EMIs
          </span>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Scheduled installments</span>
        </div>
      </div>

      {/* ─── Profile & Loans History ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Contact Info */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-[#E6E1D6] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono pb-2 border-b border-slate-100">
            Client Profile
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Client Name</span>
              <span className="text-slate-900 font-semibold block mt-0.5">{customer.name}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block">Place / City</span>
              <div className="flex items-center gap-1.5 mt-0.5 text-slate-800">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.place || '—'}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D6] space-y-1 text-xs">
                <span className="text-[11px] font-bold text-[#701A35] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Borrower Profile</span>
                </span>
                <p className="text-[11px] text-slate-500">
                  Synchronized with official client registry.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Loans Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-[#E6E1D6] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Loans Portfolio
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All loans associated with {customer.name}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {customerLoans.length} Loans
            </span>
          </div>

          {customerLoans.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No loan records found for this client.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] text-slate-500 border-b border-[#E6E1D6] text-[11px] font-mono">
                    <th className="p-3">Loan ID / Code</th>
                    <th className="p-3">Start Date</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                    <th className="p-3 text-center">EMIs</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerLoans.map((l) => (
                    <tr key={l.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#701A35]">
                        {l.codeNo || l.id}
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {l.startDate}
                      </td>
                      <td className="p-3 font-mono text-right">
                        <MoneyDisplay
                          amount={l.totalAmount}
                          size="sm"
                          amountClassName="text-slate-900 font-bold block text-right"
                        />
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-700">
                        {l.installmentCount}
                      </td>
                      <td className="p-3">
                        <StatusPill status={l.status} size="sm" />
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedLoanId(l.id);
                            setActiveMainTab('loans');
                            router.push(`/loans/${l.id}`);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-[#701A35] hover:bg-[#701A35] hover:text-white rounded-lg border border-[#701A35]/30 transition-all flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <span>View</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
