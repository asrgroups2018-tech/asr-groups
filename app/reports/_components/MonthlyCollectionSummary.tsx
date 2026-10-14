'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useApp } from '@/lib/store';
import { formatINR } from '@/lib/utils/formatCurrency';
import { Loan } from '@/lib/types';

const PAID_STATUSES = new Set(['PASS', 'NEFT', 'CASH', 'CLS', 'PAID']);
const isPaid = (s: string) => PAID_STATUSES.has(String(s || '').trim().toUpperCase());
const dateKey = (v: string) => String(v || '').slice(0, 10);

interface MonthlyRow {
  sNo: number;
  monthKey: string; // 'YYYY-MM'
  monthLabel: string;
  due: number;
  collected: number;
  pending: number;
  collectionRate: number;
  installmentsTotal: number;
  installmentsPaid: number;
  installmentsPending: number;
}

function formatMonthLabel(key: string) {
  const d = new Date(`${key}-01T00:00:00`);
  return isNaN(d.getTime()) ? key : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function buildMonthlyRows(loans: Loan[]): MonthlyRow[] {
  const map = new Map<
    string,
    { due: number; collected: number; total: number; paid: number }
  >();

  for (const loan of loans) {
    for (const inst of loan.installments || []) {
      const dueDate = dateKey(inst.dueDate || '');
      if (!dueDate) continue;
      const monthKey = dueDate.slice(0, 7);
      const amountDue = Number(inst.amountDue || 0);
      const paid = isPaid(inst.status) ? amountDue : 0;

      const existing = map.get(monthKey) || { due: 0, collected: 0, total: 0, paid: 0 };
      existing.due += amountDue;
      existing.collected += paid;
      existing.total += 1;
      existing.paid += isPaid(inst.status) ? 1 : 0;
      map.set(monthKey, existing);
    }
  }

  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0])) // newest first
    .map(([key, data], i) => ({
      sNo: i + 1,
      monthKey: key,
      monthLabel: formatMonthLabel(key),
      due: data.due,
      collected: data.collected,
      pending: Math.max(0, data.due - data.collected),
      collectionRate: data.due > 0 ? Math.round((data.collected / data.due) * 100) : 0,
      installmentsTotal: data.total,
      installmentsPaid: data.paid,
      installmentsPending: data.total - data.paid,
    }));
}

const safeFileName = (v: string) =>
  v.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'report';
const pdfMoney = (v: number) => `INR ${Number(v || 0).toLocaleString('en-IN')}`;

