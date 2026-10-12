'use client';

import React, { useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Scale,
  Search,
  CheckCircle2,
  AlertCircle,
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

interface TrialRow {
  sNo: number;
  customerId: string;
  customerName: string;
  place: string;
  loanCount: number;
  debit: number;   // Total principal/amount due (Dr side — what was expected)
  credit: number;  // Total collected (Cr side — what came in)
  balance: number; // Outstanding (Dr - Cr)
}

function buildTrialRows(loans: Loan[]): TrialRow[] {
  const grouped = new Map<
    string,
    { name: string; place: string; loanIds: Set<string>; debit: number; credit: number }
  >();

  for (const loan of loans) {
    const existing = grouped.get(loan.customerId) || {
      name: loan.customerName,
      place: loan.place || '',
      loanIds: new Set(),
      debit: 0,
      credit: 0,
    };
    existing.loanIds.add(loan.id);

    const installments: Installment[] = loan.installments || [];
    for (const inst of installments) {
      const due = Number(inst.amountDue || 0);
      const paid = isPaid(inst.status) ? due : 0;
      existing.debit += due;
      existing.credit += paid;
    }
    grouped.set(loan.customerId, existing);
  }

  return Array.from(grouped.entries())
    .map(([customerId, data], index) => ({
      sNo: index + 1,
      customerId,
      customerName: data.name,
      place: data.place,
      loanCount: data.loanIds.size,
      debit: data.debit,
      credit: data.credit,
      balance: Math.max(0, data.debit - data.credit),
    }))
    .sort((a, b) => a.customerName.localeCompare(b.customerName))
    .map((row, index) => ({ ...row, sNo: index + 1 }));
}

const safeFileName = (v: string) =>
  v.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'report';
const pdfMoney = (v: number) => `INR ${Number(v || 0).toLocaleString('en-IN')}`;
const formatDate = () =>
  new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const TrialBalance: React.FC = () => {
  const { loans, isLoading, showToast } = useApp();
  const [query, setQuery] = useState('');

  const allRows = useMemo(() => buildTrialRows(loans), [loans]);

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

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, r) => ({ debit: acc.debit + r.debit, credit: acc.credit + r.credit, balance: acc.balance + r.balance }),
        { debit: 0, credit: 0, balance: 0 }
      ),
    [filteredRows]
  );

  const isBalanced = Math.abs(totals.debit - (totals.credit + totals.balance)) < 1;

  const exportPdf = () => {
    if (!filteredRows.length) {
      showToast('Nothing to export', 'No data available.', 'warning');
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
    doc.text('ASR GROUPS · TRIAL BALANCE', 32, 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(238, 216, 161);
    doc.text(`As of ${formatDate()} · ${filteredRows.length} accounts`, 32, 44);

    autoTable(doc, {
      startY: 82,
      head: [['S.No', 'Customer', 'Place', 'Loans', 'Dr (Amount Due)', 'Cr (Collected)', 'Balance (Outstanding)']],
      body: filteredRows.map((r) => [
        String(r.sNo),
        `${r.customerName}\n${r.customerId}`,
        r.place || '—',
        String(r.loanCount),
        pdfMoney(r.debit),
        pdfMoney(r.credit),
        pdfMoney(r.balance),
      ]),
      foot: [
        ['', `TOTAL · ${filteredRows.length} accounts`, '', '', pdfMoney(totals.debit), pdfMoney(totals.credit), pdfMoney(totals.balance)],
        ['', isBalanced ? '✓ TRIAL BALANCE: IN BALANCE' : '✗ CHECK: Out of balance', '', '', '', '', ''],
      ],
      theme: 'striped',
      headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, cellPadding: 4 },
      footStyles: { fillColor: [243, 239, 230], textColor: [112, 26, 53], fontSize: 8, fontStyle: 'bold' },
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
      margin: { left: 32, right: 32, bottom: 34 },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text(`ASR Groups · Trial Balance · Page ${data.pageNumber} · Confidential`, pw / 2, ph - 16, { align: 'center' });
      },
    });

    doc.save(`ASR_Trial_Balance_${safeFileName(formatDate())}.pdf`);
    showToast('Trial Balance PDF downloaded', `${filteredRows.length} accounts exported.`, 'success');
  };

  const exportExcel = () => {
    if (!filteredRows.length) {
      showToast('Nothing to export', 'No data available.', 'warning');
      return;
    }
    const rows = filteredRows.map((r) => ({
      'S.No': r.sNo,
      'Customer ID': r.customerId,
      'Customer Name': r.customerName,
      'Place': r.place || '—',
      'Loans': r.loanCount,
      'Dr (Amount Due)': r.debit,
      'Cr (Collected)': r.credit,
      'Balance (Outstanding)': r.balance,
    }));
    rows.push({
      'S.No': 0,
      'Customer ID': `GRAND TOTAL · ${filteredRows.length} accounts`,
      'Customer Name': '',
      'Place': '',
      'Loans': 0,
      'Dr (Amount Due)': totals.debit,
      'Cr (Collected)': totals.credit,
      'Balance (Outstanding)': totals.balance,
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Trial Balance');
    XLSX.writeFile(wb, `ASR_Trial_Balance_${safeFileName(formatDate())}.xlsx`);
    showToast('Trial Balance Excel downloaded', `${filteredRows.length} accounts exported.`, 'success');
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-7">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">
              Tally — Trial Balance
            </p>
            <div className="mt-1 flex items-center gap-3">
              <Scale className="h-6 w-6 text-[#701A35]" />
              <h2 className="text-2xl font-bold tracking-tight text-[#24131B]">Trial Balance</h2>
              <span className="rounded-full bg-[#F5EEE3] px-2.5 py-1 text-xs font-bold text-[#701A35]">
                {filteredRows.length}
              </span>
              {isBalanced ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" /> In Balance
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200">
                  <AlertCircle className="h-3.5 w-3.5" /> Check Balance
                </span>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              All customer accounts with Debit (amount due) vs Credit (collected) vs Outstanding Balance. Dr = Cr + Balance must hold.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-[#EEE8DE] pt-4 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={exportPdf}
              disabled={!filteredRows.length}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-45"
            >
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button
              type="button"
              onClick={exportExcel}
              disabled={!filteredRows.length}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-45"
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
          </div>
        </div>

        {/* Totals summary bar */}
        <div className="mt-6 grid grid-cols-2 gap-2 border-t border-[#EEE8DE] pt-5 sm:grid-cols-4">
          <SumCard label="Total Dr (Amount Due)" value={formatINR(totals.debit)} tone="amber" />
          <SumCard label="Total Cr (Collected)" value={formatINR(totals.credit)} tone="green" />
          <SumCard label="Outstanding Balance" value={formatINR(totals.balance)} tone="blue" />
          <SumCard
            label="Balance Check (Dr - Cr)"
            value={formatINR(totals.debit - totals.credit)}
            tone={isBalanced ? 'slate' : 'red'}
          />
        </div>
      </section>

      {/* Search */}
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-4 shadow-[0_12px_32px_rgba(58,34,22,0.04)] sm:p-5">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customer, ID or place…"
            className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-10 pr-3 text-xs outline-none focus:border-[#C5A059] focus:bg-white"
          />
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          {isLoading ? 'Loading…' : `Showing ${filteredRows.length} account${filteredRows.length === 1 ? '' : 's'}`}
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
        <div className="flex items-center justify-between border-b border-[#E7DFD2] bg-[#FCFBF9] px-4 py-4 sm:px-5">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Scale className="h-4 w-4 text-[#701A35]" /> Trial Balance Ledger
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">Dr (Debit) = Cr (Credit) + Balance must hold for each account</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                <th className="w-12 px-3 py-3">S.No</th>
                <th className="w-[25%] px-3 py-3">Customer</th>
                <th className="w-[10%] px-3 py-3">Place</th>
                <th className="w-[8%] px-3 py-3">Loans</th>
                <th className="w-[15%] px-3 py-3 text-right">Dr (Amount Due)</th>
                <th className="w-[15%] px-3 py-3 text-right">Cr (Collected)</th>
                <th className="w-[17%] px-3 py-3 text-right">Balance (Outstanding)</th>
                <th className="w-[8%] px-3 py-3 text-center">Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-sm text-slate-500">
                    {isLoading ? 'Loading data…' : 'No records found.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const rowBalance = Math.abs(row.debit - (row.credit + row.balance)) < 1;
                  return (
                    <tr key={row.customerId} className="transition-colors hover:bg-[#FCFAF7]">
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-500">{row.sNo}</td>
                      <td className="px-3 py-3">
                        <span className="block truncate text-xs font-bold text-[#701A35]">{row.customerName}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-400">{row.customerId}</span>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-slate-600">{row.place || '—'}</td>
                      <td className="px-3 py-3 text-[11px] text-slate-600">{row.loanCount}</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-800">{formatINR(row.debit)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-emerald-700">{formatINR(row.credit)}</td>
                      <td className="px-3 py-3 text-right font-bold text-[#245B9B]">{formatINR(row.balance)}</td>
                      <td className="px-3 py-3 text-center">
                        {rowBalance ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-rose-500 inline" />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-[#F8F6F2] font-bold text-slate-800">
                <td></td>
                <td className="px-3 py-3 text-xs">GRAND TOTAL · {filteredRows.length} accounts</td>
                <td></td>
                <td></td>
                <td className="px-3 py-3 text-right text-xs">{formatINR(totals.debit)}</td>
                <td className="px-3 py-3 text-right text-xs text-emerald-700">{formatINR(totals.credit)}</td>
                <td className="px-3 py-3 text-right text-xs text-[#245B9B]">{formatINR(totals.balance)}</td>
                <td className="px-3 py-3 text-center">
                  {isBalanced ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-500 inline" />
                  )}
                </td>
              </tr>
              <tr className="border-t border-slate-200 bg-[#FBF8F3]">
                <td colSpan={8} className="px-3 py-2.5 text-[11px] font-bold text-center text-slate-600">
                  {isBalanced
                    ? '✓ Trial Balance is IN BALANCE — Dr = Cr + Outstanding'
                    : '✗ Trial Balance has a discrepancy — Dr ≠ Cr + Outstanding'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
};

function SumCard({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'green' | 'blue' | 'slate' | 'red' }) {
  const tones = {
    amber: 'border-[#E1C98D] bg-[#FBF8F3] text-[#701A35]',
    green: 'border-emerald-200 bg-emerald-50/60 text-emerald-700',
    blue: 'border-blue-200 bg-blue-50/60 text-blue-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    red: 'border-rose-200 bg-rose-50/60 text-rose-700',
  };
  return (
    <div className={`rounded-2xl border px-3.5 py-3 ${tones[tone]}`}>
      <span className="block text-[10px] font-bold uppercase tracking-[0.1em] opacity-70">{label}</span>
      <strong className="mt-2 block truncate text-lg font-bold tabular-nums text-slate-900">{value}</strong>
    </div>
  );
}
