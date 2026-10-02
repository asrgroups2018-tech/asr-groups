'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/lib/store';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { Building2, TrendingUp, ShieldCheck, Users, PieChart } from 'lucide-react';

interface CompanySyndicationRow {
  id: string;
  shortCode: string;
  name: string;
  isOutsideParty: boolean;
  activeLoansCount: number;
  totalFunded: number;
  totalCollected: number;
  outstanding: number;
  recoveryRate: number;
  sharePercent: number;
}

export const CompanySyndicationReport: React.FC = () => {
  const { companies } = useApp();

  const reportData = useMemo(() => {
    const totalSystemFunded = companies.reduce((sum, c) => sum + (c.totalFunded || 0), 0);

    return companies.map((c) => {
      const totalFunded = c.totalFunded || 0;
      const totalCollected = c.totalCollected || 0;
      const outstanding = Math.max(0, totalFunded - totalCollected);
      const recoveryRate = totalFunded > 0 ? Number(((totalCollected / totalFunded) * 100).toFixed(1)) : 0;
      const sharePercent = totalSystemFunded > 0 ? Number(((totalFunded / totalSystemFunded) * 100).toFixed(1)) : 0;

      return {
        id: c.id,
        shortCode: c.shortCode,
        name: c.name,
        isOutsideParty: c.isOutsideParty,
        activeLoansCount: c.activeLoansCount || 0,
        totalFunded,
        totalCollected,
        outstanding,
        recoveryRate,
        sharePercent,
      };
    });
  }, [companies]);

  const stats = useMemo(() => {
    const totalFunded = reportData.reduce((sum, r) => sum + r.totalFunded, 0);
    const totalCollected = reportData.reduce((sum, r) => sum + r.totalCollected, 0);
    const totalOutstanding = reportData.reduce((sum, r) => sum + r.outstanding, 0);
    const asrFunded = reportData.filter((r) => !r.isOutsideParty).reduce((sum, r) => sum + r.totalFunded, 0);
    const outsideFunded = reportData.filter((r) => r.isOutsideParty).reduce((sum, r) => sum + r.totalFunded, 0);
    const overallRecovery = totalFunded > 0 ? ((totalCollected / totalFunded) * 100).toFixed(1) : '0.0';

    return {
      totalFunded,
      totalCollected,
      totalOutstanding,
      asrFunded,
      outsideFunded,
      overallRecovery,
      asrCount: reportData.filter((r) => !r.isOutsideParty).length,
      outsideCount: reportData.filter((r) => r.isOutsideParty).length,
    };
  }, [reportData]);

  const columns: ColumnDef<CompanySyndicationRow>[] = [
    {
      key: 'shortCode',
      header: 'Company Code',
      sortable: true,
      accessor: (r) => r.shortCode,
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-200">
            {r.shortCode}
          </span>
          <span className="font-bold text-slate-900 text-xs">{r.name}</span>
        </div>
      ),
      exportValue: (r) => `${r.shortCode} - ${r.name}`,
    },
    {
      key: 'classification',
      header: 'Ownership',
      sortable: true,
      align: 'center',
      accessor: (r) => (r.isOutsideParty ? 'Outside Party' : 'ASR Group'),
      render: (r) => (
        <span
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
            r.isOutsideParty
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {r.isOutsideParty ? 'Outside Party' : 'ASR Group'}
        </span>
      ),
      exportValue: (r) => (r.isOutsideParty ? 'Outside Party' : 'ASR Group'),
    },
    {
      key: 'activeLoansCount',
      header: 'Active Facilities',
      sortable: true,
      align: 'center',
      accessor: (r) => r.activeLoansCount,
      render: (r) => (
        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          {r.activeLoansCount} loans
        </span>
      ),
      exportValue: (r) => r.activeLoansCount,
    },
    {
      key: 'totalFunded',
      header: 'Capital Funded',
      sortable: true,
      align: 'right',
      accessor: (r) => r.totalFunded,
      render: (r) => <MoneyDisplay amount={r.totalFunded} size="sm" amountClassName="font-bold text-slate-900" />,
      exportValue: (r) => r.totalFunded,
    },
    {
      key: 'totalCollected',
      header: 'Capital Recovered',
      sortable: true,
      align: 'right',
      accessor: (r) => r.totalCollected,
      render: (r) => <MoneyDisplay amount={r.totalCollected} size="sm" amountClassName="font-bold text-emerald-700" />,
      exportValue: (r) => r.totalCollected,
    },
    {
      key: 'outstanding',
      header: 'Outstanding Exposure',
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
      key: 'recoveryRate',
      header: 'Recovery Rate',
      sortable: true,
      align: 'right',
      accessor: (r) => r.recoveryRate,
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full ${r.recoveryRate >= 80 ? 'bg-emerald-600' : r.recoveryRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(100, r.recoveryRate)}%` }}
            />
          </div>
          <span className="font-mono text-xs font-bold text-slate-800 tabular-nums">{r.recoveryRate}%</span>
        </div>
      ),
      exportValue: (r) => `${r.recoveryRate}%`,
    },
    {
      key: 'sharePercent',
      header: 'Portfolio Share',
      sortable: true,
      align: 'right',
      accessor: (r) => r.sharePercent,
      render: (r) => (
        <span className="font-mono text-xs text-slate-600 font-semibold">{r.sharePercent}%</span>
      ),
      exportValue: (r) => `${r.sharePercent}%`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 3 High-Impact KPI Badges matching Loans page */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4.5 rounded-2xl border-2 border-slate-200/90 shadow-sm hover:border-slate-300 transition-all">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
            Total Capital Funded
          </span>
          <div className="mt-1.5">
            <MoneyDisplay
              amount={stats.totalFunded}
              size="xl"
              amountClassName="text-slate-950 font-black text-2xl block tracking-tight"
            />
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            Across <strong className="text-slate-800">{stats.asrCount + stats.outsideCount}</strong> entities ({stats.asrCount} ASR · {stats.outsideCount} Outside)
          </span>
        </div>

        <div className="bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white p-4.5 rounded-2xl border-2 border-emerald-300 shadow-sm hover:border-emerald-400 transition-all">
          <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider font-mono">
            Total Capital Recovered
          </span>
          <div className="mt-1.5">
            <MoneyDisplay
              amount={stats.totalCollected}
              size="xl"
              amountClassName="text-emerald-700 font-black text-2xl block tracking-tight"
            />
          </div>
          <span className="text-[11px] text-emerald-800 font-bold mt-1 block">
            {stats.overallRecovery}% recovery rate
          </span>
        </div>

        <div className="bg-gradient-to-br from-rose-100/90 via-rose-50 to-white p-4.5 rounded-2xl border-2 border-rose-300 shadow-sm hover:border-rose-400 transition-all">
          <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider font-mono">
            Total Outstanding Exposure
          </span>
          <div className="mt-1.5">
            <MoneyDisplay
              amount={stats.totalOutstanding}
              size="xl"
              amountClassName="text-[#701A35] font-black text-2xl block tracking-tight"
            />
          </div>
          <span className="text-[11px] text-rose-700 font-bold mt-1 block">
            Active capital in circulation
          </span>
        </div>
      </div>

      {/* Main Report Table */}
      <DataTable
        data={reportData}
        columns={columns}
        keyExtractor={(r) => r.id}
        title="16-Company Capital Syndication & Exposure Report"
        exportFileName="asr_company_syndication_report"
        searchPlaceholder="Search by company code or legal name..."
        pageSizeDefault={20}
        footerTotals={
          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-xs font-mono">
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Total Capital Funded</span>
              <MoneyDisplay amount={stats.totalFunded} size="sm" amountClassName="font-bold text-slate-900 text-sm" />
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Total Capital Recovered</span>
              <MoneyDisplay amount={stats.totalCollected} size="sm" amountClassName="font-bold text-emerald-700 text-sm" />
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Net Outstanding Balance</span>
              <MoneyDisplay amount={stats.totalOutstanding} size="sm" amountClassName="font-bold text-rose-700 text-sm" />
            </div>
            <div className="md:text-right">
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Overall Recovery Rate</span>
              <span className="font-bold text-slate-900 text-sm">{stats.overallRecovery}%</span>
            </div>
          </div>
        }
      />
    </div>
  );
};
