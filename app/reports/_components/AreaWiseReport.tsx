'use client';

import React, { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useApp } from '@/lib/store';
import { formatINR } from '@/lib/utils/formatCurrency';
import { Loan } from '@/lib/types';

const PAID_STATUSES = new Set(['PASS', 'NEFT', 'CASH', 'CLS', 'PAID']);
const isPaid = (s: string) => PAID_STATUSES.has(String(s || '').trim().toUpperCase());

const safeFileName = (v: string) =>
  v.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'report';
const pdfMoney = (v: number) => `INR ${Number(v || 0).toLocaleString('en-IN')}`;

interface AreaRow {
  place: string;
  totalLoans: number;
  totalCustomers: number;
  totalPortfolio: number;   // sum of totalAmount for all loans in area
  totalDue: number;         // sum of amountDue for all installments
  totalCollected: number;   // sum of amountDue for PAID installments
  totalOutstanding: number; // totalDue - totalCollected
  totalBounced: number;     // count of RET* installments
  bouncedAmount: number;    // amount of bounced installments
  collectionRate: number;   // totalCollected / totalDue * 100
}

const BOUNCE_STATUSES = new Set(['RET', 'RET NEFT', 'RET PASS', 'BOUNCE', 'RETURNED']);
const isBounced = (s: string) => BOUNCE_STATUSES.has(String(s || '').trim().toUpperCase());

function buildAreaData(loans: Loan[]): AreaRow[] {
  const map = new Map<string, {
    loanIds: Set<string>;
    customerIds: Set<string>;
    totalPortfolio: number;
    totalDue: number;
    totalCollected: number;
    totalBounced: number;
    bouncedAmount: number;
  }>();

  for (const loan of loans) {
    const area = (loan.place || 'Unknown').trim().toUpperCase() || 'UNKNOWN';
    if (!map.has(area)) {
      map.set(area, { loanIds: new Set(), customerIds: new Set(), totalPortfolio: 0, totalDue: 0, totalCollected: 0, totalBounced: 0, bouncedAmount: 0 });
    }
    const row = map.get(area)!;
    row.loanIds.add(loan.id);
    row.customerIds.add(loan.customerId);
    row.totalPortfolio += Number(loan.totalAmount || 0);

    for (const inst of loan.installments || []) {
      const due = Number(inst.amountDue || 0);
      row.totalDue += due;
      if (isPaid(inst.status)) row.totalCollected += due;
      if (isBounced(inst.status)) { row.totalBounced++; row.bouncedAmount += due; }
    }
  }

  return Array.from(map.entries())
    .map(([place, d]) => ({
      place,
      totalLoans: d.loanIds.size,
      totalCustomers: d.customerIds.size,
      totalPortfolio: d.totalPortfolio,
      totalDue: d.totalDue,
      totalCollected: d.totalCollected,
      totalOutstanding: Math.max(0, d.totalDue - d.totalCollected),
      totalBounced: d.totalBounced,
      bouncedAmount: d.bouncedAmount,
      collectionRate: d.totalDue > 0 ? (d.totalCollected / d.totalDue) * 100 : 0,
    }))
    .sort((a, b) => b.totalOutstanding - a.totalOutstanding);
}

const rateColor = (r: number) => {
  if (r >= 80) return 'text-emerald-700';
  if (r >= 60) return 'text-amber-600';
  if (r >= 40) return 'text-orange-600';
  return 'text-red-600';
};
const rateBarColor = (r: number) => {
  if (r >= 80) return 'bg-emerald-500';
  if (r >= 60) return 'bg-amber-500';
  if (r >= 40) return 'bg-orange-500';
  return 'bg-red-500';
};

