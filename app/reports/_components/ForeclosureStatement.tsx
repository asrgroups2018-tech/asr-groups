'use client';

import React, { useMemo, useState } from 'react';
import {
  Calculator,
  ChevronDown,
  FileText,
  Search,
  X,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useApp } from '@/lib/store';
import { formatINR } from '@/lib/utils/formatCurrency';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';
import { Loan } from '@/lib/types';

const PAID_STATUSES = new Set(['PASS', 'NEFT', 'CASH', 'CLS', 'PAID']);
const isPaid = (s: string) => PAID_STATUSES.has(String(s || '').trim().toUpperCase());

const dateKey = (v: string) => String(v || '').slice(0, 10);
const fmtDate = (v: string) => {
  if (!v) return '—';
  const d = new Date(`${dateKey(v)}T00:00:00`);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
};
const pdfMoney = (v: number) => `INR ${Number(v || 0).toLocaleString('en-IN')}`;
const safeFileName = (v: string) =>
  v.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'report';

interface ForeclosureInstallment {
  seqNo: number;
  dueDate: string;
  amountDue: number;
  status: 'Paid' | 'Unpaid (Foreclosing)' | 'Future (Foreclosing)';
  isForeclosing: boolean;
}

interface ForeclosureCalc {
  totalInstallments: number;
  paidInstallments: number;
  unpaidInstallments: number;
  totalPaid: number;
  grossOutstanding: number;      // sum of amountDue for all unpaid installments
  rebateAmount: number;          // calculated rebate
  netSettlement: number;         // grossOutstanding - rebateAmount
  installments: ForeclosureInstallment[];
}

function calcForeclosure(loan: Loan, asOfDate: string, rebateType: 'none' | 'percent' | 'fixed', rebateValue: number): ForeclosureCalc {
  const today = asOfDate || new Date().toISOString().slice(0, 10);
  const insts = [...(loan.installments || [])].sort((a, b) =>
    dateKey(a.dueDate).localeCompare(dateKey(b.dueDate))
  );

  let totalPaid = 0;
  let grossOutstanding = 0;
  let paidInstallments = 0;
  let unpaidInstallments = 0;
  const installments: ForeclosureInstallment[] = [];

  for (const inst of insts) {
    const due = Number(inst.amountDue || 0);
    const paid = isPaid(inst.status);
    const dueDate = dateKey(inst.dueDate);

    if (paid) {
      paidInstallments++;
      totalPaid += due;
      installments.push({ seqNo: Number(inst.seqNo || 0), dueDate: inst.dueDate || '', amountDue: due, status: 'Paid', isForeclosing: false });
    } else {
      // Unpaid — if due on/before today: overdue; if future: future
      const label = dueDate <= today ? 'Unpaid (Foreclosing)' : 'Future (Foreclosing)';
      grossOutstanding += due;
      unpaidInstallments++;
      installments.push({ seqNo: Number(inst.seqNo || 0), dueDate: inst.dueDate || '', amountDue: due, status: label, isForeclosing: true });
    }
  }

  let rebateAmount = 0;
  if (rebateType === 'percent' && rebateValue > 0) {
    rebateAmount = Math.min(grossOutstanding, (grossOutstanding * rebateValue) / 100);
  } else if (rebateType === 'fixed' && rebateValue > 0) {
    rebateAmount = Math.min(grossOutstanding, rebateValue);
  }

  const netSettlement = Math.max(0, grossOutstanding - rebateAmount);

  return { totalInstallments: insts.length, paidInstallments, unpaidInstallments, totalPaid, grossOutstanding, rebateAmount, netSettlement, installments };
}

