'use client';

import React, { useEffect, useState } from 'react';
import { Check, Clock3, X } from 'lucide-react';
import { AccessRequest } from '@/lib/types';
import { useApp } from '@/lib/store';

export const AccessRequestsTab: React.FC = () => {
  const { showToast, currentActor } = useApp();
  const [items, setItems] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => { const response = await fetch('/api/access-requests', { cache: 'no-store' }); const json = await response.json(); if (json.success) setItems(json.data); setLoading(false); };
  useEffect(() => { void load(); }, []);
  const decide = async (item: AccessRequest, status: 'Approved' | 'Rejected') => { const response = await fetch('/api/access-requests', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, status }) }); const json = await response.json().catch(() => ({})); if (response.ok && json.success) { showToast(`Request ${status.toLowerCase()}`, `${item.userName}'s access request was updated.`, 'success'); void load(); } else { showToast('Request update failed', json.error || 'The access request could not be updated.', 'error'); } };
  const canReview = currentActor.assignedRoleIds.includes(0);
  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-bold text-slate-900">Access requests</h2><p className="mt-1 text-xs text-slate-500">Review requests raised when a user reaches a page or action outside their role.</p></div>{loading ? <div className="p-8 text-center text-xs text-slate-500">Loading requests…</div> : items.length === 0 ? <div className="p-8 text-center text-xs text-slate-500">No access requests are waiting for review.</div> : <div className="divide-y divide-slate-100">{items.map((item) => <div key={item.id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-900">{item.userName}</strong><span className="rounded-full bg-[#FBF8F3] px-2 py-1 text-[10px] font-bold text-[#701A35]">{item.moduleId} · {item.action}</span><span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><Clock3 className="h-3 w-3" />{item.status}</span></div><p className="mt-1 text-xs text-slate-600">{item.reason}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{item.id} · {item.createdAt}</p></div>{canReview && item.status === 'Pending' && <div className="flex shrink-0 gap-2"><button type="button" onClick={() => void decide(item, 'Rejected')} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700"><X className="h-3.5 w-3.5" />Reject</button><button type="button" onClick={() => void decide(item, 'Approved')} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><Check className="h-3.5 w-3.5" />Approve</button></div>}</div>)}</div>}</section>;
};
