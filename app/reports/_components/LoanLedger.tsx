'use client';

import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Layers,
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

interface LoanLedgerEntry {
  seqNo: number;
  dueDate: string;
  recdDate: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  runningBalance: number;
  reference: string;
  depositAccount: string;
  remarks: string;
}

interface LoanLedgerRow {
  loanId: string;
  codeNo: string;
  customerId: string;
  customerName: string;
  place: string;
  status: string;
  startDate: string;
  frequency: string;
  disbursedAmount: number | null;
  interestAmount: number | null;
  totalAmount: number;
  totalCollected: number;
  totalOutstanding: number;
  installmentCount: number;
  entries: LoanLedgerEntry[];
}

function buildLoanLedger(loans: Loan[]): LoanLedgerRow[] {
  return loans.map((loan) => {
    const entries: LoanLedgerEntry[] = [];
    let running = 0;

    const sorted = [...(loan.installments || [])].sort((a, b) =>
      dateKey(a.dueDate).localeCompare(dateKey(b.dueDate))
    );

    for (const inst of sorted) {
      const due = Number(inst.amountDue || 0);
      const paid = isPaid(inst.status) ? due : 0;
      running += due - paid;

      entries.push({
        seqNo: Number(inst.seqNo || 1),
        dueDate: inst.dueDate || '',
        recdDate: inst.recdDate || '',
        status: String(inst.status || 'PENDING'),
        amountDue: due,
        amountPaid: paid,
        runningBalance: Math.max(0, running),
        reference: inst.chqNo || '',
        depositAccount: inst.depName || '',
        remarks: inst.remarks || '',
      });
    }

    return {
      loanId: loan.id,
      codeNo: loan.codeNo || '',
      customerId: loan.customerId,
      customerName: loan.customerName,
      place: loan.place || '',
      status: String(loan.status || 'Active'),
      startDate: loan.startDate || '',
      frequency: String(loan.frequency || 'Monthly'),
      disbursedAmount: loan.disbursedAmount ?? null,
      interestAmount: loan.interestAmount ?? null,
      totalAmount: Number(loan.totalAmount || 0),
      totalCollected: Number(loan.totalCollected || 0),
      totalOutstanding: Number(loan.totalOutstanding || 0),
      installmentCount: entries.length,
      entries,
    };
  }).sort((a, b) => a.customerName.localeCompare(b.customerName));
}

const STATUS_BADGE: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'On Track': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Overdue: 'bg-red-50 text-red-700 border-red-200',
  Closed: 'bg-slate-100 text-slate-600 border-slate-200',
  Draft: 'bg-amber-50 text-amber-700 border-amber-200',
};
const statusBadge = (s: string) => STATUS_BADGE[s] || 'bg-slate-50 text-slate-600 border-slate-200';

const INST_STATUS_BADGE: Record<string, string> = {
  PASS: 'bg-violet-50 text-violet-700',
  NEFT: 'bg-blue-50 text-blue-700',
  CASH: 'bg-emerald-50 text-emerald-700',
  CLS: 'bg-amber-50 text-amber-700',
  PENDING: 'bg-slate-50 text-slate-500',
  RET: 'bg-red-50 text-red-700',
};
const instBadge = (s: string) => INST_STATUS_BADGE[s.toUpperCase()] || 'bg-slate-50 text-slate-500';

