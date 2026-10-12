'use client';

import React, { useMemo } from 'react';
import { ArrowLeft, CalendarClock, ChevronRight, CreditCard, ReceiptText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { Installment, Loan } from '@/lib/types';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { StatusPill } from '@/components/ui/StatusPill';

const PAID_STATUSES = new Set(['PASS', 'NEFT', 'CASH', 'PAID', 'CLS', 'CS', 'SETTLED', 'CLOSED']);

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const nextUnpaidInstallment = (loans: Loan[]) => loans
  .flatMap((loan) => loan.installments.map((installment) => ({ loan, installment })))
  .filter(({ installment }) => installment.dueDate && !PAID_STATUSES.has(String(installment.status).toUpperCase()))
  .sort((a, b) => a.installment.dueDate.localeCompare(b.installment.dueDate))[0];

export const CustomerLoansView: React.FC<{ loanId?: string }> = ({ loanId }) => {
  const router = useRouter();
  const { loans, currentActor, isLoading } = useApp();
  const visibleLoans = useMemo(() => {
    if (!loanId) return loans;
    const normalized = loanId.toLowerCase();
    return loans.filter((loan) => loan.id.toLowerCase() === normalized || loan.codeNo?.toLowerCase() === normalized);
  }, [loanId, loans]);
  const payments = useMemo(() => visibleLoans.flatMap((loan) => loan.installments.map((installment) => ({ loan, installment }))), [visibleLoans]);
  const nextReminder = useMemo(() => nextUnpaidInstallment(visibleLoans), [visibleLoans]);
  const totalAmount = visibleLoans.reduce((sum, loan) => sum + Number(loan.totalAmount || 0), 0);
  const totalPaid = visibleLoans.reduce((sum, loan) => sum + Number(loan.totalCollected || 0), 0);
  const outstanding = Math.max(0, totalAmount - totalPaid);

  if (isLoading && loans.length === 0) return <div className="space-y-5 animate-pulse"><div className="h-36 rounded-3xl bg-slate-200" /><div className="grid gap-3 md:grid-cols-3"><div className="h-28 rounded-2xl bg-slate-200" /><div className="h-28 rounded-2xl bg-slate-200" /><div className="h-28 rounded-2xl bg-slate-200" /></div><div className="h-72 rounded-3xl bg-slate-200" /></div>;
  if (loanId && visibleLoans.length === 0) return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm"><CreditCard className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 text-base font-bold text-slate-900">Loan record not found</h2><p className="mt-1 text-xs text-slate-500">This loan is not assigned to your account.</p><button onClick={() => router.push('/loans')} className="mt-5 rounded-xl bg-[#701A35] px-4 py-2.5 text-xs font-bold text-white">Return to Loans</button></div>;

  return <div className="space-y-5 pb-8">
    <section className="rounded-3xl bg-gradient-to-br from-[#1A0A13] via-[#2A1020] to-[#14060E] p-6 text-white shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059]">Customer portal</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-[#EED8A1]">{loanId ? visibleLoans[0]?.customerName : currentActor.name}</h1><p className="mt-1 text-sm text-slate-300">Your loan accounts and repayment transactions</p></div>{loanId && <button onClick={() => router.push('/loans')} className="inline-flex items-center gap-2 self-start rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"><ArrowLeft className="h-3.5 w-3.5" />All loans</button>}</div>
      <div className="mt-7 grid gap-4 sm:grid-cols-3"><PortalMetric label="Total loan amount" value={totalAmount} /><PortalMetric label="Amount paid" value={totalPaid} accent="emerald" /><PortalMetric label="Outstanding" value={outstanding} accent="gold" /></div>
    </section>

    <section className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${nextReminder ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}><div className="flex items-start gap-3"><div className={`rounded-xl p-2.5 ${nextReminder ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}><CalendarClock className="h-5 w-5" /></div><div><p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${nextReminder ? 'text-amber-700' : 'text-emerald-700'}`}>{nextReminder ? 'Next payment reminder' : 'Repayment status'}</p>{nextReminder ? <><h2 className="mt-1 text-base font-bold text-slate-900">Payment due on {formatDate(nextReminder.installment.dueDate)}</h2><p className="mt-1 text-xs text-slate-600">Installment {nextReminder.installment.seqNo} · {nextReminder.loan.id}</p></> : <h2 className="mt-1 text-base font-bold text-slate-900">All scheduled payments are up to date</h2>}</div></div>{nextReminder && <MoneyDisplay amount={nextReminder.installment.amountDue} size="lg" amountClassName="font-black text-amber-900" />}</section>

    {!loanId && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A07A39]">Assigned accounts</p><h2 className="mt-1 text-lg font-bold text-slate-900">Your loans</h2></div><span className="rounded-full bg-[#F5EEE3] px-2.5 py-1 text-xs font-bold text-[#701A35]">{visibleLoans.length}</span></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{visibleLoans.map((loan) => <button key={loan.id} onClick={() => router.push(`/loans/${encodeURIComponent(loan.id)}`)} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-[#C5A059] hover:bg-[#FFFBF2]"><span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{loan.customerName}</strong><span className="mt-1 block text-[11px] text-slate-500">{loan.id} · {loan.installmentCount} {loan.frequency} payments</span></span><span className="flex items-center gap-3"><MoneyDisplay amount={loan.totalOutstanding || 0} size="sm" amountClassName="font-bold text-[#701A35]" /><ChevronRight className="h-4 w-4 text-slate-400" /></span></button>)}{visibleLoans.length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No loan accounts are assigned to this login.</p>}</div></section>}

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6"><ReceiptText className="h-5 w-5 text-[#701A35]" /><div><h2 className="text-base font-bold text-slate-900">Payment transactions</h2><p className="mt-0.5 text-[11px] text-slate-500">Only transactions belonging to your assigned account are shown.</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b border-slate-200 bg-[#FCFBF9] text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500"><th className="px-5 py-3">Loan</th><th className="px-5 py-3">Installment</th><th className="px-5 py-3">Due date</th><th className="px-5 py-3">Paid date</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{payments.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">No transactions are available for this account.</td></tr> : [...payments].sort((a, b) => a.installment.dueDate.localeCompare(b.installment.dueDate)).map(({ loan, installment }) => <TransactionRow key={installment.id} loan={loan} installment={installment} />)}</tbody></table></div></section>
  </div>;
};

function PortalMetric({ label, value, accent }: { label: string; value: number; accent?: 'emerald' | 'gold' }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</span><MoneyDisplay amount={value} size="xl" amountClassName={`mt-2 block font-black ${accent === 'emerald' ? 'text-emerald-300' : accent === 'gold' ? 'text-[#EED8A1]' : 'text-white'}`} /></div>;
}

function TransactionRow({ loan, installment }: { loan: Loan; installment: Installment }) {
  return <tr className="hover:bg-[#FCFBF9]"><td className="px-5 py-3.5 font-mono text-[11px] font-bold text-slate-800">{loan.id}</td><td className="px-5 py-3.5 text-slate-700">#{installment.seqNo}</td><td className="px-5 py-3.5 text-slate-600">{formatDate(installment.dueDate)}</td><td className="px-5 py-3.5 text-slate-600">{formatDate(installment.recdDate)}</td><td className="px-5 py-3.5"><MoneyDisplay amount={installment.amountDue} size="sm" amountClassName="font-bold text-slate-900" /></td><td className="px-5 py-3.5"><StatusPill status={installment.status} size="xs" /></td></tr>;
}