export const MonthlyCollectionSummary: React.FC = () => {
  const { loans, isLoading, showToast } = useApp();
  const [yearFilter, setYearFilter] = useState('all');

  const allRows = useMemo(() => buildMonthlyRows(loans), [loans]);

  const availableYears = useMemo(
    () =>
      Array.from(new Set(allRows.map((r) => r.monthKey.slice(0, 4)))).sort().reverse(),
    [allRows]
  );

  const filteredRows = useMemo(() => {
    if (yearFilter === 'all') return allRows;
    return allRows.filter((r) => r.monthKey.startsWith(yearFilter));
  }, [allRows, yearFilter]);

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, r) => ({
          due: acc.due + r.due,
          collected: acc.collected + r.collected,
          pending: acc.pending + r.pending,
        }),
        { due: 0, collected: 0, pending: 0 }
      ),
    [filteredRows]
  );

  const overallRate = totals.due > 0 ? Math.round((totals.collected / totals.due) * 100) : 0;

  const bestMonth = filteredRows.reduce<MonthlyRow | null>(
    (best, r) => (!best || r.collected > best.collected ? r : best),
    null
  );

  const exportPdf = () => {
    if (!filteredRows.length) {
      showToast('Nothing to export', 'No monthly data found.', 'warning');
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
    doc.text('ASR GROUP · MONTHLY COLLECTION SUMMARY', 32, 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(238, 216, 161);
    doc.text(
      `${yearFilter === 'all' ? 'All Years' : yearFilter} · ${filteredRows.length} months · Overall collection rate ${overallRate}%`,
      32, 44
    );

    autoTable(doc, {
      startY: 82,
      head: [['S.No', 'Month', 'Total Due', 'Collected', 'Pending', 'Collection %', 'Installments (Total / Paid / Pending)']],
      body: filteredRows.map((r) => [
        String(r.sNo),
        r.monthLabel,
        pdfMoney(r.due),
        pdfMoney(r.collected),
        r.pending > 0 ? pdfMoney(r.pending) : '—',
        `${r.collectionRate}%`,
        `${r.installmentsTotal} / ${r.installmentsPaid} / ${r.installmentsPending}`,
      ]),
      foot: [
        ['', `GRAND TOTAL · ${filteredRows.length} months`, pdfMoney(totals.due), pdfMoney(totals.collected), pdfMoney(totals.pending), `${overallRate}%`, ''],
      ],
      theme: 'striped',
      headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, cellPadding: 5 },
      footStyles: { fillColor: [243, 239, 230], textColor: [112, 26, 53], fontSize: 8, fontStyle: 'bold' },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
      margin: { left: 32, right: 32, bottom: 34 },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text(`ASR Group · Monthly Collection Summary · Page ${data.pageNumber}`, pw / 2, ph - 16, { align: 'center' });
      },
    });

    doc.save(`ASR_Monthly_Summary_${safeFileName(yearFilter)}.pdf`);
    showToast('Monthly Summary PDF downloaded', `${filteredRows.length} months exported.`, 'success');
  };

  const exportExcel = () => {
    if (!filteredRows.length) {
      showToast('Nothing to export', 'No monthly data found.', 'warning');
      return;
    }
    const rows = filteredRows.map((r) => ({
      'S.No': r.sNo,
      'Month': r.monthLabel,
      'Month Key': r.monthKey,
      'Total Due': r.due,
      'Collected': r.collected,
      'Pending': r.pending,
      'Collection Rate (%)': r.collectionRate,
      'Total Installments': r.installmentsTotal,
      'Paid Installments': r.installmentsPaid,
      'Pending Installments': r.installmentsPending,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Monthly Summary');
    XLSX.writeFile(wb, `ASR_Monthly_Summary_${safeFileName(yearFilter)}.xlsx`);
    showToast('Monthly Summary Excel downloaded', `${filteredRows.length} months exported.`, 'success');
  };

  const rateColor = (rate: number) => {
    if (rate >= 90) return 'text-emerald-700';
    if (rate >= 70) return 'text-amber-600';
    if (rate >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const rateBarColor = (rate: number) => {
    if (rate >= 90) return 'bg-emerald-500';
    if (rate >= 70) return 'bg-amber-500';
    if (rate >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-7">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">
              Tally — Monthly Collection Summary
            </p>
            <div className="mt-1 flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-[#701A35]" />
              <h2 className="text-2xl font-bold tracking-tight text-[#24131B]">Monthly Collection Summary</h2>
              <span className="rounded-full bg-[#F5EEE3] px-2.5 py-1 text-xs font-bold text-[#701A35]">
                {filteredRows.length} months
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Month-wise breakdown of dues, collections, pending amounts, and collection efficiency rate.
            </p>
          </div>

          {/* Filters & Export */}
          <div className="flex flex-wrap items-end gap-3 border-t border-[#EEE8DE] pt-4">
            <label className="block min-w-[130px] text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
              Year
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="mt-1 w-full appearance-none rounded-xl border border-slate-200 bg-[#FCFBF9] px-3 py-2.5 text-xs font-semibold normal-case text-slate-700 outline-none focus:border-[#C5A059]"
              >
                <option value="all">All Years</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={exportPdf}
                disabled={!filteredRows.length}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-45"
              >
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button
                type="button"
                onClick={exportExcel}
                disabled={!filteredRows.length}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-45"
              >
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-2 border-t border-[#EEE8DE] pt-5 sm:grid-cols-4">
            <SumCard label="Total Due" value={formatINR(totals.due)} tone="amber" />
            <SumCard label="Total Collected" value={formatINR(totals.collected)} tone="green" />
            <SumCard label="Total Pending" value={formatINR(totals.pending)} tone="blue" />
            <div className="rounded-2xl border border-violet-200 bg-violet-50/60 px-3.5 py-3">
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-violet-700 opacity-70">
                Overall Collection Rate
              </span>
              <strong className={`mt-2 block text-2xl font-bold tabular-nums ${rateColor(overallRate)}`}>
                {overallRate}%
              </strong>
            </div>
          </div>

          {bestMonth && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/40 px-4 py-3">
              <TrendingUp className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span className="text-xs text-emerald-700">
                <strong>Best month:</strong> {bestMonth.monthLabel} — collected {formatINR(bestMonth.collected)} ({bestMonth.collectionRate}% rate)
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
        <div className="flex items-center justify-between border-b border-[#E7DFD2] bg-[#FCFBF9] px-4 py-4 sm:px-5">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <BarChart3 className="h-4 w-4 text-[#701A35]" />
              Month-wise Collection Register
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">
              {isLoading ? 'Loading…' : `${filteredRows.length} month${filteredRows.length === 1 ? '' : 's'} of data`}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                <th className="w-10 px-3 py-3">S.No</th>
                <th className="w-[14%] px-3 py-3">Month</th>
                <th className="w-[14%] px-3 py-3 text-right">Total Due</th>
                <th className="w-[14%] px-3 py-3 text-right">Collected</th>
                <th className="w-[14%] px-3 py-3 text-right">Pending</th>
                <th className="w-[18%] px-3 py-3">Collection Rate</th>
                <th className="w-[8%] px-3 py-3 text-center">Inst. Total</th>
                <th className="w-[8%] px-3 py-3 text-center">Paid</th>
                <th className="w-[8%] px-3 py-3 text-center">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-sm text-slate-500">
                    {isLoading ? 'Loading…' : 'No monthly data found.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.monthKey} className="transition-colors hover:bg-[#FCFAF7]">
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-500">{r.sNo}</td>
                    <td className="px-3 py-3 font-bold text-slate-800">{r.monthLabel}</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-700">{formatINR(r.due)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-700">{formatINR(r.collected)}</td>
                    <td className="px-3 py-3 text-right font-semibold">
                      {r.pending > 0 ? (
                        <span className="text-[#245B9B]">{formatINR(r.pending)}</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">✓ Fully Collected</span>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-full bg-slate-100 h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${rateBarColor(r.collectionRate)}`}
                            style={{ width: `${Math.min(r.collectionRate, 100)}%` }}
                          />
                        </div>
                        <span className={`w-10 text-right text-[11px] font-bold ${rateColor(r.collectionRate)}`}>
                          {r.collectionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-[11px] text-slate-600">{r.installmentsTotal}</td>
                    <td className="px-3 py-3 text-center text-[11px] font-semibold text-emerald-700">{r.installmentsPaid}</td>
                    <td className="px-3 py-3 text-center text-[11px] font-semibold text-[#245B9B]">{r.installmentsPending}</td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-[#F8F6F2] font-bold text-slate-800">
                  <td></td>
                  <td className="px-3 py-3 text-xs">TOTAL · {filteredRows.length} months</td>
                  <td className="px-3 py-3 text-right text-xs">{formatINR(totals.due)}</td>
                  <td className="px-3 py-3 text-right text-xs text-emerald-700">{formatINR(totals.collected)}</td>
                  <td className="px-3 py-3 text-right text-xs text-[#245B9B]">{formatINR(totals.pending)}</td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-bold ${rateColor(overallRate)}`}>{overallRate}% overall</span>
                  </td>
                  <td></td>
                  <td></td>
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

function SumCard({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'green' | 'blue' }) {
  const tones = {
    amber: 'border-[#E1C98D] bg-[#FBF8F3] text-[#701A35]',
    green: 'border-emerald-200 bg-emerald-50/60 text-emerald-700',
    blue: 'border-blue-200 bg-blue-50/60 text-blue-700',
  };
  return (
    <div className={`rounded-2xl border px-3.5 py-3 ${tones[tone]}`}>
      <span className="block text-[10px] font-bold uppercase tracking-[0.1em] opacity-70">{label}</span>
      <strong className="mt-2 block truncate text-lg font-bold tabular-nums text-slate-900">{value}</strong>
    </div>
  );
}
