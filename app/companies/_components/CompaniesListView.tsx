'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { Company } from '@/lib/types';
import {
  Building2,
  Plus,
  Eye,
  Trash2,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { AddCompanyModal } from './AddCompanyModal';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export const CompaniesListView: React.FC = () => {
  const router = useRouter();
  const {
    companies,
    loans,
    selectedCompanyId,
    setSelectedCompanyId,
    deleteCompany,
    isLoading,
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [partyFilter, setPartyFilter] = useState<'ALL' | 'ASR' | 'OUTSIDE'>('ALL');
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCompany(companyToDelete.id);
      setCompanyToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

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
            onClick={() => {
              setSelectedCompanyId(c.id);
              router.push(`/companies/${c.id}`);
            }}
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
            onClick={() => {
              setSelectedCompanyId(c.id);
              router.push(`/companies/${c.id}`);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#701A35] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCompanyToDelete(c)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete Company"
          >
            <Trash2 className="w-3.5 h-3.5" />
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
              onClick={() => {
                setSelectedCompanyId(c.id);
                router.push(`/companies/${c.id}`);
              }}
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
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setSelectedCompanyId(c.id);
              router.push(`/companies/${c.id}`);
            }}
            className="py-1 px-3 text-xs font-semibold text-[#701A35] bg-[#FAF5ED] hover:bg-[#F3ECE0] border border-[#E2D2B0] rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Details</span>
          </button>
          <button
            onClick={() => setCompanyToDelete(c)}
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Delete Company"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  if (isLoading && (!companies || companies.length === 0)) {
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
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-950 font-serif">
                Funding Companies
              </h1>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Internal ASR entities and outside investor funding sources
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-gold px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Company</span>
        </button>
      </div>

      {/* ─── Metric Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-gradient-to-br from-[#701A35]/10 via-[#FAF8F5] to-white p-4.5 rounded-2xl border-2 border-[#701A35]/30 shadow-sm hover:border-[#701A35]/50 transition-all">
          <span className="text-[11px] font-bold text-[#701A35] uppercase tracking-wider font-mono">
            Total Capital Funded
          </span>
          <div className="mt-1.5">
            <MoneyDisplay
              amount={totalFundedSum}
              size="xl"
              amountClassName="text-[#701A35] font-black text-2xl block tracking-tight"
            />
          </div>
          <span className="text-[11px] text-slate-600 font-medium mt-1 block">
            Sum across all partner company split allocations
          </span>
        </div>

        <div className="bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white p-4.5 rounded-2xl border-2 border-emerald-300 shadow-sm hover:border-emerald-400 transition-all">
          <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider font-mono">
            ASR Group Internal
          </span>
          <div className="mt-1.5">
            <span className="text-2xl font-black font-mono text-emerald-700 block tracking-tight">
              {asrCount} Companies
            </span>
          </div>
          <span className="text-[11px] text-emerald-800 font-bold mt-1 block truncate">
            PASS, KARS, INFIN, INFINITY, INNOVATIVE, MARS, TRIVENI, GLOB...
          </span>
        </div>

        <div className="bg-gradient-to-br from-purple-100/90 via-purple-50 to-white p-4.5 rounded-2xl border-2 border-purple-300 shadow-sm hover:border-purple-400 transition-all">
          <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider font-mono">
            Outside Parties
          </span>
          <div className="mt-1.5">
            <span className="text-2xl font-black font-mono text-purple-800 block tracking-tight">
              {outsideCount} Entities
            </span>
          </div>
          <span className="text-[11px] text-purple-800 font-bold mt-1 block truncate">
            FINCUBE, CS ASSOCIATES, M CHINNIAH, TATVA, BHAVANA, THIR...
          </span>
        </div>
      </div>

      {/* ─── Entity Filter Pills ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
          {[
            { id: 'ALL', label: 'All Entities' },
            { id: 'ASR', label: 'ASR Group Internal' },
            { id: 'OUTSIDE', label: 'Outside Parties' },
          ].map((tab) => {
            const isActive = partyFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPartyFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold btn-press transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#701A35] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Showing <strong className="text-slate-800">{enrichedCompanies.length}</strong> companies
        </span>
      </div>

      {/* ─── Companies DataTable ─── */}
      {companies.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center space-y-3">
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!companyToDelete}
        onClose={() => setCompanyToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Funding Company"
        itemName={companyToDelete?.name}
        itemCode={companyToDelete?.shortCode}
        message="Are you sure you want to delete this funding entity? This action will remove the company from the registry."
        confirmText="Delete Company"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
