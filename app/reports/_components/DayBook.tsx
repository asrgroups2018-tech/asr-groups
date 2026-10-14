'use client';

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useApp } from '@/lib/store';
import { formatINR } from '@/lib/utils/formatCurrency';
import { Loan, Installment } from '@/lib/types';

const PAID_STATUSES = new Set(['PASS', 'NEFT', 'CASH', 'CLS', 'PAID']);
const isPaid = (status: string) =>
  PAID_STATUSES.has(String(status || '').trim().toUpperCase());
const dateKey = (v: string) => String(v || '').slice(0, 10);

interface DayEntry {
  sNo: number;
  time: string; // recdDate
  customerId: string;
  customerName: string;
  loanId: string;
  codeNo: string;
  seqNo: number;
  mode: string; // CASH, NEFT, PASS, etc.
  reference: string; // chqNo
  depositAccount: string;
  place: string;
  amount: number;
  remarks: string;
}

interface ModeTotal {
  mode: string;
  count: number;
  total: number;
}

function buildDayEntries(loans: Loan[], date: string): DayEntry[] {
  const entries: DayEntry[] = [];

  for (const loan of loans) {
    for (const inst of loan.installments || []) {
      const recdDate = dateKey(inst.recdDate || '');
      if (!isPaid(inst.status)) continue;
      if (recdDate !== date) continue;

      entries.push({
        sNo: 0,
        time: inst.recdDate || '',
        customerId: loan.customerId,
        customerName: loan.customerName,
        loanId: loan.id,
        codeNo: loan.codeNo || '',
        seqNo: Number(inst.seqNo || 1),
        mode: String(inst.status || 'CASH').toUpperCase(),
        reference: inst.chqNo || '',
        depositAccount: inst.depName || '',
        place: inst.place || loan.place || '',
        amount: Number(inst.amountDue || 0),
        remarks: inst.remarks || '',
      });
    }
  }

  entries.sort((a, b) => a.customerName.localeCompare(b.customerName));
  return entries.map((e, i) => ({ ...e, sNo: i + 1 }));
}

function modeTotals(entries: DayEntry[]): ModeTotal[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const e of entries) {
    const existing = map.get(e.mode) || { count: 0, total: 0 };
    existing.count += 1;
    existing.total += e.amount;
    map.set(e.mode, existing);
  }
  return Array.from(map.entries())
    .map(([mode, data]) => ({ mode, ...data }))
    .sort((a, b) => b.total - a.total);
}

const safeFileName = (v: string) =>
  v.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'report';
const pdfMoney = (v: number) => `INR ${Number(v || 0).toLocaleString('en-IN')}`;

const MODE_COLORS: Record<string, string> = {
  PASS: 'bg-violet-50 text-violet-700 border-violet-200',
  NEFT: 'bg-blue-50 text-blue-700 border-blue-200',
  CASH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLS: 'bg-amber-50 text-amber-700 border-amber-200',
  CS: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};
const modeColor = (mode: string) =>
  MODE_COLORS[mode] || 'bg-slate-50 text-slate-700 border-slate-200';

