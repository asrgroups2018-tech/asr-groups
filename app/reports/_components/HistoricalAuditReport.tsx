'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/lib/store';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { StatusPill } from '@/components/ui/StatusPill';
import { HistoricalReceiptRow } from '@/lib/types';
import { FileSpreadsheet, AlertCircle, CheckCircle2, ShieldCheck, Filter } from 'lucide-react';

export const HistoricalAuditReport: React.FC = () => {
  const { receipts } = useApp();
  const [filterMode, setFilterMode] = useState<'ALL' | 'MISMATCH_ONLY' | 'OUTSIDE_ONLY' | 'ASR_ONLY'>('ALL');

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const hasOutside = Boolean(
        (r.cs && r.cs > 0) ||
        (r.mc && r.mc > 0) ||
        (r.tatva && r.tatva > 0) ||
        (r.bhavna && r.bhavna > 0) ||
        (r.taSS && r.taSS > 0)
      );

      if (filterMode === 'MISMATCH_ONLY') return r.isMismatch;
      if (filterMode === 'OUTSIDE_ONLY') return hasOutside;
      if (filterMode === 'ASR_ONLY') return !hasOutside;
      return true;
    });
  }, [receipts, filterMode]);

  const stats = useMemo(() => {
    const totalVolume = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    const mismatchRows = receipts.filter((r) => r.isMismatch);
    const mismatchVolume = mismatchRows.reduce((sum, r) => sum + Math.abs(r.mismatchDiff || 0), 0);
    const settledRows = receipts.filter((r) => ['PASS', 'NEFT', 'CASH', 'PAID'].includes(String(r.status).toUpperCase()));
    const settledVolume = settledRows.reduce((sum, r) => sum + (r.amount || 0), 0);

    return {
      totalCount: receipts.length,
      totalVolume,
      mismatchCount: mismatchRows.length,
      mismatchVolume,
      settledCount: settledRows.length,
      settledVolume,
      matchedCount: receipts.length - mismatchRows.length,
    };
  }, [receipts]);

  const columns: ColumnDef<HistoricalReceiptRow>[] = [
    {
      key: 'sNo',
      header: 'S.No',
      sortable: true,
      align: 'center',
      accessor: (r) => r.sNo,
      render: (r) => <span className="font-mono text-xs font-bold text-slate-500">#{r.sNo}</span>,
      exportValue: (r) => r.sNo,
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      accessor: (r) => r.date,
      render: (r) => <span className="font-mono text-xs font-bold text-slate-800">{r.date}</span>,
      exportValue: (r) => r.date,
    },
    {
      key: 'clientName',
      header: 'Client / Place',
      sortable: true,
      accessor: (r) => r.clientName,
      render: (r) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{r.clientName}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-[10px] text-slate-500 font-semibold">{r.codeNo || 'CL'}</span>
            <span className="text-[10px] text-slate-500 font-medium uppercase">{r.place}</span>
          </div>
        </div>
      ),
      exportValue: (r) => `${r.clientName} (${r.codeNo || ''}, ${r.place})`,
    },
    {
      key: 'amount',
      header: 'Amount (₹)',
      sortable: true,
      align: 'right',
      accessor: (r) => r.amount,
      render: (r) => <MoneyDisplay amount={r.amount} size="sm" amountClassName="font-bold text-slate-900" />,
      exportValue: (r) => r.amount,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortable: true,
      accessor: (r) => r.status,
      render: (r) => <StatusPill status={r.status as any} size="sm" />,
      exportValue: (r) => r.status,
    },
    {
      key: 'auditAudit',
      header: 'Reconciliation',
      sortable: true,
      accessor: (r) => (r.isMismatch ? 'Mismatch' : 'Matched'),
      render: (r) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
            r.isMismatch
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
          }`}
        >
          {r.isMismatch ? (
            <>
              <AlertCircle className="w-3 h-3" />
              <span>Diff: ₹{Math.abs(r.mismatchDiff || 0).toLocaleString('en-IN')}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3" />
              <span>Matched</span>
            </>
          )}
        </span>
      ),
      exportValue: (r) => (r.isMismatch ? `Mismatch (Diff ₹${r.mismatchDiff})` : 'Matched'),
    },
    {
      key: 'pass',
      header: 'PASS',
      align: 'right',
      sortable: true,
      accessor: (r) => r.pass || 0,
      render: (r) => (r.pass ? <span className="font-mono text-xs font-semibold text-slate-800">₹{r.pass.toLocaleString('en-IN')}</span> : <span className="text-slate-300 font-mono">-</span>),
      exportValue: (r) => r.pass || 0,
    },
    {
      key: 'kars',
      header: 'KARS',
      align: 'right',
      sortable: true,
      accessor: (r) => r.kars || 0,
      render: (r) => (r.kars ? <span className="font-mono text-xs font-semibold text-slate-800">₹{r.kars.toLocaleString('en-IN')}</span> : <span className="text-slate-300 font-mono">-</span>),
      exportValue: (r) => r.kars || 0,
    },
    {
      key: 'ig',
      header: 'IG (INFIN)',
      align: 'right',
      sortable: true,
      accessor: (r) => r.ig || 0,
      render: (r) => (r.ig ? <span className="font-mono text-xs font-semibold text-slate-800">₹{r.ig.toLocaleString('en-IN')}</span> : <span className="text-slate-300 font-mono">-</span>),
      exportValue: (r) => r.ig || 0,
    },
    {
      key: 'ala',
      header: 'ALA',
      align: 'right',
      sortable: true,
      accessor: (r) => r.ala || 0,
      render: (r) => (r.ala ? <span className="font-mono text-xs font-semibold text-slate-800">₹{r.ala.toLocaleString('en-IN')}</span> : <span className="text-slate-300 font-mono">-</span>),
      exportValue: (r) => r.ala || 0,
    },
    {
      key: 'fin',
      header: 'FIN',
      align: 'right',
      sortable: true,
      accessor: (r) => r.fin || 0,
      render: (r) => (r.fin ? <span className="font-mono text-xs font-semibold text-slate-800">₹{r.fin.toLocaleString('en-IN')}</span> : <span className="text-slate-300 font-mono">-</span>),
      exportValue: (r) => r.fin || 0,
    },
    {
      key: 'cs',
      header: 'CS (Outside)',
      align: 'right',
      sortable: true,
      accessor: (r) => r.cs || 0,
      render: (r) => (r.cs ? <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">₹{r.cs.toLocaleString('en-IN')}</span> : <span className="text-slate-300 font-mono">-</span>),
      exportValue: (r) => r.cs || 0,
    },
    {
      key: 'mc',
      header: 'MC (Outside)',
      align: 'right',
      sortable: true,
      accessor: (r) => r.mc || 0,
      render: (r) => (r.mc ? <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">₹{r.mc.toLocaleString('en-IN')}</span> : <span className="text-slate-300 font-mono">-</span>),
      exportValue: (r) => r.mc || 0,
    },
    {
      key: 'depName',
      header: 'Deposit Acc',
      sortable: true,
      accessor: (r) => r.depName || '-',
      render: (r) => <span className="text-[11px] text-slate-600">{r.depName || '-'}</span>,
      exportValue: (r) => r.depName || '-',
    },
    {
      key: 'chqNo',
      header: 'Cheque / Ref',
      sortable: false,
      render: (r) => <span className="font-mono text-[11px] text-slate-600">{r.chqNo || '-'}</span>,
      exportValue: (r) => r.chqNo || '-',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 3 High-Impact KPI Badges matching Loans page */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-[#701A35]/12 via-[#FAF8F5] to-white p-3 rounded-xl border-2 border-[#701A35]/30 shadow-sm hover:border-[#701A35]/50 transition-all">
          <span className="text-[10px] font-bold text-[#701A35] uppercase tracking-wider font-mono">
            Total July Volume
          </span>
          <div className="mt-1">
            <MoneyDisplay
              amount={stats.totalVolume}
              size="lg"
              amountClassName="text-[#701A35] font-black text-xl block tracking-tight"
            />
          </div>
          <span className="text-[10px] text-slate-600 font-medium mt-0.5 block">
            Across <strong className="text-slate-800">{stats.totalCount}</strong> audited historical entries
          </span>
        </div>

        <div className="bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white p-3 rounded-xl border-2 border-emerald-300 shadow-sm hover:border-emerald-400 transition-all">
          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider font-mono">
            Reconciled Volume
          </span>
          <div className="mt-1">
            <MoneyDisplay
              amount={stats.settledVolume}
              size="lg"
              amountClassName="text-emerald-700 font-black text-xl block tracking-tight"
            />
          </div>
          <span className="text-[10px] text-emerald-800 font-bold mt-0.5 block">
            {stats.matchedCount} verified matching splits
          </span>
        </div>

        <div className="bg-gradient-to-br from-rose-100/90 via-rose-50 to-white p-3 rounded-xl border-2 border-rose-300 shadow-sm hover:border-rose-400 transition-all">
          <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider font-mono">
            Discrepancy Mismatches
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <h3 className="text-xl font-black text-[#701A35] tabular-nums tracking-tight font-mono">
              {stats.mismatchCount}
            </h3>
            {stats.mismatchCount > 0 && (
              <span className="text-[10px] font-bold text-rose-700 font-mono">
                (Diff: ₹{stats.mismatchVolume.toLocaleString('en-IN')})
              </span>
            )}
          </div>
          <span className="text-[10px] text-rose-700 font-bold mt-0.5 block">
            Requiring audit correction
          </span>
        </div>
      </div>

      {/* Filter Bar matching Loans page */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto max-w-full">
          {[
            { id: 'ALL', label: `All (${receipts.length})` },
            { id: 'MISMATCH_ONLY', label: `Discrepancies Only (${stats.mismatchCount})` },
            { id: 'OUTSIDE_ONLY', label: 'Outside-Party Splits' },
            { id: 'ASR_ONLY', label: 'ASR Group Only' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-120 cursor-pointer whitespace-nowrap ${
                filterMode === tab.id
                  ? 'bg-[#701A35] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Report Table */}
      <DataTable
        data={filteredReceipts}
        columns={columns}
        keyExtractor={(r) => `${r.sNo}-${r.date}`}
        title="July 2026 Historical Audit & Reconciliation Report"
        exportFileName="asr_historical_july_audit_report"
        searchPlaceholder="Search by client, code, cheque number, deposit account..."
        pageSizeDefault={25}
        footerTotals={
          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-xs font-mono">
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Total Entries</span>
              <span className="font-bold text-slate-900 text-sm">{filteredReceipts.length} Rows</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Total Volume</span>
              <MoneyDisplay amount={stats.totalVolume} size="sm" amountClassName="font-bold text-slate-900 text-sm" />
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Reconciled Volume</span>
              <MoneyDisplay amount={stats.settledVolume} size="sm" amountClassName="font-bold text-emerald-700 text-sm" />
            </div>
            <div className="md:text-right">
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Discrepancy Count</span>
              <span className="font-bold text-rose-700 text-sm">{stats.mismatchCount} Discrepancies</span>
            </div>
          </div>
        }
      />
    </div>
  );
};
