'use client';

import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  Download,
  FileBarChart,
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
import { Customer, Installment, Loan } from '@/lib/types';
import { formatINR } from '@/lib/utils/formatCurrency';

interface LedgerRow {
  id: string;
  customerId: string;
  customerName: string;
  dueDate: string;
  receivedDate: string;
  date: string;
  loanId: string;
  codeNo: string;
  sequence: number;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: string;
  reference: string;
  depositName: string;
  remarks: string;
}

interface CustomerReport {
  id: string;
  name: string;
  phone: string;
  place: string;
  principal: number;
  collected: number;
  balance: number;
  loanCount: number;
  transactions: LedgerRow[];
  status: string;
}

interface LedgerEntry extends LedgerRow {
  runningBalance: number;
}

const PAID_STATUSES = new Set(['PASS', 'NEFT', 'CASH', 'CLS', 'PAID']);
const isPaid = (status: string) => PAID_STATUSES.has(String(status || '').trim().toUpperCase());
const dateKey = (value: string) => String(value || '').slice(0, 10);
const formatDate = (value: string) => {
  if (!value) return '—';
  const date = new Date(`${dateKey(value)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatMonth = (value: string) => {
  const date = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};
const pdfMoney = (value: number) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;
const safeFileName = (value: string) => value.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'report';

function buildLedgerRows(loans: Loan[]): LedgerRow[] {
  return loans.flatMap((loan) => {
    const installments = loan.installments || [];
    if (!installments.length) return [{ id: loan.id, customerId: loan.customerId, customerName: loan.customerName, dueDate: loan.startDate || '', receivedDate: '', date: loan.startDate || loan.createdAt || '', loanId: loan.id, codeNo: loan.codeNo || '', sequence: 1, amountDue: Number(loan.totalAmount || 0), amountPaid: 0, balance: Number(loan.totalAmount || 0), status: String(loan.status || 'Scheduled'), reference: '', depositName: '', remarks: 'Loan has no installment schedule.' }];
    return installments.map((installment: Installment, index) => {
      const amountDue = Number(installment.amountDue || 0);
      const amountPaid = isPaid(installment.status) ? amountDue : 0;
      return { id: installment.id || `${loan.id}-${index + 1}`, customerId: loan.customerId, customerName: loan.customerName, dueDate: installment.dueDate || '', receivedDate: installment.recdDate || '', date: installment.recdDate || installment.dueDate || loan.startDate || '', loanId: loan.id, codeNo: loan.codeNo || '', sequence: Number(installment.seqNo || index + 1), amountDue, amountPaid, balance: Math.max(0, amountDue - amountPaid), status: String(installment.status || 'PENDING'), reference: installment.chqNo || '', depositName: installment.depName || '', remarks: installment.remarks || '' };
    });
  });
}

function makeCustomerReports(rows: LedgerRow[], customers: Customer[], loans: Loan[]): CustomerReport[] {
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const loanCounts = new Map<string, number>();
  loans.forEach((loan) => loanCounts.set(loan.customerId, (loanCounts.get(loan.customerId) || 0) + 1));
  const grouped = new Map<string, CustomerReport>();
  rows.forEach((row) => {
    const customer = customerMap.get(row.customerId);
    const current = grouped.get(row.customerId) || { id: row.customerId, name: row.customerName, phone: customer?.phone || '', place: customer?.place || '', principal: 0, collected: 0, balance: 0, loanCount: loanCounts.get(row.customerId) || 0, transactions: [], status: customer?.status || 'Active' };
    current.principal += row.amountDue;
    current.collected += row.amountPaid;
    current.balance += row.balance;
    current.transactions.push(row);
    grouped.set(row.customerId, current);
  });
  return Array.from(grouped.values()).map((report) => ({ ...report, transactions: report.transactions.sort((a, b) => dateKey(a.date).localeCompare(dateKey(b.date))), status: customerMap.get(report.id)?.status || (report.balance > 0 ? 'Active' : 'Closed') })).sort((a, b) => a.name.localeCompare(b.name));
}

function makeLedgerEntries(report: CustomerReport): LedgerEntry[] {
  let runningBalance = 0;
  return report.transactions.map((row) => {
    runningBalance += row.amountDue - row.amountPaid;
    return { ...row, runningBalance: Math.max(0, runningBalance) };
  });
}

function reportForTransactions(report: CustomerReport, transactions: LedgerRow[]): CustomerReport {
  return {
    ...report,
    principal: transactions.reduce((sum, row) => sum + row.amountDue, 0),
    collected: transactions.reduce((sum, row) => sum + row.amountPaid, 0),
    balance: transactions.reduce((sum, row) => sum + row.balance, 0),
    transactions,
    loanCount: new Set(transactions.map((row) => row.loanId)).size,
  };
}

export const ReportsView: React.FC = () => {
  const { customers, loans, isLoading, showToast } = useApp();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [month, setMonth] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [ledgerCustomer, setLedgerCustomer] = useState<CustomerReport | null>(null);

  const allRows = useMemo(() => buildLedgerRows(loans), [loans]);
  const months = useMemo(() => Array.from(new Set(allRows.map((row) => dateKey(row.date).slice(0, 7)).filter(Boolean)).values()).sort().reverse(), [allRows]);
  const dateFilteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return allRows.filter((row) => {
      const rowDate = dateKey(row.date);
      const searchable = [row.customerName, row.customerId, row.loanId, row.codeNo, row.reference].join(' ').toLowerCase();
      return (!normalized || searchable.includes(normalized)) && (!month || month === 'all' || rowDate.startsWith(month)) && (!fromDate || rowDate >= fromDate) && (!toDate || rowDate <= toDate);
    });
  }, [allRows, fromDate, month, query, toDate]);
  const allCustomerReports = useMemo(() => makeCustomerReports(dateFilteredRows, customers, loans), [customers, dateFilteredRows, loans]);
  const statusOptions = useMemo(() => Array.from(new Set(allCustomerReports.map((report) => report.status))).sort((a, b) => a.localeCompare(b)), [allCustomerReports]);
  const customerReports = useMemo(() => allCustomerReports.filter((report) => status === 'All statuses' || report.status === status), [allCustomerReports, status]);
  const totals = useMemo(() => customerReports.reduce((summary, report) => ({ principal: summary.principal + report.principal, collected: summary.collected + report.collected, balance: summary.balance + report.balance }), { principal: 0, collected: 0, balance: 0 }), [customerReports]);
  const activeCount = customerReports.filter((report) => report.status === 'Active').length;
  const closedCount = customerReports.filter((report) => report.status === 'Closed').length;
  const allVisibleSelected = customerReports.length > 0 && customerReports.every((report) => selectedCustomerIds.has(report.id));
  const exportTargets = selectedCustomerIds.size > 0 ? customerReports.filter((report) => selectedCustomerIds.has(report.id)) : customerReports;

  const toggleCustomer = (id: string) => setSelectedCustomerIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAllCustomers = () => setSelectedCustomerIds((current) => allVisibleSelected ? new Set() : new Set(customerReports.map((report) => report.id)));
  const clearFilters = () => { setQuery(''); setStatus('All statuses'); setMonth('all'); setFromDate(''); setToDate(''); setSelectedCustomerIds(new Set()); };
  const setLedger = (report: CustomerReport) => setLedgerCustomer(report);

  const exportExcel = (reports: CustomerReport[], ledgerOnly = false) => {
    if (!reports.length) { showToast('Nothing to export', 'Select at least one customer or adjust the filters.', 'warning'); return; }
    const summary = reports.map((report) => ({ 'Customer ID': report.id, 'Customer name': report.name, Mobile: report.phone, Place: report.place, 'Loan count': report.loanCount, Principal: report.principal, Collected: report.collected, Balance: report.balance, Status: report.status }));
    const ledger = reports.flatMap((report) => makeLedgerEntries(report).map((entry) => ({ 'Customer ID': report.id, 'Customer name': report.name, Date: entry.date, 'Due date': entry.dueDate, 'Received date': entry.receivedDate, 'Loan ID': entry.loanId, 'Loan code': entry.codeNo, 'S.No': entry.sequence, Status: entry.status, 'Amount due': entry.amountDue, Paid: entry.amountPaid, 'Running balance': entry.runningBalance, Reference: entry.reference, 'Deposit account': entry.depositName, Remarks: entry.remarks })));
    const workbook = XLSX.utils.book_new();
    if (!ledgerOnly) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), 'Customer summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(ledger), 'Ledger');
    const name = reports.length === 1 ? reports[0].name : selectedCustomerIds.size ? `selected_${reports.length}_customers` : 'all_customers';
    XLSX.writeFile(workbook, `ASR_${safeFileName(name)}_ledger.xlsx`);
    showToast('Excel downloaded', `${reports.length} customer ledger${reports.length === 1 ? '' : 's'} exported.`, 'success');
  };

  const exportPdf = (reports: CustomerReport[], ledgerOnly = false) => {
    if (!reports.length) { showToast('Nothing to export', 'Select at least one customer or adjust the filters.', 'warning'); return; }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const title = reports.length === 1 ? `${reports[0].name} · Ledger Statement` : ledgerOnly ? 'Full Customer Ledgers' : 'Customer Master Report';
    doc.setFillColor(112, 26, 53); doc.rect(0, 0, pageWidth, 58, 'F'); doc.setFillColor(197, 160, 89); doc.rect(0, 56, pageWidth, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255, 255, 255); doc.text(`ASR GROUPS · ${title.toUpperCase()}`, 32, 28);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(238, 216, 161); doc.text(`${reports.length} customer${reports.length === 1 ? '' : 's'} · Generated ${new Date().toLocaleString('en-IN')}`, 32, 44);
    if (!ledgerOnly) {
      autoTable(doc, { startY: 82, head: [['S.No', 'Customer', 'Mobile', 'Place', 'Loans', 'Principal', 'Collected', 'Balance', 'Status']], body: reports.map((report, index) => [String(index + 1), report.name, report.phone || '—', report.place || '—', String(report.loanCount), pdfMoney(report.principal), pdfMoney(report.collected), pdfMoney(report.balance), report.status]), foot: [['', `TOTAL · ${reports.length} customers`, '', '', '', pdfMoney(totals.principal), pdfMoney(totals.collected), pdfMoney(totals.balance), '']], theme: 'striped', headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' }, bodyStyles: { fontSize: 8, cellPadding: 5 }, footStyles: { fillColor: [243, 239, 230], textColor: [112, 26, 53], fontSize: 8, fontStyle: 'bold' }, margin: { left: 32, right: 32, bottom: 34 } });
    } else {
      let startY = 82;
      reports.forEach((report) => {
        const entries = makeLedgerEntries(report);
        if (startY > pageHeight - 160) { doc.addPage(); startY = 42; }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(112, 26, 53); doc.text(`${report.name} · ${report.id}`, 32, startY);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80); doc.text(`Principal ${pdfMoney(report.principal)} · Collected ${pdfMoney(report.collected)} · Balance ${pdfMoney(report.balance)}`, 32, startY + 14);
        autoTable(doc, { startY: startY + 24, head: [['S.No', 'Date', 'Loan', 'Due', 'Paid', 'Running balance', 'Status', 'Reference']], body: entries.map((entry) => [String(entry.sequence), formatDate(entry.date), entry.loanId, pdfMoney(entry.amountDue), pdfMoney(entry.amountPaid), pdfMoney(entry.runningBalance), entry.status, entry.reference || '—']), theme: 'striped', headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 7.5 }, bodyStyles: { fontSize: 7.5, cellPadding: 4 }, margin: { left: 32, right: 32, bottom: 34 }, didDrawPage: (data) => { doc.setFontSize(8); doc.setTextColor(130, 130, 130); doc.text(`ASR Groups · Page ${data.pageNumber} · Confidential`, pageWidth / 2, pageHeight - 16, { align: 'center' }); } });
        startY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || startY + 100) + 28;
      });
    }
    if (!ledgerOnly) { doc.setFontSize(8); doc.setTextColor(130, 130, 130); doc.text(`ASR Groups · Confidential`, pageWidth / 2, pageHeight - 16, { align: 'center' }); }
    const name = reports.length === 1 ? reports[0].name : selectedCustomerIds.size ? `selected_${reports.length}_customers` : 'all_customers';
    doc.save(`ASR_${safeFileName(name)}_${ledgerOnly ? 'ledger' : 'report'}.pdf`);
    showToast('PDF downloaded', `${reports.length} customer report${reports.length === 1 ? '' : 's'} exported.`, 'success');
  };

  return <div className="space-y-5 pb-8">
    <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-7"><div className="flex flex-col gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">Financial reporting</p><div className="mt-1 flex items-center gap-3"><h1 className="text-2xl font-bold tracking-tight text-[#24131B]">Master report & ledger</h1><span className="rounded-full bg-[#F5EEE3] px-2.5 py-1 text-xs font-bold text-[#701A35]">{customerReports.length}</span></div><p className="mt-2 max-w-2xl text-sm text-slate-500">Customer-wise financial statements with date-wise ledger details, running balances, and downloadable reports.</p></div><div className="grid grid-cols-2 gap-2 border-t border-[#EEE8DE] pt-4 sm:flex sm:flex-wrap"><button type="button" onClick={() => exportPdf(customerReports)} disabled={!customerReports.length} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-45"><FileText className="h-4 w-4" /> PDF</button><button type="button" onClick={() => exportExcel(customerReports)} disabled={!customerReports.length} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-45"><FileSpreadsheet className="h-4 w-4" /> Excel</button><button type="button" onClick={() => exportPdf(exportTargets, true)} disabled={!exportTargets.length} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#D8D5FF] bg-[#FAFAFF] px-3 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-45"><Download className="h-4 w-4" /> {selectedCustomerIds.size ? 'Selected PDF' : 'All ledgers PDF'}</button><button type="button" onClick={() => exportExcel(exportTargets, true)} disabled={!exportTargets.length} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-cyan-200 bg-cyan-50/30 px-3 py-2.5 text-xs font-bold text-cyan-700 hover:bg-cyan-50 disabled:opacity-45"><Download className="h-4 w-4" /> {selectedCustomerIds.size ? 'Selected Excel' : 'All ledgers Excel'}</button></div></div><div className="mt-6 grid grid-cols-2 gap-2 border-t border-[#EEE8DE] pt-5 sm:grid-cols-5"><MetricCard label="Total principal" value={formatINR(totals.principal)} tone="maroon" /><MetricCard label="Total collected" value={formatINR(totals.collected)} tone="green" /><MetricCard label="Total balance" value={formatINR(totals.balance)} tone="blue" /><MetricCard label="Active customers" value={String(activeCount)} tone="violet" /><MetricCard label="Closed customers" value={String(closedCount)} tone="slate" /></div></section>

    <section className="rounded-3xl border border-[#E7DFD2] bg-white p-4 shadow-[0_12px_32px_rgba(58,34,22,0.04)] sm:p-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="relative min-w-0 flex-1 xl:max-w-sm"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer, loan, code or reference" className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] py-2.5 pl-10 pr-3 text-xs outline-none focus:border-[#C5A059] focus:bg-white" /></div><div className="flex flex-wrap items-center gap-2"><Filter className="h-4 w-4 text-slate-400" /><SelectField label="Month" value={month} onChange={setMonth}><option value="all">All months</option>{months.map((value) => <option key={value} value={value}>{formatMonth(value)}</option>)}</SelectField><DateField label="From" value={fromDate} onChange={setFromDate} /><DateField label="To" value={toDate} onChange={setToDate} /></div></div><div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#EEE8DE] pt-4"><StatusChip label="All" count={allCustomerReports.length} active={status === 'All statuses'} onClick={() => setStatus('All statuses')} />{statusOptions.map((value) => <StatusChip key={value} label={value} count={allCustomerReports.filter((report) => report.status === value).length} active={status === value} onClick={() => setStatus(value)} />)}{(query || month !== 'all' || fromDate || toDate || status !== 'All statuses') && <button type="button" onClick={clearFilters} className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-[#701A35] hover:underline">Clear filters</button>}</div><div className="mt-3 text-[11px] text-slate-500">{isLoading ? 'Syncing records…' : `Showing ${customerReports.length} customer${customerReports.length === 1 ? '' : 's'} from ${dateFilteredRows.length} ledger transaction${dateFilteredRows.length === 1 ? '' : 's'}`}{selectedCustomerIds.size > 0 && <span className="ml-2 font-bold text-[#701A35]">· {selectedCustomerIds.size} selected</span>}</div></section>

    <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]"><div className="flex items-center justify-between border-b border-[#E7DFD2] bg-[#FCFBF9] px-4 py-4 sm:px-5"><div><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileBarChart className="h-4 w-4 text-[#701A35]" /> Customer master report</h2><p className="mt-1 text-[11px] text-slate-500">Select customers for bulk ledgers or open one customer’s complete date-wise statement.</p></div><span className="hidden rounded-full bg-[#F5EEE3] px-2.5 py-1 text-[10px] font-bold text-[#701A35] sm:inline-flex">{customerReports.length} customers</span></div><div className="hidden overflow-hidden md:block"><table className="w-full table-fixed border-collapse text-left text-xs"><thead><tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500"><th className="w-10 px-3 py-3 text-center"><input type="checkbox" aria-label="Select all visible customers" checked={allVisibleSelected} onChange={toggleAllCustomers} className="h-3.5 w-3.5 accent-[#701A35]" /></th><th className="w-12 px-3 py-3">S.No</th><th className="w-[22%] px-3 py-3">Customer</th><th className="w-[13%] px-3 py-3">Mobile</th><th className="w-[10%] px-3 py-3">Place</th><th className="w-[12%] px-3 py-3 text-right">Principal</th><th className="w-[12%] px-3 py-3 text-right">Collected</th><th className="w-[12%] px-3 py-3 text-right">Balance</th><th className="w-[9%] px-3 py-3">Status</th><th className="w-[104px] px-3 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{customerReports.length === 0 ? <tr><td colSpan={10} className="px-6 py-16 text-center text-sm text-slate-500">No customer records match these filters.</td></tr> : customerReports.map((report, index) => <CustomerTableRow key={report.id} report={report} index={index} selected={selectedCustomerIds.has(report.id)} onToggle={() => toggleCustomer(report.id)} onView={() => setLedger(report)} />)}</tbody><tfoot><tr className="border-t border-slate-200 bg-[#F8F6F2] font-bold text-slate-800"><td></td><td></td><td className="px-3 py-3">TOTAL · {customerReports.length} customers</td><td></td><td></td><td className="px-3 py-3 text-right">{formatINR(totals.principal)}</td><td className="px-3 py-3 text-right text-emerald-700">{formatINR(totals.collected)}</td><td className="px-3 py-3 text-right text-[#245B9B]">{formatINR(totals.balance)}</td><td></td><td></td></tr></tfoot></table></div><div className="divide-y divide-slate-100 md:hidden">{customerReports.length === 0 ? <div className="p-10 text-center text-xs text-slate-500">No customer records match these filters.</div> : customerReports.map((report, index) => <CustomerMobileRow key={report.id} report={report} index={index} selected={selectedCustomerIds.has(report.id)} onToggle={() => toggleCustomer(report.id)} onView={() => setLedger(report)} />)}</div></section>

    {ledgerCustomer && <LedgerDrawer report={ledgerCustomer} onClose={() => setLedgerCustomer(null)} onPdf={(rows) => exportPdf([reportForTransactions(ledgerCustomer, rows)], true)} onExcel={(rows) => exportExcel([reportForTransactions(ledgerCustomer, rows)], true)} />}
  </div>;
};

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'maroon' | 'green' | 'blue' | 'violet' | 'slate' }) {
  const tones = { maroon: 'border-[#E1C98D] bg-[#FBF8F3] text-[#701A35]', green: 'border-emerald-200 bg-emerald-50/60 text-emerald-700', blue: 'border-blue-200 bg-blue-50/60 text-blue-700', violet: 'border-violet-200 bg-violet-50/60 text-violet-700', slate: 'border-slate-200 bg-slate-50 text-slate-700' };
  return <div className={`rounded-2xl border px-3.5 py-3 ${tones[tone]}`}><span className="block text-[10px] font-bold uppercase tracking-[0.1em] opacity-70">{label}</span><strong className="mt-2 block truncate text-lg font-bold tabular-nums text-slate-900">{value}</strong></div>;
}

function StatusChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${active ? 'border-[#701A35] bg-[#701A35] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#C5A059] hover:bg-[#FBF8F3]'}`}>{label} <span className={active ? 'ml-1 text-[#EED8A1]' : 'ml-1 text-slate-400'}>{count}</span></button>;
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="block min-w-[135px] text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}<span className="relative mt-1 block"><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-[#FCFBF9] px-3 py-2.5 pr-8 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-[#C5A059] focus:bg-white">{children}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /></span></label>;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block min-w-[145px] text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}<span className="relative mt-1 block"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-[#FCFBF9] px-3 py-2.5 pl-9 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-[#C5A059] focus:bg-white" /></span></label>;
}