export const ForeclosureStatement: React.FC = () => {
  const { loans, showToast } = useApp();
  const [loanSearch, setLoanSearch] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [rebateType, setRebateType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [rebateValue, setRebateValue] = useState('');
  const [showAllInst, setShowAllInst] = useState(false);

  // Search loans
  const filteredLoans = useMemo(() => {
    const q = loanSearch.trim().toLowerCase();
    if (!q) return loans.slice(0, 30);
    return loans.filter((l) =>
      [l.customerName, l.customerId, l.id, l.codeNo || ''].join(' ').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [loans, loanSearch]);

  const selectedLoan = useMemo(() =>
    loans.find((l) => l.id === selectedLoanId) || null,
    [loans, selectedLoanId]
  );

  const rebateNum = parseFloat(rebateValue) || 0;

  const calc = useMemo(() => {
    if (!selectedLoan) return null;
    return calcForeclosure(selectedLoan, asOfDate, rebateType, rebateNum);
  }, [selectedLoan, asOfDate, rebateType, rebateNum]);

  const companyName = 'ASR GROUP';
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const exportPdf = () => {
    if (!selectedLoan || !calc) { showToast('Select a loan', 'Please select a loan first.', 'warning'); return; }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(112, 26, 53); doc.rect(0, 0, pw, 70, 'F');
    doc.setFillColor(197, 160, 89); doc.rect(0, 68, pw, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(255, 255, 255);
    doc.text(companyName, pw / 2, 26, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(238, 216, 161);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
    doc.text('FORECLOSURE STATEMENT', pw / 2, 64, { align: 'center' });

    // Sub-header
    doc.setFillColor(248, 246, 242); doc.rect(0, 70, pw, 44, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80, 60, 50);
    doc.text(`Customer: ${selectedLoan.customerName} (${selectedLoan.customerId})`, 36, 88);
    doc.text(`Loan ID: ${selectedLoan.id}${selectedLoan.codeNo ? ` · Code: ${selectedLoan.codeNo}` : ''}`, 36, 100);
    doc.text(`Foreclosure Date: ${fmtDate(asOfDate)} · Statement Issued: ${today}`, pw - 36, 88, { align: 'right' });
    doc.text(`Loan Start: ${fmtDate(selectedLoan.startDate || '')} · Frequency: ${selectedLoan.frequency || '—'}`, pw - 36, 100, { align: 'right' });

    // Summary box
    doc.setFillColor(255, 255, 255); doc.roundedRect(36, 124, pw - 72, 80, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(112, 26, 53);
    doc.text('FORECLOSURE SETTLEMENT SUMMARY', 44, 142);
    doc.setFontSize(8.5); doc.setTextColor(60, 50, 40); doc.setFont('helvetica', 'normal');

    const col1 = 44; const col2 = pw / 2; const lineH = 14;
    doc.text(`Total Installments: ${calc.totalInstallments}`, col1, 158);
    doc.text(`Paid Installments: ${calc.paidInstallments}`, col1, 158 + lineH);
    doc.text(`Foreclosing Installments: ${calc.unpaidInstallments}`, col1, 158 + 2 * lineH);
    doc.text(`Total Collected So Far: ${pdfMoney(calc.totalPaid)}`, col2, 158);
    doc.text(`Gross Outstanding: ${pdfMoney(calc.grossOutstanding)}`, col2, 158 + lineH);
    if (calc.rebateAmount > 0) doc.text(`Rebate Applied: (${pdfMoney(calc.rebateAmount)})`, col2, 158 + 2 * lineH);

    // Net settlement box
    doc.setFillColor(112, 26, 53); doc.roundedRect(36, 216, pw - 72, 38, 5, 5, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(`NET FORECLOSURE AMOUNT PAYABLE: ${pdfMoney(calc.netSettlement)}`, pw / 2, 239, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(238, 216, 161);
    doc.text(`Rupees ${numberToWordsINR(calc.netSettlement)} Only`, pw / 2, 250, { align: 'center' });

    // Installment table
    const foreclosingInsts = calc.installments.filter((i) => i.isForeclosing);
    autoTable(doc, {
      startY: 268,
      head: [['Inst. No', 'Due Date', 'Amount (₹)', 'Status']],
      body: foreclosingInsts.map((i) => [
        String(i.seqNo),
        fmtDate(i.dueDate),
        pdfMoney(i.amountDue),
        i.status,
      ]),
      foot: [['', 'GROSS OUTSTANDING', pdfMoney(calc.grossOutstanding), ''],
        calc.rebateAmount > 0 ? ['', 'Less: Rebate', `(${pdfMoney(calc.rebateAmount)})`, ''] : null,
        ['', 'NET SETTLEMENT AMOUNT', pdfMoney(calc.netSettlement), ''],
      ].filter(Boolean) as string[][],
      theme: 'striped',
      headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8.5, cellPadding: 5 },
      footStyles: { fillColor: [243, 239, 230], textColor: [112, 26, 53], fontSize: 9, fontStyle: 'bold' },
      columnStyles: { 2: { halign: 'right' } },
      margin: { left: 36, right: 36, bottom: 80 },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || 500;
    if (finalY + 90 < ph) {
      doc.setDrawColor(200, 180, 130); doc.setLineWidth(0.5);
      doc.line(36, finalY + 36, pw / 2 - 20, finalY + 36);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 60, 50);
      doc.text('Authorised Signatory', 36, finalY + 50);
      doc.text(companyName, 36, finalY + 62);
    }
    doc.setFontSize(7); doc.setTextColor(160, 140, 130);
    doc.text('This is a system-generated statement. Valid only on the foreclosure date mentioned above.', pw / 2, ph - 22, { align: 'center' });

    doc.save(`ASR_Foreclosure_${safeFileName(selectedLoan.id)}_${safeFileName(asOfDate)}.pdf`);
    showToast('Foreclosure Statement PDF', `${selectedLoan.customerName} — ₹${calc.netSettlement.toLocaleString('en-IN')} net settlement.`, 'success');
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-7">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">Tally — Foreclosure Statement</p>
            <div className="mt-1 flex items-center gap-3">
              <Calculator className="h-6 w-6 text-[#701A35]" />
              <h2 className="text-2xl font-bold tracking-tight text-[#24131B]">Foreclosure / Pre-closure Statement</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Calculate the net settlement amount for early loan closure. Select any loan, set the foreclosure date, apply a rebate, and generate a print-ready statement.
            </p>
          </div>

          {/* Loan Selector */}
          <div className="grid gap-4 border-t border-[#EEE8DE] pt-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Loan Search */}
            <div className="sm:col-span-2">
              <label className="block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-1.5">
                Select Loan *
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={selectedLoan ? `${selectedLoan.customerName} — ${selectedLoan.id}` : loanSearch}
                  onChange={(e) => { setLoanSearch(e.target.value); setSelectedLoanId(''); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by customer name, loan ID, code…"
                  className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-10 pr-8 text-xs outline-none focus:border-[#C5A059]"
                />
                {selectedLoan && (
                  <button type="button" onClick={() => { setSelectedLoanId(''); setLoanSearch(''); setShowDropdown(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    <X className="h-4 w-4" />
                  </button>
                )}
                {showDropdown && !selectedLoan && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                    {filteredLoans.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-slate-500">No loans found.</p>
                    ) : filteredLoans.map((l) => (
                      <button key={l.id} type="button"
                        onClick={() => { setSelectedLoanId(l.id); setLoanSearch(''); setShowDropdown(false); }}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#FBF4E9] border-b border-slate-50 last:border-0">
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-[#701A35]">{l.customerName}</span>
                          <span className="block text-[10px] text-slate-500">{l.id}{l.codeNo ? ` · ${l.codeNo}` : ''} · {l.place}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="block text-xs font-semibold text-slate-700">{formatINR(l.totalAmount)}</span>
                          <span className="block text-[10px] text-slate-400">{l.installments?.length || 0} inst.</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Foreclosure Date */}
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-1.5">
                Foreclosure Date *
              </label>
              <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-[#C5A059]" />
            </div>

            {/* Rebate */}
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-1.5">
                Rebate / Discount
              </label>
              <div className="flex gap-1.5">
                <div className="relative">
                  <select value={rebateType} onChange={(e) => setRebateType(e.target.value as any)}
                    className="appearance-none rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-3 pr-7 text-[11px] font-semibold text-slate-700 outline-none focus:border-[#C5A059]">
                    <option value="none">None</option>
                    <option value="percent">% Rate</option>
                    <option value="fixed">Fixed ₹</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                </div>
                {rebateType !== 'none' && (
                  <input type="number" min="0" value={rebateValue}
                    onChange={(e) => setRebateValue(e.target.value)}
                    placeholder={rebateType === 'percent' ? '% e.g. 5' : '₹ amount'}
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-[#FCFBF9] px-3 py-2.5 text-xs outline-none focus:border-[#C5A059]" />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      {selectedLoan && calc ? (
        <>
          {/* Settlement Summary */}
          <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
            <div className="border-b border-[#E7DFD2] bg-[#FCFBF9] px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Foreclosure Settlement — {selectedLoan.customerName}
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  As of {fmtDate(asOfDate)} · Loan {selectedLoan.id}
                  {selectedLoan.codeNo ? ` (${selectedLoan.codeNo})` : ''}
                </p>
              </div>
              <button type="button" onClick={exportPdf}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50">
                <FileText className="h-4 w-4" /> Generate PDF Statement
              </button>
            </div>

            {/* Grid layout like Tally P&L statement */}
            <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0 divide-[#E7DFD2]">
              {/* Left: Paid so far */}
              <div className="p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 mb-4">Paid So Far</p>
                <div className="space-y-3">
                  <FLine label="Total Installments" value={`${calc.totalInstallments}`} isText />
                  <FLine label="Paid Installments" value={`${calc.paidInstallments}`} isText />
                  <div className="border-t border-dashed border-slate-200 pt-2">
                    <FLine label="Amount Collected" value={formatINR(calc.totalPaid)} bold highlight="green" />
                  </div>
                </div>
              </div>

              {/* Right: Outstanding & Settlement */}
              <div className="p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A07A39] mb-4">Settlement Calculation</p>
                <div className="space-y-3">
                  <FLine label={`Foreclosing Installments (${calc.unpaidInstallments})`} value={formatINR(calc.grossOutstanding)} bold />
                  {calc.rebateAmount > 0 && (
                    <FLine label={`Less: Rebate (${rebateType === 'percent' ? `${rebateValue}%` : 'Fixed'})`} value={`(${formatINR(calc.rebateAmount)})`} sub />
                  )}
                  <div className="border-t-2 border-[#701A35] pt-3 mt-1">
                    <div className="rounded-2xl border-2 border-[#701A35] bg-[#701A35] px-4 py-3 text-white">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">Net Foreclosure Amount Payable</span>
                      <strong className="block text-2xl font-bold tabular-nums mt-1">{formatINR(calc.netSettlement)}</strong>
                      <span className="block text-[10px] opacity-80 mt-0.5">
                        {numberToWordsINR(calc.netSettlement)} Only
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Installments being foreclosed */}
          <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
            <div className="flex items-center justify-between border-b border-[#E7DFD2] bg-[#FCFBF9] px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Installment Register</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {calc.installments.filter((i) => i.isForeclosing).length} installments being foreclosed · {calc.paidInstallments} already paid
                </p>
              </div>
              <button type="button" onClick={() => setShowAllInst((v) => !v)}
                className="text-[11px] font-bold text-[#701A35] hover:underline">
                {showAllInst ? 'Show foreclosing only' : 'Show all installments'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    <th className="w-12 px-4 py-3">Inst.</th>
                    <th className="w-[30%] px-4 py-3">Due Date</th>
                    <th className="w-[30%] px-4 py-3 text-right">Amount</th>
                    <th className="w-[35%] px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(showAllInst ? calc.installments : calc.installments.filter((i) => i.isForeclosing))
                    .map((inst) => (
                      <tr key={inst.seqNo}
                        className={`transition-colors ${inst.isForeclosing ? 'hover:bg-amber-50/40 bg-amber-50/20' : 'hover:bg-[#FCFAF7] opacity-50'}`}>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{inst.seqNo}</td>
                        <td className="px-4 py-3 text-[11px] font-semibold text-slate-700">{inst.dueDate ? inst.dueDate : '—'}</td>
                        <td className={`px-4 py-3 text-right font-bold ${inst.isForeclosing ? 'text-[#701A35]' : 'text-emerald-700'}`}>
                          {formatINR(inst.amountDue)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                            inst.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : inst.status.includes('Unpaid')
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>{inst.status}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-[#F8F6F2] font-bold">
                    <td colSpan={2} className="px-4 py-3 text-xs text-slate-700">
                      {calc.unpaidInstallments} foreclosing installments
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[#701A35]">{formatINR(calc.grossOutstanding)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">Gross outstanding</td>
                  </tr>
                  {calc.rebateAmount > 0 && (
                    <tr className="bg-emerald-50/40 font-semibold text-xs">
                      <td colSpan={2} className="px-4 py-2.5 text-emerald-700">Less: Rebate</td>
                      <td className="px-4 py-2.5 text-right text-emerald-700">({formatINR(calc.rebateAmount)})</td>
                      <td></td>
                    </tr>
                  )}
                  <tr className="bg-[#701A35] text-white font-bold text-xs">
                    <td colSpan={2} className="px-4 py-3">NET FORECLOSURE AMOUNT</td>
                    <td className="px-4 py-3 text-right">{formatINR(calc.netSettlement)}</td>
                    <td className="px-4 py-3 text-[10px] opacity-80">{numberToWordsINR(calc.netSettlement)} Only</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-[#DDD4C0] bg-[#FDFCFA]">
          <div className="text-center">
            <Calculator className="mx-auto h-10 w-10 text-[#C5A059] opacity-50" />
            <p className="mt-3 text-sm font-semibold text-slate-500">Select a loan above to calculate foreclosure</p>
            <p className="mt-1 text-[11px] text-slate-400">Choose a customer and set a foreclosure date to see the settlement amount</p>
          </div>
        </section>
      )}
    </div>
  );
};

function FLine({ label, value, bold, sub, highlight, isText }: {
  label: string; value: string; bold?: boolean; sub?: boolean; highlight?: 'green'; isText?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 ${sub ? 'pl-3 opacity-80' : ''}`}>
      <span className={`text-[11px] ${bold ? 'font-bold text-slate-700' : 'font-medium text-slate-500'}`}>
        {sub && '↳ '}{label}
      </span>
      <span className={`text-[12px] tabular-nums ${bold
        ? highlight === 'green' ? 'font-bold text-emerald-700' : 'font-bold text-slate-800'
        : 'font-semibold text-slate-700'
      }`}>
        {value}
      </span>
    </div>
  );
}
