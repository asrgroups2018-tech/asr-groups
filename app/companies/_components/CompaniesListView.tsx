'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { Company } from '@/lib/types';
import {
  Building2,
  Plus,
  Eye,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { AddCompanyModal } from './AddCompanyModal';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';

export const CompaniesListView: React.FC = () => {
  const {
    companies,
    loans,
    selectedCompanyId,
    setSelectedCompanyId,
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [partyFilter, setPartyFilter] = useState<'ALL' | 'ASR' | 'OUTSIDE'>('ALL');

  const COMPANY_ORDER: Record<string, number> = {
    'PASS ENTERPRISES': 1,
    'KARS ENTERPRISES': 2,
    'INFIN GROUP': 3,
    'INFINITY ENTERPRISES': 4,
    'INNOVATIVE SOLUTIONS': 5,
    'MARS SOLUTION': 6,
    'MM ASSOCIATES': 7,
    'TRIVENI GROUP': 8,
    'GLOBAL SOLITAIRE': 9,
    'ALAGESH': 10,
    'FINCUBE VENTURES': 11,
    'CS ASSOCIATES': 12,
    'M CHINNIAH': 13,
    'TATVA ENTERPRISES': 14,
    'BHAVANA CORP': 15,
    'THIRUCHENDURAON ASSOCIATE': 16,
  };

  const filteredCompanies = useMemo(() => {
    let list = companies;
    if (partyFilter === 'ASR') list = companies.filter((c) => !c.isOutsideParty);
    else if (partyFilter === 'OUTSIDE') list = companies.filter((c) => c.isOutsideParty);

    return [...list].sort((a, b) => {
      const orderA = COMPANY_ORDER[a.name.toUpperCase()] ?? (a.isOutsideParty ? 99 : 50);
      const orderB = COMPANY_ORDER[b.name.toUpperCase()] ?? (b.isOutsideParty ? 99 : 50);
      return orderA - orderB;
    });
  }, [companies, partyFilter]);

  const enrichedCompanies = useMemo(() => {
    return filteredCompanies.map((c) => {
      const codeUpper = c.shortCode?.toUpperCase() || '';
      const nameUpper = c.name?.toUpperCase() || '';

      const matchingLoans = loans.filter((l) =>
        (l.splits || []).some(
          (sp) =>
            sp.companyId === c.id ||
            (sp.companyCode && sp.companyCode.toUpperCase() === codeUpper) ||
            (sp.companyName && sp.companyName.toUpperCase() === nameUpper)
        )
      );

      const computedLoansCount = matchingLoans.length > 0 ? matchingLoans.length : (c.activeLoansCount || 0);
      const computedTotalFunded = matchingLoans.length > 0
        ? matchingLoans.reduce((sum, l) => {
            const sp = (l.splits || []).find(
              (s) =>
                s.companyId === c.id ||
                (s.companyCode && s.companyCode.toUpperCase() === codeUpper) ||
                (s.companyName && s.companyName.toUpperCase() === nameUpper)
            );
            return sum + (sp ? sp.splitAmount : 0);
          }, 0)
        : (c.totalFunded || 0);

      return {
        ...c,
        totalFunded: computedTotalFunded > 0 ? computedTotalFunded : (c.totalFunded || 0),
        activeLoansCount: computedLoansCount,
      };
    });
  }, [filteredCompanies, loans]);

  const totalFundedSum = useMemo(
    () => enrichedCompanies.reduce((acc, c) => acc + (c.totalFunded || 0), 0),
    [enrichedCompanies]
  );

  const asrCount = useMemo(() => companies.filter((c) => !c.isOutsideParty).length, [companies]);
  const outsideCount = useMemo(() => companies.filter((c) => c.isOutsideParty).length, [companies]);

  const columns: ColumnDef<Company>[] = [
    {
      key: 'shortCode',
      header: 'Short Code',
      sortable: true,
      align: 'left',
      accessor: (c) => c.shortCode,
      render: (c) => (
        <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-[#FAF8F5] border border-[#E6E1D6] text-[#701A35]">
          {c.shortCode}
        </span>
      ),
      exportValue: (c) => c.shortCode,
    },
    {
      key: 'name',
      header: 'Company Name',
      sortable: true,
      accessor: (c) => c.name,
      render: (c) => (
        <div className="min-w-0">
          <button
            onClick={() => setSelectedCompanyId(c.id)}
            className="font-bold text-[#701A35] hover:underline text-xs block text-left cursor-pointer transition-colors"
          >
            {c.name}
          </button>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {c.isOutsideParty ? 'Outside Party Entity' : 'ASR Group Internal Entity'}
          </span>
        </div>
      ),
      exportValue: (c) => c.name,
    },
    {
      key: 'isOutsideParty',
      header: 'Ownership',
      sortable: true,
      align: 'center',
      accessor: (c) => (c.isOutsideParty ? 'Outside Party' : 'ASR Group'),
      render: (c) => (
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
          c.isOutsideParty
            ? 'bg-purple-50 text-purple-700 border-purple-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {c.isOutsideParty ? 'Outside Party' : 'ASR Group'}
        </span>
      ),
      exportValue: (c) => (c.isOutsideParty ? 'Outside Party' : 'ASR Group'),
    },
    {
      key: 'totalFunded',
      header: 'Total Funded (₹)',
      sortable: true,
      align: 'right',
      accessor: (c) => c.totalFunded || 0,
      render: (c) => (
        <MoneyDisplay
          amount={c.totalFunded || 0}
          size="sm"
          amountClassName="text-slate-900 font-bold block text-right"
        />
      ),
    },
    {
      key: 'activeLoansCount',
      header: 'Funded Loans',
      sortable: true,
      align: 'center',
      accessor: (c) => c.activeLoansCount || 0,
      render: (c) => (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
          {c.activeLoansCount || 0} loans
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
            onClick={() => setSelectedCompanyId(c.id)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#701A35] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const renderCompanyMobileCard = (c: Company) => (
    <div className="p-4 space-y-3 bg-white hover:bg-[#FAF8F5]/60 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#E6E1D6] text-[#701A35]">
              {c.shortCode}
            </span>
            <h4
              onClick={() => setSelectedCompanyId(c.id)}
              className="text-sm font-bold text-slate-900 truncate hover:text-[#701A35] cursor-pointer"
            >
              {c.name}
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {c.isOutsideParty ? 'Outside Party Entity' : 'ASR Group Internal Entity'}
          </span>
        </div>
        <div className="text-right shrink-0">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              c.isOutsideParty
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {c.isOutsideParty ? 'Outside Party' : 'ASR Group'}
          </span>
        </div>
      </div>

      <div className="p-2.5 bg-[#FAF8F5] border border-[#E6E1D6] rounded-xl flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Total Capital Funded:</span>
        <MoneyDisplay
          amount={c.totalFunded || 0}
          size="sm"
          amountClassName="font-bold text-slate-900"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span>
          Funded Loans: <strong className="text-slate-800 font-mono">{c.activeLoansCount || 0}</strong>
        </span>
        <button
          onClick={() => setSelectedCompanyId(c.id)}
          className="py-1 px-3 text-xs font-semibold text-[#701A35] bg-[#FAF5ED] hover:bg-[#F3ECE0] border border-[#E2D2B0] rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View Details</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── Top Control Bar ─── */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 font-serif">
              Companies
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Internal Entities & Outside Investor Funding Sources
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-200" />
            <span>New Company</span>
          </button>
        </div>
      </div>

      {/* ─── 3 High-Impact Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Total Capital Funded
          </span>
          <div className="mt-1">
            <MoneyDisplay
              amount={totalFundedSum}
              size="xl"
              amountClassName="text-slate-900 font-bold block"
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Sum across all 15 active partner splits</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            ASR Group Internal
          </span>
          <span className="text-xl font-bold text-emerald-700 font-mono block mt-1">
            {asrCount} Companies
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">PASS, KARS, INFIN, INFINITY, INNOVATIVE, MARS, TRIVENI, GLOBAL, ALAGESH</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Outside Parties
          </span>
          <span className="text-xl font-bold text-purple-700 font-mono block mt-1">
            {outsideCount} Entities
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">FINCUBE, CS ASSOCIATES, M CHINNIAH, TATVA, BHAVANA, THIRUCHENDURAON</span>
        </div>
      </div>

      {/* ─── Filter Toggle ─── */}
      <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
        {(['ALL', 'ASR', 'OUTSIDE'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setPartyFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              partyFilter === f
                ? 'bg-[#701A35] text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {f === 'ALL' ? 'All Entities' : f === 'ASR' ? 'ASR Group Own' : 'Outside Parties'}
          </button>
        ))}
      </div>

      {/* ─── Companies DataTable ─── */}
      {companies.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-[#E6E1D6] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#701A35]/10 text-[#701A35] flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Companies Registered</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Add funding companies before creating loan splits.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-amber-200" />
            <span>Add First Company</span>
          </button>
        </div>
      ) : (
        <DataTable
          data={enrichedCompanies}
          columns={columns}
          keyExtractor={(c) => c.id}
          title="Funding & Deposit Companies Registry"
          searchPlaceholder="Search short code, company name..."
          exportFileName="ASR_Funding_Companies"
          mobileCardRender={renderCompanyMobileCard}
        />
      )}

      {/* Add Company Modal */}
      <AddCompanyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