export const AreaWiseReport: React.FC = () => {
  const { loans, isLoading, showToast, systemSettings } = useApp();
  const [query, setQuery] = useState('');
  const [sortCol, setSortCol] = useState<keyof AreaRow>('totalOutstanding');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const allRows = useMemo(() => buildAreaData(loans), [loans]);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? allRows.filter((r) => r.place.toLowerCase().includes(q)) : allRows;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [allRows, query, sortCol, sortDir]);

  const grand = useMemo(() => sorted.reduce(
    (acc, r) => ({ portfolio: acc.portfolio + r.totalPortfolio, due: acc.due + r.totalDue, collected: acc.collected + r.totalCollected, outstanding: acc.outstanding + r.totalOutstanding, bounced: acc.bounced + r.bouncedAmount }),
    { portfolio: 0, due: 0, collected: 0, outstanding: 0, bounced: 0 }
  ), [sorted]);

  const overallRate = grand.due > 0 ? (grand.collected / grand.due) * 100 : 0;

  const toggleSort = (col: keyof AreaRow) => {
    if (sortCol === col) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };
  const sortIndicator = (col: keyof AreaRow) =>
    sortCol === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';

  const companyName = systemSettings.companyProfile.companyName || 'ASR Groups';
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const exportPdf = () => {
    if (!sorted.length) { showToast('No data', 'No area data available.', 'warning'); return; }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(112, 26, 53); doc.rect(0, 0, pw, 58, 'F');
    doc.setFillColor(197, 160, 89); doc.rect(0, 56, pw, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
    doc.text(`${companyName.toUpperCase()} · AREA-WISE COLLECTION REPORT`, 32, 28);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(238, 216, 161);
    doc.text(`${sorted.length} areas · As of ${today} · Overall recovery ${overallRate.toFixed(1)}%`, 32, 44);

    autoTable(doc, {
      startY: 82,
      head: [['Area / Place', 'Loans', 'Customers', 'Portfolio', 'Total Due', 'Collected', 'Outstanding', 'Bounced ₹', 'Rate %']],
      body: sorted.map((r) => [
        r.place,
        String(r.totalLoans),
        String(r.totalCustomers),
        pdfMoney(r.totalPortfolio),
        pdfMoney(r.totalDue),
        pdfMoney(r.totalCollected),
        pdfMoney(r.totalOutstanding),
        r.bouncedAmount > 0 ? pdfMoney(r.bouncedAmount) : '—',
        `${r.collectionRate.toFixed(1)}%`,
      ]),
      foot: [['GRAND TOTAL', String(allRows.reduce((s, r) => s + r.totalLoans, 0)), String(allRows.reduce((s, r) => s + r.totalCustomers, 0)), pdfMoney(grand.portfolio), pdfMoney(grand.due), pdfMoney(grand.collected), pdfMoney(grand.outstanding), pdfMoney(grand.bounced), `${overallRate.toFixed(1)}%`]],
      theme: 'striped',
      headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, cellPadding: 5 },
      footStyles: { fillColor: [243, 239, 230], textColor: [112, 26, 53], fontSize: 8.5, fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' } },
      margin: { left: 28, right: 28, bottom: 34 },
      didDrawPage: (d) => {
        doc.setFontSize(8); doc.setTextColor(130, 130, 130);
        doc.text(`${companyName} · Area-wise Report · Page ${d.pageNumber} · Confidential`, pw / 2, ph - 16, { align: 'center' });
      },
    });

    doc.save(`ASR_AreaWise_${safeFileName(today)}.pdf`);
    showToast('Area-wise Report PDF', `${sorted.length} areas exported.`, 'success');
  };

  const exportExcel = () => {
    if (!sorted.length) { showToast('No data', 'No area data available.', 'warning'); return; }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sorted.map((r) => ({
      'Area / Place': r.place,
      'Total Loans': r.totalLoans,
      'Total Customers': r.totalCustomers,
      'Total Portfolio': r.totalPortfolio,
      'Total Due': r.totalDue,
      'Total Collected': r.totalCollected,
      'Outstanding': r.totalOutstanding,
      'Bounced Instruments': r.totalBounced,
      'Bounced Amount': r.bouncedAmount,
      'Collection Rate (%)': r.collectionRate.toFixed(2),
    }))), 'Area-wise Report');
    XLSX.writeFile(wb, `ASR_AreaWise_${safeFileName(today)}.xlsx`);
    showToast('Area-wise Report Excel', `${sorted.length} areas exported.`, 'success');
  };

  const SortTh = ({ col, label, right }: { col: keyof AreaRow; label: string; right?: boolean }) => (
    <th className={`px-3 py-3 cursor-pointer select-none hover:text-[#701A35] transition-colors ${right ? 'text-right' : 'text-left'}`}
      onClick={() => toggleSort(col)}>
      {label}{sortIndicator(col)}
    </th>
  );

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-7">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">Tally — Area-wise Collection</p>
            <div className="mt-1 flex items-center gap-3">
              <MapPin className="h-6 w-6 text-[#701A35]" />
              <h2 className="text-2xl font-bold tracking-tight text-[#24131B]">Area / Place-wise Collection Report</h2>
              <span className="rounded-full bg-[#F5EEE3] px-2.5 py-1 text-xs font-bold text-[#701A35]">
                {sorted.length} areas
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Location-level portfolio analytics — outstanding dues, collection rates, and bounce frequency by area.
            </p>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-2 border-t border-[#EEE8DE] pt-4 sm:grid-cols-5">
            <AreaCard label="Total Portfolio" value={formatINR(grand.portfolio)} />
            <AreaCard label="Total Due" value={formatINR(grand.due)} />
            <AreaCard label="Collected" value={formatINR(grand.collected)} tone="green" />
            <AreaCard label="Outstanding" value={formatINR(grand.outstanding)} tone="blue" />
            <div className="rounded-2xl border border-[#E1C98D] bg-[#FBF8F3] px-3.5 py-3">
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#A07A39] opacity-70">Overall Rate</span>
              <strong className="mt-1.5 block text-xl font-bold text-slate-900">{overallRate.toFixed(1)}%</strong>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-white overflow-hidden border border-[#E1C98D]">
                <div className={`h-full rounded-full ${rateBarColor(overallRate)}`} style={{ width: `${Math.min(overallRate, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Search + Export */}
          <div className="flex items-center gap-3 border-t border-[#EEE8DE] pt-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by area / place…"
                className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-10 pr-3 text-xs outline-none focus:border-[#C5A059]" />
            </div>
            {query && (
              <button type="button" onClick={() => setQuery('')} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#701A35] hover:underline">
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={exportPdf} disabled={!sorted.length}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-45">
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button type="button" onClick={exportExcel} disabled={!sorted.length}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-45">
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
        <div className="border-b border-[#E7DFD2] bg-[#FCFBF9] px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <MapPin className="h-4 w-4 text-[#701A35]" /> Area-wise Breakdown
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">Click column headers to sort. Rows sorted by outstanding by default.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                <th className="w-6 px-3 py-3">#</th>
                <SortTh col="place" label="Area / Place" />
                <SortTh col="totalLoans" label="Loans" right />
                <SortTh col="totalCustomers" label="Customers" right />
                <SortTh col="totalPortfolio" label="Portfolio" right />
                <SortTh col="totalDue" label="Total Due" right />
                <SortTh col="totalCollected" label="Collected" right />
                <SortTh col="totalOutstanding" label="Outstanding" right />
                <SortTh col="bouncedAmount" label="Bounced ₹" right />
                <SortTh col="collectionRate" label="Rate %" right />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-16 text-center text-sm text-slate-500">
                  {isLoading ? 'Loading…' : 'No area data found.'}
                </td></tr>
              ) : sorted.map((r, i) => (
                <tr key={r.place} className="hover:bg-[#FCFAF7] transition-colors">
                  <td className="px-3 py-3 font-mono text-[10px] text-slate-400">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#701A35]" />
                      <span className="font-bold text-slate-800">{r.place}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-700">{r.totalLoans}</td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-700">{r.totalCustomers}</td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-700">{formatINR(r.totalPortfolio)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-700">{formatINR(r.totalDue)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-emerald-700">{formatINR(r.totalCollected)}</td>
                  <td className="px-3 py-3 text-right font-bold text-[#245B9B]">{formatINR(r.totalOutstanding)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-red-600">
                    {r.bouncedAmount > 0 ? formatINR(r.bouncedAmount) : <span className="text-slate-300 font-normal">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden min-w-[40px]">
                        <div className={`h-full rounded-full ${rateBarColor(r.collectionRate)}`}
                          style={{ width: `${Math.min(r.collectionRate, 100)}%` }} />
                      </div>
                      <span className={`w-12 text-right text-[11px] font-bold ${rateColor(r.collectionRate)}`}>
                        {r.collectionRate.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {sorted.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-[#F8F6F2] font-bold text-slate-800">
                  <td></td>
                  <td className="px-3 py-3 text-xs">GRAND TOTAL · {sorted.length} areas</td>
                  <td className="px-3 py-3 text-right text-xs">{allRows.reduce((s, r) => s + r.totalLoans, 0)}</td>
                  <td className="px-3 py-3 text-right text-xs">{allRows.reduce((s, r) => s + r.totalCustomers, 0)}</td>
                  <td className="px-3 py-3 text-right text-xs">{formatINR(grand.portfolio)}</td>
                  <td className="px-3 py-3 text-right text-xs">{formatINR(grand.due)}</td>
                  <td className="px-3 py-3 text-right text-xs text-emerald-700">{formatINR(grand.collected)}</td>
                  <td className="px-3 py-3 text-right text-xs text-[#245B9B]">{formatINR(grand.outstanding)}</td>
                  <td className="px-3 py-3 text-right text-xs text-red-600">{formatINR(grand.bounced)}</td>
                  <td className="px-3 py-3 text-right text-xs">{overallRate.toFixed(1)}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
};

function AreaCard({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'blue' }) {
  const base = tone === 'green' ? 'border-emerald-200 bg-emerald-50/60'
    : tone === 'blue' ? 'border-blue-200 bg-blue-50/60'
    : 'border-slate-200 bg-slate-50';
  return (
    <div className={`rounded-2xl border px-3.5 py-3 ${base}`}>
      <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <strong className="mt-1.5 block truncate text-base font-bold text-slate-900 tabular-nums">{value}</strong>
    </div>
  );
}
