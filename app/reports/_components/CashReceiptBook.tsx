'use client';

import React, { useMemo, useState } from 'react';
import {
  Banknote,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Filter,
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
const dateKey = (v: string) => String(v || '').slice(0, 10);
const fmtDate = (v: string) => {
  if (!v) return '—';
  const d = new Date(`${dateKey(v)}T00:00:00`);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const safeFileName = (v: string) =>
  v.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'report';
const pdfMoney = (v: number) => `INR ${Number(v || 0).toLocaleString('en-IN')}`;

interface ReceiptEntry {
  sNo: number;
  recdDate: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  place: string;
  loanId: string;
  codeNo: string;
  seqNo: number;
  mode: string;       // status: CASH, NEFT, PASS, CLS, etc.
  reference: string;  // chqNo
  depositAccount: string; // depName
  amount: number;
  remarks: string;
}

interface ModeGroup {
  mode: string;
  count: number;
  total: number;
}

const MODE_BADGE: Record<string, string> = {
  PASS: 'bg-violet-50 text-violet-700 border-violet-200',
  NEFT: 'bg-blue-50 text-blue-700 border-blue-200',
  CASH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLS: 'bg-amber-50 text-amber-700 border-amber-200',
  CS: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};
const modeBadge = (m: string) => MODE_BADGE[m.toUpperCase()] || 'bg-slate-50 text-slate-600 border-slate-200';

const ALL_MODES = ['CASH', 'NEFT', 'PASS', 'CLS', 'CS'];

function buildReceiptEntries(loans: Loan[]): ReceiptEntry[] {
  const entries: ReceiptEntry[] = [];
  for (const loan of loans) {
    for (const inst of loan.installments || []) {
      if (!isPaid(inst.status)) continue;
      entries.push({
        sNo: 0,
        recdDate: inst.recdDate || inst.dueDate || '',
        dueDate: inst.dueDate || '',
        customerId: loan.customerId,
        customerName: loan.customerName,
        place: inst.place || loan.place || '',
        loanId: loan.id,
        codeNo: loan.codeNo || '',
        seqNo: Number(inst.seqNo || 1),
        mode: String(inst.status || 'CASH').trim().toUpperCase(),
        reference: inst.chqNo || '',
        depositAccount: inst.depName || '',
        amount: Number(inst.amountDue || 0),
        remarks: inst.remarks || '',
      });
    }
  }
  // Sort by recdDate desc, then customer name
  entries.sort((a, b) => {
    const dCmp = dateKey(b.recdDate).localeCompare(dateKey(a.recdDate));
    if (dCmp !== 0) return dCmp;
    return a.customerName.localeCompare(b.customerName);
  });
  return entries.map((e, i) => ({ ...e, sNo: i + 1 }));
}

function groupByMode(entries: ReceiptEntry[]): ModeGroup[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const e of entries) {
    const ex = map.get(e.mode) || { count: 0, total: 0 };
    ex.count++;
    ex.total += e.amount;
    map.set(e.mode, ex);
  }
  return Array.from(map.entries())
    .map(([mode, d]) => ({ mode, ...d }))
    .sort((a, b) => b.total - a.total);
}

export const CashReceiptBook: React.FC = () => {
  const { loans, isLoading, showToast } = useApp();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [groupMode, setGroupMode] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const allEntries = useMemo(() => buildReceiptEntries(loans), [loans]);

  // Get all unique modes from data
  const allModes = useMemo(() =>
    Array.from(new Set(allEntries.map((e) => e.mode))).sort(),
    [allEntries]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntries.filter((e) => {
      const d = dateKey(e.recdDate);
      if (fromDate && d && d < fromDate) return false;
      if (toDate && d && d > toDate) return false;
      if (modeFilter !== 'ALL' && e.mode !== modeFilter) return false;
      if (q && ![e.customerName, e.customerId, e.reference, e.depositAccount, e.loanId, e.codeNo, e.place].join(' ').toLowerCase().includes(q)) return false;
      return true;
    }).map((e, i) => ({ ...e, sNo: i + 1 }));
  }, [allEntries, fromDate, toDate, modeFilter, query]);

  const modeGroups = useMemo(() => groupByMode(filtered), [filtered]);
  const grandTotal = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  // Group entries by mode for grouped view
  const entriesByMode = useMemo(() => {
    if (!groupMode) return null;
    const map = new Map<string, ReceiptEntry[]>();
    for (const e of filtered) {
      const arr = map.get(e.mode) || [];
      arr.push(e);
      map.set(e.mode, arr);
    }
    return map;
  }, [filtered, groupMode]);

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setModeFilter('ALL');
    setQuery('');
  };

  const hasFilters = fromDate || toDate || modeFilter !== 'ALL' || query;

  const exportPdf = () => {
    if (!filtered.length) { showToast('Nothing to export', 'No receipts match the filters.', 'warning'); return; }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(112, 26, 53); doc.rect(0, 0, pw, 58, 'F');
    doc.setFillColor(197, 160, 89); doc.rect(0, 56, pw, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
    doc.text('ASR GROUP · Cash & Receipt Book', 32, 28);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(238, 216, 161);
    const periodLabel = fromDate || toDate
      ? `${fromDate ? fmtDate(fromDate) : 'Beginning'} to ${toDate ? fmtDate(toDate) : 'Date'}`
      : 'All Dates';
    doc.text(`${periodLabel} · ${modeFilter !== 'ALL' ? modeFilter + ' only · ' : ''}${filtered.length} transactions · Total ${pdfMoney(grandTotal)}`, 32, 44);

    autoTable(doc, {
      startY: 82,
      head: [['S.No', 'Date', 'Customer', 'Loan / Code', 'Inst.', 'Mode', 'Reference', 'Deposit A/c', 'Place', 'Amount']],
      body: filtered.map((e) => [
        String(e.sNo),
        fmtDate(e.recdDate),
        `${e.customerName}\n${e.customerId}`,
        `${e.loanId}${e.codeNo ? ` (${e.codeNo})` : ''}`,
        String(e.seqNo),
        e.mode,
        e.reference || '—',
        e.depositAccount || '—',
        e.place || '—',
        pdfMoney(e.amount),
      ]),
      foot: [['', '', `TOTAL · ${filtered.length} receipts`, '', '', '', '', '', '', pdfMoney(grandTotal)]],
      theme: 'striped',
      headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, cellPadding: 4 },
      footStyles: { fillColor: [243, 239, 230], textColor: [112, 26, 53], fontSize: 8, fontStyle: 'bold' },
      columnStyles: { 9: { halign: 'right' } },
      margin: { left: 32, right: 32, bottom: 34 },
      didDrawPage: (d) => {
        doc.setFontSize(8); doc.setTextColor(130, 130, 130);
        doc.text(`ASR GROUP · Cash & Receipt Book · Page ${d.pageNumber} · Confidential`, pw / 2, ph - 16, { align: 'center' });
      },
    });
    doc.save(`ASR_ReceiptBook_${safeFileName(fromDate || today)}.pdf`);
    showToast('Receipt Book PDF downloaded', `${filtered.length} receipts exported.`, 'success');
  };

  const exportExcel = () => {
    if (!filtered.length) { showToast('Nothing to export', 'No receipts match the filters.', 'warning'); return; }
    const rows = filtered.map((e) => ({
      'S.No': e.sNo,
      'Date Received': e.recdDate ? fmtDate(e.recdDate) : '—',
      'Due Date': e.dueDate ? fmtDate(e.dueDate) : '—',
      'Customer ID': e.customerId,
      'Customer Name': e.customerName,
      'Place': e.place || '—',
      'Loan ID': e.loanId,
      'Code No': e.codeNo || '—',
      'Inst. No': e.seqNo,
      'Mode': e.mode,
      'Reference / Cheque No': e.reference || '—',
      'Deposit Account': e.depositAccount || '—',
      'Amount': e.amount,
      'Remarks': e.remarks || '—',
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Receipt Book');
    // Mode summary sheet
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      modeGroups.map((g) => ({ 'Mode': g.mode, 'Count': g.count, 'Total Amount': g.total }))
    ), 'Mode Summary');
    XLSX.writeFile(wb, `ASR_ReceiptBook_${safeFileName(fromDate || today)}.xlsx`);
    showToast('Receipt Book Excel downloaded', `${filtered.length} receipts + mode summary exported.`, 'success');
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-7">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">Tally — Cash & Receipt Book</p>
            <div className="mt-1 flex items-center gap-3">
              <Banknote className="h-6 w-6 text-[#701A35]" />
              <h2 className="text-2xl font-bold tracking-tight text-[#24131B]">Cash & Receipt Book</h2>
              <span className="rounded-full bg-[#F5EEE3] px-2.5 py-1 text-xs font-bold text-[#701A35]">
                {filtered.length} receipts
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              All collections filtered by date, mode (CASH/NEFT/PASS/CLS), or customer. Mode-wise subtotals included.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 border-t border-[#EEE8DE] pt-4">
            {/* Date range */}
            <label className="block min-w-[140px] text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
              From Date
              <span className="relative mt-1 block">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-[#C5A059]" />
              </span>
            </label>
            <label className="block min-w-[140px] text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
              To Date
              <span className="relative mt-1 block">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-[#C5A059]" />
              </span>
            </label>

            {/* Mode filter */}
            <label className="block min-w-[120px] text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
              Mode
              <span className="relative mt-1 block">
                <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-3 pr-8 text-xs font-semibold normal-case text-slate-700 outline-none focus:border-[#C5A059]">
                  <option value="ALL">All Modes</option>
                  {allModes.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </span>
            </label>

            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customer, reference, deposit…"
                className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-10 pr-3 text-xs outline-none focus:border-[#C5A059]" />
            </div>

            {/* View toggle */}
            <button type="button" onClick={() => setGroupMode((v) => !v)}
              className={`whitespace-nowrap rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                groupMode
                  ? 'border-[#701A35] bg-[#701A35] text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-[#C5A059]'
              }`}>
              {groupMode ? 'Flat View' : 'Group by Mode'}
            </button>

            {hasFilters && (
              <button type="button" onClick={clearFilters}
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

          {/* Mode-wise Totals */}
          {modeGroups.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-[#EEE8DE] pt-4">
              <div className="rounded-2xl border border-[#E1C98D] bg-[#FBF8F3] px-3.5 py-3">
                <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#A07A39] opacity-70">Grand Total</span>
                <strong className="mt-1 block text-base font-bold text-slate-900 tabular-nums">{formatINR(grandTotal)}</strong>
                <span className="text-[9px] text-slate-400">{filtered.length} receipts</span>
              </div>
              {modeGroups.map((g) => (
                <div key={g.mode} className={`rounded-2xl border px-3.5 py-3 ${modeBadge(g.mode)}`}>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.1em] opacity-70">{g.mode}</span>
                  <strong className="mt-1 block text-base font-bold text-slate-900 tabular-nums">{formatINR(g.total)}</strong>
                  <span className="text-[9px] text-slate-400">{g.count} receipt{g.count === 1 ? '' : 's'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
        <div className="border-b border-[#E7DFD2] bg-[#FCFBF9] px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Banknote className="h-4 w-4 text-[#701A35]" />
            {groupMode ? 'Receipt Register — Grouped by Mode' : 'Receipt Register — Date-wise'}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            {isLoading ? 'Loading…' : `${filtered.length} receipt${filtered.length === 1 ? '' : 's'} · ${formatINR(grandTotal)} total`}
          </p>
        </div>
        <div className="overflow-x-auto">
          {groupMode && entriesByMode ? (
            // Grouped view
            <div className="divide-y divide-slate-100">
              {Array.from(entriesByMode.entries()).map(([mode, rows]) => {
                const modeTotal = rows.reduce((s, e) => s + e.amount, 0);
                return (
                  <div key={mode}>
                    <div className={`flex items-center justify-between px-5 py-3 ${modeBadge(mode)} border-b`}>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${modeBadge(mode)}`}>{mode}</span>
                        <span className="text-xs font-semibold text-slate-700">{rows.length} receipt{rows.length === 1 ? '' : 's'}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{formatINR(modeTotal)}</span>
                    </div>
                    <table className="w-full table-fixed border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                          <th className="w-10 px-3 py-2">S.No</th>
                          <th className="w-[12%] px-3 py-2">Date</th>
                          <th className="w-[20%] px-3 py-2">Customer</th>
                          <th className="w-[16%] px-3 py-2">Loan / Code</th>
                          <th className="w-8 px-3 py-2">Inst.</th>
                          <th className="w-[14%] px-3 py-2">Reference</th>
                          <th className="w-[14%] px-3 py-2">Deposit A/c</th>
                          <th className="w-[12%] px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {rows.map((e, i) => (
                          <tr key={`${e.loanId}-${e.seqNo}`} className="hover:bg-[#FCFAF7]">
                            <td className="px-3 py-2.5 font-mono text-[10px] text-slate-400">{i + 1}</td>
                            <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-700">{fmtDate(e.recdDate)}</td>
                            <td className="px-3 py-2.5">
                              <span className="block truncate text-[11px] font-bold text-[#701A35]">{e.customerName}</span>
                              <span className="text-[9px] text-slate-400">{e.customerId}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="block truncate font-mono text-[10px] text-slate-700">{e.loanId}</span>
                              {e.codeNo && <span className="text-[9px] text-slate-400">{e.codeNo}</span>}
                            </td>
                            <td className="px-3 py-2.5 text-center text-[11px] text-slate-600">{e.seqNo}</td>
                            <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{e.reference || '—'}</td>
                            <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{e.depositAccount || '—'}</td>
                            <td className="px-3 py-2.5 text-right font-bold text-emerald-700">{formatINR(e.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : (
            // Flat view
            <table className="w-full table-fixed border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  <th className="w-10 px-3 py-3">S.No</th>
                  <th className="w-[11%] px-3 py-3">Date</th>
                  <th className="w-[20%] px-3 py-3">Customer</th>
                  <th className="w-[16%] px-3 py-3">Loan / Code</th>
                  <th className="w-8 px-3 py-3 text-center">Inst.</th>
                  <th className="w-[8%] px-3 py-3">Mode</th>
                  <th className="w-[13%] px-3 py-3">Reference</th>
                  <th className="w-[12%] px-3 py-3">Deposit A/c</th>
                  <th className="w-[11%] px-3 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-sm text-slate-500">
                      {isLoading ? 'Loading…' : 'No receipts match these filters. Try adjusting the date range or mode.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={`${e.loanId}-${e.seqNo}`} className="transition-colors hover:bg-[#FCFAF7]">
                      <td className="px-3 py-3 font-mono text-[10px] text-slate-400">{e.sNo}</td>
                      <td className="px-3 py-3 text-[11px] font-semibold text-slate-700">{fmtDate(e.recdDate)}</td>
                      <td className="px-3 py-3">
                        <span className="block truncate text-xs font-bold text-[#701A35]">{e.customerName}</span>
                        <span className="mt-0.5 block text-[9px] text-slate-400">{e.customerId}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="block truncate font-mono text-[10px] text-slate-700">{e.loanId}</span>
                        {e.codeNo && <span className="text-[9px] text-slate-400">{e.codeNo}</span>}
                      </td>
                      <td className="px-3 py-3 text-center text-[11px] text-slate-600">{e.seqNo}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${modeBadge(e.mode)}`}>{e.mode}</span>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-slate-600 truncate">{e.reference || '—'}</td>
                      <td className="px-3 py-3 text-[11px] text-slate-600 truncate">{e.depositAccount || '—'}</td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-700">{formatINR(e.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-[#F8F6F2] font-bold text-slate-800">
                    <td></td>
                    <td colSpan={7} className="px-3 py-3 text-xs">TOTAL · {filtered.length} receipts</td>
                    <td className="px-3 py-3 text-right text-xs text-emerald-700">{formatINR(grandTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </section>
    </div>
  );
};
