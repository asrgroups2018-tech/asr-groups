'use client';

import React, { useState } from 'react';
import { ArrowLeft, LockKeyhole, Send } from 'lucide-react';
import Link from 'next/link';

export default function AccessDeniedClient({ resource, action, from }: { resource: string; action: string; from: string }) {
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const requestAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) return;
    setSaving(true);
    const response = await fetch('/api/access-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ moduleId: resource, action, reason }) });
    setSaving(false);
    if (response.ok) setSubmitted(true);
  };
  return <main className="flex min-h-screen items-center justify-center bg-[#F7F5F0] p-5"><section className="w-full max-w-lg rounded-3xl border border-[#E6E1D6] bg-white p-7 text-center shadow-xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#701A35] text-[#EED8A1]"><LockKeyhole className="h-7 w-7" /></div><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A7A3A]">Access controlled</p><h1 className="mt-2 text-2xl font-bold text-slate-900">You don’t have access to this page</h1><p className="mt-2 text-sm text-slate-500">Your current role cannot {action} the {resource} page. If you need this permission, send a request to the Super Admin.</p>{submitted ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800">Access request submitted. You will be notified after review.</div> : <form onSubmit={requestAccess} className="mt-6 text-left"><label className="text-xs font-bold text-slate-700">Reason for access<textarea required value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder="Explain the work this access is needed for" className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-[#C5A059] focus:bg-white" /></label><button type="submit" disabled={saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#701A35] px-4 py-3 text-xs font-bold text-white disabled:opacity-60"><Send className="h-4 w-4" />{saving ? 'Sending…' : 'Request access'}</button></form>}<Link href={from === '/access-denied' ? '/dashboard' : from} className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#701A35] hover:underline"><ArrowLeft className="h-3.5 w-3.5" />Back to a permitted page</Link></section></main>;
}