export const DayBook: React.FC = () => {
  const { loans, isLoading, showToast } = useApp();

  // Default to today
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);

  const entries = useMemo(() => buildDayEntries(loans, selectedDate), [loans, selectedDate]);
  const modes = useMemo(() => modeTotals(entries), [entries]);
  const totalAmount = useMemo(() => entries.reduce((s, e) => s + e.amount, 0), [entries]);

  // Navigate date
  const moveDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const displayDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const exportPdf = () => {
    if (!entries.length) {
      showToast('No transactions', `No collections found for ${displayDate}.`, 'warning');
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
    doc.text('ASR GROUP · Day Book', 32, 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(238, 216, 161);
    doc.text(`${displayDate} · ${entries.length} transactions · Total ${pdfMoney(totalAmount)}`, 32, 44);

    autoTable(doc, {
      startY: 82,
      head: [['S.No', 'Customer', 'Loan / Code', 'Inst.', 'Mode', 'Reference', 'Deposit A/c', 'Place', 'Amount']],
      body: entries.map((e) => [
        String(e.sNo),
        `${e.customerName}\n${e.customerId}`,
        `${e.loanId}${e.codeNo ? ` (${e.codeNo})` : ''}`,
        String(e.seqNo),
        e.mode,
        e.reference || '—',
        e.depositAccount || '—',
        e.place || '—',
        pdfMoney(e.amount),
      ]),
      foot: [
        ['', `TOTAL · ${entries.length} transactions`, '', '', '', '', '', '', pdfMoney(totalAmount)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, cellPadding: 4 },
      footStyles: { fillColor: [243, 239, 230], textColor: [112, 26, 53], fontSize: 8, fontStyle: 'bold' },
      columnStyles: { 8: { halign: 'right' } },
      margin: { left: 32, right: 32, bottom: 34 },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text(`ASR GROUP · Day Book · Page ${data.pageNumber} · Confidential`, pw / 2, ph - 16, { align: 'center' });
      },
    });

    doc.save(`ASR_DayBook_${safeFileName(selectedDate)}.pdf`);
    showToast('Day Book PDF downloaded', `${entries.length} transactions for ${displayDate}.`, 'success');
  };

  const exportExcel = () => {
    if (!entries.length) {
      showToast('No transactions', `No collections found for ${displayDate}.`, 'warning');
      return;
    }
    const rows = entries.map((e) => ({
      'S.No': e.sNo,
      'Date': selectedDate,
      'Customer ID': e.customerId,
      'Customer Name': e.customerName,
      'Loan ID': e.loanId,
      'Code No': e.codeNo || '—',
      'Inst. No': e.seqNo,
      'Mode': e.mode,
      'Reference / Cheque No': e.reference || '—',
      'Deposit Account': e.depositAccount || '—',
      'Place': e.place || '—',
      'Amount': e.amount,
      'Remarks': e.remarks || '—',
    }));
    rows.push({
      'S.No': 0,
      'Date': '',
      'Customer ID': '',
      'Customer Name': `TOTAL · ${entries.length} transactions`,
      'Loan ID': '',
      'Code No': '',
      'Inst. No': 0,
      'Mode': '',
      'Reference / Cheque No': '',
      'Deposit Account': '',
      'Place': '',
      'Amount': totalAmount,
      'Remarks': '',
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Day Book');
    XLSX.writeFile(wb, `ASR_DayBook_${safeFileName(selectedDate)}.xlsx`);
    showToast('Day Book Excel downloaded', `${entries.length} transactions exported.`, 'success');
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-7">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">
              Tally — Day Book
            </p>
            <div className="mt-1 flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-[#701A35]" />
              <h2 className="text-2xl font-bold tracking-tight text-[#24131B]">Day Book</h2>
              <span className="rounded-full bg-[#F5EEE3] px-2.5 py-1 text-xs font-bold text-[#701A35]">
                {entries.length} transactions
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              All receipts and collections for a selected date. Navigate day-by-day or pick any date.
            </p>
          </div>

          {/* Date Navigator */}
          <div className="flex flex-wrap items-center gap-3 border-t border-[#EEE8DE] pt-4">
            <button
              type="button"
              onClick={() => moveDate(-1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A07A39]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-[#D8C9A0] bg-[#FBF8F3] py-2 pl-10 pr-3 text-xs font-bold text-[#701A35] outline-none focus:border-[#C5A059]"
              />
            </div>
            <button
              type="button"
              onClick={() => moveDate(1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className="rounded-xl border border-[#C5A059] bg-[#FBF8F3] px-3 py-2 text-xs font-bold text-[#701A35] hover:bg-[#F5EEE3]"
            >
              Today
            </button>
            <span className="ml-auto text-xs font-semibold text-slate-600">{displayDate}</span>
          </div>

          {/* Export buttons */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={exportPdf}
              disabled={!entries.length}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-45"
            >
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button
              type="button"
              onClick={exportExcel}
              disabled={!entries.length}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-45"
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
          </div>
        </div>

        {/* Mode-wise Totals */}
        <div className="mt-6 border-t border-[#EEE8DE] pt-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Mode-wise Collection Totals
          </p>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl border border-[#E1C98D] bg-[#FBF8F3] px-3.5 py-3">
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#A07A39] opacity-70">Total for Day</span>
              <strong className="mt-1 block text-lg font-bold tabular-nums text-slate-900">{formatINR(totalAmount)}</strong>
            </div>
            {modes.map((m) => (
              <div key={m.mode} className={`rounded-2xl border px-3.5 py-3 ${modeColor(m.mode)}`}>
                <span className="block text-[10px] font-bold uppercase tracking-[0.1em] opacity-70">{m.mode} ({m.count})</span>
                <strong className="mt-1 block text-lg font-bold tabular-nums text-slate-900">{formatINR(m.total)}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transactions Table */}
      <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
        <div className="flex items-center justify-between border-b border-[#E7DFD2] bg-[#FCFBF9] px-4 py-4 sm:px-5">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <BookOpen className="h-4 w-4 text-[#701A35]" />
              Transactions — {displayDate}
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">
              {entries.length
                ? `${entries.length} collection${entries.length === 1 ? '' : 's'} totalling ${formatINR(totalAmount)}`
                : 'No collections recorded for this date'}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                <th className="w-10 px-3 py-3">S.No</th>
                <th className="w-[22%] px-3 py-3">Customer</th>
                <th className="w-[18%] px-3 py-3">Loan / Code</th>
                <th className="w-8 px-3 py-3 text-center">Inst.</th>
                <th className="w-[9%] px-3 py-3">Mode</th>
                <th className="w-[13%] px-3 py-3">Reference</th>
                <th className="w-[12%] px-3 py-3">Deposit A/c</th>
                <th className="w-[8%] px-3 py-3">Place</th>
                <th className="w-[12%] px-3 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-sm text-slate-500">
                    {isLoading ? 'Loading…' : `No collections found for ${displayDate}. Try another date.`}
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={`${e.loanId}-${e.seqNo}`} className="transition-colors hover:bg-[#FCFAF7]">
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-500">{e.sNo}</td>
                    <td className="px-3 py-3">
                      <span className="block truncate text-xs font-bold text-[#701A35]">{e.customerName}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-400">{e.customerId}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block truncate font-mono text-[10px] text-slate-700">{e.loanId}</span>
                      {e.codeNo && <span className="mt-0.5 block text-[10px] text-slate-400">{e.codeNo}</span>}
                    </td>
                    <td className="px-3 py-3 text-center text-[11px] text-slate-600">{e.seqNo}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${modeColor(e.mode)}`}>
                        {e.mode}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[11px] text-slate-600">{e.reference || '—'}</td>
                    <td className="px-3 py-3 text-[11px] text-slate-600 truncate">{e.depositAccount || '—'}</td>
                    <td className="px-3 py-3 text-[11px] text-slate-600 truncate">{e.place || '—'}</td>
                    <td className="px-3 py-3 text-right font-bold text-emerald-700">{formatINR(e.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {entries.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-[#F8F6F2] font-bold text-slate-800">
                  <td></td>
                  <td className="px-3 py-3 text-xs">TOTAL · {entries.length} transactions</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="px-3 py-3 text-right text-xs text-emerald-700">{formatINR(totalAmount)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
};
