'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import {
  Building2,
  ArrowLeft,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';

export const CompanyDetailsView: React.FC = () => {
  const {
    companies,
    selectedCompanyId,
    setSelectedCompanyId,
    loans,
    setSelectedLoanId,
    setActiveMainTab,
  } = useApp();

  const company = companies.find((c) => c.id === selectedCompanyId);

  if (!company) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#E6E1D6]">
        <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-800">Company Record Not Found</h3>
        <button
          onClick={() => setSelectedCompanyId(null)}
          className="mt-3 px-4 py-1.5 text-xs font-bold text-white bg-[#701A35] rounded-xl"
        >
          Return to Companies
        </button>
      </div>
    );
  }

  // Find all loans this company has funded
  const companyLoans = loans.filter((l) =>
    (l.splits || []).some((s) => s.companyId === company.id || s.companyCode === company.shortCode)
  );

  const totalFunded = companyLoans.reduce((sum, l) => {
    const split = (l.splits || []).find((s) => s.companyId === company.id || s.companyCode === company.shortCode);
    return sum + (split ? split.splitAmount : 0);
  }, 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ─── Top Header & Back Button ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedCompanyId(null)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
            title="Back to Companies List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-serif">
                {company.name}
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-bold">
                {company.shortCode || company.id}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                company.isOutsideParty
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {company.isOutsideParty ? 'Outside Party Company' : 'ASR Group Company'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Funding Entity · Short Code: <strong className="text-slate-700 font-mono">{company.shortCode}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusPill status="Active" size="md" />
        </div>
      </div>

      {/* ─── 3 Metric KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Total Capital Funded
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            ₹{totalFunded.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-600 font-medium block leading-snug">
            {numberToWordsINR(totalFunded)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Disbursed across loans</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Loans Syndicated
          </span>
          <span className="text-xl font-bold text-[#701A35] font-mono block mt-1">
            {companyLoans.length} Loans
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Portfolio involvement</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Classification
          </span>
          <span className="text-base font-bold text-slate-900 block mt-1">
            {company.isOutsideParty ? 'Outside Party' : 'ASR Group Own'}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
            {company.isOutsideParty ? 'External funding syndicate' : 'Direct ASR treasury'}
          </span>
        </div>
      </div>

      {/* ─── Profile Details & Loans History ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Info */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-[#E6E1D6] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono pb-2 border-b border-slate-100">
            Entity Details
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Entity Name</span>
              <span className="text-slate-900 font-semibold block mt-0.5">{company.name}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block">Short Code</span>
              <span className="font-mono font-bold text-slate-800 block mt-0.5">{company.shortCode}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block">Ownership Type</span>
              <span className="text-slate-800 font-semibold block mt-0.5">
                {company.isOutsideParty ? 'Outside-Party Entity' : 'ASR Group Internal Entity'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Funded Loans */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-[#E6E1D6] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Funded Loans Portfolio
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All loans where {company.name} provided capital
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {companyLoans.length} Loans
            </span>
          </div>

          {companyLoans.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No loan syndications on record for this company.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] text-slate-500 border-b border-[#E6E1D6] text-[11px] font-mono">
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
                      <tr key={l.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                        <td className="p-3 font-bold text-[#701A35]">
                          {l.customerName || l.id}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {l.startDate}
                        </td>
                        <td className="p-3 font-mono text-right">
                          <span className="font-bold text-slate-900 block">
                            {mySplit ? `₹${mySplit.splitAmount.toLocaleString('en-IN')}` : '-'}
                          </span>
                          {mySplit && (
                            <span className="text-[10px] text-slate-500 font-sans block leading-tight">
                              {numberToWordsINR(mySplit.splitAmount)}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-700 text-right">
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
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-[#701A35] hover:bg-[#701A35] hover:text-white rounded-lg border border-[#701A35]/30 transition-all flex items-center gap-1 ml-auto cursor-pointer"
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
