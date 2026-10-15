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
import { Loan } from '@/lib/types';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { CustomSelect } from '@/components/ui/CustomSelect';

// Statuses that indicate instrument was returned/bounced
const BOUNCE_STATUSES = new Set(['RET', 'RET NEFT', 'RET PASS', 'BOUNCE', 'RETURNED']);
// Statuses that indicate subsequent recovery
const RECOVERED_STATUSES = new Set(['PASS', 'NEFT', 'CASH', 'CLS', 'PAID']);

const isBounced = (s: string) => BOUNCE_STATUSES.has(String(s || '').trim().toUpperCase());
const isRecovered = (s: string) => RECOVERED_STATUSES.has(String(s || '').trim().toUpperCase());

const dateKey = (v: string) => String(v || '').slice(0, 10);
const fmtDate = (v: string) => {
  if (!v) return '—';
  const d = new Date(`${dateKey(v)}T00:00:00`);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const safeFileName = (v: string) =>
  v.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'report';
const pdfMoney = (v: number) => `INR ${Number(v || 0).toLocaleString('en-IN')}`;

type BounceType = 'RET NEFT' | 'RET PASS' | 'RET' | string;
type RecoveryStatus = 'Pending' | 'Recovered' | 'Partially Recovered';

interface BounceEntry {
  sNo: number;
  customerId: string;
  customerName: string;
  place: string;
  loanId: string;
  codeNo: string;
  seqNo: number;
  dueDate: string;
  bounceDate: string;    // recdDate of the returned installment
  bounceType: BounceType;
  reference: string;     // chqNo
  depositAccount: string;
  amount: number;
  // Recovery tracking: find next installment of same loan at same seqNo (if any) that is PAID
  recoveryStatus: RecoveryStatus;
  recoveryDate: string;
  recoveryRef: string;
  remarks: string;
}

function buildBounceEntries(loans: Loan[]): BounceEntry[] {
  const entries: BounceEntry[] = [];

  for (const loan of loans) {
    const insts = loan.installments || [];

    // Build a map of all other installments for quick lookup
    const allInstsBySeq = new Map<number, typeof insts[0][]>();
    for (const inst of insts) {
      const seq = Number(inst.seqNo || 0);
      if (!allInstsBySeq.has(seq)) allInstsBySeq.set(seq, []);
      allInstsBySeq.get(seq)!.push(inst);
    }

    for (const inst of insts) {
      if (!isBounced(inst.status)) continue;

      const amount = Number(inst.amountDue || 0);
      const seqNo = Number(inst.seqNo || 0);

      // Check if same loan has any subsequent PAID installment at same seq
      // Tally logic: if a bounced cheque was re-presented and succeeded,
      // there may be a separate entry or the status may have been re-updated.
      // Here we look at the loan's other installments for a matching seq with paid status.
      const sameSeqInsts = (allInstsBySeq.get(seqNo) || []).filter(
        (i) => i.id !== inst.id && isRecovered(i.status)
      );

      let recoveryStatus: RecoveryStatus = 'Pending';
      let recoveryDate = '';
      let recoveryRef = '';

      if (sameSeqInsts.length > 0) {
        recoveryStatus = 'Recovered';
        const recInst = sameSeqInsts[0];
        recoveryDate = recInst.recdDate || '';
        recoveryRef = recInst.chqNo || '';
      }

      entries.push({
        sNo: 0,
        customerId: loan.customerId,
        customerName: loan.customerName,
        place: inst.place || loan.place || '',
        loanId: loan.id,
        codeNo: loan.codeNo || '',
        seqNo,
        dueDate: inst.dueDate || '',
        bounceDate: inst.recdDate || '',
        bounceType: String(inst.status || 'RET').trim().toUpperCase(),
        reference: inst.chqNo || '',
        depositAccount: inst.depName || '',
        amount,
        recoveryStatus,
        recoveryDate,
        recoveryRef,
        remarks: inst.remarks || '',
      });
    }
  }

  entries.sort((a, b) => {
    const d = dateKey(b.bounceDate).localeCompare(dateKey(a.bounceDate));
    if (d !== 0) return d;
    return a.customerName.localeCompare(b.customerName);
  });

  return entries.map((e, i) => ({ ...e, sNo: i + 1 }));
}

const BOUNCE_TYPE_BADGE: Record<string, string> = {
  'RET NEFT': 'bg-blue-50 text-blue-800 border-blue-200',
  'RET PASS': 'bg-violet-50 text-violet-800 border-violet-200',
  'RET': 'bg-red-50 text-red-800 border-red-200',
};
const bounceBadge = (t: string) => BOUNCE_TYPE_BADGE[t] || 'bg-slate-50 text-slate-700 border-slate-200';

export const BounceReturnRegister: React.FC = () => {
  const { loans, isLoading, showToast, systemSettings } = useApp();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Recovered'>('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const allEntries = useMemo(() => buildBounceEntries(loans), [loans]);

  const allTypes = useMemo(() =>
    Array.from(new Set(allEntries.map((e) => e.bounceType))).sort(),
    [allEntries]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntries.filter((e) => {
      if (statusFilter !== 'All' && e.recoveryStatus !== statusFilter) return false;
      if (typeFilter !== 'All' && e.bounceType !== typeFilter) return false;
      const bd = dateKey(e.bounceDate);
      if (fromDate && bd && bd < fromDate) return false;
      if (toDate && bd && bd > toDate) return false;
      if (q && ![e.customerName, e.customerId, e.loanId, e.reference, e.depositAccount, e.codeNo].join(' ').toLowerCase().includes(q)) return false;
      return true;
    }).map((e, i) => ({ ...e, sNo: i + 1 }));
  }, [allEntries, statusFilter, typeFilter, fromDate, toDate, query]);

  const summary = useMemo(() => {
    const total = filtered.reduce((s, e) => s + e.amount, 0);
    const pending = filtered.filter((e) => e.recoveryStatus === 'Pending').reduce((s, e) => s + e.amount, 0);
    const recovered = filtered.filter((e) => e.recoveryStatus === 'Recovered').reduce((s, e) => s + e.amount, 0);
    const pendingCount = filtered.filter((e) => e.recoveryStatus === 'Pending').length;
    const recoveredCount = filtered.filter((e) => e.recoveryStatus === 'Recovered').length;
    const recoveryRate = total > 0 ? (recovered / total) * 100 : 0;
    return { total, pending, recovered, pendingCount, recoveredCount, recoveryRate };
  }, [filtered]);

  const hasFilters = query || statusFilter !== 'All' || typeFilter !== 'All' || fromDate || toDate;
  const clearFilters = () => { setQuery(''); setStatusFilter('All'); setTypeFilter('All'); setFromDate(''); setToDate(''); };

  const exportPdf = () => {
    if (!filtered.length) { showToast('Nothing to export', 'No bounce entries match filters.', 'warning'); return; }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const companyName = APP_BRAND;
    doc.setFillColor(112, 26, 53); doc.rect(0, 0, pw, 58, 'F');
    doc.setFillColor(197, 160, 89); doc.rect(0, 56, pw, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
    doc.text(`${companyName.toUpperCase()} · BOUNCE & RETURN REGISTER`, 32, 28);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(238, 216, 161);
    doc.text(`${filtered.length} entries · Pending: ${pdfMoney(summary.pending)} · Recovered: ${pdfMoney(summary.recovered)}`, 32, 44);

    autoTable(doc, {
      startY: 82,
      head: [['S.No', 'Customer', 'Loan / Code', 'Inst.', 'Due Date', 'Bounce Date', 'Type', 'Reference', 'Deposit A/c', 'Amount', 'Recovery']],
      body: filtered.map((e) => [
        String(e.sNo),
        `${e.customerName}\n${e.customerId}`,
        `${e.loanId}${e.codeNo ? ` (${e.codeNo})` : ''}`,
        String(e.seqNo),
        fmtDate(e.dueDate),
        e.bounceDate ? fmtDate(e.bounceDate) : '—',
        e.bounceType,
        e.reference || '—',
        e.depositAccount || '—',
        pdfMoney(e.amount),
        e.recoveryStatus === 'Recovered' ? `Recovered ${e.recoveryDate ? fmtDate(e.recoveryDate) : ''}` : 'PENDING',
      ]),
      foot: [['', `TOTAL · ${filtered.length} bounces`, '', '', '', '', '', '', '', pdfMoney(summary.total), `${summary.recoveryRate.toFixed(1)}% recovered`]],
      theme: 'striped',
      headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, cellPadding: 3.5 },
      footStyles: { fillColor: [243, 239, 230], textColor: [112, 26, 53], fontSize: 8, fontStyle: 'bold' },
      columnStyles: { 9: { halign: 'right' } },
      margin: { left: 28, right: 28, bottom: 34 },
      didDrawPage: (d) => {
        doc.setFontSize(8); doc.setTextColor(130, 130, 130);
        doc.text(`${companyName} · Bounce Register · Page ${d.pageNumber} · Confidential`, pw / 2, ph - 16, { align: 'center' });
      },
    });

    doc.save(`ASR_BounceRegister_${safeFileName(new Date().toISOString().slice(0, 10))}.pdf`);
    showToast('Bounce Register PDF', `${filtered.length} entries exported.`, 'success');
  };

  const exportExcel = () => {
    if (!filtered.length) { showToast('Nothing to export', 'No bounce entries match filters.', 'warning'); return; }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filtered.map((e) => ({
      'S.No': e.sNo,
      'Customer ID': e.customerId,
      'Customer Name': e.customerName,
      'Place': e.place || '—',
      'Loan ID': e.loanId,
      'Code No': e.codeNo || '—',
      'Inst. No': e.seqNo,
      'Due Date': fmtDate(e.dueDate),
      'Bounce Date': e.bounceDate ? fmtDate(e.bounceDate) : '—',
      'Bounce Type': e.bounceType,
      'Reference / Cheque No': e.reference || '—',
      'Deposit Account': e.depositAccount || '—',
      'Amount': e.amount,
      'Recovery Status': e.recoveryStatus,
      'Recovery Date': e.recoveryDate ? fmtDate(e.recoveryDate) : '—',
      'Recovery Reference': e.recoveryRef || '—',
      'Remarks': e.remarks || '—',
    }))), 'Bounce Register');

    // Summary sheet
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { 'Metric': 'Total Bounced Instruments', 'Count': filtered.length, 'Amount': summary.total },
      { 'Metric': 'Recovered', 'Count': summary.recoveredCount, 'Amount': summary.recovered },
      { 'Metric': 'Pending Recovery', 'Count': summary.pendingCount, 'Amount': summary.pending },
      { 'Metric': 'Recovery Rate (%)', 'Count': '', 'Amount': summary.recoveryRate.toFixed(2) },
    ]), 'Summary');

    XLSX.writeFile(wb, `ASR_BounceRegister_${safeFileName(new Date().toISOString().slice(0, 10))}.xlsx`);
    showToast('Bounce Register Excel', `${filtered.length} entries + summary sheet exported.`, 'success');
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-7">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">Tally — Bounce & Return Register</p>
            <div className="mt-1 flex items-center gap-3">
              <AlertOctagon className="h-6 w-6 text-[#701A35]" />
              <h2 className="text-2xl font-bold tracking-tight text-[#24131B]">Bounce & Return Register</h2>
              <span className="rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-bold text-red-700">
                {allEntries.length} total
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              All returned / bounced instruments (RET, RET NEFT, RET PASS) with recovery tracking and pending follow-up.
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-2 border-t border-[#EEE8DE] pt-4 sm:grid-cols-4">
            <SumCard label="Total Bounced" value={formatINR(summary.total)} sub={`${filtered.length} instruments`} tone="red" />
            <SumCard label="Pending Recovery" value={formatINR(summary.pending)} sub={`${summary.pendingCount} pending`} tone="orange" />
            <SumCard label="Recovered" value={formatINR(summary.recovered)} sub={`${summary.recoveredCount} cleared`} tone="green" />
            <div className="rounded-2xl border border-violet-200 bg-violet-50/50 px-3.5 py-3">
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-violet-700 opacity-70">Recovery Rate</span>
              <strong className="mt-1.5 block text-xl font-bold text-slate-900">{summary.recoveryRate.toFixed(1)}%</strong>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-white overflow-hidden border border-violet-100">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(summary.recoveryRate, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-2 border-t border-[#EEE8DE] pt-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Customer, loan, reference…"
                className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-10 pr-3 text-xs outline-none focus:border-[#C5A059]" />
            </div>
            {/* Status filter */}
            {(['All', 'Pending', 'Recovered'] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatusFilter(s)}
                className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${statusFilter === s ? 'bg-[#701A35] text-white border-[#701A35]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#C5A059]'}`}>
                {s}
              </button>
            ))}
            {/* Type filter */}
            <CustomSelect value={typeFilter} onChange={setTypeFilter} options={[{ value: 'All', label: 'All Types' }, ...allTypes.map((type) => ({ value: type, label: type }))]} buttonClassName="rounded-xl border-slate-200 bg-[#FCFBF9] px-3 py-2.5 text-xs text-slate-700" menuClassName="min-w-full" size="md" />
            <DateRangePicker
              label="Bounce Date Range"
              value={{ startDate: fromDate || null, endDate: toDate || null, presetLabel: 'custom' }}
              onChange={(range) => {
                setFromDate(range.startDate || '');
                setToDate(range.endDate || '');
              }}
            />
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#701A35] hover:underline self-end pb-0.5">
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
            <div className="flex gap-2 ml-auto self-end">
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
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
        <div className="border-b border-[#E7DFD2] bg-[#FCFBF9] px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <AlertOctagon className="h-4 w-4 text-red-600" /> Bounced / Returned Instruments
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            {isLoading ? 'Loading…' : `${filtered.length} instrument${filtered.length === 1 ? '' : 's'} · ${formatINR(summary.pending)} pending recovery`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                <th className="w-10 px-3 py-3">S.No</th>
                <th className="w-[18%] px-3 py-3">Customer</th>
                <th className="w-[14%] px-3 py-3">Loan / Code</th>
                <th className="w-8 px-3 py-3 text-center">Inst.</th>
                <th className="w-[10%] px-3 py-3">Due Date</th>
                <th className="w-[10%] px-3 py-3">Bounce Date</th>
                <th className="w-[8%] px-3 py-3">Type</th>
                <th className="w-[10%] px-3 py-3">Reference</th>
                <th className="w-[10%] px-3 py-3 text-right">Amount</th>
                <th className="w-[12%] px-3 py-3">Recovery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-16 text-center text-sm text-slate-500">
                  {isLoading ? 'Loading…' : allEntries.length === 0 ? 'No bounced instruments found in the system.' : 'No entries match the current filters.'}
                </td></tr>
              ) : filtered.map((e) => (
                <tr key={`${e.loanId}-${e.seqNo}-${e.bounceType}`}
                  className={`transition-colors hover:bg-[#FCFAF7] ${e.recoveryStatus === 'Pending' ? 'bg-red-50/30' : ''}`}>
                  <td className="px-3 py-3 font-mono text-[10px] text-slate-400">{e.sNo}</td>
                  <td className="px-3 py-3">
                    <span className="block truncate text-xs font-bold text-[#701A35]">{e.customerName}</span>
                    <span className="text-[9px] text-slate-400">{e.customerId} · {e.place}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="block font-mono text-[10px] text-slate-700">{e.loanId}</span>
                    {e.codeNo && <span className="text-[9px] text-slate-400">{e.codeNo}</span>}
                  </td>
                  <td className="px-3 py-3 text-center text-[11px] text-slate-600">{e.seqNo}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-600">{fmtDate(e.dueDate)}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-600">{e.bounceDate ? fmtDate(e.bounceDate) : '—'}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${bounceBadge(e.bounceType)}`}>
                      {e.bounceType}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[11px] text-slate-600 truncate">{e.reference || '—'}</td>
                  <td className="px-3 py-3 text-right font-bold text-red-700">{formatINR(e.amount)}</td>
                  <td className="px-3 py-3">
                    {e.recoveryStatus === 'Recovered' ? (
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Recovered
                        </span>
                        {e.recoveryDate && <span className="mt-0.5 block text-[9px] text-slate-400">{fmtDate(e.recoveryDate)}</span>}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                        <Clock className="h-3 w-3" /> Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-[#F8F6F2] font-bold text-slate-800">
                  <td></td>
                  <td colSpan={7} className="px-3 py-3 text-xs">TOTAL · {filtered.length} instruments · {summary.recoveryRate.toFixed(1)}% recovery rate</td>
                  <td className="px-3 py-3 text-right text-xs text-red-700">{formatINR(summary.total)}</td>
                  <td className="px-3 py-3 text-xs text-amber-700">₹{formatINR(summary.pending)} pending</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
};

function SumCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'red' | 'orange' | 'green' }) {
  const tones = {
    red: 'border-red-200 bg-red-50/50',
    orange: 'border-amber-200 bg-amber-50/50',
    green: 'border-emerald-200 bg-emerald-50/50',
  };
  return (
    <div className={`rounded-2xl border px-3.5 py-3 ${tones[tone]}`}>
      <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <strong className="mt-1.5 block truncate text-base font-bold text-slate-900 tabular-nums">{value}</strong>
      <span className="text-[9px] text-slate-400">{sub}</span>
    </div>
  );
}
