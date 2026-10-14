'use client';

import React, { useMemo, useState } from 'react';
import { TrendingDown, FileText, FileSpreadsheet, Search, X, Building2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useApp } from '@/lib/store';
import { APP_BRAND } from '@/lib/branding';
import { formatINR } from '@/lib/utils/formatCurrency';
import { dateKey } from './CollectionsView';
import type { DateRange, Period } from './CollectionsView';

const fmtDate = (v: string) => {
  const d = new Date(`${dateKey(v)}T00:00:00`);
  return isNaN(d.getTime()) ? (v || '—') : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const pdfMoney = (v: number) => `INR ${Number(v || 0).toLocaleString('en-IN')}`;
const safeFile = (v: string) => v.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase() || 'expense';

interface ExpenseRow {
  sNo: number;
  disbursedDate: string; // startDate used as disbursement date
  loanId: string;
  codeNo: string;
  customerId: string;
  customerName: string;
  place: string;
  frequency: string;
  totalAmount: number;
  disbursedAmount: number;  // loan.disbursedAmount or totalAmount - interestAmount
  interestAmount: number;
  installmentCount: number;
  status: string;
  companies: { name: string; amount: number }[];
  primaryCompany: string;
}

const STATUS_COLORS: Record<string, string> = {
  Active:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  Overdue: 'bg-red-50 text-red-700 border-red-200',
  Closed:  'bg-slate-100 text-slate-600 border-slate-200',
  Draft:   'bg-amber-50 text-amber-700 border-amber-200',
};
const statusColor = (s: string) => STATUS_COLORS[s] || 'bg-slate-50 text-slate-600 border-slate-200';

export const ExpenseRegister: React.FC<{ dateRange: DateRange; period: Period; periodLabel: string }> = ({
  dateRange, periodLabel,
}) => {
  const { loans, companies, isLoading, showToast, systemSettings } = useApp();
  const [query, setQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('All');

  // Build company name map
  const companyMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companies) m.set(c.id, c.name || c.id);
    return m;
  }, [companies]);

  const rows = useMemo((): ExpenseRow[] => {
    const { from, to } = dateRange;
    const result: ExpenseRow[] = [];

    const isAllTime = !from && !to;

    for (const loan of loans) {
      const startDate = dateKey(loan.startDate || '');
      if (!isAllTime && (!startDate || startDate < from || startDate > to)) continue;

      const totalAmount = Number(loan.totalAmount || 0);
      const interestAmount = Number(loan.interestAmount || 0);
      const disbursedAmount = loan.disbursedAmount != null
        ? Number(loan.disbursedAmount)
        : Math.max(0, totalAmount - interestAmount);

      // Company splits
      const compCells: { name: string; amount: number }[] = [];
      const splits = (loan as any).splits || [];
      for (const sp of splits) {
        const cName = companyMap.get(sp.companyId) || sp.companyId || 'Unknown';
        compCells.push({ name: cName, amount: Number(sp.splitAmount || 0) });
      }
      if (compCells.length === 0 && disbursedAmount > 0) {
        compCells.push({ name: 'Own Funds', amount: disbursedAmount });
      }

      const primaryCompany = compCells.length > 0
        ? compCells.reduce((a, b) => (a.amount >= b.amount ? a : b)).name
        : 'Own Funds';

      result.push({
        sNo: 0,
        disbursedDate: loan.startDate || '',
        loanId: loan.id,
        codeNo: loan.codeNo || '',
        customerId: loan.customerId,
        customerName: loan.customerName,
        place: loan.place || '',
        frequency: String(loan.frequency || 'Monthly'),
        totalAmount,
        disbursedAmount,
        interestAmount,
        installmentCount: (loan.installments || []).length,
        status: String(loan.status || 'Active'),
        companies: compCells,
        primaryCompany,
      });
    }

    result.sort((a, b) => a.disbursedDate.localeCompare(b.disbursedDate));
    return result.map((r, i) => ({ ...r, sNo: i + 1 }));
  }, [loans, companies, companyMap, dateRange]);

  const allCompanies = useMemo(() =>
    Array.from(new Set(rows.map((r) => r.primaryCompany))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (companyFilter !== 'All' && r.primaryCompany !== companyFilter) return false;
      if (q && ![r.customerName, r.customerId, r.loanId, r.codeNo, r.place].join(' ').toLowerCase().includes(q)) return false;
      return true;
    }).map((r, i) => ({ ...r, sNo: i + 1 }));
  }, [rows, companyFilter, query]);

  const totals = useMemo(() => ({
    disbursed: filtered.reduce((s, r) => s + r.disbursedAmount, 0),
    total: filtered.reduce((s, r) => s + r.totalAmount, 0),
    interest: filtered.reduce((s, r) => s + r.interestAmount, 0),
  }), [filtered]);

  // Company-wise disbursement summary
  const companySummary = useMemo(() => {
    const map: Record<string, { loans: number; amount: number }> = {};
    for (const r of rows) {
      for (const c of r.companies) {
        if (!map[c.name]) map[c.name] = { loans: 0, amount: 0 };
        map[c.name].loans++;
        map[c.name].amount += c.amount;
      }
    }
    return Object.entries(map).sort(([, a], [, b]) => b.amount - a.amount);
  }, [rows]);

    const companyName = APP_BRAND;

  const exportPdf = () => {
    if (!filtered.length) { showToast('Nothing to export', '', 'warning'); return; }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth(); const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(37, 99, 235); doc.rect(0, 0, pw, 58, 'F');
    doc.setFillColor(147, 197, 253); doc.rect(0, 56, pw, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(255, 255, 255);
    doc.text(`${companyName.toUpperCase()} · EXPENSE REGISTER (DEBIT SIDE)`, 32, 28);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(191, 219, 254);
    doc.text(`${periodLabel} · ${filtered.length} loans disbursed · Total Debit: ${pdfMoney(totals.disbursed)}`, 32, 44);
    autoTable(doc, {
      startY: 78,
      head: [['S.No', 'Disbursed Date', 'Customer', 'Loan / Code', 'Place', 'Frequency', 'Disbursed (₹)', 'Interest (₹)', 'Total (₹)', 'Status', 'Company']],
      body: filtered.map((r) => [
        String(r.sNo), fmtDate(r.disbursedDate), `${r.customerName}\n${r.customerId}`,
        `${r.loanId}${r.codeNo ? ` (${r.codeNo})` : ''}`, r.place || '—', r.frequency,
        pdfMoney(r.disbursedAmount), r.interestAmount > 0 ? pdfMoney(r.interestAmount) : '—',
        pdfMoney(r.totalAmount), r.status, r.primaryCompany,
      ]),
      foot: [['', '', `TOTAL · ${filtered.length} loans`, '', '', '', pdfMoney(totals.disbursed), pdfMoney(totals.interest), pdfMoney(totals.total), '', '']],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, cellPadding: 3.5 },
      footStyles: { fillColor: [239, 246, 255], textColor: [37, 99, 235], fontSize: 8.5, fontStyle: 'bold' },
      columnStyles: { 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' } },
      margin: { left: 26, right: 26, bottom: 34 },
      didDrawPage: (d) => {
        doc.setFontSize(8); doc.setTextColor(130, 130, 130);
        doc.text(`${companyName} · Expense Register · Page ${d.pageNumber}`, pw / 2, ph - 14, { align: 'center' });
      },
    });
    doc.save(`ASR_ExpenseRegister_${safeFile(periodLabel)}.pdf`);
    showToast('Expense Register PDF', `${filtered.length} loans exported.`, 'success');
  };

  const exportExcel = () => {
    if (!filtered.length) { showToast('Nothing to export', '', 'warning'); return; }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filtered.map((r) => ({
      'S.No': r.sNo, 'Disbursed Date': fmtDate(r.disbursedDate),
      'Customer ID': r.customerId, 'Customer Name': r.customerName, 'Place': r.place || '—',
      'Loan ID': r.loanId, 'Code No': r.codeNo || '—', 'Frequency': r.frequency,
      'Disbursed Amount (Dr)': r.disbursedAmount, 'Interest Amount': r.interestAmount,
      'Total Loan Amount': r.totalAmount, 'Installments': r.installmentCount,
      'Status': r.status, 'Primary Company': r.primaryCompany,
    }))), 'Expense Register');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      companySummary.map(([name, d]) => ({ Company: name, 'Loans Involving': d.loans, 'Amount Disbursed': d.amount }))
    ), 'Company Summary');
    XLSX.writeFile(wb, `ASR_ExpenseRegister_${safeFile(periodLabel)}.xlsx`);
    showToast('Expense Register Excel', `${filtered.length} loans + company summary exported.`, 'success');
  };

  return (
    <div className="space-y-4">
      {/* Company summary cards */}
      {companySummary.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {companySummary.map(([name, d]) => (
            <button key={name} type="button"
              onClick={() => setCompanyFilter(companyFilter === name ? 'All' : name)}
              className={`rounded-2xl border-2 px-4 py-3.5 text-left transition ${companyFilter === name ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200 ring-offset-1' : 'border-slate-200 bg-white hover:border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="block truncate text-[11px] font-bold text-slate-700">{name}</span>
              </div>
              <strong className="block text-base font-bold tabular-nums text-blue-700">{formatINR(d.amount)}</strong>
              <span className="text-[10px] text-slate-500">{d.loans} loan{d.loans !== 1 ? 's' : ''} involving</span>
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-4 shadow-[0_8px_24px_rgba(58,34,22,0.04)]">
        <div className="flex flex-wrap items-center gap-3">
          {allCompanies.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <button type="button" onClick={() => setCompanyFilter('All')}
                className={`rounded-xl border px-3 py-2 text-[11px] font-bold transition ${companyFilter === 'All' ? 'bg-[#701A35] text-white border-[#701A35]' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                All Companies ({rows.length})
              </button>
            </div>
          )}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer, loan, code, place…"
              className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-10 pr-3 text-xs outline-none focus:border-[#C5A059]" />
          </div>
          {(query || companyFilter !== 'All') && (
            <button type="button" onClick={() => { setQuery(''); setCompanyFilter('All'); }}
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
        <div className="mt-3 border-t border-[#EEE8DE] pt-2 flex flex-wrap gap-4 text-xs">
          <span className="text-slate-500">{filtered.length} loans disbursed</span>
          <span className="font-bold text-blue-700">Total Debit (Disbursed): {formatINR(totals.disbursed)}</span>
          {totals.interest > 0 && <span className="font-semibold text-slate-600">Interest Booked: {formatINR(totals.interest)}</span>}
          <span className="font-semibold text-slate-600">Total Portfolio: {formatINR(totals.total)}</span>
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_8px_24px_rgba(58,34,22,0.04)]">
        <div className="border-b border-[#E7DFD2] bg-blue-50/60 px-5 py-4 flex items-center gap-3">
          <TrendingDown className="h-5 w-5 text-blue-700" />
          <div>
            <h2 className="text-sm font-bold text-blue-900">Expense Register — Debit Side</h2>
            <p className="mt-0.5 text-[11px] text-blue-700">{periodLabel} · {formatINR(totals.disbursed)} total disbursed</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                <th className="w-10 px-3 py-3">S.No</th>
                <th className="w-[11%] px-3 py-3">Date</th>
                <th className="w-[17%] px-3 py-3">Customer</th>
                <th className="w-[13%] px-3 py-3">Loan / Code</th>
                <th className="w-[8%] px-3 py-3">Place</th>
                <th className="w-[8%] px-3 py-3">Freq.</th>
                <th className="w-[11%] px-3 py-3 text-right text-blue-600">Debit (Disb.)</th>
                <th className="w-[10%] px-3 py-3 text-right">Interest</th>
                <th className="w-[10%] px-3 py-3 text-right">Total</th>
                <th className="w-[7%] px-3 py-3">Status</th>
                <th className="w-[12%] px-3 py-3">Company</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-6 py-16 text-center text-sm text-slate-500">
                  {isLoading ? 'Loading…' : `No loans disbursed in ${periodLabel}.`}
                </td></tr>
              ) : filtered.map((r) => (
                <tr key={r.loanId} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-3 py-3 font-mono text-[10px] text-slate-400">{r.sNo}</td>
                  <td className="px-3 py-3 text-[11px] font-medium text-slate-700">{fmtDate(r.disbursedDate)}</td>
                  <td className="px-3 py-3">
                    <span className="block truncate font-bold text-[#701A35]">{r.customerName}</span>
                    <span className="text-[9px] text-slate-400">{r.customerId} · {r.place}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="block font-mono text-[10px] text-slate-700 truncate">{r.loanId}</span>
                    {r.codeNo && <span className="text-[9px] text-slate-400">{r.codeNo}</span>}
                  </td>
                  <td className="px-3 py-3 text-[11px] text-slate-600 truncate">{r.place || '—'}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-600">{r.frequency}</td>
                  <td className="px-3 py-3 text-right font-bold text-blue-700">{formatINR(r.disbursedAmount)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-700">
                    {r.interestAmount > 0 ? formatINR(r.interestAmount) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-700">{formatINR(r.totalAmount)}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${statusColor(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-0.5">
                      {r.companies.slice(0, 2).map((c, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <Building2 className="h-2.5 w-2.5 flex-shrink-0 text-blue-400" />
                          <span className="truncate text-[9px] text-slate-600">{c.name}</span>
                        </div>
                      ))}
                      {r.companies.length > 2 && (
                        <span className="text-[9px] text-slate-400">+{r.companies.length - 2} more</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-[#F8F6F2] font-bold text-slate-800">
                  <td colSpan={6} className="px-3 py-3 text-xs">TOTAL · {filtered.length} loans</td>
                  <td className="px-3 py-3 text-right text-xs text-blue-700">{formatINR(totals.disbursed)}</td>
                  <td className="px-3 py-3 text-right text-xs">{formatINR(totals.interest)}</td>
                  <td className="px-3 py-3 text-right text-xs">{formatINR(totals.total)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
};
