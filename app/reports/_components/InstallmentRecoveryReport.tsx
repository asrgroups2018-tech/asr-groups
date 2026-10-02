'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/lib/store';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { StatusPill } from '@/components/ui/StatusPill';
import { Calendar, AlertCircle, CheckCircle2, DollarSign, Clock, Filter } from 'lucide-react';

interface InstallmentReportRow {
  id: string;
  loanId: string;
  seqNo: number;
  clientName: string;
  place: string;
  dueDate: string;
  recdDate: string | null;
  amountDue: number;
  status: string;
  chqNo?: string;
  depName?: string;
  delayDays: number;
  agingBucket: 'Current' | '1-30 Days' | '31-60 Days' | '61-90 Days' | '90+ Days Default';
  remarks?: string;
}

export const InstallmentRecoveryReport: React.FC = () => {
  const { loans } = useApp();
  const [agingFilter, setAgingFilter] = useState<string>('ALL');

  const reportData = useMemo(() => {
    const rows: InstallmentReportRow[] = [];
    const today = new Date().toISOString().slice(0, 10);

    loans.forEach((l) => {
      (l.installments || []).forEach((ins) => {
        const isSettled = ['PASS', 'NEFT', 'CASH', 'PAID', 'Paid'].includes(String(ins.status).toUpperCase());
        const isBounced = ['RET', 'RET NEFT', 'RET PASS'].includes(String(ins.status).toUpperCase());

        let delayDays = 0;
        if (isSettled && ins.recdDate && ins.dueDate) {
          const d1 = new Date(ins.dueDate).getTime();
          const d2 = new Date(ins.recdDate).getTime();
          if (!isNaN(d1) && !isNaN(d2)) {
            delayDays = Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
          }
        } else if (!isSettled && ins.dueDate && ins.dueDate < today) {
          const d1 = new Date(ins.dueDate).getTime();
          const d2 = new Date(today).getTime();
          if (!isNaN(d1) && !isNaN(d2)) {
            delayDays = Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
          }
        }

        let agingBucket: InstallmentReportRow['agingBucket'] = 'Current';
        if (delayDays > 90 || isBounced) {
          agingBucket = '90+ Days Default';
        } else if (delayDays > 60) {
          agingBucket = '61-90 Days';
        } else if (delayDays > 30) {
          agingBucket = '31-60 Days';
        } else if (delayDays > 0) {
          agingBucket = '1-30 Days';
        }

        rows.push({
          id: ins.id,
          loanId: l.id,
          seqNo: ins.seqNo,
          clientName: l.customerName,
          place: l.place || 'CHENNAI',
          dueDate: ins.dueDate,
          recdDate: ins.recdDate || null,
          amountDue: Number(ins.amountDue || 0),
          status: ins.status,
          chqNo: ins.chqNo,
          depName: ins.depName,
          delayDays,
          agingBucket,
          remarks: ins.remarks,
        });
      });
    });

    return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [loans]);

  const filteredData = useMemo(() => {
    if (agingFilter === 'ALL') return reportData;
    return reportData.filter((r) => r.agingBucket === agingFilter);
  }, [reportData, agingFilter]);

  const stats = useMemo(() => {
    const totalScheduled = reportData.reduce((sum, r) => sum + r.amountDue, 0);
    const settledRows = reportData.filter((r) => ['PASS', 'NEFT', 'CASH', 'PAID'].includes(r.status.toUpperCase()));
    const settledAmount = settledRows.reduce((sum, r) => sum + r.amountDue, 0);
    const bouncedRows = reportData.filter((r) => ['RET', 'RET NEFT', 'RET PASS'].includes(r.status.toUpperCase()));
    const bouncedAmount = bouncedRows.reduce((sum, r) => sum + r.amountDue, 0);
    const pendingRows = reportData.filter((r) => r.status.toUpperCase() === 'PENDING');
    const pendingAmount = pendingRows.reduce((sum, r) => sum + r.amountDue, 0);

    const onTimeRate = totalScheduled > 0 ? ((settledAmount / totalScheduled) * 100).toFixed(1) : '0.0';

    return {
      totalCount: reportData.length,
      totalScheduled,
      settledCount: settledRows.length,
      settledAmount,
      bouncedCount: bouncedRows.length,
      bouncedAmount,
      pendingCount: pendingRows.length,
      pendingAmount,
      onTimeRate,
    };
  }, [reportData]);

  const columns: ColumnDef<InstallmentReportRow>[] = [
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      accessor: (r) => r.dueDate,
      render: (r) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs">{r.dueDate}</span>
          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">EMI #{r.seqNo}</span>
        </div>
      ),
      exportValue: (r) => r.dueDate,
    },
    {
      key: 'clientName',
      header: 'Client & Facility',
      sortable: true,
      accessor: (r) => r.clientName,
      render: (r) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{r.clientName}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-[10px] text-[#701A35] font-semibold bg-[#701A35]/5 px-1 rounded border border-[#701A35]/20">
              {r.loanId}
            </span>
            <span className="text-[10px] text-slate-500 font-medium uppercase">{r.place}</span>
          </div>
        </div>
      ),
      exportValue: (r) => `${r.clientName} (${r.loanId})`,
    },
    {
      key: 'amountDue',
      header: 'Amount Due',
      sortable: true,
      align: 'right',
      accessor: (r) => r.amountDue,
      render: (r) => <MoneyDisplay amount={r.amountDue} size="sm" amountClassName="font-bold text-slate-900" />,
      exportValue: (r) => r.amountDue,
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
      key: 'recdDate',
      header: 'Settlement Date',
      sortable: true,
      accessor: (r) => r.recdDate || 'Pending',
      render: (r) => (
        <span className="font-mono text-xs text-slate-700">
          {r.recdDate ? r.recdDate : <span className="text-slate-400 italic">Unsettled</span>}
        </span>
      ),
      exportValue: (r) => r.recdDate || 'Unsettled',
    },
    {
      key: 'agingBucket',
      header: 'Aging Category',
      sortable: true,
      accessor: (r) => r.agingBucket,
      render: (r) => {
        let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
        if (r.agingBucket === '90+ Days Default') badgeStyle = 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
        else if (r.agingBucket === '61-90 Days') badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300';
        else if (r.agingBucket === '31-60 Days') badgeStyle = 'bg-yellow-50 text-yellow-800 border-yellow-300';
        else if (r.agingBucket === 'Current') badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300';

        return (
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono border ${badgeStyle}`}>
            {r.agingBucket} {r.delayDays > 0 ? `(${r.delayDays}d)` : ''}
          </span>
        );
      },
      exportValue: (r) => `${r.agingBucket} (${r.delayDays} days delay)`,
    },
    {
      key: 'chqNo',
      header: 'Payment Ref',
      sortable: false,
      render: (r) => (
        <span className="font-mono text-[11px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
          {r.chqNo || '-'}
        </span>
      ),
      exportValue: (r) => r.chqNo || '-',
    },
    {
      key: 'depName',
      header: 'Deposit Account',
      sortable: true,
      accessor: (r) => r.depName || '-',
      render: (r) => (
        <span className="text-[11px] text-slate-700 font-medium">
          {r.depName || <span className="text-slate-400 italic">-</span>}
        </span>
      ),
      exportValue: (r) => r.depName || '-',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 3 High-Impact KPI Badges matching Loans page */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4.5 rounded-2xl border-2 border-slate-200/90 shadow-sm hover:border-slate-300 transition-all">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
            Total EMIs Scheduled
          </span>
          <div className="mt-1.5">
            <MoneyDisplay
              amount={stats.totalScheduled}
              size="xl"
              amountClassName="text-slate-950 font-black text-2xl block tracking-tight"
            />
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            Across <strong className="text-slate-800">{stats.totalCount}</strong> installments
          </span>
        </div>

        <div className="bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white p-4.5 rounded-2xl border-2 border-emerald-300 shadow-sm hover:border-emerald-400 transition-all">
          <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider font-mono">
            Successfully Collected
          </span>
          <div className="mt-1.5">
            <MoneyDisplay
              amount={stats.settledAmount}
              size="xl"
              amountClassName="text-emerald-700 font-black text-2xl block tracking-tight"
            />
          </div>
          <span className="text-[11px] text-emerald-800 font-bold mt-1 block">
            {stats.onTimeRate}% collection rate ({stats.settledCount} EMIs settled)
          </span>
        </div>

        <div className="bg-gradient-to-br from-rose-100/90 via-rose-50 to-white p-4.5 rounded-2xl border-2 border-rose-300 shadow-sm hover:border-rose-400 transition-all">
          <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider font-mono">
            Bounced / Returned (RET)
          </span>
          <div className="mt-1.5">
            <MoneyDisplay
              amount={stats.bouncedAmount}
              size="xl"
              amountClassName="text-[#701A35] font-black text-2xl block tracking-tight"
            />
          </div>
          <span className="text-[11px] text-rose-700 font-bold mt-1 block">
            {stats.bouncedCount} bounced EMIs
          </span>
        </div>
      </div>

      {/* Aging Filter Bar matching Loans page */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto max-w-full">
          {[
            { id: 'ALL', label: `All (${reportData.length})` },
            { id: 'Current', label: 'Current / On-Time' },
            { id: '1-30 Days', label: '1-30 Days' },
            { id: '31-60 Days', label: '31-60 Days' },
            { id: '90+ Days Default', label: '90+ Days / Bounced' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAgingFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-120 cursor-pointer whitespace-nowrap ${
                agingFilter === tab.id
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
        data={filteredData}
        columns={columns}
        keyExtractor={(r) => r.id}
        title="Installment Recovery & Repayment Aging Report"
        exportFileName="asr_installment_recovery_report"
        searchPlaceholder="Search by client, loan ID, cheque number, or place..."
        pageSizeDefault={20}
        footerTotals={
          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-xs font-mono">
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Total Volume</span>
              <MoneyDisplay amount={stats.totalScheduled} size="sm" amountClassName="font-bold text-slate-900 text-sm" />
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Recovered</span>
              <MoneyDisplay amount={stats.settledAmount} size="sm" amountClassName="font-bold text-emerald-700 text-sm" />
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Bounced / Overdue</span>
              <MoneyDisplay amount={stats.bouncedAmount} size="sm" amountClassName="font-bold text-rose-700 text-sm" />
            </div>
            <div className="md:text-right">
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Collection Rate</span>
              <span className="font-bold text-slate-900 text-sm">{stats.onTimeRate}%</span>
            </div>
          </div>
        }
      />
    </div>
  );
};
