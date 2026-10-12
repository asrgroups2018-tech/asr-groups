'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  FileText,
  Search,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useApp } from '@/lib/store';
import { formatINR } from '@/lib/utils/formatCurrency';
import { Loan, Installment } from '@/lib/types';

const PAID_STATUSES = new Set(['PASS', 'NEFT', 'CASH', 'CLS', 'PAID']);
const isPaid = (s: string) => PAID_STATUSES.has(String(s || '').trim().toUpperCase());
const dateKey = (v: string) => String(v || '').slice(0, 10);

type AgeingBucket = '0-30' | '31-60' | '61-90' | '91-180' | '180+';

interface OverdueEntry {
  customerId: string;
  customerName: string;
  place: string;
  loanId: string;
  codeNo: string;
  seqNo: number;
  dueDate: string;
  daysOverdue: number;
  bucket: AgeingBucket;
  amount: number;
}

interface AgeingRow {
  sNo: number;
  customerId: string;
  customerName: string;
  place: string;
  loanCount: number;
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket91_180: number;
  bucket180plus: number;
  totalOverdue: number;
  overdueInstallments: number;
}

function getBucket(days: number): AgeingBucket {
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  if (days <= 180) return '91-180';
  return '180+';
}

function buildAgeingRows(loans: Loan[], asOfDate: string): AgeingRow[] {
  const asOf = new Date(`${asOfDate}T00:00:00`).getTime();
  const grouped = new Map<
    string,
    {
      name: string;
      place: string;
      loanIds: Set<string>;
      b0: number;
      b31: number;
      b61: number;
      b91: number;
      b180: number;
      count: number;
    }
  >();

  for (const loan of loans) {
    for (const inst of loan.installments || []) {
      if (isPaid(inst.status)) continue;
      const due = dateKey(inst.dueDate || '');
      if (!due) continue;
      const dueMs = new Date(`${due}T00:00:00`).getTime();
      if (isNaN(dueMs) || dueMs >= asOf) continue; // Not yet overdue

      const days = Math.floor((asOf - dueMs) / 86400000);
      const bucket = getBucket(days);
      const amount = Number(inst.amountDue || 0);

      const existing = grouped.get(loan.customerId) || {
        name: loan.customerName,
        place: loan.place || '',
        loanIds: new Set(),
        b0: 0,
        b31: 0,
        b61: 0,
        b91: 0,
        b180: 0,
        count: 0,
      };
      existing.loanIds.add(loan.id);
      existing.count += 1;
      if (bucket === '0-30') existing.b0 += amount;
      else if (bucket === '31-60') existing.b31 += amount;
      else if (bucket === '61-90') existing.b61 += amount;
      else if (bucket === '91-180') existing.b91 += amount;
      else existing.b180 += amount;

      grouped.set(loan.customerId, existing);
    }
  }

  return Array.from(grouped.entries())
    .map(([id, data], i) => ({
      sNo: i + 1,
      customerId: id,
      customerName: data.name,
      place: data.place,
      loanCount: data.loanIds.size,
      bucket0_30: data.b0,
      bucket31_60: data.b31,
      bucket61_90: data.b61,
      bucket91_180: data.b91,
      bucket180plus: data.b180,
      totalOverdue: data.b0 + data.b31 + data.b61 + data.b91 + data.b180,
      overdueInstallments: data.count,
    }))
    .filter((r) => r.totalOverdue > 0)
    .sort((a, b) => b.totalOverdue - a.totalOverdue)
    .map((r, i) => ({ ...r, sNo: i + 1 }));
}

const safeFileName = (v: string) =>
  v.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'report';
const pdfMoney = (v: number) => (v > 0 ? `INR ${Number(v).toLocaleString('en-IN')}` : '—');

interface BucketSummary {
  total_b0: number;
  total_b31: number;
  total_b61: number;
  total_b91: number;
  total_b180: number;
  grand: number;
}

