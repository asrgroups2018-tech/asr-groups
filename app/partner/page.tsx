'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Landmark, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { formatINR } from '@/lib/utils/formatCurrency';
import { PartnerPortalData, PartnerPortalTransaction } from '@/lib/types';

export default function PartnerPortalPage() {
  const [data, setData] = useState<PartnerPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadPortal = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/partner/portal', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load the company account.');
      setData(result.data as PartnerPortalData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the company account.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPortal(); }, [loadPortal]);

  const transactions = useMemo(() => (data?.transactions || []).filter((transaction) => (
    (!fromDate || transaction.date >= fromDate) && (!toDate || transaction.date <= toDate)
  )), [data, fromDate, toDate]);

  const downloadStatement = () => {
    if (!data) return;
    const columns = ['Date', 'Entry', 'Due date', 'Received date', 'Scheduled share', 'Received share', 'Status'];
    const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = transactions.map((entry) => [
      entry.date,
      entry.category,
      entry.dueDate || '',
      entry.receivedDate || '',
      entry.expectedAmount,
      entry.receivedAmount,
      entry.status,
    ]);
    const csv = [columns, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.company.shortCode.toLowerCase()}-company-statement.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl space-y-5 p-4 pb-10 sm:p-8">
        {loading && !data ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8 text-sm text-slate-300">Loading your company account…</div>
        ) : error && !data ? (
          <section className="rounded-2xl border border-rose-900/60 bg-slate-900 p-6 text-center">
            <p className="text-sm font-semibold text-rose-300">{error}</p>
            <button type="button" onClick={() => void loadPortal()} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-xs font-bold text-white"><RefreshCw className="h-3.5 w-3.5" /> Retry</button>
          </section>
        ) : data ? (
          <>
            <section className="flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#701A35] text-[#EED8A1]"><Landmark className="h-6 w-6" /></div>
                <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">Partner company account</p><h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">{data.company.name}</h1><p className="mt-1 text-xs text-slate-400">Company code · {data.company.shortCode}</p></div>
              </div>
              <button type="button" onClick={() => void loadPortal()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh account</button>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric title="Capital allocated" amount={data.totalFunded} detail={`${data.capitalSharePercent.toFixed(1)}% share of associated portfolio`} tone="rose" />
              <Metric title="Scheduled return share" amount={data.totalScheduledReturn} detail="Your company’s scheduled installments" tone="blue" />
              <Metric title="Received return share" amount={data.totalReceivedReturn} detail={`${data.recoveryPercent.toFixed(1)}% of scheduled share received`} tone="green" />
              <Metric title="Remaining scheduled share" amount={data.remainingScheduledReturn} detail="Scheduled amount not yet received" tone="amber" />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">Projected profit / (loss)</p><p className="mt-1 text-xs text-slate-400">Recorded interest allocated to your company</p></div>{data.projectedProfitLoss >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-400" /> : <TrendingDown className="h-5 w-5 text-rose-400" />}</div>
                <div className={`mt-4 text-3xl font-bold tabular-nums ${data.projectedProfitLoss >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatINR(data.projectedProfitLoss)}</div>
                <p className="mt-2 text-sm font-semibold text-slate-200">{data.projectedProfitLossPercent.toFixed(2)}% of your company’s deployed capital</p>
                <p className="mt-4 border-t border-slate-700 pt-3 text-[11px] leading-relaxed text-slate-400">Calculated from recorded loan interest and your company’s split percentage. Allocated, deployed, scheduled, and received amounts are shown separately.</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">Company balance</p>
                <div className="mt-4 flex items-center justify-between gap-3"><span className="text-sm text-slate-300">Opening balance</span><MoneyDisplay amount={Math.abs(data.openingBalance)} size="sm" amountClassName="font-bold text-white" /></div>
                <p className="mt-1 text-right text-[10px] font-semibold text-slate-500">{data.openingBalance < 0 ? 'Credit' : 'Debit'}</p>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-700 pt-4"><span className="text-sm text-slate-300">Cash capital deployed</span><MoneyDisplay amount={data.capitalDeployed} size="sm" amountClassName="font-bold text-white" /></div>
                <p className="mt-2 text-[11px] text-slate-500">The account view contains only this company’s capital and return-share figures.</p>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
              <div className="flex flex-col gap-3 border-b border-slate-700 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div><h2 className="text-sm font-bold text-white">Monthly account summary</h2><p className="mt-1 text-[11px] text-slate-400">Capital allocations, scheduled share, and received share by month</p></div>
              </div>
              <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-xs"><thead className="bg-slate-800/80 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Month</th><th className="px-5 py-3 text-right">Capital allocated</th><th className="px-5 py-3 text-right">Scheduled return</th><th className="px-5 py-3 text-right">Received return</th></tr></thead><tbody className="divide-y divide-slate-800">{data.monthly.length ? data.monthly.map((month) => <tr key={month.month} className="text-slate-200"><td className="px-5 py-3 font-semibold">{formatMonth(month.month)}</td><td className="px-5 py-3 text-right tabular-nums">{formatINR(month.capitalAllocated)}</td><td className="px-5 py-3 text-right tabular-nums">{formatINR(month.scheduledReturn)}</td><td className="px-5 py-3 text-right font-semibold text-emerald-300 tabular-nums">{formatINR(month.receivedReturn)}</td></tr>) : <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No company activity is recorded yet.</td></tr>}</tbody></table></div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
              <div className="flex flex-col gap-3 border-b border-slate-700 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
                <div><h2 className="text-sm font-bold text-white">Company statement</h2><p className="mt-1 text-[11px] text-slate-400">Your company’s capital and installment share entries</p></div>
                <div className="flex flex-wrap items-end gap-2"><label className="text-[10px] font-semibold text-slate-400">From<input aria-label="Statement start date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 block rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-2 text-xs text-white" /></label><label className="text-[10px] font-semibold text-slate-400">To<input aria-label="Statement end date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 block rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-2 text-xs text-white" /></label><button type="button" onClick={downloadStatement} className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"><Download className="h-3.5 w-3.5" /> Export CSV</button></div>
              </div>
              <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-xs"><thead className="bg-slate-800/80 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Entry date</th><th className="px-5 py-3">Entry</th><th className="px-5 py-3">Due / received</th><th className="px-5 py-3 text-right">Scheduled share</th><th className="px-5 py-3 text-right">Received share</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-800">{transactions.length ? transactions.map((entry, index) => <StatementRow key={`${entry.category}-${entry.date}-${entry.dueDate || ''}-${index}`} entry={entry} />) : <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No entries match this date range.</td></tr>}</tbody></table></div>
              <div className="border-t border-slate-700 px-5 py-3 text-[10px] text-slate-500">{transactions.length} company account entries · loan and customer identifiers are not included</div>
            </section>
          </>
        ) : null}
      </main>
    </AppShell>
  );
}

function Metric({ title, amount, detail, tone }: { title: string; amount: number; detail: string; tone: 'rose' | 'blue' | 'green' | 'amber' }) {
  const colors = { rose: 'border-rose-900/70 bg-rose-950/25 text-rose-200', blue: 'border-sky-900/70 bg-sky-950/25 text-sky-200', green: 'border-emerald-900/70 bg-emerald-950/25 text-emerald-200', amber: 'border-amber-800/70 bg-amber-950/20 text-amber-200' };
  return <div className={`rounded-2xl border p-4 sm:p-5 ${colors[tone]}`}><p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-80">{title}</p><MoneyDisplay amount={amount} size="md" amountClassName="mt-2 block text-xl font-bold tabular-nums" /><p className="mt-2 text-[10px] opacity-70">{detail}</p></div>;
}

function StatementRow({ entry }: { entry: PartnerPortalTransaction }) {
  const statusTone = entry.status === 'Paid' || entry.status === 'Allocated' ? 'text-emerald-300' : 'text-amber-300';
  const relatedDates = entry.category === 'Capital allocated'
    ? '—'
    : [entry.dueDate ? `Due ${formatDate(entry.dueDate)}` : '', entry.receivedDate ? `Received ${formatDate(entry.receivedDate)}` : ''].filter(Boolean).join(' · ') || '—';
  return <tr className="text-slate-200"><td className="whitespace-nowrap px-5 py-3">{formatDate(entry.date)}</td><td className="px-5 py-3 font-semibold">{entry.category}</td><td className="px-5 py-3 text-slate-400">{relatedDates}</td><td className="px-5 py-3 text-right tabular-nums">{formatINR(entry.expectedAmount)}</td><td className="px-5 py-3 text-right font-semibold text-emerald-300 tabular-nums">{formatINR(entry.receivedAmount)}</td><td className={`px-5 py-3 font-semibold ${statusTone}`}>{entry.status}</td></tr>;
}

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMonth(value: string) {
  const date = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}
