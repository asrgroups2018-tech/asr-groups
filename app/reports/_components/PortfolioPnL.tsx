'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  IndianRupee,
  Percent,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useApp } from '@/lib/store';
import { APP_BRAND } from '@/lib/branding';
import { formatINR } from '@/lib/utils/formatCurrency';
import { Company, Loan, ManualReceipt } from '@/lib/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { buildReportAccounting, getLoanInterest, getLoanPrincipal, ReportPeriod } from '@/lib/reportAccounting';
import { ReportPeriodBar, useReportPeriod } from './ReportPeriodBar';
import { isPaidStatus } from '@/lib/utils/statusMapping';

const dateKey = (v: string) => String(v || '').slice(0, 10);
const safeFileName = (v: string) =>
  v.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'report';
const pdfMoney = (v: number) => `INR ${Number(v || 0).toLocaleString('en-IN')}`;
const fmtMonth = (key: string) => {
  const d = new Date(`${key}-01T00:00:00`);
  return isNaN(d.getTime()) ? key : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

interface PnLSummary {
  // Income side
  grossCollections: number;       // Total amountPaid across all PAID installments
  interestIncome: number;         // Sum of loan.interestAmount (where available)
  totalIncome: number;            // grossCollections (primary income metric)

  // Capital deployed
  principalDeployed: number;      // Sum of disbursedAmount (or totalAmount - interestAmount)
  totalPortfolio: number;         // Sum of totalAmount (all loans)

  // Outstanding
  totalOutstanding: number;       // principalDeployed - grossCollections (floor 0)
  totalLoans: number;
  activeLoans: number;
  closedLoans: number;
  overdueLoans: number;

  // Rates
  recoveryRate: number;           // grossCollections / totalPortfolio * 100
  interestYield: number;          // interestIncome / principalDeployed * 100 (if data available)
  accounting: ReturnType<typeof buildReportAccounting>;
}

interface MonthlyPnL {
  monthKey: string;
  monthLabel: string;
  deployed: number;               // loans started this month (totalAmount)
  disbursed: number;              // disbursedAmount for loans started this month
  collected: number;              // collected in this month (by recdDate)
  interest: number;               // interestAmount for loans started this month
  netCashFlow: number;            // collected - disbursed
}

interface CompanyPnL {
  companyId: string;
  companyName: string;
  companyCode: string;
  isOutsideParty: boolean;
  totalFunded: number;            // principal share from loan splits
  totalScheduled: number;         // repayable share from loan splits
  totalCollected: number;         // from installment splits
  outstanding: number;
  recoveryRate: number;
}

function buildPnL(loans: Loan[], companies: Company[], receipts: ManualReceipt[], period: ReportPeriod): PnLSummary {
  const accounting = buildReportAccounting(loans, companies, receipts, period);
  const interestIncome = accounting.directIncome.reduce((sum, line) => sum + line.amount, 0);
  const principalDeployed = accounting.principalFunded;
  const totalPortfolio = accounting.totalRepayable;
  let activeLoans = 0;
  let closedLoans = 0;
  let overdueLoans = 0;

  const reportLoans = loans.filter((loan) => dateKey(loan.startDate || loan.createdAt) <= period.toDate);
  for (const loan of reportLoans) {
    const st = String(loan.status || '').toLowerCase();
    if (st === 'closed') closedLoans++;
    else if (st === 'overdue') overdueLoans++;
    else activeLoans++;
  }

  const grossCollections = accounting.totalCollected;
  const totalOutstanding = accounting.receivables;
  const recoveryRate = totalPortfolio > 0 ? (grossCollections / totalPortfolio) * 100 : 0;
  const interestYield = principalDeployed > 0 ? (interestIncome / principalDeployed) * 100 : 0;

  return {
    grossCollections,
    interestIncome,
    totalIncome: accounting.directIncome.reduce((sum, line) => sum + line.amount, 0) + accounting.indirectIncome.reduce((sum, line) => sum + line.amount, 0),
    principalDeployed,
    totalPortfolio,
    totalOutstanding,
    totalLoans: reportLoans.length,
    activeLoans,
    closedLoans,
    overdueLoans,
    recoveryRate,
    interestYield,
    accounting,
  };
}

function buildMonthlyPnL(loans: Loan[], period: ReportPeriod): MonthlyPnL[] {
  // Month → collections by recdDate
  const collByMonth = new Map<string, number>();
  // Month → deployed/interest by loan startDate
  const deployByMonth = new Map<string, { deployed: number; interest: number; disbursed: number; portfolio: number }>();

  for (const loan of loans) {
    const startMonth = dateKey(loan.startDate || '').slice(0, 7);
    const startDate = dateKey(loan.startDate || loan.createdAt);
    if (startMonth && startDate >= period.fromDate && startDate <= period.toDate) {
      const existing = deployByMonth.get(startMonth) || { deployed: 0, interest: 0, disbursed: 0, portfolio: 0 };
      const interest = getLoanInterest(loan);
      const disbursed = Number(loan.disbursedAmount || 0);
      existing.interest += loan.isOpeningBalanceOnly ? 0 : interest;
      existing.disbursed += loan.isOpeningBalanceOnly
        ? 0
        : disbursed > 0 ? disbursed : Math.max(0, Number(loan.totalAmount || 0) - interest);
      existing.portfolio += loan.isOpeningBalanceOnly ? 0 : Number(loan.totalAmount || 0);
      deployByMonth.set(startMonth, existing);
    }

    for (const inst of loan.installments || []) {
      if (!isPaidStatus(inst.status)) continue;
      const recdDate = dateKey(inst.recdDate || '');
      const recdMonth = recdDate.slice(0, 7);
      if (recdMonth && recdDate >= period.fromDate && recdDate <= period.toDate) {
        collByMonth.set(recdMonth, (collByMonth.get(recdMonth) || 0) + Number(inst.amountDue || 0));
      }
    }
  }

  // Merge all months
  const allMonths = new Set([...collByMonth.keys(), ...deployByMonth.keys()]);

  return Array.from(allMonths)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => {
      const dep = deployByMonth.get(key) || { deployed: 0, interest: 0, disbursed: 0, portfolio: 0 };
      const collected = collByMonth.get(key) || 0;
      return {
        monthKey: key,
        monthLabel: fmtMonth(key),
        deployed: dep.portfolio,
        disbursed: dep.disbursed,
        collected,
        interest: dep.interest,
        netCashFlow: collected - dep.disbursed,
      };
    });
}

