'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileSpreadsheet,
  FileText,
  Search,
  X,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useApp } from '@/lib/store';
import { APP_BRAND } from '@/lib/branding';
import { formatINR } from '@/lib/utils/formatCurrency';
import { getTodayIsoDate } from '@/components/ui/DatePicker';
import { isPaid, isBounce, dateKey } from './CollectionsView';
import type { DateRange, Period } from './CollectionsView';

const fmtDate = (v: string) => {
  if (!v) return '—';
  const d = new Date(`${dateKey(v)}T00:00:00`);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const pdfMoney = (v: number) => `INR ${Number(v || 0).toLocaleString('en-IN')}`;
const safeFile = (v: string) => v.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase() || 'collections';

type PayStatus = 'Paid' | 'Bounce' | 'Overdue' | 'Pending';

interface SheetRow {
  sNo: number;
  customerId: string;
  customerName: string;
  place: string;
  loanId: string;
  codeNo: string;
  seqNo: number;
  dueDate: string;
  recdDate: string;
  principal: number;
  amountDue: number;
  collectedAmount: number;
  mode: string;
  reference: string;
  depositAccount: string;
  paymentStatus: PayStatus;
}

const MODE_BADGE: Record<string, string> = {
  PASS: 'bg-violet-50 text-violet-700 border-violet-200',
  NEFT: 'bg-blue-50 text-blue-700 border-blue-200',
  CASH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLS:  'bg-amber-50 text-amber-700 border-amber-200',
};
const STATUS_STYLE: Record<PayStatus, string> = {
  Paid:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  Bounce:  'bg-red-50 text-red-700 border-red-200',
  Overdue: 'bg-orange-50 text-orange-700 border-orange-200',
  Pending: 'bg-slate-50 text-slate-500 border-slate-200',
};
const ROW_BG: Record<PayStatus, string> = {
  Paid:    'bg-emerald-50/20',
  Bounce:  'bg-red-50/25',
  Overdue: 'bg-orange-50/20',
  Pending: '',
};

export const CollectionSheet: React.FC<{ dateRange: DateRange; period: Period; periodLabel: string }> = ({
  dateRange, periodLabel,
}) => {
  const { loans, isLoading, showToast, systemSettings } = useApp();
  const today = useMemo(() => getTodayIsoDate(), []);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | PayStatus>('All');
  const [modeFilter, setModeFilter] = useState('All');
  const [dateMode, setDateMode] = useState<'due' | 'received'>('due');

  const rows = useMemo((): SheetRow[] => {
    const { from, to } = dateRange;
    const result: SheetRow[] = [];

    const isAllTime = !from && !to;   // period === 'all' → no date restriction

    for (const loan of loans) {
      for (const inst of loan.installments || []) {
        if (!isAllTime) {
          const checkDate = dateMode === 'due'
            ? dateKey(inst.dueDate || '')
            : dateKey(inst.recdDate || '');
          if (!checkDate || checkDate < from || checkDate > to) continue;
        }

        const due = Number(inst.amountDue || 0);
        const paid = isPaid(inst.status);
        const bounce = isBounce(inst.status);
        const dDate = dateKey(inst.dueDate || '');

        let paymentStatus: PayStatus = 'Pending';
        if (paid) paymentStatus = 'Paid';
        else if (bounce) paymentStatus = 'Bounce';
        else if (dDate < today) paymentStatus = 'Overdue';

        result.push({
          sNo: 0,
          customerId: loan.customerId,
          customerName: loan.customerName,
          place: inst.place || loan.place || '',
          loanId: loan.id,
          codeNo: loan.codeNo || '',
          seqNo: Number(inst.seqNo || 1),
          dueDate: inst.dueDate || '',
          recdDate: inst.recdDate || '',
          principal: Number(loan.totalAmount || 0),
          amountDue: due,
          collectedAmount: paid ? due : 0,
          mode: paid ? String(inst.status).toUpperCase() : '',
          reference: inst.chqNo || '',
          depositAccount: inst.depName || '',
          paymentStatus,
        });
      }
    }

    result.sort((a, b) => {
      const dA = dateMode === 'due' ? a.dueDate : a.recdDate;
      const dB = dateMode === 'due' ? b.dueDate : b.recdDate;
      return dA !== dB ? dA.localeCompare(dB) : a.customerName.localeCompare(b.customerName);
    });

    return result.map((r, i) => ({ ...r, sNo: i + 1 }));
  }, [loans, dateRange, dateMode, today]);

  const allModes = useMemo(() =>
    Array.from(new Set(rows.filter((r) => r.mode).map((r) => r.mode))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'All' && r.paymentStatus !== statusFilter) return false;
      if (modeFilter !== 'All' && r.mode !== modeFilter) return false;
      if (q && ![r.customerName, r.customerId, r.loanId, r.codeNo, r.reference, r.place].join(' ').toLowerCase().includes(q)) return false;
      return true;
    }).map((r, i) => ({ ...r, sNo: i + 1 }));
  }, [rows, statusFilter, modeFilter, query]);

  const totals = useMemo(() => ({
    due: filtered.reduce((s, r) => s + r.amountDue, 0),
    collected: filtered.reduce((s, r) => s + r.collectedAmount, 0),
    pending: filtered.filter((r) => r.paymentStatus !== 'Paid').reduce((s, r) => s + r.amountDue, 0),
    rate: 0,
  }), [filtered]);
  totals.rate = totals.due > 0 ? (totals.collected / totals.due) * 100 : 0;

  const statusCounts: Record<string, number> = useMemo(() => {
    const m: Record<string, number> = { All: rows.length };
    for (const r of rows) m[r.paymentStatus] = (m[r.paymentStatus] || 0) + 1;
    return m;
  }, [rows]);

  const companyName = APP_BRAND;

  const exportPdf = () => {
    if (!filtered.length) { showToast('Nothing to export', 'No rows match filters.', 'warning'); return; }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth(); const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(112, 26, 53); doc.rect(0, 0, pw, 56, 'F');
    doc.setFillColor(197, 160, 89); doc.rect(0, 54, pw, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(255, 255, 255);
    doc.text(`${companyName.toUpperCase()} · COLLECTION SHEET`, 30, 26);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(238, 216, 161);
    doc.text(`${periodLabel} · ${filtered.length} rows · Collected: ${pdfMoney(totals.collected)} · Pending: ${pdfMoney(totals.pending)}`, 30, 42);
    autoTable(doc, {
      startY: 74,
      head: [['#', 'Customer', 'Loan / Code', 'Place', 'Inst.', 'Due Date', 'Recd. Date', 'To Collect', 'Collected', 'Mode', 'Reference', 'Status']],
      body: filtered.map((r) => [
        String(r.sNo), `${r.customerName} (${r.customerId})`,
        `${r.loanId}${r.codeNo ? ` (${r.codeNo})` : ''}`, r.place || '—',
        String(r.seqNo), fmtDate(r.dueDate), r.recdDate ? fmtDate(r.recdDate) : '—',
        pdfMoney(r.amountDue), r.collectedAmount > 0 ? pdfMoney(r.collectedAmount) : '—',
        r.mode || '—', r.reference || '—', r.paymentStatus,
      ]),
      foot: [['', `${filtered.length} rows`, '', '', '', '', '', pdfMoney(totals.due), pdfMoney(totals.collected), '', '', `${totals.rate.toFixed(1)}%`]],
      theme: 'striped',
      headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, cellPadding: 3 },
      footStyles: { fillColor: [243, 239, 230], textColor: [112, 26, 53], fontSize: 7.5, fontStyle: 'bold' },
      columnStyles: { 7: { halign: 'right' }, 8: { halign: 'right' } },
      margin: { left: 24, right: 24, bottom: 30 },
      didDrawPage: (d) => {
        doc.setFontSize(7); doc.setTextColor(150, 140, 130);
        doc.text(`${companyName} · Collection Sheet · Page ${d.pageNumber}`, pw / 2, ph - 12, { align: 'center' });
      },
    });
    doc.save(`ASR_CollectionSheet_${safeFile(periodLabel)}.pdf`);
    showToast('PDF exported', `${filtered.length} rows.`, 'success');
  };

  const exportExcel = () => {
    if (!filtered.length) { showToast('Nothing to export', '', 'warning'); return; }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filtered.map((r) => ({
      'S.No': r.sNo, 'Customer ID': r.customerId, 'Customer Name': r.customerName,
      'Place': r.place || '—', 'Loan ID': r.loanId, 'Code No': r.codeNo || '—',
      'Inst. No': r.seqNo, 'Due Date': fmtDate(r.dueDate), 'Received Date': r.recdDate ? fmtDate(r.recdDate) : '—',
      'Principal': r.principal, 'To Collect': r.amountDue,
      'Collected': r.collectedAmount || '', 'Mode': r.mode || '—',
      'Reference': r.reference || '—', 'Deposit A/c': r.depositAccount || '—', 'Status': r.paymentStatus,
    }))), 'Collection Sheet');
    XLSX.writeFile(wb, `ASR_CollectionSheet_${safeFile(periodLabel)}.xlsx`);
    showToast('Excel exported', `${filtered.length} rows.`, 'success');
  };

  const hasFilters = query || statusFilter !== 'All' || modeFilter !== 'All';

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E7DFD2] bg-white shadow-[0_4px_16px_rgba(58,34,22,0.05)]">
      {/* ── Controls bar ── */}
      <div className="border-b border-[#E7DFD2] bg-[#FCFBF9] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date mode */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px]">
            {(['due', 'received'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setDateMode(m)}
                className={`rounded-md px-2.5 py-1.5 font-bold transition ${dateMode === m ? 'bg-[#701A35] text-white' : 'text-slate-500 hover:text-[#701A35]'}`}>
                {m === 'due' ? 'By Due Date' : 'By Recd. Date'}
              </button>
            ))}
          </div>

          {/* Status pills */}
          <div className="flex gap-1 flex-wrap">
            {(['All', 'Paid', 'Pending', 'Overdue', 'Bounce'] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatusFilter(s as any)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                  statusFilter === s
                    ? s === 'All' ? 'bg-[#701A35] text-white border-[#701A35]'
                    : s === 'Paid' ? 'bg-emerald-600 text-white border-emerald-600'
                    : s === 'Overdue' ? 'bg-orange-500 text-white border-orange-500'
                    : s === 'Bounce' ? 'bg-red-600 text-white border-red-600'
                    : 'bg-slate-500 text-white border-slate-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#C5A059]'
                }`}>
                {s}{statusCounts[s] !== undefined ? ` (${statusCounts[s]})` : ''}
              </button>
            ))}
          </div>

          {/* Mode filter */}
          {allModes.length > 0 && (
            <div className="relative">
              <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-2.5 pr-7 text-[11px] font-semibold text-slate-700 outline-none focus:border-[#C5A059]">
                <option value="All">All Modes</option>
                {allModes.map((m) => <option key={m}>{m}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
            </div>
          )}

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customer, loan, reference…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-[#C5A059]" />
          </div>

          {hasFilters && (
            <button type="button" onClick={() => { setQuery(''); setStatusFilter('All'); setModeFilter('All'); }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#701A35] hover:underline">
              <X className="h-3 w-3" /> Clear
            </button>
          )}

          <div className="flex gap-1.5 ml-auto">
            <button type="button" onClick={exportPdf} disabled={!filtered.length}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-40">
              <FileText className="h-3.5 w-3.5" /> PDF
            </button>
            <button type="button" onClick={exportExcel} disabled={!filtered.length}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
            </button>
          </div>
        </div>

        {/* Summary totals strip */}
        <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[11px]">
          <span className="font-medium text-slate-500">{filtered.length} row{filtered.length !== 1 ? 's' : ''}</span>
          <span>To Collect: <strong className="text-[#701A35]">{formatINR(totals.due)}</strong></span>
          <span>Collected: <strong className="text-emerald-700">{formatINR(totals.collected)}</strong></span>
          <span>Pending: <strong className="text-orange-600">{formatINR(totals.pending)}</strong></span>
          <span className={`font-bold ${totals.rate >= 80 ? 'text-emerald-700' : totals.rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
            {totals.rate.toFixed(1)}% collected
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
              <th className="w-8 px-2 py-2.5 text-center">#</th>
              <th className="px-3 py-2.5 text-left">Customer</th>
              <th className="w-[15%] px-3 py-2.5 text-left">Loan / Code</th>
              <th className="w-[8%] px-2 py-2.5 text-center">Inst.</th>
              <th className="w-[11%] px-3 py-2.5 text-left">{dateMode === 'due' ? 'Due Date' : 'Recd. Date'}</th>
              <th className="w-[11%] px-3 py-2.5 text-right">To Collect</th>
              <th className="w-[11%] px-3 py-2.5 text-right">Collected</th>
              <th className="w-[7%] px-2 py-2.5 text-center">Mode</th>
              <th className="w-[9%] px-2 py-2.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-6 py-14 text-center">
                  <p className="text-sm font-semibold text-slate-500">
                    {isLoading ? 'Loading data…' : `No installments for ${periodLabel}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {!isLoading && 'Try switching the period or changing the date filters above.'}
                  </p>
                </td>
              </tr>
            ) : filtered.map((r) => (
              <tr key={`${r.loanId}-${r.seqNo}-${r.dueDate}`}
                className={`transition-colors hover:brightness-95 ${ROW_BG[r.paymentStatus]}`}>
                <td className="px-2 py-2 text-center font-mono text-[10px] text-slate-400">{r.sNo}</td>
                <td className="px-3 py-2">
                  <span className="block truncate font-bold text-[#701A35] text-[11px]">{r.customerName}</span>
                  <span className="text-[9px] text-slate-400">{r.customerId}{r.place ? ` · ${r.place}` : ''}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="block font-mono text-[10px] font-semibold text-slate-700 truncate">{r.loanId}</span>
                  {r.codeNo && <span className="text-[9px] text-slate-400">{r.codeNo}</span>}
                </td>
                <td className="px-2 py-2 text-center font-mono text-[11px] text-slate-600">{r.seqNo}</td>
                <td className="px-3 py-2 text-[11px] font-medium text-slate-700">
                  {dateMode === 'due'
                    ? fmtDate(r.dueDate)
                    : (r.recdDate ? fmtDate(r.recdDate) : <span className="text-slate-300">—</span>)
                  }
                </td>
                <td className="px-3 py-2 text-right font-semibold text-slate-800 text-[11px]">{formatINR(r.amountDue)}</td>
                <td className="px-3 py-2 text-right font-bold text-emerald-700 text-[11px]">
                  {r.collectedAmount > 0 ? formatINR(r.collectedAmount) : <span className="font-normal text-slate-300">—</span>}
                </td>
                <td className="px-2 py-2 text-center">
                  {r.mode && (
                    <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${MODE_BADGE[r.mode] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {r.mode}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-center">
                  <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${STATUS_STYLE[r.paymentStatus]}`}>
                    {r.paymentStatus === 'Paid'    && <CheckCircle2 className="h-2.5 w-2.5" />}
                    {r.paymentStatus === 'Bounce'  && <AlertOctagon className="h-2.5 w-2.5" />}
                    {(r.paymentStatus === 'Pending' || r.paymentStatus === 'Overdue') && <Clock className="h-2.5 w-2.5" />}
                    {r.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-[#F8F6F2]">
                <td colSpan={5} className="px-3 py-2.5 text-xs font-bold text-slate-700">
                  TOTAL · {filtered.length} installments · {totals.rate.toFixed(1)}% collected
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-800">{formatINR(totals.due)}</td>
                <td className="px-3 py-2.5 text-right text-xs font-bold text-emerald-700">{formatINR(totals.collected)}</td>
                <td colSpan={2} className="px-3 py-2.5 text-xs font-semibold text-orange-600">
                  Pending: {formatINR(totals.pending)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
