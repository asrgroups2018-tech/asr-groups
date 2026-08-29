'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { BorrowerCompany } from '@/lib/types';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  TrendingUp,
  Download,
  Trash2,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/common/DataTable';
import { StatusPill } from '@/components/common/StatusPill';
import { AddCompanyModal } from './AddCompanyModal';

export const CompaniesListView: React.FC = () => {
  const {
    companies,
    selectedCompanyId,
    setSelectedCompanyId,
    deleteCompany,
    showToast,
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState('All');

  // Extract distinct areas for filter
  const areas = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.area) set.add(c.area);
    });
    return ['All', ...Array.from(set)];
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    if (selectedArea === 'All') return companies;
    return companies.filter((c) => c.area === selectedArea);
  }, [companies, selectedArea]);

  const totalBorrowedSum = useMemo(
    () => companies.reduce((acc, c) => acc + (c.totalBorrowed || 0), 0),
    [companies]
  );

  const totalOutstandingSum = useMemo(
    () => companies.reduce((acc, c) => acc + (c.outstandingAmount || 0), 0),
    [companies]
  );

  const columns: ColumnDef<BorrowerCompany>[] = [
    {
      key: 'id',
      header: 'Company ID',
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
      key: 'companyName',
      header: 'Company Name',
      sortable: true,
      accessor: (c) => c.companyName,
      render: (c) => (
        <div className="min-w-0">
          <button
            onClick={() => setSelectedCompanyId(c.id)}
            className="font-bold text-[#701A35] hover:underline text-xs block text-left cursor-pointer transition-colors"
          >
            {c.companyName}
          </button>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Borrower Entity
          </span>
        </div>
      ),
      exportValue: (c) => c.companyName,
    },
    {
      key: 'contactPerson',
      header: 'Contact Person',
      sortable: true,
      accessor: (c) => c.contactPerson,
      render: (c) => (
        <span className="text-xs text-slate-800 font-medium">
          {c.contactPerson}
        </span>
      ),
      exportValue: (c) => c.contactPerson,
    },
    {
      key: 'phone',
      header: 'Phone Number',
      sortable: true,
      accessor: (c) => c.phone,
      render: (c) => (
        <span className="font-mono text-xs text-slate-700">
          {c.phone}
        </span>
      ),
      exportValue: (c) => c.phone,
    },
    {
      key: 'area',
      header: 'Area / Zone',
      sortable: true,
      accessor: (c) => c.area,
      render: (c) => (
        <span className="text-[11px] text-slate-600 bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E6E1D6]">
          {c.area}
        </span>
      ),
      exportValue: (c) => c.area,
    },
    {
      key: 'activeLoansCount',
      header: 'Active Loans',
      sortable: true,
      align: 'center',
      accessor: (c) => c.activeLoansCount,
      render: (c) => (
        <span className="font-mono text-xs font-bold text-slate-800">
          {c.activeLoansCount}
        </span>
      ),
    },
    {
      key: 'totalBorrowed',
      header: 'Total Borrowed (₹)',
      sortable: true,
      align: 'right',
      accessor: (c) => c.totalBorrowed,
      render: (c) => (
        <span className="font-mono text-xs font-bold text-slate-900">
          ₹{c.totalBorrowed.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'outstandingAmount',
      header: 'Outstanding (₹)',
      sortable: true,
      align: 'right',
      accessor: (c) => c.outstandingAmount,
      render: (c) => (
        <span className="font-mono text-xs font-bold text-rose-700">
          ₹{c.outstandingAmount.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortable: true,
      accessor: (c) => c.status,
      render: (c) => <StatusPill status={c.status} size="sm" />,
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
            title="View Company Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Remove company ${c.companyName}?`)) {
                deleteCompany(c.id);
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete Company"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ─── Top Control Bar ─── */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 font-serif">
              Companies
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage borrowing companies and their loan balances
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-200" />
            <span>+ New Company</span>
          </button>
        </div>
      </div>

      {/* ─── 3 High-Contrast Financial Totals ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Total Borrowed
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            ₹{totalBorrowedSum.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Across all loans</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Outstanding Balance
          </span>
          <span className="text-xl font-bold text-rose-700 font-mono block mt-1">
            ₹{totalOutstandingSum.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Principal + pending interest</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Total Companies
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
            {companies.length} Companies
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Active registered businesses</span>
        </div>
      </div>

      {/* ─── Area Filters Bar ─── */}
      {areas.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> Zone:
          </span>
          {areas.map((a) => (
            <button
              key={a}
              onClick={() => setSelectedArea(a)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                selectedArea === a
                  ? 'bg-[#701A35] text-white font-bold'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      {/* ─── Companies DataTable ─── */}
      {companies.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-[#E6E1D6] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#701A35]/10 text-[#701A35] flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Companies Registered</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Add borrower companies before creating loan allocations.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-amber-200" />
            <span>+ Add First Company</span>
          </button>
        </div>
      ) : (
        <DataTable
          data={filteredCompanies}
          columns={columns}
          keyExtractor={(c) => c.id}
          title="Borrowing Companies Registry"
          searchPlaceholder="Search company, contact person, area, phone..."
          exportFileName="ASR_Borrowing_Companies"
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
