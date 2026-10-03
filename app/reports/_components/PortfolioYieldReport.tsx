'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/lib/store';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { StatusPill } from '@/components/ui/StatusPill';
import { Briefcase, TrendingUp, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface PortfolioYieldRow {
  id: string;
  codeNo?: string;
  startDate: string;
  customerName: string;
  place: string;
  totalAmount: number;
  frequency: string;
  installmentCount: number;
  settledCount: number;
  pendingCount: number;
  totalCollected: number;
  totalOutstanding: number;
  completionRate: number;
  status: string;
}

export const PortfolioYieldReport: React.FC = () => {
  const { loans } = useApp();

  const reportData = useMemo(() => {
    return loans.map((l) => {
      const insts = l.installments || [];
      const settledInsts = insts.filter((i) =>
        ['PASS', 'NEFT', 'CASH', 'PAID', 'Paid'].includes(String(i.status).toUpperCase())
      );
      const settledCount = settledInsts.length;
      const pendingCount = insts.length - settledCount;
      const totalCollected = l.totalCollected || 0;
      const totalAmount = l.totalAmount || 0;
      const totalOutstanding = Math.max(0, totalAmount - totalCollected);
      const completionRate = totalAmount > 0 ? Number(((totalCollected / totalAmount) * 100).toFixed(1)) : 0;

      return {
        id: l.id,
        codeNo: l.codeNo,
        startDate: l.startDate,
        customerName: l.customerName,
        place: l.place || 'CHENNAI',
        totalAmount,
        frequency: l.frequency,
        installmentCount: l.installmentCount || insts.length,
        settledCount,
        pendingCount,
        totalCollected,
        totalOutstanding,
        completionRate,
        status: l.status,
      };
    });
  }, [loans]);

  const stats = useMemo(() => {
    const totalDisbursed = reportData.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalRecovered = reportData.reduce((sum, r) => sum + r.totalCollected, 0);
    const totalOutstanding = reportData.reduce((sum, r) => sum + r.totalOutstanding, 0);
    const activeCount = reportData.filter((r) => r.status !== 'Closed').length;
    const closedCount = reportData.filter((r) => r.status === 'Closed').length;
    const overallCompletion = totalDisbursed > 0 ? ((totalRecovered / totalDisbursed) * 100).toFixed(1) : '0.0';

    return {
      totalLoans: reportData.length,
      totalDisbursed,
      totalRecovered,
      totalOutstanding,
      activeCount,
      closedCount,
      overallCompletion,
    };
  }, [reportData]);

  const columns: ColumnDef<PortfolioYieldRow>[] = [
    {
      key: 'id',
      header: 'Facility ID',
      sortable: true,
      accessor: (r) => r.id,
      render: (r) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs block">{r.id}</span>
          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{r.startDate}</span>
        </div>
      ),
      exportValue: (r) => `${r.id} (${r.startDate})`,
    },
    {
      key: 'customerName',
      header: 'Borrower / Client',
      sortable: true,
      accessor: (r) => r.customerName,
      render: (r) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{r.customerName}</span>
          <span className="text-[10px] text-slate-500 font-medium uppercase">{r.place}</span>
        </div>
      ),
      exportValue: (r) => `${r.customerName} - ${r.place}`,
    },
    {
      key: 'totalAmount',
      header: 'Principal Disbursed',
      sortable: true,
      align: 'right',
      accessor: (r) => r.totalAmount,
      render: (r) => <MoneyDisplay amount={r.totalAmount} size="sm" amountClassName="font-bold text-slate-900" />,
      exportValue: (r) => r.totalAmount,
    },
    {
      key: 'frequency',
      header: 'Frequency',
      sortable: true,
      align: 'center',
      accessor: (r) => r.frequency,
      render: (r) => (
        <span className="font-mono text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          {r.frequency}
        </span>
      ),
      exportValue: (r) => r.frequency,
    },
    {
      key: 'progress',
      header: 'EMIs Settled / Total',
      sortable: true,
      align: 'center',
      accessor: (r) => r.settledCount,
      render: (r) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-800">
            {r.settledCount} / {r.installmentCount}
          </span>
          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200 mx-auto mt-1">
            <div
              className={`h-full ${r.completionRate === 100 ? 'bg-emerald-600' : 'bg-[#701A35]'}`}
              style={{ width: `${r.completionRate}%` }}
            />
          </div>
        </div>
      ),
      exportValue: (r) => `${r.settledCount} of ${r.installmentCount} EMIs`,
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
      key: 'totalOutstanding',
      header: 'Remaining Balance',
      sortable: true,
      align: 'right',
      accessor: (r) => r.totalOutstanding,
      render: (r) => (
        <MoneyDisplay
          amount={r.totalOutstanding}
          size="sm"
          amountClassName={r.totalOutstanding > 0 ? 'font-bold text-rose-700' : 'font-bold text-slate-500'}
        />
      ),
      exportValue: (r) => r.totalOutstanding,
    },
    {
      key: 'completionRate',
      header: 'Completion %',
      sortable: true,
      align: 'right',
      accessor: (r) => r.completionRate,
      render: (r) => (
        <span className="font-mono text-xs font-bold text-slate-800 tabular-nums">{r.completionRate}%</span>
      ),
      exportValue: (r) => `${r.completionRate}%`,
    },
    {
      key: 'status',
      header: 'Loan Status',
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-[#701A35]/12 via-[#FAF8F5] to-white p-3 rounded-xl border-2 border-[#701A35]/30 shadow-sm hover:border-[#701A35]/50 transition-all">
          <span className="text-[10px] font-bold text-[#701A35] uppercase tracking-wider font-mono">
            Total Disbursed Capital
          </span>
          <div className="mt-1">
            <MoneyDisplay
              amount={stats.totalDisbursed}
              size="lg"
              amountClassName="text-[#701A35] font-black text-xl block tracking-tight"
            />
          </div>
          <span className="text-[10px] text-slate-600 font-medium mt-0.5 block">
            Across <strong className="text-slate-800">{stats.totalLoans}</strong> loan facilities ({stats.activeCount} active · {stats.closedCount} closed)
          </span>
        </div>

        <div className="bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white p-3 rounded-xl border-2 border-emerald-300 shadow-sm hover:border-emerald-400 transition-all">
          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider font-mono">
            Total Recovered Principal
          </span>
          <div className="mt-1">
            <MoneyDisplay
              amount={stats.totalRecovered}
              size="lg"
              amountClassName="text-emerald-700 font-black text-xl block tracking-tight"
            />
          </div>
          <span className="text-[10px] text-emerald-800 font-bold mt-0.5 block">
            {stats.overallCompletion}% recovery rate
          </span>
        </div>

        <div className="bg-gradient-to-br from-rose-100/90 via-rose-50 to-white p-3 rounded-xl border-2 border-rose-300 shadow-sm hover:border-rose-400 transition-all">
          <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider font-mono">
            Remaining Active Balance
          </span>
          <div className="mt-1">
            <MoneyDisplay
              amount={stats.totalOutstanding}
              size="lg"
              amountClassName="text-[#701A35] font-black text-xl block tracking-tight"
            />
          </div>
          <span className="text-[10px] text-rose-700 font-bold mt-0.5 block">
            Active balance in circulation
          </span>
        </div>
      </div>

      {/* Main Report Table */}
      <DataTable
        data={reportData}
        columns={columns}
        keyExtractor={(r) => r.id}
        title="Portfolio Underwriting & Yield Performance Report"
        exportFileName="asr_portfolio_yield_report"
        searchPlaceholder="Search by loan ID, borrower name, place, or code..."
        pageSizeDefault={20}
        footerTotals={
          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-xs font-mono">
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Total Disbursed</span>
              <MoneyDisplay amount={stats.totalDisbursed} size="sm" amountClassName="font-bold text-slate-900 text-sm" />
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Total Recovered</span>
              <MoneyDisplay amount={stats.totalRecovered} size="sm" amountClassName="font-bold text-emerald-700 text-sm" />
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Remaining Balance</span>
              <MoneyDisplay amount={stats.totalOutstanding} size="sm" amountClassName="font-bold text-rose-700 text-sm" />
            </div>
            <div className="md:text-right">
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Overall Yield</span>
              <span className="font-bold text-slate-900 text-sm">{stats.overallCompletion}%</span>
            </div>
          </div>
        }
      />
    </div>
  );
};
