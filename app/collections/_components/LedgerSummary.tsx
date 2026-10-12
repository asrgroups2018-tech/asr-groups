'use client';

import React, { useMemo } from 'react';
import { BarChart3, FileText, TrendingDown, TrendingUp } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useApp } from '@/lib/store';
import { formatINR } from '@/lib/utils/formatCurrency';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';
import { isPaid, isBounce, dateKey } from './CollectionsView';
import type { DateRange, Period, CollectionStats } from './CollectionsView';

const pdfMoney = (v: number) => `INR ${Number(v || 0).toLocaleString('en-IN')}`;
const safeFile = (v: string) => v.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase() || 'ledger';

export const LedgerSummary: React.FC<{
  dateRange: DateRange;
  stats: CollectionStats;
  period: Period;
  periodLabel: string;
}> = ({ dateRange, stats, period, periodLabel }) => {
  const { loans, companies, showToast, systemSettings } = useApp();

  // Build company name map
  const companyMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companies) m.set(c.id, c.name || c.id);
    return m;
  }, [companies]);

  // ── Income breakdown for this period ──
  const incomeBreakdown = useMemo(() => {
    const { from, to } = dateRange;
    const modes: Record<string, number> = {};
    let total = 0;

    const isAllTime = !from && !to;

    for (const loan of loans) {
      for (const inst of loan.installments || []) {
        if (!isPaid(inst.status)) continue;
        if (!isAllTime) {
          const rDate = dateKey(inst.recdDate || '');
          if (!rDate || rDate < from || rDate > to) continue;
        }
        const mode = String(inst.status || 'CASH').trim().toUpperCase();
        const amt = Number(inst.amountDue || 0);
        modes[mode] = (modes[mode] || 0) + amt;
        total += amt;
      }
    }
    return { modes, total };
  }, [loans, dateRange]);

  // ── Expense breakdown for this period ──
  const expenseBreakdown = useMemo(() => {
    const { from, to } = dateRange;
    const byCompany: Record<string, number> = {};
    let totalDisbursed = 0;
    let totalInterest = 0;

    const isAllTime2 = !from && !to;

    for (const loan of loans) {
      const startDate = dateKey(loan.startDate || '');
      if (!isAllTime2 && (!startDate || startDate < from || startDate > to)) continue;

      const totalAmt = Number(loan.totalAmount || 0);
      const interest = Number(loan.interestAmount || 0);
      const disbursed = loan.disbursedAmount != null
        ? Number(loan.disbursedAmount)
        : Math.max(0, totalAmt - interest);

      totalDisbursed += disbursed;
      totalInterest += interest;

      const splits = (loan as any).splits || [];
      if (splits.length > 0) {
        for (const sp of splits) {
          const cName = companyMap.get(sp.companyId) || 'Unknown';
          byCompany[cName] = (byCompany[cName] || 0) + Number(sp.splitAmount || 0);
        }
      } else {
        byCompany['Own Funds'] = (byCompany['Own Funds'] || 0) + disbursed;
      }
    }
    return { byCompany, totalDisbursed, totalInterest };
  }, [loans, companies, companyMap, dateRange]);

  // ── Bounce breakdown for this period ──
  const bounceInPeriod = useMemo(() => {
    const { from, to } = dateRange;
    let total = 0, count = 0;
    for (const loan of loans) {
      for (const inst of loan.installments || []) {
        if (!isBounce(inst.status)) continue;
        const dDate = dateKey(inst.dueDate || '');
        if (!dDate || dDate < from || dDate > to) continue;
        total += Number(inst.amountDue || 0);
        count++;
      }
    }
    return { total, count };
  }, [loans, dateRange]);

  const netBalance = incomeBreakdown.total - expenseBreakdown.totalDisbursed;
  const companyName = systemSettings.companyProfile.companyName || 'ASR Groups';
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const exportPdf = () => {
    if (incomeBreakdown.total === 0 && expenseBreakdown.totalDisbursed === 0) {
      showToast('Nothing to export', 'No data for this period.', 'warning'); return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(112, 26, 53); doc.rect(0, 0, pw, 72, 'F');
    doc.setFillColor(197, 160, 89); doc.rect(0, 70, pw, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(255, 255, 255);
    doc.text(companyName.toUpperCase(), pw / 2, 24, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('COLLECTIONS LEDGER SUMMARY', pw / 2, 42, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(238, 216, 161);
    doc.text(`Period: ${periodLabel} · Printed: ${today}`, pw / 2, 58, { align: 'center' });

    // Net balance bar
    const netPositive = netBalance >= 0;
    doc.setFillColor(netPositive ? 21 : 185, netPositive ? 128 : 28, netPositive ? 61 : 28);
    doc.roundedRect(36, 84, pw - 72, 36, 4, 4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text(`NET BALANCE: ${pdfMoney(Math.abs(netBalance))} ${netPositive ? '(Surplus)' : '(Deficit)'}`, pw / 2, 107, { align: 'center' });

    // Two-column summary
    const incomeRows: string[][] = [];
    incomeRows.push(['EMI Collections (Total)', '', pdfMoney(incomeBreakdown.total)]);
    for (const [mode, amt] of Object.entries(incomeBreakdown.modes)) {
      incomeRows.push([`  ↳ ${mode}`, '', pdfMoney(amt)]);
    }

    const expenseRows: string[][] = [];
    expenseRows.push(['Loans Disbursed (Total)', pdfMoney(expenseBreakdown.totalDisbursed), '']);
    for (const [co, amt] of Object.entries(expenseBreakdown.byCompany)) {
      expenseRows.push([`  ↳ ${co}`, pdfMoney(amt), '']);
    }
    if (expenseBreakdown.totalInterest > 0) {
      expenseRows.push(['Interest Booked', pdfMoney(expenseBreakdown.totalInterest), '']);
    }
    if (bounceInPeriod.count > 0) {
      expenseRows.push([`Bounce / Return (${bounceInPeriod.count})`, pdfMoney(bounceInPeriod.total), '']);
    }

    const maxLen = Math.max(incomeRows.length, expenseRows.length);
    const combined: string[][] = [];
    for (let i = 0; i < maxLen; i++) {
      const inc = incomeRows[i] || ['', '', ''];
      const exp = expenseRows[i] || ['', '', ''];
      combined.push([inc[0], inc[2], exp[0], exp[1]]);
    }

    autoTable(doc, {
      startY: 132,
      head: [['INCOME — Credit Side', 'Amount (₹)', 'EXPENSE — Debit Side', 'Amount (₹)']],
      body: combined,
      foot: [['TOTAL INCOME', pdfMoney(incomeBreakdown.total), 'TOTAL EXPENSE', pdfMoney(expenseBreakdown.totalDisbursed)]],
      theme: 'grid',
      headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8.5, cellPadding: 6 },
      footStyles: { fillColor: [243, 239, 230], textColor: [112, 26, 53], fontSize: 9.5, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: 36, right: 36, bottom: 60 },
    });

    // Words
    const finalY: number = (doc as any).lastAutoTable?.finalY || 450;
    if (finalY + 60 < ph) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(110, 90, 80);
      doc.text(`Net Balance in Words: ${numberToWordsINR(Math.abs(netBalance))} Only (${netPositive ? 'Surplus' : 'Deficit'})`,
        pw / 2, finalY + 24, { align: 'center' });
    }
    doc.setFontSize(7.5); doc.setTextColor(160, 140, 130); doc.setFont('helvetica', 'normal');
    doc.text('This is a system-generated summary. All figures are dynamic and based on current records.',
      pw / 2, ph - 18, { align: 'center' });

    doc.save(`ASR_LedgerSummary_${safeFile(periodLabel)}.pdf`);
    showToast('Ledger Summary PDF', 'Exported.', 'success');
  };

  const ModeRow = ({ label, value, indent }: { label: string; value: number; indent?: boolean }) => (
    <div className={`flex items-center justify-between py-1.5 ${indent ? 'pl-5' : ''}`}>
      <span className={`text-xs ${indent ? 'text-slate-500' : 'font-semibold text-slate-700'}`}>
        {indent && <span className="mr-1 text-slate-300">↳</span>}{label}
      </span>
      <span className={`tabular-nums text-xs font-bold ${indent ? 'text-slate-700' : 'text-emerald-700'}`}>
        {formatINR(value)}
      </span>
    </div>
  );

  const ExpRow = ({ label, value, indent }: { label: string; value: number; indent?: boolean }) => (
    <div className={`flex items-center justify-between py-1.5 ${indent ? 'pl-5' : ''}`}>
      <span className={`text-xs ${indent ? 'text-slate-500' : 'font-semibold text-slate-700'}`}>
        {indent && <span className="mr-1 text-slate-300">↳</span>}{label}
      </span>
      <span className={`tabular-nums text-xs font-bold ${indent ? 'text-slate-700' : 'text-blue-700'}`}>
        {formatINR(value)}
      </span>
    </div>
  );

  const hasData = incomeBreakdown.total > 0 || expenseBreakdown.totalDisbursed > 0;

  return (
    <div className="space-y-5 pb-6">
      {/* Net Balance Hero */}
      <div className={`rounded-3xl p-6 text-white ${netBalance >= 0 ? 'bg-gradient-to-r from-emerald-700 to-emerald-600' : 'bg-gradient-to-r from-rose-700 to-rose-600'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-70">Net Balance · {periodLabel}</p>
            <div className="mt-2 flex items-center gap-3">
              {netBalance >= 0 ? <TrendingUp className="h-8 w-8 opacity-80" /> : <TrendingDown className="h-8 w-8 opacity-80" />}
              <span className="text-3xl font-bold tabular-nums">{formatINR(Math.abs(netBalance))}</span>
              <span className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[11px] font-bold">
                {netBalance >= 0 ? '▲ Surplus' : '▼ Deficit'}
              </span>
            </div>
            <p className="mt-2 text-[11px] opacity-70">{numberToWordsINR(Math.abs(netBalance))} Only</p>
          </div>
          <button type="button" onClick={exportPdf} disabled={!hasData}
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/30 disabled:opacity-45">
            <FileText className="h-4 w-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Income (Cr)', value: incomeBreakdown.total, tone: 'green' as const },
          { label: 'Total Expense (Dr)', value: expenseBreakdown.totalDisbursed, tone: 'blue' as const },
          { label: 'Interest Booked', value: expenseBreakdown.totalInterest, tone: 'amber' as const },
          { label: 'Bounce / RET', value: bounceInPeriod.total, tone: 'red' as const },
        ].map(({ label, value, tone }) => {
          const colors = { green: 'border-emerald-200 bg-emerald-50/60', blue: 'border-blue-200 bg-blue-50/60', amber: 'border-amber-200 bg-amber-50/50', red: 'border-red-200 bg-red-50/50' };
          const textColors = { green: 'text-emerald-700', blue: 'text-blue-700', amber: 'text-amber-700', red: 'text-red-700' };
          return (
            <div key={label} className={`rounded-2xl border px-4 py-3.5 ${colors[tone]}`}>
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</span>
              <strong className={`mt-1.5 block text-lg font-bold tabular-nums ${textColors[tone]}`}>{formatINR(value)}</strong>
            </div>
          );
        })}
      </div>

      {/* Two-column Tally-style ledger */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Income (Credit) */}
        <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-[0_8px_24px_rgba(21,128,61,0.06)]">
          <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50/70 px-5 py-4">
            <TrendingUp className="h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-sm font-bold text-emerald-900">Income — Credit Side</h2>
              <p className="text-[11px] text-emerald-700">Collections received in {periodLabel}</p>
            </div>
          </div>
          <div className="p-5">
            {incomeBreakdown.total === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No income in this period.</p>
            ) : (
              <div className="space-y-0.5">
                <ModeRow label="EMI Collections" value={incomeBreakdown.total} />
                <div className="border-t border-dashed border-slate-100 pt-1">
                  {Object.entries(incomeBreakdown.modes).map(([mode, amt]) => (
                    <ModeRow key={mode} label={mode} value={amt} indent />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <span className="text-sm font-bold text-emerald-800">TOTAL INCOME (Cr)</span>
                  <span className="text-lg font-bold text-emerald-700 tabular-nums">{formatINR(incomeBreakdown.total)}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Expense (Debit) */}
        <section className="overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <div className="flex items-center gap-3 border-b border-blue-100 bg-blue-50/70 px-5 py-4">
            <TrendingDown className="h-5 w-5 text-blue-700" />
            <div>
              <h2 className="text-sm font-bold text-blue-900">Expense — Debit Side</h2>
              <p className="text-[11px] text-blue-700">Loans disbursed in {periodLabel}</p>
            </div>
          </div>
          <div className="p-5">
            {expenseBreakdown.totalDisbursed === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No disbursements in this period.</p>
            ) : (
              <div className="space-y-0.5">
                <ExpRow label="Loans Disbursed" value={expenseBreakdown.totalDisbursed} />
                <div className="border-t border-dashed border-slate-100 pt-1">
                  {Object.entries(expenseBreakdown.byCompany).map(([co, amt]) => (
                    <ExpRow key={co} label={co} value={amt} indent />
                  ))}
                </div>
                {expenseBreakdown.totalInterest > 0 && (
                  <>
                    <div className="border-t border-dashed border-slate-100 pt-1">
                      <ExpRow label="Interest Booked (receivable)" value={expenseBreakdown.totalInterest} />
                    </div>
                  </>
                )}
                {bounceInPeriod.count > 0 && (
                  <div className="border-t border-dashed border-slate-100 pt-1">
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-xs font-semibold text-red-600">Bounce / Return ({bounceInPeriod.count})</span>
                      <span className="tabular-nums text-xs font-bold text-red-600">{formatINR(bounceInPeriod.total)}</span>
                    </div>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3">
                  <span className="text-sm font-bold text-blue-800">TOTAL EXPENSE (Dr)</span>
                  <span className="text-lg font-bold text-blue-700 tabular-nums">{formatINR(expenseBreakdown.totalDisbursed)}</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Period comparison */}
      <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_8px_24px_rgba(58,34,22,0.04)]">
        <div className="border-b border-[#E7DFD2] bg-[#FCFBF9] px-5 py-4 flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-[#701A35]" />
          <h2 className="text-sm font-bold text-slate-900">Overall Portfolio Snapshot</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { label: 'Today — Collected', value: stats.collectedToday, tone: 'green' as const },
            { label: 'Today — Pending', value: stats.pendingToday, tone: 'red' as const },
            { label: 'Week — Collected', value: stats.collectedThisWeek, tone: 'green' as const },
            { label: 'Week — Due', value: stats.dueThisWeek, tone: 'amber' as const },
            { label: 'Month — Collected', value: stats.collectedThisMonth, tone: 'green' as const },
            { label: 'Month — Pending', value: stats.pendingThisMonth, tone: 'red' as const },
            { label: 'Month — Disbursed', value: stats.disbursedThisMonth, tone: 'blue' as const },
            { label: 'All-time Disbursed', value: stats.disbursedTotal, tone: 'blue' as const },
            { label: 'Total Bounce (all-time)', value: stats.bounceTotal, tone: 'red' as const },
          ].map(({ label, value, tone }) => {
            const tc = { green: 'text-emerald-700', red: 'text-red-600', blue: 'text-blue-700', amber: 'text-amber-700' }[tone];
            return (
              <div key={label} className="flex items-center justify-between px-5 py-3 hover:bg-[#FCFAF7] transition-colors">
                <span className="text-xs font-medium text-slate-600">{label}</span>
                <span className={`text-xs font-bold tabular-nums ${tc}`}>{formatINR(value)}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