export const LoanLedger: React.FC = () => {
  const { loans, isLoading, showToast } = useApp();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const allRows = useMemo(() => buildLoanLedger(loans), [loans]);

  const allStatuses = useMemo(() =>
    Array.from(new Set(allRows.map((r) => r.status))).sort(),
    [allRows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter((r) => {
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (q && ![r.customerName, r.customerId, r.loanId, r.codeNo, r.place].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allRows, query, statusFilter]);

  const totals = useMemo(() => filtered.reduce(
    (acc, r) => ({ total: acc.total + r.totalAmount, collected: acc.collected + r.totalCollected, outstanding: acc.outstanding + r.totalOutstanding }),
    { total: 0, collected: 0, outstanding: 0 }
  ), [filtered]);

  const hasFilters = query || statusFilter !== 'All';

  // Get entries for a loan filtered by date if date filter is applied
  const getFilteredEntries = (row: LoanLedgerRow) => {
    if (!fromDate && !toDate) return row.entries;
    return row.entries.filter((e) => {
      const d = dateKey(e.dueDate);
      if (fromDate && d && d < fromDate) return false;
      if (toDate && d && d > toDate) return false;
      return true;
    });
  };

  const exportSelectedPdf = (row: LoanLedgerRow) => {
    const entries = getFilteredEntries(row);
    if (!entries.length) { showToast('No entries', 'No installments found.', 'warning'); return; }
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(112, 26, 53); doc.rect(0, 0, pw, 58, 'F');
    doc.setFillColor(197, 160, 89); doc.rect(0, 56, pw, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(255, 255, 255);
    doc.text('ASR GROUP · LOAN LEDGER', 32, 26);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(238, 216, 161);
    doc.text(`${row.customerName} · ${row.loanId}${row.codeNo ? ` (${row.codeNo})` : ''} · ${row.place}`, 32, 42);
    doc.text(`${row.frequency} · ${entries.length} installments`, 32, 54);

    autoTable(doc, {
      startY: 78,
      head: [['Inst.', 'Due Date', 'Recd. Date', 'Mode', 'Dr (Due)', 'Cr (Paid)', 'Bal.', 'Ref.']],
      body: entries.map((e) => [
        String(e.seqNo),
        fmtDate(e.dueDate),
        e.recdDate ? fmtDate(e.recdDate) : '—',
        e.status,
        pdfMoney(e.amountDue),
        e.amountPaid > 0 ? pdfMoney(e.amountPaid) : '—',
        pdfMoney(e.runningBalance),
        e.reference || '—',
      ]),
      foot: [['', 'TOTAL', '', '', pdfMoney(entries.reduce((s, e) => s + e.amountDue, 0)), pdfMoney(entries.reduce((s, e) => s + e.amountPaid, 0)), pdfMoney(row.totalOutstanding), '']],
      theme: 'striped',
      headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, cellPadding: 4 },
      footStyles: { fillColor: [243, 239, 230], textColor: [112, 26, 53], fontSize: 8, fontStyle: 'bold' },
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
      margin: { left: 32, right: 32, bottom: 34 },
      didDrawPage: (d) => {
        doc.setFontSize(8); doc.setTextColor(130, 130, 130);
        doc.text(`ASR Group · Loan Ledger · Page ${d.pageNumber} · Confidential`, pw / 2, ph - 16, { align: 'center' });
      },
    });
    doc.save(`ASR_LoanLedger_${safeFileName(row.loanId)}.pdf`);
    showToast('Loan Ledger PDF', `${row.customerName} — ${entries.length} installments exported.`, 'success');
  };

  const exportAllExcel = () => {
    if (!filtered.length) { showToast('No data', 'No loans found.', 'warning'); return; }
    const wb = XLSX.utils.book_new();

    // Summary sheet
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      filtered.map((r, i) => ({
        'S.No': i + 1,
        'Loan ID': r.loanId,
        'Code': r.codeNo || '—',
        'Customer ID': r.customerId,
        'Customer Name': r.customerName,
        'Place': r.place || '—',
        'Status': r.status,
        'Start Date': r.startDate,
        'Frequency': r.frequency,
        'Installments': r.installmentCount,
        'Disbursed Amount': r.disbursedAmount ?? '',
        'Interest Amount': r.interestAmount ?? '',
        'Total Amount': r.totalAmount,
        'Total Collected': r.totalCollected,
        'Outstanding': r.totalOutstanding,
      }))
    ), 'Loan Summary');

    // Ledger details sheet
    const ledger: any[] = [];
    for (const r of filtered) {
      for (const e of r.entries) {
        ledger.push({
          'Loan ID': r.loanId,
          'Code': r.codeNo || '—',
          'Customer': r.customerName,
          'Place': r.place || '—',
          'Loan Status': r.status,
          'Inst. No': e.seqNo,
          'Due Date': e.dueDate,
          'Recd. Date': e.recdDate || '—',
          'Mode': e.status,
          'Dr (Amount Due)': e.amountDue,
          'Cr (Amount Paid)': e.amountPaid || '',
          'Running Balance': e.runningBalance,
          'Reference': e.reference || '—',
          'Deposit Account': e.depositAccount || '—',
          'Remarks': e.remarks || '—',
        });
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ledger), 'Loan Ledgers');

    XLSX.writeFile(wb, `ASR_LoanLedger_All_${safeFileName(new Date().toLocaleDateString('en-IN'))}.xlsx`);
    showToast('All Loan Ledgers Excel', `${filtered.length} loans + full ledger exported.`, 'success');
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-7">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">Tally — Loan-wise Ledger</p>
            <div className="mt-1 flex items-center gap-3">
              <Layers className="h-6 w-6 text-[#701A35]" />
              <h2 className="text-2xl font-bold tracking-tight text-[#24131B]">Loan-wise Ledger</h2>
              <span className="rounded-full bg-[#F5EEE3] px-2.5 py-1 text-xs font-bold text-[#701A35]">
                {filtered.length} loans
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Every individual loan has its own Dr/Cr ledger with running balance. Expand any loan to view its full installment register.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 border-t border-[#EEE8DE] pt-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customer, loan ID, code, place…"
                className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-10 pr-3 text-xs outline-none focus:border-[#C5A059]" />
            </div>
            <label className="block min-w-[120px] text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
              Status
              <span className="relative mt-1 block">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-3 pr-8 text-xs font-semibold normal-case text-slate-700 outline-none focus:border-[#C5A059]">
                  <option value="All">All Statuses</option>
                  {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </span>
            </label>
            <label className="block min-w-[130px] text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
              Entries From
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-[#FCFBF9] px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-[#C5A059]" />
            </label>
            <label className="block min-w-[130px] text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
              Entries To
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-[#FCFBF9] px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-[#C5A059]" />
            </label>
            {hasFilters && (
              <button type="button" onClick={() => { setQuery(''); setStatusFilter('All'); }}
                className="inline-flex items-center gap-1 self-end pb-2.5 text-[11px] font-bold text-[#701A35] hover:underline">
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
            <div className="flex gap-2 self-end ml-auto">
              <button type="button" onClick={exportAllExcel} disabled={!filtered.length}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-45">
                <FileSpreadsheet className="h-4 w-4" /> Export All Excel
              </button>
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-3 gap-2 border-t border-[#EEE8DE] pt-4">
            <TotCard label="Total Portfolio" value={formatINR(totals.total)} tone="amber" />
            <TotCard label="Total Collected" value={formatINR(totals.collected)} tone="green" />
            <TotCard label="Outstanding" value={formatINR(totals.outstanding)} tone="blue" />
          </div>
        </div>
      </section>

      {/* Loan List */}
      <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
        <div className="border-b border-[#E7DFD2] bg-[#FCFBF9] px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Layers className="h-4 w-4 text-[#701A35]" /> Loan Register
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            {isLoading ? 'Loading…' : `${filtered.length} loan${filtered.length === 1 ? '' : 's'} · Click any row to expand its full ledger`}
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              {isLoading ? 'Loading…' : 'No loans match these filters.'}
            </div>
          ) : (
            filtered.map((row, idx) => {
              const isExpanded = expandedLoanId === row.loanId;
              const displayEntries = getFilteredEntries(row);
              const entryTotals = displayEntries.reduce(
                (acc, e) => ({ due: acc.due + e.amountDue, paid: acc.paid + e.amountPaid }),
                { due: 0, paid: 0 }
              );

              return (
                <div key={row.loanId}>
                  {/* Loan header row — clickable (div to avoid button-in-button) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedLoanId(isExpanded ? null : row.loanId)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedLoanId(isExpanded ? null : row.loanId); } }}
                    className={`w-full cursor-pointer select-none text-left transition-colors ${isExpanded ? 'bg-[#FBF4E9]' : 'hover:bg-[#FCFAF7]'}`}
                  >
                    <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
                      <div className="flex-shrink-0 text-slate-400">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-[#701A35]" />
                          : <ChevronRight className="h-4 w-4" />}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 w-8 flex-shrink-0">{idx + 1}</div>

                      <div className="min-w-0 flex-1 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-4">
                        <div className="col-span-2 sm:col-span-1">
                          <span className="block truncate text-xs font-bold text-[#701A35]">{row.customerName}</span>
                          <span className="text-[10px] text-slate-400">{row.customerId} · {row.place}</span>
                        </div>
                        <div>
                          <span className="block font-mono text-[10px] text-slate-600">{row.loanId}</span>
                          {row.codeNo && <span className="text-[9px] text-slate-400">{row.codeNo}</span>}
                        </div>
                        <div className="hidden sm:block">
                          <span className="text-[10px] text-slate-500">{fmtDate(row.startDate)} · {row.frequency} · {row.installmentCount} inst.</span>
                        </div>
                        <div>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusBadge(row.status)}`}>{row.status}</span>
                        </div>
                      </div>

                      {/* Amounts + per-loan PDF */}
                      <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
                        <div className="text-right">
                          <span className="block text-[9px] font-bold uppercase text-slate-400">Principal</span>
                          <span className="text-xs font-semibold text-slate-700">{formatINR(row.totalAmount)}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9px] font-bold uppercase text-slate-400">Collected</span>
                          <span className="text-xs font-semibold text-emerald-700">{formatINR(row.totalCollected)}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9px] font-bold uppercase text-slate-400">Outstanding</span>
                          <span className="text-xs font-bold text-[#245B9B]">{formatINR(row.totalOutstanding)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); exportSelectedPdf(row); }}
                          className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-rose-700 hover:bg-rose-50 flex-shrink-0"
                        >
                          <FileText className="h-3.5 w-3.5 inline mr-1" />PDF
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Ledger */}
                  {isExpanded && (
                    <div className="border-t border-[#EEE8DE] bg-[#FDFCFA]">
                      {/* Loan details bar */}
                      <div className="flex flex-wrap gap-4 px-5 py-3 border-b border-[#EEE8DE] bg-[#FBF8F3] text-[11px]">
                        <MiniInfo label="Start Date" value={fmtDate(row.startDate)} />
                        <MiniInfo label="Frequency" value={row.frequency} />
                        <MiniInfo label="Installments" value={`${row.installmentCount}`} />
                        {row.disbursedAmount != null && row.disbursedAmount > 0 && (
                          <MiniInfo label="Disbursed" value={formatINR(row.disbursedAmount)} />
                        )}
                        {row.interestAmount != null && row.interestAmount > 0 && (
                          <MiniInfo label="Interest Booked" value={formatINR(row.interestAmount)} />
                        )}
                        <MiniInfo label="Total Portfolio" value={formatINR(row.totalAmount)} />
                        <MiniInfo label="Collected" value={formatINR(row.totalCollected)} color="text-emerald-700" />
                        <MiniInfo label="Outstanding" value={formatINR(row.totalOutstanding)} color="text-[#245B9B]" />
                      </div>

                      {/* Ledger table */}
                      <div className="overflow-x-auto">
                        <table className="w-full table-fixed border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                              <th className="w-10 px-3 py-2">Inst.</th>
                              <th className="w-[12%] px-3 py-2">Due Date</th>
                              <th className="w-[12%] px-3 py-2">Recd. Date</th>
                              <th className="w-[8%] px-3 py-2">Mode</th>
                              <th className="w-[14%] px-3 py-2 text-right">Dr (Due)</th>
                              <th className="w-[14%] px-3 py-2 text-right">Cr (Paid)</th>
                              <th className="w-[14%] px-3 py-2 text-right">Balance</th>
                              <th className="w-[14%] px-3 py-2">Reference</th>
                              <th className="w-[12%] px-3 py-2">Deposit A/c</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {displayEntries.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-xs text-slate-500">
                                  No installments in the selected date range.
                                </td>
                              </tr>
                            ) : (
                              displayEntries.map((e) => (
                                <tr key={e.seqNo} className={`transition-colors hover:bg-[#FCFAF7] ${!isPaid(e.status) && e.runningBalance > 0 ? '' : ''}`}>
                                  <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{e.seqNo}</td>
                                  <td className="px-3 py-2.5 text-[11px] text-slate-700">{fmtDate(e.dueDate)}</td>
                                  <td className="px-3 py-2.5 text-[11px] text-slate-700">{e.recdDate ? fmtDate(e.recdDate) : '—'}</td>
                                  <td className="px-3 py-2.5">
                                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold ${instBadge(e.status)}`}>
                                      {e.status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-semibold text-slate-700">{formatINR(e.amountDue)}</td>
                                  <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">
                                    {e.amountPaid > 0 ? formatINR(e.amountPaid) : <span className="text-slate-300">—</span>}
                                  </td>
                                  <td className={`px-3 py-2.5 text-right font-bold ${e.runningBalance > 0 ? 'text-[#245B9B]' : 'text-emerald-600'}`}>
                                    {e.runningBalance > 0 ? formatINR(e.runningBalance) : '✓ Nil'}
                                  </td>
                                  <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{e.reference || '—'}</td>
                                  <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{e.depositAccount || '—'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-slate-200 bg-[#F8F6F2] font-bold text-slate-800">
                              <td colSpan={4} className="px-3 py-2.5 text-xs">TOTAL · {displayEntries.length} installments</td>
                              <td className="px-3 py-2.5 text-right text-xs">{formatINR(entryTotals.due)}</td>
                              <td className="px-3 py-2.5 text-right text-xs text-emerald-700">{formatINR(entryTotals.paid)}</td>
                              <td className="px-3 py-2.5 text-right text-xs text-[#245B9B]">{formatINR(row.totalOutstanding)}</td>
                              <td></td><td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

function TotCard({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'green' | 'blue' }) {
  const tones = {
    amber: 'border-[#E1C98D] bg-[#FBF8F3]',
    green: 'border-emerald-200 bg-emerald-50/60',
    blue: 'border-blue-200 bg-blue-50/60',
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <strong className="mt-1.5 block truncate text-base font-bold text-slate-900 tabular-nums">{value}</strong>
    </div>
  );
}

function MiniInfo({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</span>
      <span className={`block text-[11px] font-semibold ${color || 'text-slate-700'}`}>{value}</span>
    </div>
  );
}
