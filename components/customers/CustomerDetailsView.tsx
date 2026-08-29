'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import {
  Users,
  Phone,
  Mail,
  MapPin,
  Building,
  ArrowLeft,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  PieChart,
  ShieldCheck,
} from 'lucide-react';
import { StatusPill } from '@/components/common/StatusPill';

export const CustomerDetailsView: React.FC = () => {
  const {
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    loans,
    setSelectedLoanId,
    setActiveMainTab,
  } = useApp();

  const customer = customers.find((c) => c.id === selectedCustomerId);

  if (!customer) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#E6E1D6]">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-800">Investor Account Not Found</h3>
        <button
          onClick={() => setSelectedCustomerId(null)}
          className="mt-3 px-4 py-1.5 text-xs font-bold text-white bg-[#701A35] rounded-xl"
        >
          Return to Customers
        </button>
      </div>
    );
  }

  // All loans this customer has funded as an investor
  const fundedLoans = loans.filter((l) =>
    l.customers.some((c) => c.customerId === customer.id)
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ─── Header & Back Button ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedCustomerId(null)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
            title="Back to Customers List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-serif">
                {customer.fullName}
              </h1>
              {customer.companyName && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#FAF8F5] text-slate-700 border border-[#E6E1D6]">
                  {customer.companyName}
                </span>
              )}
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-bold">
                {customer.id}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer / Capital Provider · Member since <span className="font-mono">{customer.createdAt}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusPill status={customer.status} size="md" />
        </div>
      </div>

      {/* ─── 4 KPI Metric Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Capital Invested */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Total Capital Invested
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            ₹{customer.totalInvested.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Total principal funded</span>
        </div>

        {/* Total Profit Returns */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Net Profit Received
          </span>
          <span className="text-xl font-bold text-emerald-700 font-mono block mt-1">
            ₹{customer.totalReturns.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Profit disbursed to date</span>
        </div>

        {/* Active Syndicated Deals */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Active Deals Funded
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            {fundedLoans.filter((l) => l.status === 'Active' || l.status === 'Disbursed').length}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Live earning investments</span>
        </div>

        {/* Average Annual Yield */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Effective Yield
          </span>
          <span className="text-xl font-bold text-[#701A35] font-mono block mt-1">
            20.0% p.a.
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Net of ASR commission cut</span>
        </div>
      </div>

      {/* ─── Profile & Investment History ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Contact Info (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-[#E6E1D6] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono pb-2 border-b border-slate-100">
            Investor Profile
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Investor Name</span>
              <span className="text-slate-900 font-semibold block mt-0.5">{customer.fullName}</span>
            </div>

            {customer.companyName && (
              <div>
                <span className="text-slate-400 text-[11px] block">Investor Holding Entity</span>
                <span className="text-slate-800 font-medium block mt-0.5">{customer.companyName}</span>
              </div>
            )}

            <div>
              <span className="text-slate-400 text-[11px] block">Direct Phone</span>
              <div className="flex items-center gap-1.5 mt-0.5 font-mono text-slate-800">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.phone}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block">Email Address</span>
              <div className="flex items-center gap-1.5 mt-0.5 text-slate-800">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.email}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block">Registered Address</span>
              <span className="text-slate-700 block mt-0.5">{customer.address || 'Chennai, Tamil Nadu'}</span>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D6] space-y-1 text-xs">
                <span className="text-[11px] font-bold text-[#701A35] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Investor Account</span>
                </span>
                <p className="text-[11px] text-slate-500">
                  Principal is secured by ASR intermediary escrow & borrower company syndication.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Investment History Table & Visual Trend (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-[#E6E1D6] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Investment & Funded Deals History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every loan funded by {customer.fullName}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {fundedLoans.length} Deals
            </span>
          </div>

          {fundedLoans.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No funded loan deals yet for this investor.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Select this customer in Step 1 of + Create New Loan to fund a deal.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] text-slate-500 border-b border-[#E6E1D6] text-[11px] font-mono">
                    <th className="p-3">Loan ID</th>
                    <th className="p-3">Disbursed Date</th>
                    <th className="p-3">Capital Share (₹)</th>
                    <th className="p-3">Borrowers Involved</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fundedLoans.map((l) => {
                    const myShare = l.customers.find((c) => c.customerId === customer.id);

                    return (
                      <tr key={l.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                        <td className="p-3 font-mono font-bold text-[#701A35]">
                          {l.id}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {l.disbursedDate}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          ₹{myShare ? myShare.shareAmount.toLocaleString('en-IN') : '-'}
                          <span className="text-[10px] text-slate-400 block font-sans">
                            ({myShare?.sharePercentage}% of capital)
                          </span>
                        </td>
                        <td className="p-3 text-slate-700">
                          <span className="font-semibold">{l.companies.length} Companies</span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                            {l.companies.map((c) => c.companyName).join(', ')}
                          </span>
                        </td>
                        <td className="p-3">
                          <StatusPill status={l.status} size="sm" />
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedLoanId(l.id);
                              setActiveMainTab('loans');
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-[#701A35] hover:bg-[#701A35] hover:text-white rounded-lg border border-[#701A35]/30 transition-all flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <span>View Deal</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
