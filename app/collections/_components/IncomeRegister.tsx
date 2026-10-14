'use client';

import React, { useMemo, useState } from 'react';
import { TrendingUp, FileText, FileSpreadsheet, Search, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useApp } from '@/lib/store';
import { APP_BRAND } from '@/lib/branding';
import { formatINR } from '@/lib/utils/formatCurrency';
import { isPaid, dateKey } from './CollectionsView';
import type { DateRange, Period } from './CollectionsView';

const fmtDate = (v: string) => {
  const d = new Date(`${dateKey(v)}T00:00:00`);
  return isNaN(d.getTime()) ? (v || '—') : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const pdfMoney = (v: number) => `INR ${Number(v || 0).toLocaleString('en-IN')}`;
const safeFile = (v: string) => v.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase() || 'income';

interface IncomeRow {
  sNo: number;
  recdDate: string;
  customerId: string;
  customerName: string;
  place: string;
  loanId: string;
  codeNo: string;
  seqNo: number;
  mode: string; // CASH / NEFT / PASS / CLS
  reference: string;
  depositAccount: string;
  credit: number; // amount received
  remarks: string;
}

const MODE_COLORS: Record<string, string> = {
  CASH: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  NEFT: 'bg-blue-100 text-blue-800 border-blue-300',
  PASS: 'bg-violet-100 text-violet-800 border-violet-300',
  CLS:  'bg-amber-100 text-amber-800 border-amber-300',
};
const modeColor = (m: string) => MODE_COLORS[m] || 'bg-slate-100 text-slate-700 border-slate-200';

const MODE_ORDER = ['CASH', 'NEFT', 'PASS', 'CLS'];

export const IncomeRegister: React.FC<{ dateRange: DateRange; period: Period; periodLabel: string }> = ({
  dateRange, periodLabel,
}) => {
  const { loans, isLoading, showToast, systemSettings } = useApp();
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState('All');
  const [groupByMode, setGroupByMode] = useState(false);

  const rows = useMemo((): IncomeRow[] => {
    const { from, to } = dateRange;
    const result: IncomeRow[] = [];

    const isAllTime = !from && !to;

    for (const loan of loans) {
      for (const inst of loan.installments || []) {
        if (!isPaid(inst.status)) continue;
        if (!isAllTime) {
          const rDate = dateKey(inst.recdDate || '');
          if (!rDate || rDate < from || rDate > to) continue;
        }

        result.push({
          sNo: 0,
          recdDate: inst.recdDate || '',
          customerId: loan.customerId,
          customerName: loan.customerName,
          place: inst.place || loan.place || '',
          loanId: loan.id,
          codeNo: loan.codeNo || '',
          seqNo: Number(inst.seqNo || 1),
          mode: String(inst.status || 'CASH').trim().toUpperCase(),
          reference: inst.chqNo || '',
          depositAccount: inst.depName || '',
          credit: Number(inst.amountDue || 0),
          remarks: inst.remarks || '',
        });
      }
    }

    result.sort((a, b) => {
      if (a.recdDate !== b.recdDate) return a.recdDate.localeCompare(b.recdDate);
      return a.customerName.localeCompare(b.customerName);
    });

    return result.map((r, i) => ({ ...r, sNo: i + 1 }));
  }, [loans, dateRange]);

  const allModes = useMemo(() =>
    Array.from(new Set(rows.map((r) => r.mode))).sort((a, b) =>
      (MODE_ORDER.indexOf(a) + 10) - (MODE_ORDER.indexOf(b) + 10)
    ), [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (modeFilter !== 'All' && r.mode !== modeFilter) return false;
      if (q && ![r.customerName, r.customerId, r.loanId, r.reference, r.depositAccount].join(' ').toLowerCase().includes(q)) return false;
      return true;
    }).map((r, i) => ({ ...r, sNo: i + 1 }));
  }, [rows, modeFilter, query]);

  const modeSummary = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const r of rows) {
      if (!map[r.mode]) map[r.mode] = { count: 0, total: 0 };
      map[r.mode].count++;
      map[r.mode].total += r.credit;
    }
    return map;
  }, [rows]);

  const grandTotal = filtered.reduce((s, r) => s + r.credit, 0);
  const companyName = APP_BRAND;

  // Build groups for grouped view
  const grouped = useMemo(() => {
    const map = new Map<string, IncomeRow[]>();
    for (const r of filtered) {
      if (!map.has(r.mode)) map.set(r.mode, []);
      map.get(r.mode)!.push(r);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      (MODE_ORDER.indexOf(a) + 10) - (MODE_ORDER.indexOf(b) + 10)
    );
  }, [filtered]);

  const exportPdf = () => {
    if (!filtered.length) { showToast('Nothing to export', '', 'warning'); return; }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth(); const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(21, 128, 61); doc.rect(0, 0, pw, 58, 'F');
    doc.setFillColor(134, 239, 172); doc.rect(0, 56, pw, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(255, 255, 255);
    doc.text(`${companyName.toUpperCase()} · INCOME REGISTER (CREDIT SIDE)`, 32, 28);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(187, 247, 208);
    doc.text(`${periodLabel} · ${filtered.length} entries · Total Credit: ${pdfMoney(grandTotal)}`, 32, 44);
    autoTable(doc, {
      startY: 78,
      head: [['S.No', 'Recd. Date', 'Customer', 'Loan / Code', 'Inst.', 'Mode', 'Reference', 'Deposit A/c', 'Credit (₹)']],
      body: filtered.map((r) => [
        String(r.sNo), fmtDate(r.recdDate), `${r.customerName} (${r.customerId})`,
        `${r.loanId}${r.codeNo ? ` (${r.codeNo})` : ''}`, String(r.seqNo),
        r.mode, r.reference || '—', r.depositAccount || '—', pdfMoney(r.credit),
      ]),
      foot: [['', '', `TOTAL · ${filtered.length} receipts`, '', '', '', '', '', pdfMoney(grandTotal)]],
      theme: 'striped',
      headStyles: { fillColor: [21, 128, 61], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, cellPadding: 4 },
      footStyles: { fillColor: [240, 253, 244], textColor: [21, 128, 61], fontSize: 9, fontStyle: 'bold' },
      columnStyles: { 8: { halign: 'right' } },
      margin: { left: 28, right: 28, bottom: 34 },
      didDrawPage: (d) => {
        doc.setFontSize(8); doc.setTextColor(130, 130, 130);
        doc.text(`${companyName} · Income Register · Page ${d.pageNumber}`, pw / 2, ph - 14, { align: 'center' });
      },
    });
    doc.save(`ASR_IncomeRegister_${safeFile(periodLabel)}.pdf`);
    showToast('Income Register PDF', `${filtered.length} entries exported.`, 'success');
  };

  const exportExcel = () => {
    if (!filtered.length) { showToast('Nothing to export', '', 'warning'); return; }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filtered.map((r) => ({
      'S.No': r.sNo, 'Received Date': fmtDate(r.recdDate), 'Customer ID': r.customerId,
      'Customer Name': r.customerName, 'Place': r.place, 'Loan ID': r.loanId,
      'Code': r.codeNo || '—', 'Inst. No': r.seqNo, 'Mode (Cr)': r.mode,
      'Reference': r.reference || '—', 'Deposit Account': r.depositAccount || '—',
      'Credit Amount': r.credit, 'Remarks': r.remarks || '—',
    }))), 'Income Register');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      Object.entries(modeSummary).map(([mode, d]) => ({ Mode: mode, Entries: d.count, 'Total Credit': d.total }))
    ), 'Mode Summary');
    XLSX.writeFile(wb, `ASR_IncomeRegister_${safeFile(periodLabel)}.xlsx`);
    showToast('Income Register Excel', `${filtered.length} entries + mode summary exported.`, 'success');
  };

  return (
    <div className="space-y-4">
      {/* Mode summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {allModes.map((mode) => {
          const s = modeSummary[mode] || { count: 0, total: 0 };
          return (
            <button key={mode} type="button" onClick={() => setModeFilter(modeFilter === mode ? 'All' : mode)}
              className={`rounded-2xl border-2 px-4 py-3.5 text-left transition ${modeFilter === mode ? modeColor(mode) + ' ring-2 ring-offset-1' : 'bg-white border-slate-200 hover:border-[#C5A059]'}`}>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${modeColor(mode)}`}>{mode}</span>
              <strong className="mt-2 block text-base font-bold tabular-nums text-slate-900">{formatINR(s.total)}</strong>
              <span className="text-[10px] text-slate-500">{s.count} receipts</span>
            </button>
          );
        })}
        {allModes.length === 0 && (
          <div className="col-span-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
            No income entries for this period.
          </div>
        )}
      </div>

      {/* Controls */}
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-4 shadow-[0_8px_24px_rgba(58,34,22,0.04)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 bg-[#FCFBF9] p-0.5">
            <button type="button" onClick={() => setGroupByMode(false)}
              className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${!groupByMode ? 'bg-[#701A35] text-white' : 'text-slate-500 hover:text-[#701A35]'}`}>
              Date-wise
            </button>
            <button type="button" onClick={() => setGroupByMode(true)}
              className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${groupByMode ? 'bg-[#701A35] text-white' : 'text-slate-500 hover:text-[#701A35]'}`}>
              Group by Mode
            </button>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer, loan, reference…"
              className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-10 pr-3 text-xs outline-none focus:border-[#C5A059]" />
          </div>
          {(query || modeFilter !== 'All') && (
            <button type="button" onClick={() => { setQuery(''); setModeFilter('All'); }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#701A35] hover:underline">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={exportPdf} disabled={!filtered.length}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-45">
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button type="button" onClick={exportExcel} disabled={!filtered.length}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-45">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
          </div>
        </div>
        <div className="mt-3 border-t border-[#EEE8DE] pt-2 flex gap-4 text-xs">
          <span className="text-slate-500">{filtered.length} receipts</span>
          <span className="font-bold text-emerald-700">Total Credit: {formatINR(grandTotal)}</span>
        </div>
      </section>

      {/* Table — flat or grouped */}
      <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_8px_24px_rgba(58,34,22,0.04)]">
        <div className="border-b border-[#E7DFD2] bg-emerald-50/60 px-5 py-4 flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-emerald-700" />
          <div>
            <h2 className="text-sm font-bold text-emerald-900">Income Register — Credit Side</h2>
            <p className="mt-0.5 text-[11px] text-emerald-700">{periodLabel} · {formatINR(grandTotal)} total credit</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          {groupByMode ? (
            <div>
              {grouped.length === 0 ? (
                <p className="py-16 text-center text-sm text-slate-500">No income entries for this period.</p>
              ) : grouped.map(([mode, modeRows]) => (
                <div key={mode}>
                  <div className={`flex items-center justify-between px-5 py-3 border-b border-slate-200 ${modeColor(mode)} bg-opacity-20`}>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${modeColor(mode)}`}>{mode}</span>
                    <span className="text-xs font-bold text-slate-700">{modeRows.length} entries · {formatINR(modeRows.reduce((s, r) => s + r.credit, 0))}</span>
                  </div>
                  <IncomeTable rows={modeRows} showMode={false} />
                  <div className="border-b-2 border-slate-200 bg-emerald-50/40 px-5 py-2.5 flex justify-between text-xs font-bold text-emerald-700">
                    <span>{mode} Subtotal — {modeRows.length} receipts</span>
                    <span>{formatINR(modeRows.reduce((s, r) => s + r.credit, 0))}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between bg-emerald-100/60 border-t-2 border-emerald-300 px-5 py-3 text-sm font-bold text-emerald-900">
                <span>GRAND TOTAL — {filtered.length} receipts</span>
                <span>{formatINR(grandTotal)}</span>
              </div>
            </div>
          ) : (
            <>
              <IncomeTable rows={filtered} showMode />
              {filtered.length > 0 && (
                <div className="flex justify-between border-t-2 border-slate-300 bg-[#F8F6F2] px-5 py-3 text-xs font-bold text-slate-800">
                  <span>TOTAL · {filtered.length} entries</span>
                  <span className="text-emerald-700">{formatINR(grandTotal)}</span>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

function IncomeTable({ rows, showMode }: { rows: IncomeRow[]; showMode: boolean }) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-slate-400">No entries.</p>;
  return (
    <table className="w-full table-fixed border-collapse text-xs">
      <thead>
        <tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
          <th className="w-10 px-3 py-2.5">S.No</th>
          <th className="w-[11%] px-3 py-2.5">Recd. Date</th>
          <th className="w-[18%] px-3 py-2.5">Customer</th>
          <th className="w-[14%] px-3 py-2.5">Loan / Code</th>
          <th className="w-7 px-2 py-2.5 text-center">Inst.</th>
          {showMode && <th className="w-[8%] px-3 py-2.5">Mode</th>}
          <th className="w-[12%] px-3 py-2.5">Reference</th>
          <th className="w-[14%] px-3 py-2.5">Deposit A/c</th>
          <th className="w-[11%] px-3 py-2.5 text-right text-emerald-700 font-bold">Credit (₹)</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {rows.map((r) => (
          <tr key={`${r.loanId}-${r.seqNo}-${r.mode}`} className="hover:bg-emerald-50/20 transition-colors">
            <td className="px-3 py-2.5 font-mono text-[10px] text-slate-400">{r.sNo}</td>
            <td className="px-3 py-2.5 text-[11px] text-slate-700 font-medium">{fmtDate(r.recdDate)}</td>
            <td className="px-3 py-2.5">
              <span className="block truncate font-bold text-[#701A35]">{r.customerName}</span>
              <span className="text-[9px] text-slate-400">{r.customerId} · {r.place}</span>
            </td>
            <td className="px-3 py-2.5">
              <span className="block font-mono text-[10px] text-slate-700 truncate">{r.loanId}</span>
              {r.codeNo && <span className="text-[9px] text-slate-400">{r.codeNo}</span>}
            </td>
            <td className="px-2 py-2.5 text-center text-[11px] text-slate-600">{r.seqNo}</td>
            {showMode && (
              <td className="px-3 py-2.5">
                <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${MODE_COLORS[r.mode] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{r.mode}</span>
              </td>
            )}
            <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{r.reference || '—'}</td>
            <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{r.depositAccount || '—'}</td>
            <td className="px-3 py-2.5 text-right font-bold text-emerald-700">{formatINR(r.credit)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
