'use client';

import React, { useMemo } from 'react';
import { ArrowRight, CalendarClock, CreditCard, ReceiptText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { StatusPill } from '@/components/ui/StatusPill';

const PAID_STATUSES = new Set(['PASS', 'NEFT', 'CASH', 'PAID', 'CLS', 'CS', 'SETTLED', 'CLOSED']);
const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

export const CustomerDashboardView: React.FC = () => {
  const router = useRouter();
  const { currentActor, loans, isLoading } = useApp();
  const payments = useMemo(() => loans.flatMap((loan) => loan.installments.map((installment) => ({ loan, installment }))).filter(({ installment }) => installment.dueDate && !PAID_STATUSES.has(String(installment.status).toUpperCase())).sort((a, b) => a.installment.dueDate.localeCompare(b.installment.dueDate)), [loans]);
  const nextPayment = payments[0];
  const totalAmount = loans.reduce((sum, loan) => sum + Number(loan.totalAmount || 0), 0);
  const totalPaid = loans.reduce((sum, loan) => sum + Number(loan.totalCollected || 0), 0);
  const outstanding = Math.max(0, totalAmount - totalPaid);

  if (isLoading && loans.length === 0) return <div className="space-y-5 animate-pulse"><div className="h-40 rounded-3xl bg-slate-200" /><div className="grid gap-3 md:grid-cols-3"><div className="h-28 rounded-2xl bg-slate-200" /><div className="h-28 rounded-2xl bg-slate-200" /><div className="h-28 rounded-2xl bg-slate-200" /></div><div className="h-64 rounded-3xl bg-slate-200" /></div>;

  return <main className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-8">
    <section className="rounded-3xl bg-gradient-to-br from-[#1A0A13] via-[#2A1020] to-[#14060E] p-6 text-white shadow-sm sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059]">Customer portal</p><div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight text-[#EED8A1]">Welcome, {currentActor.name}</h1><p className="mt-1 text-sm text-slate-300">A private view of your loan balance and repayment schedule.</p></div><span className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-mono text-slate-300">Account {currentActor.id}</span></div></section>
    <section className="grid gap-3 sm:grid-cols-3"><PortalMetric label="Total loan amount" value={totalAmount} /><PortalMetric label="Amount paid" value={totalPaid} accent="emerald" /><PortalMetric label="Outstanding balance" value={outstanding} accent="gold" /></section>
    <section className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${nextPayment ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}><div className="flex items-start gap-3"><div className={`rounded-xl p-2.5 ${nextPayment ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}><CalendarClock className="h-5 w-5" /></div><div><p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${nextPayment ? 'text-amber-700' : 'text-emerald-700'}`}>{nextPayment ? 'Next payment reminder' : 'Repayment status'}</p><h2 className="mt-1 text-base font-bold text-slate-900">{nextPayment ? `Payment due on ${formatDate(nextPayment.installment.dueDate)}` : 'All scheduled payments are up to date'}</h2>{nextPayment && <p className="mt-1 text-xs text-slate-600">{nextPayment.loan.id} · installment #{nextPayment.installment.seqNo}</p>}</div></div>{nextPayment && <MoneyDisplay amount={nextPayment.installment.amountDue} size="lg" amountClassName="font-black text-amber-900" />}</section>
    <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A07A39]">Assigned records</p><h2 className="mt-1 text-lg font-bold text-slate-900">Your loan accounts</h2></div><CreditCard className="h-5 w-5 text-[#701A35]" /></div><div className="mt-4 space-y-3">{loans.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No loan accounts are assigned to this login.</p> : loans.map((loan) => <button key={loan.id} onClick={() => router.push(`/loans/${encodeURIComponent(loan.id)}`)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-[#C5A059] hover:bg-[#FFFBF2]"><span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{loan.id}</strong><span className="mt-1 block text-[11px] text-slate-500">{loan.installmentCount} {loan.frequency} installments · {loan.status}</span></span><span className="flex items-center gap-3"><MoneyDisplay amount={loan.totalOutstanding || 0} size="sm" amountClassName="font-bold text-[#701A35]" /><ArrowRight className="h-4 w-4 text-slate-400" /></span></button>)}</div></div><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><ReceiptText className="h-5 w-5 text-[#701A35]" /><div><h2 className="text-base font-bold text-slate-900">Recent transactions</h2><p className="mt-0.5 text-[11px] text-slate-500">Your latest repayment activity</p></div></div><div className="mt-4 divide-y divide-slate-100">{loans.flatMap((loan) => loan.installments.map((installment) => ({ loan, installment }))).sort((a, b) => (b.installment.recdDate || b.installment.dueDate).localeCompare(a.installment.recdDate || a.installment.dueDate)).slice(0, 5).map(({ loan, installment }) => <div key={installment.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><strong className="block truncate text-xs text-slate-800">{loan.id} · #{installment.seqNo}</strong><span className="text-[10px] text-slate-500">{formatDate(installment.recdDate || installment.dueDate)}</span></div><div className="text-right"><MoneyDisplay amount={installment.amountDue} size="sm" amountClassName="font-bold text-slate-900" /><StatusPill status={installment.status} size="xs" /></div></div>)}{loans.length > 0 && loans.every((loan) => loan.installments.length === 0) && <p className="py-8 text-center text-xs text-slate-500">No transactions are available yet.</p>}<button onClick={() => router.push('/loans')} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#701A35] hover:underline">View all transactions <ArrowRight className="h-3.5 w-3.5" /></button></div></div></section>
  </main>;
};

function PortalMetric({ label, value, accent }: { label: string; value: number; accent?: 'emerald' | 'gold' }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span><MoneyDisplay amount={value} size="xl" amountClassName={`mt-2 block font-black ${accent === 'emerald' ? 'text-emerald-700' : accent === 'gold' ? 'text-[#701A35]' : 'text-slate-950'}`} /></div>;
}