function buildCompanyPnL(loans: Loan[], companies: Company[], period: ReportPeriod): CompanyPnL[] {
  const map = new Map<string, CompanyPnL>();

  // Pre-populate from companies
  for (const comp of companies) {
    map.set(comp.id, {
      companyId: comp.id,
      companyName: comp.name,
      companyCode: comp.shortCode,
      isOutsideParty: comp.isOutsideParty,
      totalFunded: 0,
      totalScheduled: 0,
      totalCollected: 0,
      outstanding: 0,
      recoveryRate: 0,
    });
  }

  for (const loan of loans) {
    if (dateKey(loan.startDate || loan.createdAt) > period.toDate) continue;
    // Loan-level company splits (funded amounts)
    for (const split of loan.splits || []) {
      const entry = map.get(split.companyId);
      if (entry) {
        const scheduledShare = Number(split.splitAmount || 0);
        const repayable = Number(loan.totalAmount || 0);
        const principalShare = repayable > 0 ? (getLoanPrincipal(loan) * scheduledShare) / repayable : 0;
        entry.totalFunded += principalShare;
        entry.totalScheduled += scheduledShare;
      }
    }

    // Installment-level splits (collected amounts)
    for (const inst of loan.installments || []) {
      if (!isPaidStatus(inst.status) || dateKey(inst.recdDate || inst.dueDate || '') > period.toDate) continue;
      for (const [code, amount] of Object.entries(inst.companySplits || {})) {
        // Find company by code
        const comp = companies.find((c) => c.shortCode.toUpperCase() === code.toUpperCase());
        if (comp) {
          const entry = map.get(comp.id);
          if (entry) {
            entry.totalCollected += Number(amount || 0);
          }
        }
      }
    }
  }

  return Array.from(map.values())
    .filter((e) => e.totalFunded > 0 || e.totalCollected > 0 || e.totalScheduled > 0)
    .map((e) => ({
      ...e,
      outstanding: Math.max(0, e.totalScheduled - e.totalCollected),
      recoveryRate: e.totalScheduled > 0 ? (e.totalCollected / e.totalScheduled) * 100 : 0,
    }))
    .sort((a, b) => b.totalFunded - a.totalFunded);
}

