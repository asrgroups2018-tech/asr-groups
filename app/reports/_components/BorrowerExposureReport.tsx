'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/lib/store';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { StatusPill } from '@/components/ui/StatusPill';
import { Users, AlertTriangle, ShieldCheck, PieChart } from 'lucide-react';

interface BorrowerExposureRow {
  id: string;
  name: string;
  place: string;
  phone: string;
  activeLoansCount: number;
  totalBorrowed: number;
  totalRepaid: number;
  outstanding: number;
  concentrationShare: number;
  riskRating: 'Prime / Clean' | 'Moderate Risk' | 'High Delinquency';
  status: 'Active' | 'Overdue' | 'Closed';
}

export const BorrowerExposureReport: React.FC = () => {
  const { customers, loans } = useApp();

  const reportData = useMemo(() => {
    const totalPortfolioBorrowed = customers.reduce((sum, c) => sum + (c.totalBorrowed || 0), 0);

    // Map loan status per customer for accurate risk rating
    const customerLoanStatusMap = new Map<string, string[]>();
    loans.forEach((l) => {
      if (!customerLoanStatusMap.has(l.customerId)) customerLoanStatusMap.set(l.customerId, []);
      customerLoanStatusMap.get(l.customerId)!.push(l.status);
    });

    return customers
      .map((c) => {
        const totalBorrowed = c.totalBorrowed || 0;
        const totalRepaid = c.totalRepaid || 0;
        const outstanding = Math.max(0, totalBorrowed - totalRepaid);
        const concentrationShare = totalPortfolioBorrowed > 0 ? Number(((totalBorrowed / totalPortfolioBorrowed) * 100).toFixed(2)) : 0;

        const statuses = customerLoanStatusMap.get(c.id) || [];
        const hasOverdue = statuses.includes('Overdue');

        let riskRating: BorrowerExposureRow['riskRating'] = 'Prime / Clean';
        if (hasOverdue) {
          riskRating = 'High Delinquency';
        } else if (concentrationShare > 2.5) {
          riskRating = 'Moderate Risk';
        }

        return {
          id: c.id,
          name: c.name,
          place: c.place || 'CHENNAI',
          phone: c.phone || '+91 98400 00000',
          activeLoansCount: c.activeLoansCount || 0,
          totalBorrowed,
          totalRepaid,
          outstanding,
          concentrationShare,
          riskRating,
          status: (hasOverdue ? 'Overdue' : c.activeLoansCount === 0 ? 'Closed' : 'Active') as 'Active' | 'Overdue' | 'Closed',
        };
      })
      .sort((a, b) => b.totalBorrowed - a.totalBorrowed);
  }, [customers, loans]);

  const stats = useMemo(() => {
    const totalBorrowed = reportData.reduce((sum, r) => sum + r.totalBorrowed, 0);
    const totalRepaid = reportData.reduce((sum, r) => sum + r.totalRepaid, 0);
    const totalOutstanding = reportData.reduce((sum, r) => sum + r.outstanding, 0);
    const highExposureCount = reportData.filter((r) => r.concentrationShare >= 2.0).length;
    const avgBorrowed = reportData.length > 0 ? Math.round(totalBorrowed / reportData.length) : 0;

    return {
      borrowerCount: reportData.length,
      totalBorrowed,
      totalRepaid,
      totalOutstanding,
      highExposureCount,
      avgBorrowed,
    };
  }, [reportData]);

  const columns: ColumnDef<BorrowerExposureRow>[] = [
    {
      key: 'name',
      header: 'Borrower / Client Name',
      sortable: true,
      accessor: (r) => r.name,
      render: (r) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{r.name}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-[10px] text-slate-500 font-semibold bg-slate-100 px-1 rounded border border-slate-200">
              {r.id}
            </span>
            <span className="text-[10px] text-slate-500 font-medium uppercase">{r.place}</span>
          </div>
        </div>
      ),
      exportValue: (r) => `${r.name} (${r.id})`,
    },
    {
      key: 'phone',
      header: 'Contact',
      sortable: false,
      render: (r) => <span className="font-mono text-[11px] text-slate-600">{r.phone}</span>,
      exportValue: (r) => r.phone,
    },
    {
      key: 'activeLoansCount',
      header: 'Facilities',
      sortable: true,
      align: 'center',
      accessor: (r) => r.activeLoansCount,
      render: (r) => (
        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          {r.activeLoansCount} active
        </span>
      ),
      exportValue: (r) => r.activeLoansCount,
    },
    {
      key: 'totalBorrowed',
      header: 'Cumulative Borrowed',
      sortable: true,
      align: 'right',
      accessor: (r) => r.totalBorrowed,
      render: (r) => <MoneyDisplay amount={r.totalBorrowed} size="sm" amountClassName="font-bold text-slate-900" />,
      exportValue: (r) => r.totalBorrowed,
    },
    {
      key: 'totalRepaid',
      header: 'Cumulative Repaid',
      sortable: true,
      align: 'right',
      accessor: (r) => r.totalRepaid,
      render: (r) => <MoneyDisplay amount={r.totalRepaid} size="sm" amountClassName="font-bold text-emerald-700" />,
      exportValue: (r) => r.totalRepaid,
    },
    {
      key: 'outstanding',
      header: 'Active Outstanding',
      sortable: true,
      align: 'right',
      accessor: (r) => r.outstanding,
      render: (r) => (
        <MoneyDisplay
          amount={r.outstanding}
          size="sm"
          amountClassName={r.outstanding > 0 ? 'font-bold text-rose-700' : 'font-bold text-slate-500'}
        />
      ),
      exportValue: (r) => r.outstanding,
    },
    {
      key: 'concentrationShare',
      header: 'Portfolio Share',
      sortable: true,
      align: 'right',
      accessor: (r) => r.concentrationShare,
      render: (r) => (
        <span className="font-mono text-xs font-bold text-slate-700 tabular-nums">{r.concentrationShare}%</span>
      ),
      exportValue: (r) => `${r.concentrationShare}%`,
    },
    {
      key: 'riskRating',
      header: 'Credit Assessment',
      sortable: true,
      accessor: (r) => r.riskRating,
      render: (r) => {
        let badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300';
        if (r.riskRating === 'High Delinquency') badgeStyle = 'bg-rose-50 text-rose-800 border-rose-300';
        else if (r.riskRating === 'Moderate Risk') badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300';

        return (
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyle}`}>
            {r.riskRating}
          </span>
        );
      },
      exportValue: (r) => r.riskRating,
    },
    {
      key: 'status',
      header: 'Account Status',
      align: 'center',
      sortable: true,
      accessor: (r) => r.status,
      render: (r) => <StatusPill status={r.status as any} size="sm" />,
      exportValue: (r) => r.status,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 3 High-Impact KPI Badges matching Loans page */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-gradient-to-br from-[#701A35]/12 via-[#FAF8F5] to-white p-4.5 rounded-2xl border-2 border-[#701A35]/30 shadow-sm hover:border-[#701A35]/50 transition-all">
          <span className="text-[11px] font-bold text-[#701A35] uppercase tracking-wider font-mono">
            Cumulative Borrowed Volume
          </span>
          <div className="mt-1.5">
            <MoneyDisplay
              amount={stats.totalBorrowed}
              size="xl"
              amountClassName="text-[#701A35] font-black text-2xl block tracking-tight"
            />
          </div>
          <span className="text-[11px] text-slate-600 font-medium mt-1 block">
            Across <strong className="text-slate-800">{stats.borrowerCount}</strong> active borrowers
          </span>
        </div>

        <div className="bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white p-4.5 rounded-2xl border-2 border-emerald-300 shadow-sm hover:border-emerald-400 transition-all">
          <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider font-mono">
            Cumulative Repaid Principal
          </span>
          <div className="mt-1.5">
            <MoneyDisplay
              amount={stats.totalRepaid}
              size="xl"
              amountClassName="text-emerald-700 font-black text-2xl block tracking-tight"
            />
          </div>
          <span className="text-[11px] text-emerald-800 font-bold mt-1 block">
            {stats.totalBorrowed > 0 ? ((stats.totalRepaid / stats.totalBorrowed) * 100).toFixed(1) : 0}% portfolio repaid
          </span>
        </div>

        <div className="bg-gradient-to-br from-rose-100/90 via-rose-50 to-white p-4.5 rounded-2xl border-2 border-rose-300 shadow-sm hover:border-rose-400 transition-all">
          <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider font-mono">
            Active Outstanding Exposure
          </span>
          <div className="mt-1.5">
            <MoneyDisplay
              amount={stats.totalOutstanding}
              size="xl"
              amountClassName="text-[#701A35] font-black text-2xl block tracking-tight"
            />
          </div>
          <span className="text-[11px] text-rose-700 font-bold mt-1 block">
            Active balance in circulation
          </span>
        </div>
      </div>

      {/* Main Report Table */}
      <DataTable
        data={reportData}
        columns={columns}
        keyExtractor={(r) => r.id}
        title="Borrower Exposure & Credit Concentration Report"
        exportFileName="asr_borrower_exposure_report"
        searchPlaceholder="Search by borrower name, code (CUST-...), place..."
        pageSizeDefault={20}
        footerTotals={
          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-xs font-mono">
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Total Borrowers</span>
              <span className="font-bold text-slate-900 text-sm">{stats.borrowerCount} Clients</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Cumulative Borrowed</span>
              <MoneyDisplay amount={stats.totalBorrowed} size="sm" amountClassName="font-bold text-slate-900 text-sm" />
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Cumulative Repaid</span>
              <MoneyDisplay amount={stats.totalRepaid} size="sm" amountClassName="font-bold text-emerald-700 text-sm" />
            </div>
            <div className="md:text-right">
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Total Active Balance</span>
              <MoneyDisplay amount={stats.totalOutstanding} size="sm" amountClassName="font-bold text-rose-700 text-sm" />
            </div>
          </div>
        }
      />
    </div>
  );
};
