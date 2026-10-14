'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  FileText,
  Printer,
  Search,
  User,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useApp } from '@/lib/store';
import { formatINR, numberToWordsINR } from '@/lib/utils/formatCurrency';
import { Customer, Loan, Installment } from '@/lib/types';

const PAID_STATUSES = new Set(['PASS', 'NEFT', 'CASH', 'CLS', 'PAID']);
const isPaid = (s: string) => PAID_STATUSES.has(String(s || '').trim().toUpperCase());
const dateKey = (v: string) => String(v || '').slice(0, 10);
const fmtDate = (v: string) => {
  if (!v) return '—';
  const d = new Date(`${dateKey(v)}T00:00:00`);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const safeFileName = (v: string) =>
  v.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'statement';
const pdfMoney = (v: number) => `INR ${Number(v || 0).toLocaleString('en-IN')}`;

interface LedgerEntry {
  seqNo: number;
  dueDate: string;
  recdDate: string;
  loanId: string;
  codeNo: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  runningBalance: number;
  reference: string;
  depositAccount: string;
  remarks: string;
}

interface CustomerSummary {
  customer: Customer;
  totalPrincipal: number;
  totalCollected: number;
  balance: number;
  loanCount: number;
  entries: LedgerEntry[];
}

function buildCustomerSummary(
  customer: Customer,
  customerLoans: Loan[],
  fromDate: string,
  toDate: string
): CustomerSummary {
  const allEntries: LedgerEntry[] = [];

  for (const loan of customerLoans) {
    for (const inst of loan.installments || []) {
      const date = dateKey(inst.recdDate || inst.dueDate || '');
      if (fromDate && date && date < fromDate) continue;
      if (toDate && date && date > toDate) continue;

      const amountDue = Number(inst.amountDue || 0);
      const amountPaid = isPaid(inst.status) ? amountDue : 0;

      allEntries.push({
        seqNo: Number(inst.seqNo || 1),
        dueDate: inst.dueDate || '',
        recdDate: inst.recdDate || '',
        loanId: loan.id,
        codeNo: loan.codeNo || '',
        status: String(inst.status || ''),
        amountDue,
        amountPaid,
        runningBalance: 0,
        reference: inst.chqNo || '',
        depositAccount: inst.depName || '',
        remarks: inst.remarks || '',
      });
    }
  }

  // Sort by due date
  allEntries.sort((a, b) => dateKey(a.dueDate).localeCompare(dateKey(b.dueDate)));

  // Build running balance
  let running = 0;
  for (const e of allEntries) {
    running += e.amountDue - e.amountPaid;
    e.runningBalance = Math.max(0, running);
  }

  const totalPrincipal = allEntries.reduce((s, e) => s + e.amountDue, 0);
  const totalCollected = allEntries.reduce((s, e) => s + e.amountPaid, 0);

  return {
    customer,
    totalPrincipal,
    totalCollected,
    balance: Math.max(0, totalPrincipal - totalCollected),
    loanCount: new Set(allEntries.map((e) => e.loanId)).size,
    entries: allEntries,
  };
}

export const AccountStatement: React.FC = () => {
  const { customers, loans, showToast } = useApp();
  const [query, setQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 20);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.place || '').toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [customers, query]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const customerLoans = useMemo(
    () => loans.filter((l) => l.customerId === selectedCustomerId),
    [loans, selectedCustomerId]
  );

  const statement = useMemo(() => {
    if (!selectedCustomer) return null;
    return buildCustomerSummary(selectedCustomer, customerLoans, fromDate, toDate);
  }, [selectedCustomer, customerLoans, fromDate, toDate]);

  const printStatement = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
      showToast('Print blocked', 'Allow popups for this site to print.', 'warning');
      return;
    }
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Account Statement — ${selectedCustomer?.name || ''}</title>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 24px; }
    .header { border-bottom: 3px solid #701A35; padding-bottom: 12px; margin-bottom: 16px; }
    .company-name { font-size: 18px; font-weight: bold; color: #701A35; }
    .company-sub { font-size: 10px; color: #555; margin-top: 2px; }
    .stmt-title { font-size: 14px; font-weight: bold; text-align: center; margin: 12px 0 8px; border: 1px solid #701A35; padding: 6px; color: #701A35; }
    .customer-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
    .info-row { font-size: 10px; }
    .info-label { font-weight: bold; color: #555; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 10px; }
    th { background: #701A35; color: white; padding: 5px 7px; text-align: left; font-size: 9px; }
    th.right, td.right { text-align: right; }
    td { padding: 4px 7px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #f9f6f1; }
    tfoot td { background: #f3efe6; font-weight: bold; border-top: 2px solid #701A35; }
    .summary { margin-top: 16px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .sum-box { border: 1px solid #ddd; padding: 8px 10px; border-radius: 6px; }
    .sum-label { font-size: 9px; font-weight: bold; color: #555; text-transform: uppercase; }
    .sum-value { font-size: 13px; font-weight: bold; margin-top: 4px; }
    .words { font-size: 9.5px; color: #444; margin-top: 12px; border-top: 1px dashed #ccc; padding-top: 8px; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 9px; color: #555; }
    .sig-line { border-top: 1px solid #333; width: 160px; padding-top: 4px; font-size: 9px; color: #555; text-align: center; }
    @media print {
      body { padding: 12px; }
    }
  </style>
</head>
<body onload="window.print()">
  ${content}
</body>
</html>`);
    w.document.close();
  };

  const exportPdf = () => {
    if (!statement) {
      showToast('No customer selected', 'Please select a customer first.', 'warning');
      return;
    }
    if (!statement.entries.length) {
      showToast('No transactions', 'No transactions found for the selected period.', 'warning');
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    doc.setFillColor(112, 26, 53);
    doc.rect(0, 0, pw, 70, 'F');
    doc.setFillColor(197, 160, 89);
    doc.rect(0, 68, pw, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('ASR Group', 32, 32);

    // Statement title
    doc.setFillColor(248, 246, 242);
    doc.rect(32, 84, pw - 64, 28, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(112, 26, 53);
    doc.text('ACCOUNT STATEMENT', pw / 2, 103, { align: 'center' });

    // Customer Info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const startY = 130;
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Name:', 32, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(statement.customer.name, 140, startY);

    doc.setFont('helvetica', 'bold');
    doc.text('Customer ID:', 32, startY + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(statement.customer.id, 140, startY + 14);

    doc.setFont('helvetica', 'bold');
    doc.text('Mobile:', 32, startY + 28);
    doc.setFont('helvetica', 'normal');
    doc.text(statement.customer.phone || '—', 140, startY + 28);

    doc.setFont('helvetica', 'bold');
    doc.text('Place:', 32, startY + 42);
    doc.setFont('helvetica', 'normal');
    doc.text(statement.customer.place || '—', 140, startY + 42);

    // Right side
    doc.setFont('helvetica', 'bold');
    doc.text('Statement Period:', pw / 2, startY);
    doc.setFont('helvetica', 'normal');
    const period =
      fromDate || toDate
        ? `${fromDate ? fmtDate(fromDate) : 'Beginning'} to ${toDate ? fmtDate(toDate) : 'Date'}`
        : 'All Transactions';
    doc.text(period, pw / 2 + 100, startY);

    doc.setFont('helvetica', 'bold');
    doc.text('Generated:', pw / 2, startY + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleString('en-IN'), pw / 2 + 100, startY + 14);

    doc.setFont('helvetica', 'bold');
    doc.text('Total Loans:', pw / 2, startY + 28);
    doc.setFont('helvetica', 'normal');
    doc.text(String(statement.loanCount), pw / 2 + 100, startY + 28);

    // Ledger Table
    autoTable(doc, {
      startY: startY + 64,
      head: [['S.No', 'Due Date', 'Recd. Date', 'Loan / Code', 'Mode', 'Dr (Due)', 'Cr (Paid)', 'Balance']],
      body: statement.entries.map((e, i) => [
        String(i + 1),
        fmtDate(e.dueDate),
        e.recdDate ? fmtDate(e.recdDate) : '—',
        `${e.loanId}${e.codeNo ? ` (${e.codeNo})` : ''}`,
        e.status,
        pdfMoney(e.amountDue),
        e.amountPaid > 0 ? pdfMoney(e.amountPaid) : '—',
        pdfMoney(e.runningBalance),
      ]),
      foot: [
        ['', '', '', 'CLOSING BALANCE', '', pdfMoney(statement.totalPrincipal), pdfMoney(statement.totalCollected), pdfMoney(statement.balance)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, cellPadding: 4 },
      footStyles: { fillColor: [243, 239, 230], textColor: [112, 26, 53], fontSize: 8, fontStyle: 'bold' },
      columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
      margin: { left: 32, right: 32, bottom: 60 },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text(
          `ASR Group · Confidential · Page ${data.pageNumber}`,
          pw / 2, ph - 16, { align: 'center' }
        );
      },
    });

    // Amount in words footer
    const finalY = (doc as any).lastAutoTable?.finalY || 400;
    if (finalY + 80 < ph) {
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.text('Outstanding Balance in Words:', 32, finalY + 24);
      doc.setFont('helvetica', 'normal');
      doc.text(numberToWordsINR(statement.balance), 32, finalY + 38);

      // Signature line
      doc.setDrawColor(100, 100, 100);
      doc.line(pw - 180, finalY + 60, pw - 32, finalY + 60);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Authorised Signatory', pw - 180, finalY + 72);
    }

    doc.save(`ASR_Statement_${safeFileName(statement.customer.name)}.pdf`);
    showToast('Account Statement PDF downloaded', `Statement for ${statement.customer.name}.`, 'success');
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-7">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">
              Tally — Account Statement
            </p>
            <div className="mt-1 flex items-center gap-3">
              <User className="h-6 w-6 text-[#701A35]" />
              <h2 className="text-2xl font-bold tracking-tight text-[#24131B]">Account Statement</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Print-ready customer statement with Opening Balance → Dr/Cr entries → Closing Balance. Send directly to customers.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-end gap-3 border-t border-[#EEE8DE] pt-4">
            {/* Customer Search */}
            <div className="min-w-[260px] flex-1">
              <label className="block text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-1">
                Select Customer
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedCustomerId(''); }}
                  placeholder="Search by name, ID, or place…"
                  className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-10 pr-3 text-xs outline-none focus:border-[#C5A059]"
                />
              </div>
              {query && !selectedCustomerId && filteredCustomers.length > 0 && (
                <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedCustomerId(c.id); setQuery(c.name); }}
                      className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-[#FBF8F3]"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#701A35]">{c.name}</p>
                        <p className="text-[10px] text-slate-400">{c.id} · {c.place || 'No place'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Period */}
            <label className="block min-w-[140px] text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
              From Date
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-[#FCFBF9] px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-[#C5A059]"
              />
            </label>
            <label className="block min-w-[140px] text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
              To Date
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-[#FCFBF9] px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-[#C5A059]"
              />
            </label>

            <div className="flex gap-2 self-end">
              <button
                type="button"
                onClick={exportPdf}
                disabled={!statement}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-45"
              >
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button
                type="button"
                onClick={printStatement}
                disabled={!statement}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D8C9A0] bg-[#FBF8F3] px-3 py-2.5 text-xs font-bold text-[#701A35] hover:bg-[#F5EEE3] disabled:opacity-45"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Statement Preview */}
      {statement ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoCard label="Customer" value={statement.customer.name} sub={statement.customer.id} />
            <InfoCard label="Total Principal (Dr)" value={formatINR(statement.totalPrincipal)} />
            <InfoCard label="Total Collected (Cr)" value={formatINR(statement.totalCollected)} tone="green" />
            <InfoCard label="Outstanding Balance" value={formatINR(statement.balance)} tone="blue" />
          </div>

          {/* Print Preview */}
          <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
            <div className="border-b border-[#E7DFD2] bg-[#FCFBF9] px-4 py-4 sm:px-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileText className="h-4 w-4 text-[#701A35]" />
                Statement Preview — {statement.customer.name}
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">
                {statement.entries.length} transaction{statement.entries.length === 1 ? '' : 's'} ·{' '}
                {fromDate || toDate
                  ? `Period: ${fromDate ? fmtDate(fromDate) : 'Beginning'} to ${toDate ? fmtDate(toDate) : 'Date'}`
                  : 'All transactions'}
              </p>
            </div>

            {/* Printable area */}
            <div ref={printRef} className="p-6 font-[Arial,sans-serif] text-[11px] text-slate-900">
              {/* Company Header */}
              <div className="border-b-2 border-[#701A35] pb-4 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xl font-bold text-[#701A35]">ASR Group</div>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center font-bold text-[#701A35] border border-[#701A35] py-2 mb-4 tracking-wide text-sm">
                ACCOUNT STATEMENT
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-4 text-[11px]">
                <div><span className="font-bold">Customer Name: </span>{statement.customer.name}</div>
                <div><span className="font-bold">Period: </span>{fromDate || toDate ? `${fromDate ? fmtDate(fromDate) : 'Beginning'} to ${toDate ? fmtDate(toDate) : 'Date'}` : 'All Transactions'}</div>
                <div><span className="font-bold">Customer ID: </span>{statement.customer.id}</div>
                <div><span className="font-bold">Generated: </span>{new Date().toLocaleString('en-IN')}</div>
                <div><span className="font-bold">Mobile: </span>{statement.customer.phone || '—'}</div>
                <div><span className="font-bold">Total Loans: </span>{statement.loanCount}</div>
                <div><span className="font-bold">Place: </span>{statement.customer.place || '—'}</div>
                <div><span className="font-bold">Transactions: </span>{statement.entries.length}</div>
              </div>

              {/* Ledger Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-[#701A35] text-white">
                      <th className="px-2 py-1.5 text-left w-8">S.No</th>
                      <th className="px-2 py-1.5 text-left w-[12%]">Due Date</th>
                      <th className="px-2 py-1.5 text-left w-[12%]">Recd. Date</th>
                      <th className="px-2 py-1.5 text-left w-[20%]">Loan / Code</th>
                      <th className="px-2 py-1.5 text-left w-[9%]">Mode</th>
                      <th className="px-2 py-1.5 text-right w-[13%]">Dr (Amount Due)</th>
                      <th className="px-2 py-1.5 text-right w-[13%]">Cr (Paid)</th>
                      <th className="px-2 py-1.5 text-right w-[13%]">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.entries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-slate-500">No transactions in this period</td>
                      </tr>
                    ) : (
                      statement.entries.map((e, i) => (
                        <tr key={`${e.loanId}-${e.seqNo}`} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f9f6f1]'}>
                          <td className="px-2 py-1 border-b border-slate-100">{i + 1}</td>
                          <td className="px-2 py-1 border-b border-slate-100">{fmtDate(e.dueDate)}</td>
                          <td className="px-2 py-1 border-b border-slate-100">{e.recdDate ? fmtDate(e.recdDate) : '—'}</td>
                          <td className="px-2 py-1 border-b border-slate-100">
                            <span className="font-mono text-[9px]">{e.loanId}</span>
                            {e.codeNo && <span className="text-slate-400 ml-1">({e.codeNo})</span>}
                          </td>
                          <td className="px-2 py-1 border-b border-slate-100 font-semibold">{e.status}</td>
                          <td className="px-2 py-1 border-b border-slate-100 text-right">{formatINR(e.amountDue)}</td>
                          <td className="px-2 py-1 border-b border-slate-100 text-right font-semibold text-emerald-700">
                            {e.amountPaid > 0 ? formatINR(e.amountPaid) : '—'}
                          </td>
                          <td className="px-2 py-1 border-b border-slate-100 text-right font-bold text-[#245B9B]">
                            {formatINR(e.runningBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#f3efe6] font-bold border-t-2 border-[#701A35]">
                      <td colSpan={4} className="px-2 py-2 text-[#701A35]">CLOSING BALANCE</td>
                      <td></td>
                      <td className="px-2 py-2 text-right">{formatINR(statement.totalPrincipal)}</td>
                      <td className="px-2 py-2 text-right text-emerald-700">{formatINR(statement.totalCollected)}</td>
                      <td className="px-2 py-2 text-right text-[#701A35]">{formatINR(statement.balance)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Amount in Words */}
              <div className="mt-4 border-t border-dashed border-slate-300 pt-3 text-[10px]">
                <span className="font-bold">Outstanding Balance in Words: </span>
                {numberToWordsINR(statement.balance)}
              </div>

              {/* Signature */}
              <div className="mt-10 flex items-end justify-between">
                <div className="text-[9px] text-slate-500">
                  <p>This is a computer-generated statement.</p>
                </div>
                <div className="text-center">
                  <div className="border-t border-slate-400 w-40 pt-1 text-[9px] text-slate-500">
                    Authorised Signatory
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">ASR Group</div>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <User className="h-12 w-12 text-slate-200 mb-4" />
            <h3 className="text-sm font-bold text-slate-500">Select a Customer</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-xs">
              Search for a customer above to generate their account statement with Dr/Cr ledger and balance.
            </p>
          </div>
        </section>
      )}
    </div>
  );
};

function InfoCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'green' | 'blue';
}) {
  const toneClass = !tone
    ? 'border-[#E1C98D] bg-[#FBF8F3]'
    : tone === 'green'
    ? 'border-emerald-200 bg-emerald-50/60'
    : 'border-blue-200 bg-blue-50/60';
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <strong className="mt-1.5 block truncate text-sm font-bold text-slate-900">{value}</strong>
      {sub && <span className="block text-[10px] text-slate-400 mt-0.5">{sub}</span>}
    </div>
  );
}