function tallyPnLTotals(accounting: ReturnType<typeof buildReportAccounting>) {
  const directIncome = accounting.directIncome.reduce((sum, line) => sum + line.amount, 0);
  const directExpenses = accounting.directExpenses.reduce((sum, line) => sum + line.amount, 0);
  const indirectIncome = accounting.indirectIncome.reduce((sum, line) => sum + line.amount, 0);
  const indirectExpenses = accounting.indirectExpenses.reduce((sum, line) => sum + line.amount, 0);
  const netTransfer = Math.abs(accounting.netProfit);

  // Tally shows Gross Profit c/o and b/f as internal transfers. They remain
  // visible, but the bottom Total is the operating-side total shown in the
  // reference: expenses plus net profit versus incomes plus net loss.
  return {
    debitTotal: directExpenses + indirectExpenses + (accounting.netProfit >= 0 ? netTransfer : 0),
    creditTotal: directIncome + indirectIncome + (accounting.netProfit < 0 ? netTransfer : 0),
  };
}

const rateColor = (r: number) => {
  if (r >= 80) return 'text-emerald-700';
  if (r >= 60) return 'text-amber-600';
  if (r >= 40) return 'text-orange-600';
  return 'text-red-600';
};
const rateBarColor = (r: number) => {
  if (r >= 80) return 'bg-emerald-500';
  if (r >= 60) return 'bg-amber-500';
  if (r >= 40) return 'bg-orange-500';
  return 'bg-red-500';
};