function CustomerTableRow({ report, index, selected, onToggle, onView }: { report: CustomerReport; index: number; selected: boolean; onToggle: () => void; onView: () => void }) {
  return <tr className={`transition-colors hover:bg-[#FCFAF7] ${selected ? 'bg-[#FBF4E9]' : ''}`}><td className="px-3 py-3 text-center"><input type="checkbox" aria-label={`Select ${report.name}`} checked={selected} onChange={onToggle} className="h-3.5 w-3.5 accent-[#701A35]" /></td><td className="px-3 py-3 font-mono text-[11px] text-slate-500">{index + 1}</td><td className="max-w-[220px] px-3 py-3"><span className="block truncate text-xs font-bold text-[#701A35]">{report.name}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{report.id} · {report.loanCount} loan{report.loanCount === 1 ? '' : 's'}</span></td><td className="max-w-[120px] truncate px-3 py-3 text-[11px] text-slate-600">{report.phone || '—'}</td><td className="max-w-[90px] truncate px-3 py-3 text-[11px] text-slate-600">{report.place || '—'}</td><td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-800">{formatINR(report.principal)}</td><td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-emerald-700">{formatINR(report.collected)}</td><td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-[#245B9B]">{formatINR(report.balance)}</td><td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${report.status === 'Closed' ? 'bg-slate-100 text-slate-600' : report.status === 'Overdue' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{report.status}</span></td><td className="px-3 py-3 text-right"><button type="button" onClick={onView} className="whitespace-nowrap rounded-lg border border-[#DCC7B0] bg-white px-2.5 py-2 text-[10px] font-bold text-[#701A35] hover:bg-[#FBF4E9]">View ledger</button></td></tr>;
}

function CustomerMobileRow({ report, index, selected, onToggle, onView }: { report: CustomerReport; index: number; selected: boolean; onToggle: () => void; onView: () => void }) {
  return <article className={`space-y-3 p-4 ${selected ? 'bg-[#FBF4E9]' : ''}`}><div className="flex items-start gap-3"><input type="checkbox" aria-label={`Select ${report.name}`} checked={selected} onChange={onToggle} className="mt-1 h-3.5 w-3.5 accent-[#701A35]" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="truncate text-sm font-bold text-[#701A35]">{report.name}</p><p className="mt-1 text-[10px] text-slate-400">{index + 1} · {report.id} · {report.place || 'Place not recorded'}</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{report.status}</span></div><div className="mt-3 grid grid-cols-3 gap-2"><MiniValue label="Principal" value={formatINR(report.principal)} /><MiniValue label="Collected" value={formatINR(report.collected)} accent="green" /><MiniValue label="Balance" value={formatINR(report.balance)} accent="blue" /></div><div className="mt-3 flex items-center justify-between gap-2"><span className="text-[10px] text-slate-500">{report.phone || 'Mobile not recorded'} · {report.loanCount} loan{report.loanCount === 1 ? '' : 's'}</span><button type="button" onClick={onView} className="rounded-lg border border-[#DCC7B0] bg-white px-3 py-2 text-[10px] font-bold text-[#701A35]">View ledger</button></div></div></div></article>;
}

function MiniValue({ label, value, accent }: { label: string; value: string; accent?: 'green' | 'blue' }) {
  return <div><span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</span><span className={`mt-1 block truncate text-[11px] font-bold ${accent === 'green' ? 'text-emerald-700' : accent === 'blue' ? 'text-[#245B9B]' : 'text-slate-800'}`}>{value}</span></div>;
}

function LedgerDrawer({ report, onClose, onPdf, onExcel }: { report: CustomerReport; onClose: () => void; onPdf: (rows: LedgerRow[]) => void; onExcel: (rows: LedgerRow[]) => void }) {
  const entries = makeLedgerEntries(report);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const allEntriesSelected = entries.length > 0 && entries.every((entry) => selectedEntryIds.has(entry.id));
  const selectedEntries = entries.filter((entry) => selectedEntryIds.has(entry.id));
  const exportEntries = selectedEntries.length > 0 ? selectedEntries : entries;
  const toggleEntry = (id: string) => setSelectedEntryIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAllEntries = () => setSelectedEntryIds(allEntriesSelected ? new Set() : new Set(entries.map((entry) => entry.id)));
  const monthlyTotals = Array.from(entries.reduce((map, entry) => { const month = dateKey(entry.date).slice(0, 7) || 'Unknown'; const current = map.get(month) || { due: 0, paid: 0 }; current.due += entry.amountDue; current.paid += entry.amountPaid; map.set(month, current); return map; }, new Map<string, { due: number; paid: number }>())).sort((a, b) => b[0].localeCompare(a[0]));
  return <div className="fixed inset-0 z-50 flex justify-end bg-[#1A0A13]/35"><button type="button" aria-label="Close ledger" onClick={onClose} className="absolute inset-0 cursor-default" /><aside className="relative flex h-full w-full max-w-2xl flex-col border-l border-[#E7DFD2] bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-[#E7DFD2] bg-[#FCFBF9] px-5 py-4 sm:px-7"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A07A39]">Tally-style ledger</p><h2 className="mt-1 text-lg font-bold text-slate-900">{report.name}</h2><p className="mt-1 font-mono text-[10px] text-slate-400">{report.id} · {report.place || 'Place not recorded'}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => onPdf(exportEntries)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-2 text-[10px] font-bold text-rose-700 hover:bg-rose-50"><FileText className="h-3.5 w-3.5" /> {selectedEntries.length ? 'PDF selected' : 'PDF'}</button><button type="button" onClick={() => onExcel(exportEntries)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 py-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50"><FileSpreadsheet className="h-3.5 w-3.5" /> {selectedEntries.length ? 'Excel selected' : 'Excel'}</button><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div></header><div className="overflow-y-auto p-5 sm:p-7"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><DrawerMetric label="Mobile" value={report.phone || '—'} /><DrawerMetric label="Loans" value={String(report.loanCount)} /><DrawerMetric label="Principal" value={formatINR(report.principal)} /><DrawerMetric label="Balance" value={formatINR(report.balance)} accent /></div><div className="mt-5 rounded-2xl border border-[#E7DFD2] bg-[#FBF8F3] p-4"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A07A39]">Month-wise totals</p><p className="mt-1 text-[11px] text-slate-500">All dates in this customer ledger.</p></div><strong className="text-sm text-emerald-700">{formatINR(report.collected)} paid</strong></div><div className="mt-3 space-y-2">{monthlyTotals.length ? monthlyTotals.map(([month, total]) => <div key={month} className="flex items-center justify-between border-t border-[#E7DFD2] pt-2 text-xs"><span className="font-semibold text-slate-700">{formatMonth(month)}</span><span className="text-slate-500">Due {formatINR(total.due)} · <strong className="text-emerald-700">Paid {formatINR(total.paid)}</strong></span></div>) : <p className="text-xs text-slate-500">No dated transactions.</p>}</div></div><div className="mt-5 overflow-hidden rounded-2xl border border-slate-200"><div className="border-b border-slate-200 bg-[#F8F6F2] px-4 py-3"><h3 className="text-xs font-bold text-slate-900">Date-wise ledger</h3><p className="mt-1 text-[10px] text-slate-500">Opening balance ₹0 · each row updates the running balance.</p></div><div className="overflow-hidden"><table className="w-full table-fixed border-collapse text-left text-xs"><thead><tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500"><th className="w-9 px-2 py-3 text-center"><input type="checkbox" aria-label="Select ledger rows" checked={allEntriesSelected} onChange={toggleAllEntries} className="h-3.5 w-3.5 accent-[#701A35]" /></th><th className="w-11 px-2 py-3">S.No</th><th className="w-24 px-2 py-3">Date</th><th className="w-[26%] px-2 py-3">Loan / ref</th><th className="w-[17%] px-2 py-3 text-right">Due</th><th className="w-[17%] px-2 py-3 text-right">Paid</th><th className="w-[20%] px-2 py-3 text-right">Running bal.</th></tr></thead><tbody className="divide-y divide-slate-100">{entries.map((entry, index) => <tr key={entry.id}><td className="px-2 py-3 text-center"><input type="checkbox" aria-label={`Select transaction ${index + 1}`} checked={selectedEntryIds.has(entry.id)} onChange={() => toggleEntry(entry.id)} className="h-3.5 w-3.5 accent-[#701A35]" /></td><td className="px-2 py-3 text-slate-500">{index + 1}</td><td className="whitespace-nowrap px-2 py-3 font-semibold text-slate-700">{formatDate(entry.date)}</td><td className="max-w-0 px-2 py-3"><span className="block truncate font-mono text-[10px] text-slate-700">{entry.loanId}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{entry.reference || '—'}</span></td><td className="whitespace-nowrap px-2 py-3 text-right font-semibold text-slate-700">{formatINR(entry.amountDue)}</td><td className="whitespace-nowrap px-2 py-3 text-right font-semibold text-emerald-700">{formatINR(entry.amountPaid)}</td><td className="whitespace-nowrap px-2 py-3 text-right font-bold text-[#245B9B]">{formatINR(entry.runningBalance)}</td></tr>)}</tbody><tfoot><tr className="border-t border-slate-200 bg-[#F8F6F2] font-bold"><td></td><td colSpan={3} className="px-2 py-3">TOTAL</td><td className="whitespace-nowrap px-2 py-3 text-right">{formatINR(report.principal)}</td><td className="whitespace-nowrap px-2 py-3 text-right text-emerald-700">{formatINR(report.collected)}</td><td className="whitespace-nowrap px-2 py-3 text-right text-[#245B9B]">{formatINR(report.balance)}</td></tr></tfoot></table></div></div></div></aside></div>;
}

function DrawerMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="rounded-xl bg-[#FBF8F3] px-3 py-2.5"><span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</span><span className={`mt-1 block truncate text-xs font-bold ${accent ? 'text-[#245B9B]' : 'text-slate-800'}`}>{value}</span></div>;
}
