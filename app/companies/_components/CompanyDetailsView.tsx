'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import {
  Building2,
  ArrowLeft,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';

export const CompanyDetailsView: React.FC = () => {
  const router = useRouter();
  const {
    companies,
    selectedCompanyId,
    setSelectedCompanyId,
    loans,
    setSelectedLoanId,
    setActiveMainTab,
    isLoading,
  } = useApp();

  const cleanSelectedId = String(selectedCompanyId || '').trim().toLowerCase();
  const company = companies.find(
    (c) =>
      c.id.toLowerCase() === cleanSelectedId ||
      c.shortCode.toLowerCase() === cleanSelectedId ||
      c.name.toLowerCase() === cleanSelectedId
  );

  if (!company) {
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
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800 font-serif">Company Not Found</h2>
        <button
          onClick={() => {
            setSelectedCompanyId(null);
            router.push('/companies');
          }}
          className="mt-4 px-4 py-2 bg-[#701A35] text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          Back to Companies List
        </button>
      </div>
    );
  }

  // Find all loans this company has funded
  const companyLoans = loans.filter((l) =>
    (l.splits || []).some(
      (s) =>
        s.companyId === company.id ||
        (s.companyCode && s.companyCode.toUpperCase() === company.shortCode.toUpperCase()) ||
        (s.companyName && s.companyName.toUpperCase() === company.name.toUpperCase())
    )
  );

  const totalFunded = companyLoans.reduce((sum, l) => {
    const sp = (l.splits || []).find(
      (s) =>
        s.companyId === company.id ||
        (s.companyCode && s.companyCode.toUpperCase() === company.shortCode.toUpperCase()) ||
        (s.companyName && s.companyName.toUpperCase() === company.name.toUpperCase())
    );
    return sum + (sp ? sp.splitAmount : 0);
  }, 0) || company.totalFunded || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── Breadcrumb & Top Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedCompanyId(null);
              router.push('/companies');
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer border border-slate-200 shadow-2xs"
            title="Back to All Companies"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-950 font-serif">
                {company.name}
              </h1>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#FAF8F5] border border-slate-200 text-[#701A35]">
                {company.shortCode}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {company.isOutsideParty ? 'Outside Party Entity' : 'ASR Group Internal Entity'} · Portfolio Breakdown
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            company.isOutsideParty
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {company.isOutsideParty ? 'Outside Party' : 'ASR Group Own'}
          </span>
        </div>
      </div>

      {/* ─── 3 High-Impact KPI Badges ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4.5 rounded-2xl border-2 border-slate-200/90 shadow-sm hover:border-slate-300 transition-all">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
            Total Capital Funded
          </span>
          <div className="mt-1.5">
            <MoneyDisplay
              amount={totalFunded}
              size="xl"
              amountClassName="text-slate-950 font-black text-2xl block tracking-tight"
            />
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">Disbursed across loan facilities</span>
        </div>

        <div className="bg-gradient-to-br from-purple-100/90 via-purple-50 to-white p-4.5 rounded-2xl border-2 border-purple-300 shadow-sm hover:border-purple-400 transition-all">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 font-mono block">
            Loans Syndicated
          </span>
          <div className="mt-1.5">
            <span className="text-2xl font-black text-purple-800 font-mono block tracking-tight">
              {companyLoans.length} Loans
            </span>
          </div>
          <span className="text-[11px] text-purple-800 font-bold mt-1 block">Portfolio funding involvement</span>
        </div>

        <div className="bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white p-4.5 rounded-2xl border-2 border-emerald-300 shadow-sm hover:border-emerald-400 transition-all">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 font-mono block">
            Classification
          </span>
          <div className="mt-1.5">
            <span className="text-2xl font-black text-emerald-800 block tracking-tight font-serif">
              {company.isOutsideParty ? 'Outside Party' : 'ASR Group Own'}
            </span>
          </div>
          <span className="text-[11px] text-emerald-800 font-bold mt-1 block font-mono">
            {company.isOutsideParty ? 'External funding syndicate' : 'Direct ASR treasury'}
          </span>
        </div>
      </div>

      {/* ─── Profile Details & Loans History ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Info */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono pb-2 border-b border-slate-200">
            Entity Details
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block font-mono">Entity Name</span>
              <span className="text-slate-900 font-semibold block mt-0.5">{company.name}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block font-mono">Short Code</span>
              <span className="font-mono font-bold text-slate-800 block mt-0.5">{company.shortCode}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block font-mono">Ownership Type</span>
              <span className="text-slate-800 font-semibold block mt-0.5">
                {company.isOutsideParty ? 'Outside-Party Entity' : 'ASR Group Internal Entity'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Funded Loans */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-950 font-serif">
                Funded Loans Portfolio
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                All facilities where {company.name} provided syndicate capital
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {companyLoans.length} Loans
            </span>
          </div>

          {companyLoans.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No loan syndications on record for this company.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b-2 border-slate-200 text-[11px] font-mono font-bold uppercase tracking-wider">
                    <th className="p-3">Client / Borrower</th>
                    <th className="p-3">Start Date</th>
                    <th className="p-3 text-right">Funded Share (₹)</th>
                    <th className="p-3 text-right">Split %</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companyLoans.map((l) => {
                    const mySplit = (l.splits || []).find((s) => s.companyId === company.id || s.companyCode === company.shortCode);

                    return (
                      <tr key={l.id} className="hover:bg-[#FAF5ED]/50 transition-colors">
                        <td className="p-3 font-bold text-[#701A35]">
                          {l.customerName || l.id}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {l.startDate}
                        </td>
                        <td className="p-3 font-mono text-right">
                          {mySplit ? (
                            <MoneyDisplay
                              amount={mySplit.splitAmount}
                              size="sm"
                              amountClassName="text-slate-900 font-bold block text-right"
                            />
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-700 text-right font-bold">
                          {mySplit?.splitPercent || 0}%
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
                            className="px-2.5 py-1 text-xs font-bold text-[#701A35] hover:bg-[#701A35] hover:text-white rounded-lg border border-[#701A35]/30 transition-all flex items-center gap-1 ml-auto cursor-pointer shadow-2xs"
                          >
                            <span>View Loan</span>
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