export const AgeingReport: React.FC = () => {
  const { loans, isLoading, showToast } = useApp();
  const today = new Date().toISOString().slice(0, 10);
  const [asOfDate, setAsOfDate] = useState(today);
  const [query, setQuery] = useState('');

  const allRows = useMemo(() => buildAgeingRows(loans, asOfDate), [loans, asOfDate]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (r) =>
        r.customerName.toLowerCase().includes(q) ||
        r.customerId.toLowerCase().includes(q) ||
        r.place.toLowerCase().includes(q)
    );
  }, [allRows, query]);

  const summary = useMemo<BucketSummary>(
    () =>
      filteredRows.reduce(
        (acc, r) => ({
          total_b0: acc.total_b0 + r.bucket0_30,
          total_b31: acc.total_b31 + r.bucket31_60,
          total_b61: acc.total_b61 + r.bucket61_90,
          total_b91: acc.total_b91 + r.bucket91_180,
          total_b180: acc.total_b180 + r.bucket180plus,
          grand: acc.grand + r.totalOverdue,
        }),
        { total_b0: 0, total_b31: 0, total_b61: 0, total_b91: 0, total_b180: 0, grand: 0 }
      ),
    [filteredRows]
  );

  const displayDate = new Date(`${asOfDate}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const exportPdf = () => {
    if (!filteredRows.length) {
      showToast('No overdue receivables', 'No overdue installments found.', 'warning');
      return;
    }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(112, 26, 53);
    doc.rect(0, 0, pw, 58, 'F');
    doc.setFillColor(197, 160, 89);
    doc.rect(0, 56, pw, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('ASR GROUPS · OUTSTANDING RECEIVABLES (AGEING)', 32, 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(238, 216, 161);
    doc.text(`As of ${displayDate} · ${filteredRows.length} accounts · Total overdue ${pdfMoney(summary.grand)}`, 32, 44);

    autoTable(doc, {
      startY: 82,
      head: [['S.No', 'Customer', 'Place', 'Loans', '0–30 Days', '31–60 Days', '61–90 Days', '91–180 Days', '180+ Days', 'Total Overdue']],
      body: filteredRows.map((r) => [
        String(r.sNo),
        `${r.customerName}\n${r.customerId}`,
        r.place || '—',
        String(r.loanCount),
        r.bucket0_30 > 0 ? pdfMoney(r.bucket0_30) : '—',
        r.bucket31_60 > 0 ? pdfMoney(r.bucket31_60) : '—',
        r.bucket61_90 > 0 ? pdfMoney(r.bucket61_90) : '—',
        r.bucket91_180 > 0 ? pdfMoney(r.bucket91_180) : '—',
        r.bucket180plus > 0 ? pdfMoney(r.bucket180plus) : '—',
        pdfMoney(r.totalOverdue),
      ]),
      foot: [
        ['', `TOTAL · ${filteredRows.length} accounts`, '', '',
          pdfMoney(summary.total_b0), pdfMoney(summary.total_b31), pdfMoney(summary.total_b61),
          pdfMoney(summary.total_b91), pdfMoney(summary.total_b180), pdfMoney(summary.grand)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, cellPadding: 4 },
      footStyles: { fillColor: [243, 239, 230], textColor: [112, 26, 53], fontSize: 8, fontStyle: 'bold' },
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' } },
      margin: { left: 32, right: 32, bottom: 34 },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text(`ASR Groups · Ageing Report · Page ${data.pageNumber} · Confidential`, pw / 2, ph - 16, { align: 'center' });
      },
    });

    doc.save(`ASR_AgeingReport_${safeFileName(asOfDate)}.pdf`);
    showToast('Ageing Report PDF downloaded', `${filteredRows.length} overdue accounts exported.`, 'success');
  };

  const exportExcel = () => {
    if (!filteredRows.length) {
      showToast('No overdue receivables', 'No overdue installments found.', 'warning');
      return;
    }
    const rows = filteredRows.map((r) => ({
      'S.No': r.sNo,
      'Customer ID': r.customerId,
      'Customer Name': r.customerName,
      'Place': r.place || '—',
      'Loans': r.loanCount,
      'Overdue Installments': r.overdueInstallments,
      '0–30 Days': r.bucket0_30 || '',
      '31–60 Days': r.bucket31_60 || '',
      '61–90 Days': r.bucket61_90 || '',
      '91–180 Days': r.bucket91_180 || '',
      '180+ Days': r.bucket180plus || '',
      'Total Overdue': r.totalOverdue,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Ageing Report');
    XLSX.writeFile(wb, `ASR_AgeingReport_${safeFileName(asOfDate)}.xlsx`);
    showToast('Ageing Report Excel downloaded', `${filteredRows.length} overdue accounts exported.`, 'success');
  };

  const riskColor = (r: AgeingRow) => {
    if (r.bucket180plus > 0) return 'bg-red-50';
    if (r.bucket91_180 > 0) return 'bg-orange-50';
    if (r.bucket61_90 > 0) return 'bg-amber-50';
    return '';
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-7">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">
              Tally — Outstanding Receivables
            </p>
            <div className="mt-1 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-[#701A35]" />
              <h2 className="text-2xl font-bold tracking-tight text-[#24131B]">Ageing Report</h2>
              <span className="rounded-full bg-[#F5EEE3] px-2.5 py-1 text-xs font-bold text-[#701A35]">
                {filteredRows.length} accounts
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Overdue installments bucketed by age. Highlights high-risk accounts. As of date controls what is considered overdue.
            </p>
          </div>

          {/* As-of date & search */}
          <div className="flex flex-wrap items-end gap-3 border-t border-[#EEE8DE] pt-4">
            <label className="block min-w-[160px] text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
              As of Date
              <span className="relative mt-1 block">
                <Clock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] px-3 py-2.5 pl-9 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-[#C5A059]"
                />
              </span>
            </label>
            <div className="relative min-w-64">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customer, ID or place…"
                className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-10 pr-3 text-xs outline-none focus:border-[#C5A059]"
              />
            </div>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={exportPdf}
                disabled={!filteredRows.length}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-45"
              >
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button
                type="button"
                onClick={exportExcel}
                disabled={!filteredRows.length}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-45"
              >
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </button>
            </div>
          </div>
        </div>

        {/* Bucket Summary Cards */}
        <div className="mt-6 grid grid-cols-2 gap-2 border-t border-[#EEE8DE] pt-5 sm:grid-cols-3 lg:grid-cols-6">
          <BucketCard label="Total Overdue" value={formatINR(summary.grand)} tone="rose" />
          <BucketCard label="0 – 30 Days" value={formatINR(summary.total_b0)} tone="amber" />
          <BucketCard label="31 – 60 Days" value={formatINR(summary.total_b31)} tone="orange" />
          <BucketCard label="61 – 90 Days" value={formatINR(summary.total_b61)} tone="red" />
          <BucketCard label="91 – 180 Days" value={formatINR(summary.total_b91)} tone="darkred" />
          <BucketCard label="180+ Days" value={formatINR(summary.total_b180)} tone="critical" />
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
        <div className="flex items-center justify-between border-b border-[#E7DFD2] bg-[#FCFBF9] px-4 py-4 sm:px-5">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <AlertTriangle className="h-4 w-4 text-[#701A35]" />
              Overdue Receivables — As of {displayDate}
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">
              {isLoading ? 'Loading…' : filteredRows.length
                ? `${filteredRows.length} account${filteredRows.length === 1 ? '' : 's'} with overdue collections`
                : 'No overdue receivables found for this date'}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                <th className="w-10 px-3 py-3">S.No</th>
                <th className="w-[22%] px-3 py-3">Customer</th>
                <th className="w-[8%] px-3 py-3">Place</th>
                <th className="w-[10%] px-3 py-3 text-right">0–30 Days</th>
                <th className="w-[10%] px-3 py-3 text-right">31–60 Days</th>
                <th className="w-[10%] px-3 py-3 text-right">61–90 Days</th>
                <th className="w-[10%] px-3 py-3 text-right">91–180 Days</th>
                <th className="w-[10%] px-3 py-3 text-right">180+ Days</th>
                <th className="w-[12%] px-3 py-3 text-right">Total Overdue</th>
                <th className="w-[8%] px-3 py-3 text-center">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center text-sm text-slate-500">
                    {isLoading ? 'Loading…' : 'No overdue receivables found. All accounts are current or closed.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.customerId} className={`transition-colors hover:bg-[#FCFAF7] ${riskColor(r)}`}>
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-500">{r.sNo}</td>
                    <td className="px-3 py-3">
                      <span className="block truncate text-xs font-bold text-[#701A35]">{r.customerName}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-400">{r.customerId} · {r.loanCount} loan{r.loanCount === 1 ? '' : 's'} · {r.overdueInstallments} inst.</span>
                    </td>
                    <td className="px-3 py-3 text-[11px] text-slate-600">{r.place || '—'}</td>
                    <td className="px-3 py-3 text-right text-[11px]">
                      {r.bucket0_30 > 0 ? <span className="font-semibold text-amber-700">{formatINR(r.bucket0_30)}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-[11px]">
                      {r.bucket31_60 > 0 ? <span className="font-semibold text-orange-700">{formatINR(r.bucket31_60)}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-[11px]">
                      {r.bucket61_90 > 0 ? <span className="font-semibold text-red-600">{formatINR(r.bucket61_90)}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-[11px]">
                      {r.bucket91_180 > 0 ? <span className="font-bold text-red-700">{formatINR(r.bucket91_180)}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-[11px]">
                      {r.bucket180plus > 0 ? <span className="font-bold text-red-800">{formatINR(r.bucket180plus)}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-[#701A35]">{formatINR(r.totalOverdue)}</td>
                    <td className="px-3 py-3 text-center">
                      <RiskBadge row={r} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-[#F8F6F2] font-bold text-slate-800">
                  <td></td>
                  <td className="px-3 py-3 text-xs">TOTAL · {filteredRows.length} accounts</td>
                  <td></td>
                  <td className="px-3 py-3 text-right text-xs text-amber-700">{formatINR(summary.total_b0)}</td>
                  <td className="px-3 py-3 text-right text-xs text-orange-700">{formatINR(summary.total_b31)}</td>
                  <td className="px-3 py-3 text-right text-xs text-red-600">{formatINR(summary.total_b61)}</td>
                  <td className="px-3 py-3 text-right text-xs text-red-700">{formatINR(summary.total_b91)}</td>
                  <td className="px-3 py-3 text-right text-xs text-red-800">{formatINR(summary.total_b180)}</td>
                  <td className="px-3 py-3 text-right text-xs text-[#701A35]">{formatINR(summary.grand)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
};

function BucketCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  const tones: Record<string, string> = {
    rose: 'border-rose-200 bg-rose-50/60 text-rose-700',
    amber: 'border-amber-200 bg-amber-50/60 text-amber-700',
    orange: 'border-orange-200 bg-orange-50/60 text-orange-700',
    red: 'border-red-200 bg-red-50/60 text-red-600',
    darkred: 'border-red-300 bg-red-50 text-red-700',
    critical: 'border-red-400 bg-red-100 text-red-800',
  };
  return (
    <div className={`rounded-2xl border px-3.5 py-3 ${tones[tone] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>
      <span className="block text-[10px] font-bold uppercase tracking-[0.1em] opacity-70">{label}</span>
      <strong className="mt-1.5 block truncate text-base font-bold tabular-nums text-slate-900">{value}</strong>
    </div>
  );
}

function RiskBadge({ row }: { row: AgeingRow }) {
  if (row.bucket180plus > 0)
    return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-800">Critical</span>;
  if (row.bucket91_180 > 0)
    return <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700">High</span>;
  if (row.bucket61_90 > 0)
    return <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-700">Medium</span>;
  return <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">Low</span>;
}
