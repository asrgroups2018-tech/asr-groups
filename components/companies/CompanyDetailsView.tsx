'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Landmark,
  ArrowLeft,
  Calendar,
  Percent,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { StatusPill } from '@/components/common/StatusPill';

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
        <h3 className="text-sm font-bold text-slate-800">Borrower Company Not Found</h3>
        <button
          onClick={() => setSelectedCompanyId(null)}
          className="mt-3 px-4 py-1.5 text-xs font-bold text-white bg-[#701A35] rounded-xl"
        >
          Return to Companies
        </button>
      </div>
    );
  }

  // Find all loans this company is participating in as a borrower
  const companyLoans = loans.filter((l) =>
    l.companies.some((c) => c.companyId === company.id)
  );

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
                {company.companyName}
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-bold">
                {company.id}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Borrowing Business · Contact: <strong className="text-slate-700">{company.contactPerson}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusPill status={company.status} size="md" />
        </div>
      </div>

      {/* ─── 4 Metric KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Borrowed */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Total Borrowed
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            ₹{company.totalBorrowed.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Cumulative loan principal disbursed</span>
        </div>

        {/* Current Outstanding */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Outstanding Due
          </span>
          <span className="text-xl font-bold text-rose-700 font-mono block mt-1">
            ₹{company.outstandingAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Principal + remaining interest</span>
        </div>

        {/* Active Loans */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Active Borrowings
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            {companyLoans.filter((l) => l.status === 'Active' || l.status === 'Disbursed').length}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Live active loan tranches</span>
        </div>

        {/* Repayment Reliability */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E1D6] shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
              Repayment Reliability
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold text-emerald-700 font-mono">
                {company.onTimeRepaymentRate}%
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                On-Time
              </span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full"
              style={{ width: `${company.onTimeRepaymentRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* ─── Profile Details & Borrowing History ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Contact & Bank Info (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-[#E6E1D6] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono pb-2 border-b border-slate-100">
            Company & Banking Profile
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Primary Contact Person</span>
              <span className="text-slate-900 font-semibold block mt-0.5">{company.contactPerson}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block">Contact Phone</span>
              <div className="flex items-center gap-1.5 mt-0.5 font-mono text-slate-800">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{company.phone}</span>
              </div>
            </div>

            {company.email && (
              <div>
                <span className="text-slate-400 text-[11px] block">Official Email</span>
                <div className="flex items-center gap-1.5 mt-0.5 text-slate-800">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{company.email}</span>
                </div>
              </div>
            )}

            <div>
              <span className="text-slate-400 text-[11px] block">Area / Industrial Zone</span>
              <div className="flex items-center gap-1.5 mt-0.5 text-slate-800">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{company.area}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block">Address</span>
              <span className="text-slate-700 block mt-0.5">{company.address}</span>
            </div>

            {company.bankDetails && (
              <div className="border-t border-slate-100 pt-3">
                <span className="text-slate-400 text-[11px] block font-bold mb-1">Disbursement Bank</span>
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D6] space-y-1 font-mono text-[11px]">
                  <p className="font-bold text-slate-800">{company.bankDetails.bankName}</p>
                  <p className="text-slate-600">A/C: {company.bankDetails.accountNumber}</p>
                  <p className="text-slate-500">IFSC: {company.bankDetails.ifsc}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Borrowing History (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-[#E6E1D6] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Borrowing History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All syndicated loans disbursed to {company.companyName}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {companyLoans.length} Loans Total
            </span>
          </div>

          {companyLoans.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No active or past borrowings on record for this company.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Select this company when creating a new syndicated loan deal in the Loans module.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] text-slate-500 border-b border-[#E6E1D6] text-[11px] font-mono">
                    <th className="p-3">Loan ID</th>
                    <th className="p-3">Disbursed Date</th>
                    <th className="p-3">Company Share (₹)</th>
                    <th className="p-3">Interest Rate</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companyLoans.map((l) => {
                    const mySplit = l.companies.find((c) => c.companyId === company.id);

                    return (
                      <tr key={l.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                        <td className="p-3 font-mono font-bold text-[#701A35]">
                          {l.id}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {l.disbursedDate}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          ₹{mySplit ? mySplit.amount.toLocaleString('en-IN') : '-'}
                          <span className="text-[10px] text-slate-400 block font-sans">
                            ({mySplit?.percentage}% of total)
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {mySplit?.interestRate || l.defaultInterestRate}% p.a.
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