export const PortfolioPnL: React.FC = () => {
  const { loans, companies, isLoading, showToast } = useApp();
  const [showMonthly, setShowMonthly] = useState(true);
  const [showCompany, setShowCompany] = useState(true);
  const [yearFilter, setYearFilter] = useState('all');
  const [manualReceipts, setManualReceipts] = useState<ManualReceipt[]>([]);
  const period = useReportPeriod();

  const loadManualReceipts = useCallback(async () => {
    try {
      const response = await fetch('/api/manual-receipts', { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      if (response.ok && json.success) setManualReceipts(json.data || []);
    } catch {
      // Receipt data is optional; the loan ledger remains the source of truth.
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadManualReceipts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadManualReceipts]);

  const pnl = useMemo(() => buildPnL(loans, companies, manualReceipts, period), [companies, loans, manualReceipts, period]);
  const allMonthly = useMemo(() => buildMonthlyPnL(loans, period), [loans, period]);
  const companyPnL = useMemo(() => buildCompanyPnL(loans, companies, period), [loans, companies, period]);

  const availableYears = useMemo(
    () => Array.from(new Set(allMonthly.map((r) => r.monthKey.slice(0, 4)))).sort().reverse(),
    [allMonthly]
  );

  const monthly = useMemo(() => {
    if (yearFilter === 'all') return allMonthly;
    return allMonthly.filter((r) => r.monthKey.startsWith(yearFilter));
  }, [allMonthly, yearFilter]);

  const companyName = APP_BRAND;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const exportPdf = () => {
    if (!loans.length) { showToast('No data', 'No loan data available.', 'warning'); return; }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    doc.setFillColor(112, 26, 53); doc.rect(0, 0, pw, 58, 'F');
    doc.setFillColor(197, 160, 89); doc.rect(0, 56, pw, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
    doc.text(`${companyName.toUpperCase()} · PORTFOLIO P&L SUMMARY`, 32, 28);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(238, 216, 161);
    doc.text(`${formatStatementDate(period.fromDate)} to ${formatStatementDate(period.toDate)} · ${loans.length} loans`, 32, 44);

    const debitRows = [
      ...pnl.accounting.directExpenses.map((line) => [line.label, pdfMoney(line.amount)]),
      ...(pnl.accounting.grossProfit >= 0
        ? [['Gross Profit c/o', pdfMoney(pnl.accounting.grossProfit)]]
        : [['Gross Loss b/f', pdfMoney(Math.abs(pnl.accounting.grossProfit))]]),
      ...pnl.accounting.indirectExpenses.map((line) => [line.label, pdfMoney(line.amount)]),
      ...(pnl.accounting.netProfit >= 0 ? [['Net Profit', pdfMoney(pnl.accounting.netProfit)]] : []),
    ];
    const creditRows = [
      ...pnl.accounting.directIncome.map((line) => [line.label, pdfMoney(line.amount)]),
      ...(pnl.accounting.grossProfit >= 0 ? [['Gross Profit b/f', pdfMoney(pnl.accounting.grossProfit)]] : []),
      ...pnl.accounting.indirectIncome.map((line) => [line.label, pdfMoney(line.amount)]),
      ...(pnl.accounting.netProfit < 0 ? [['Net Loss', pdfMoney(Math.abs(pnl.accounting.netProfit))]] : []),
    ];
    const pnlRows = Array.from({ length: Math.max(debitRows.length, creditRows.length) }, (_, index) => [
      debitRows[index]?.[0] || '', debitRows[index]?.[1] || '', creditRows[index]?.[0] || '', creditRows[index]?.[1] || '',
    ]);
    autoTable(doc, {
      startY: 82,
      head: [['Debit particulars', 'Debit', 'Credit particulars', 'Credit']],
      body: pnlRows,
      foot: [['TOTAL', pdfMoney(tallyPnLTotals(pnl.accounting).debitTotal), 'TOTAL', pdfMoney(tallyPnLTotals(pnl.accounting).creditTotal)]],
      theme: 'striped',
      headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, cellPadding: 6 },
      margin: { left: 32, right: 32, bottom: 34 },
      columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' } },
    });

    // Company table
    if (companyPnL.length) {
      autoTable(doc, {
        startY: 82,
        head: [['Company', 'Type', 'Principal', 'Scheduled', 'Collected', 'Outstanding', 'Recovery %']],
        body: companyPnL.map((c) => [
          `${c.companyName} (${c.companyCode})`,
          c.isOutsideParty ? 'Outside Party' : 'ASR Own',
          pdfMoney(c.totalFunded),
          pdfMoney(c.totalScheduled),
          pdfMoney(c.totalCollected),
          pdfMoney(c.outstanding),
          `${c.recoveryRate.toFixed(1)}%`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, cellPadding: 5 },
        margin: { left: pw / 2 + 10, right: 32, bottom: 34 },
      });
    }

    // Monthly table
    if (monthly.length) {
      const lastY = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 300) + 24;
      autoTable(doc, {
        startY: lastY,
        head: [['Month', 'Portfolio Deployed', 'Disbursed (Cash Out)', 'Interest Booked', 'Collected (Cash In)', 'Net Cash Flow']],
        body: monthly.map((m) => [
          m.monthLabel,
          m.deployed > 0 ? pdfMoney(m.deployed) : '—',
          m.disbursed > 0 ? pdfMoney(m.disbursed) : '—',
          m.interest > 0 ? pdfMoney(m.interest) : '—',
          m.collected > 0 ? pdfMoney(m.collected) : '—',
          m.netCashFlow >= 0 ? `+${pdfMoney(m.netCashFlow)}` : `-${pdfMoney(Math.abs(m.netCashFlow))}`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5, cellPadding: 4 },
        margin: { left: 32, right: 32, bottom: 34 },
        didDrawPage: (d) => {
          doc.setFontSize(8); doc.setTextColor(130, 130, 130);
          doc.text(`${companyName} · Portfolio P&L · Page ${d.pageNumber} · Confidential`, pw / 2, ph - 16, { align: 'center' });
        },
      });
    }

    doc.save(`ASR_Portfolio_PnL_${safeFileName(today)}.pdf`);
    showToast('Portfolio P&L PDF downloaded', 'Full P&L summary exported.', 'success');
  };

  const exportExcel = () => {
    if (!loans.length) { showToast('No data', 'No loan data available.', 'warning'); return; }
    const wb = XLSX.utils.book_new();

    // Summary sheet
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { 'Metric': 'Total Portfolio (Repayable)', 'Value': pnl.totalPortfolio },
      { 'Metric': 'Principal Deployed', 'Value': pnl.principalDeployed },
      { 'Metric': 'Direct Income · Interest Received', 'Value': pnl.interestIncome },
      { 'Metric': 'Indirect Income', 'Value': pnl.accounting.indirectIncome.reduce((sum, line) => sum + line.amount, 0) },
      { 'Metric': 'Indirect Expenses', 'Value': pnl.accounting.indirectExpenses.reduce((sum, line) => sum + line.amount, 0) },
      { 'Metric': 'Net Profit / (Loss)', 'Value': pnl.accounting.netProfit },
      { 'Metric': 'Gross Collections (Balance Sheet)', 'Value': pnl.grossCollections },
      { 'Metric': 'Outstanding Balance', 'Value': pnl.totalOutstanding },
      { 'Metric': 'Recovery Rate (%)', 'Value': pnl.recoveryRate.toFixed(2) },
      { 'Metric': 'Total Loans', 'Value': pnl.totalLoans },
      { 'Metric': 'Active Loans', 'Value': pnl.activeLoans },
      { 'Metric': 'Closed Loans', 'Value': pnl.closedLoans },
      { 'Metric': 'Overdue Loans', 'Value': pnl.overdueLoans },
    ]), 'P&L Summary');

    // Monthly sheet
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      allMonthly.map((m) => ({
        'Month': m.monthLabel,
        'Month Key': m.monthKey,
        'Portfolio Deployed': m.deployed || '',
        'Disbursed (Cash Out)': m.disbursed || '',
        'Interest Booked': m.interest || '',
        'Collected (Cash In)': m.collected || '',
        'Net Cash Flow': m.netCashFlow,
      }))
    ), 'Monthly Trend');

    // Company sheet
    if (companyPnL.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        companyPnL.map((c) => ({
          'Company': c.companyName,
          'Code': c.companyCode,
          'Type': c.isOutsideParty ? 'Outside Party' : 'ASR Own',
          'Principal Funded': c.totalFunded,
          'Scheduled Return': c.totalScheduled,
          'Total Collected': c.totalCollected,
          'Outstanding': c.outstanding,
          'Recovery Rate (%)': c.recoveryRate.toFixed(2),
        }))
      ), 'Company Breakdown');
    }

    XLSX.writeFile(wb, `ASR_Portfolio_PnL_${safeFileName(today)}.xlsx`);
    showToast('Portfolio P&L Excel downloaded', '3 sheets: Summary, Monthly, Company breakdown.', 'success');
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-7">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">Tally — Portfolio P&amp;L</p>
              <div className="mt-1 flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-[#701A35]" />
                <h2 className="text-2xl font-bold tracking-tight text-[#24131B]">Portfolio P&amp;L Summary</h2>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Income vs capital deployed, recovery rate, month-wise cash flow, and company-wise funding breakdown — all from live data.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button type="button" onClick={exportPdf} disabled={!loans.length}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-45">
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button type="button" onClick={exportExcel} disabled={!loans.length}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-45">
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </button>
            </div>
          </div>

          {/* P&L Summary Grid */}
          <div className="grid grid-cols-2 gap-3 border-t border-[#EEE8DE] pt-5 sm:grid-cols-3 lg:grid-cols-4">
            <PnLCard icon={<IndianRupee className="h-4 w-4" />} label="Total Portfolio (Repayable)" value={formatINR(pnl.totalPortfolio)} tone="amber" />
            <PnLCard icon={<TrendingUp className="h-4 w-4" />} label="Gross Collections" value={formatINR(pnl.grossCollections)} tone="green" />
            <PnLCard icon={<IndianRupee className="h-4 w-4" />} label="Outstanding Balance" value={formatINR(pnl.totalOutstanding)} tone="blue" />
            <PnLCard icon={<Percent className="h-4 w-4" />} label="Recovery Rate" value={`${pnl.recoveryRate.toFixed(2)}%`} tone={pnl.recoveryRate >= 60 ? 'green' : 'red'} />
            {pnl.interestIncome > 0 && (
              <PnLCard icon={<IndianRupee className="h-4 w-4" />} label="Interest Income Booked" value={formatINR(pnl.interestIncome)} tone="violet" />
            )}
            <PnLCard icon={<Building2 className="h-4 w-4" />} label="Total Loans" value={`${pnl.totalLoans}`} tone="slate" />
            <PnLCard icon={<Building2 className="h-4 w-4" />} label="Active / Closed / Overdue" value={`${pnl.activeLoans} / ${pnl.closedLoans} / ${pnl.overdueLoans}`} tone="slate" />
          </div>
        </div>
      </section>

      <ReportPeriodBar />

      {/* P&L Statement Block */}
      <TallyPnLStatement accounting={pnl.accounting} companyName={companyName} />

      <section className="rounded-2xl border border-[#D9D2C7] bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-4">
          <ReconciliationMetric label="Principal funded" value={pnl.principalDeployed} />
          <ReconciliationMetric label="Total collected" value={pnl.grossCollections} />
          <ReconciliationMetric label="Receivables" value={pnl.totalOutstanding} />
          <ReconciliationMetric label="Net profit / (loss)" value={pnl.accounting.netProfit} tone={pnl.accounting.netProfit >= 0 ? 'positive' : 'negative'} />
        </div>
      </section>

      {/* Company-wise Breakdown */}
      {companyPnL.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
          <button type="button" onClick={() => setShowCompany((v) => !v)}
            className="flex w-full items-center justify-between border-b border-[#E7DFD2] bg-[#FCFBF9] px-5 py-4 text-left">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Building2 className="h-4 w-4 text-[#701A35]" /> Company-wise Funding & Recovery
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">{companyPnL.length} companies — funded vs collected vs outstanding</p>
            </div>
            {showCompany ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {showCompany && (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    <th className="w-[26%] px-4 py-3 text-left">Company</th>
                    <th className="w-[10%] px-4 py-3 text-left">Type</th>
                    <th className="w-[14%] px-4 py-3 text-right">Principal</th>
                    <th className="w-[14%] px-4 py-3 text-right">Scheduled</th>
                    <th className="w-[16%] px-4 py-3 text-right">Collected</th>
                    <th className="w-[16%] px-4 py-3 text-right">Outstanding</th>
                    <th className="w-[16%] px-4 py-3">Recovery %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companyPnL.map((c) => (
                    <tr key={c.companyId} className="hover:bg-[#FCFAF7] transition-colors">
                      <td className="px-4 py-3">
                        <span className="block font-bold text-slate-800">{c.companyName}</span>
                        <span className="text-[10px] text-slate-400">{c.companyCode}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                          c.isOutsideParty
                            ? 'bg-violet-50 text-violet-700 border-violet-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {c.isOutsideParty ? 'Outside' : 'Own'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatINR(c.totalFunded)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatINR(c.totalScheduled)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatINR(c.totalCollected)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#245B9B]">{formatINR(c.outstanding)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full ${rateBarColor(c.recoveryRate)}`}
                              style={{ width: `${Math.min(c.recoveryRate, 100)}%` }} />
                          </div>
                          <span className={`w-12 text-right text-[11px] font-bold ${rateColor(c.recoveryRate)}`}>
                            {c.recoveryRate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Monthly Trend */}
      <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
        <div className="flex items-center justify-between border-b border-[#E7DFD2] bg-[#FCFBF9] px-5 py-4">
          <div>
            <button type="button" onClick={() => setShowMonthly((v) => !v)}
              className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Calendar className="h-4 w-4 text-[#701A35]" />
              Month-wise Cash Flow Trend
              {showMonthly
                ? <ChevronUp className="h-4 w-4 text-slate-400 ml-1" />
                : <ChevronDown className="h-4 w-4 text-slate-400 ml-1" />}
            </button>
            <p className="mt-1 text-[11px] text-slate-500">
              {monthly.length} month{monthly.length === 1 ? '' : 's'} of data
            </p>
          </div>
          <CustomSelect value={yearFilter} onChange={setYearFilter} options={[{ value: 'all', label: 'All Years' }, ...availableYears.map((year) => ({ value: year, label: year }))]} buttonClassName="rounded-xl border-slate-200 bg-white px-3 py-2 text-xs text-slate-700" menuClassName="min-w-full" />
        </div>
        {showMonthly && (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  <th className="w-[14%] px-4 py-3 text-left">Month</th>
                  <th className="w-[17%] px-4 py-3 text-right">Portfolio Deployed</th>
                  <th className="w-[17%] px-4 py-3 text-right">Cash Disbursed</th>
                  <th className="w-[14%] px-4 py-3 text-right">Interest Booked</th>
                  <th className="w-[17%] px-4 py-3 text-right">Cash Collected</th>
                  <th className="w-[17%] px-4 py-3 text-right">Net Cash Flow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthly.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                    {isLoading ? 'Loading…' : 'No data for selected period.'}
                  </td></tr>
                ) : monthly.map((m) => (
                  <tr key={m.monthKey} className="hover:bg-[#FCFAF7] transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800">{m.monthLabel}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {m.deployed > 0 ? formatINR(m.deployed) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-[#701A35] font-semibold">
                      {m.disbursed > 0 ? formatINR(m.disbursed) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-violet-700 font-semibold">
                      {m.interest > 0 ? formatINR(m.interest) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">
                      {m.collected > 0 ? formatINR(m.collected) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${m.netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {m.netCashFlow >= 0 ? '+' : ''}{formatINR(m.netCashFlow)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

function PnLCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  const tones: Record<string, string> = {
    amber: 'border-[#E1C98D] bg-[#FBF8F3]',
    green: 'border-emerald-200 bg-emerald-50/50',
    blue: 'border-blue-200 bg-blue-50/50',
    violet: 'border-violet-200 bg-violet-50/50',
    slate: 'border-slate-200 bg-slate-50',
    red: 'border-red-200 bg-red-50/50',
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone] || tones.slate}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
        {icon}{label}
      </div>
      <strong className="mt-2 block truncate text-base font-bold text-slate-900 tabular-nums">{value}</strong>
    </div>
  );
}

function TallyPnLStatement({ accounting, companyName }: { accounting: ReturnType<typeof buildReportAccounting>; companyName: string }) {
  const { debitTotal, creditTotal } = tallyPnLTotals(accounting);
  const isBalanced = Math.abs(creditTotal - debitTotal) < 0.01;
  const periodLabel = `${formatStatementDate(accounting.period.fromDate)} to ${formatStatementDate(accounting.period.toDate)}`;

  return (
    <section className="overflow-hidden border border-[#B8B0A4] bg-white shadow-sm">
      <div className="border-b border-[#B8B0A4] px-4 py-3 text-center">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-900">{companyName}</h2>
        <p className="mt-0.5 text-xs font-semibold text-slate-600">Profit &amp; Loss Account</p>
        <p className="text-[11px] text-slate-500">{periodLabel}</p>
      </div>
      <div className="grid divide-y divide-[#B8B0A4] md:grid-cols-2 md:divide-x md:divide-y-0">
        <TallyPnLColumn
          title="Particulars"
          side="Dr"
          rows={[
            ...(accounting.directExpenses.length ? [{ kind: 'group' as const, label: 'Direct Expenses' }, ...accounting.directExpenses.map((line) => ({ kind: 'line' as const, label: line.label, amount: line.amount }))] : []),
            accounting.grossProfit >= 0
              ? { kind: 'transfer' as const, label: 'Gross Profit c/o', amount: accounting.grossProfit }
              : { kind: 'transfer' as const, label: 'Gross Loss b/f', amount: Math.abs(accounting.grossProfit) },
            ...(accounting.indirectExpenses.length ? [{ kind: 'group' as const, label: 'Indirect Expenses' }, ...accounting.indirectExpenses.map((line) => ({ kind: 'line' as const, label: line.label, amount: line.amount }))] : []),
            ...(accounting.netProfit >= 0 ? [{ kind: 'result' as const, label: 'Net Profit', amount: accounting.netProfit }] : []),
            ...(accounting.netProfit < 0 ? [{ kind: 'result' as const, label: 'Net Loss', amount: Math.abs(accounting.netProfit) }] : []),
          ]}
          total={debitTotal}
          accent="debit"
        />
        <TallyPnLColumn
          title="Particulars"
          side="Cr"
          rows={[
            ...(accounting.directIncome.length ? [{ kind: 'group' as const, label: 'Direct Incomes' }, ...accounting.directIncome.map((line) => ({ kind: 'line' as const, label: line.label, amount: line.amount }))] : []),
            ...(accounting.grossProfit >= 0 ? [{ kind: 'transfer' as const, label: 'Gross Profit b/f', amount: accounting.grossProfit }] : []),
            ...(accounting.indirectIncome.length ? [{ kind: 'group' as const, label: 'Indirect Incomes' }, ...accounting.indirectIncome.map((line) => ({ kind: 'line' as const, label: line.label, amount: line.amount }))] : []),
            ...(accounting.netProfit < 0 ? [{ kind: 'result' as const, label: 'Net Loss', amount: Math.abs(accounting.netProfit) }] : []),
          ]}
          total={creditTotal}
          accent="credit"
        />
      </div>
      <div className={`flex items-center justify-between border-t border-[#B8B0A4] px-4 py-2.5 text-xs font-bold ${isBalanced ? 'bg-[#F7FAF6] text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
        <span>{isBalanced ? 'P&L totals agree' : 'P&L difference requires review'}</span>
        <span>{formatINR(Math.abs(creditTotal - debitTotal))}</span>
      </div>
    </section>
  );
}

type TallyPnLRow = { kind: 'group' | 'line' | 'transfer' | 'result'; label: string; amount?: number };

function TallyPnLColumn({ title, side, rows, total, accent }: { title: string; side: 'Dr' | 'Cr'; rows: TallyPnLRow[]; total: number; accent: 'debit' | 'credit' }) {
  return (
    <div>
      <div className={`flex items-center justify-between border-b border-[#B8B0A4] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] ${accent === 'credit' ? 'bg-[#FFF8E6]' : 'bg-[#FAF8F4]'}`}>
        <span>{title}</span><span>{side}</span>
      </div>
      <div className="min-h-[290px]">
        {rows.length === 0 ? <p className="px-4 py-10 text-xs italic text-slate-400">No entries recorded for this period.</p> : rows.map((row, index) => (
          <div key={`${row.kind}-${row.label}-${index}`} className={`flex items-center justify-between gap-3 px-4 py-1.5 text-xs ${row.kind === 'group' ? 'border-y border-[#D9D2C7] bg-[#F8F6F2] font-bold text-slate-800' : row.kind === 'result' ? 'border-t border-[#8B8175] font-bold text-slate-900' : row.kind === 'transfer' ? 'font-bold text-slate-900' : 'pl-7 text-slate-700'}`}>
            <span>{row.kind === 'line' ? row.label : row.label}</span>
            {row.amount !== undefined && <span className="whitespace-nowrap text-right tabular-nums">{formatINR(row.amount)}</span>}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t-2 border-[#80766A] bg-[#F3EFE7] px-4 py-2.5 text-xs font-bold text-slate-900">
        <span>Total</span><span className="tabular-nums">{formatINR(total)}</span>
      </div>
    </div>
  );
}

function ReconciliationMetric({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'positive' | 'negative' }) {
  return <div className="rounded-lg border border-[#E0D8CB] bg-[#FCFBF8] px-3 py-2"><span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</span><strong className={`mt-1 block text-sm tabular-nums ${tone === 'positive' ? 'text-emerald-700' : tone === 'negative' ? 'text-rose-700' : 'text-slate-800'}`}>{formatINR(value)}</strong></div>;
}

function formatStatementDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
