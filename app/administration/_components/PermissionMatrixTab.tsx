'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Lock, RotateCcw, Save, Search, ShieldCheck, X } from 'lucide-react';
import { useApp } from '@/lib/store';
import { ModuleAction, PermissionMatrixState, RoleId } from '@/lib/types';
import { MODULES_DATA } from '@/lib/seedData';

const columns: { key: ModuleAction; label: string }[] = [
  { key: 'view', label: 'Access' }, { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' },
  { key: 'approve', label: 'Approve' }, { key: 'export', label: 'Download' },
];

const clone = (matrix: PermissionMatrixState) => JSON.parse(JSON.stringify(matrix)) as PermissionMatrixState;

export const PermissionMatrixTab: React.FC = () => {
  const { roles, permissionMatrix, updatePermissionMatrix, showToast } = useApp();
  const [selectedRoleId, setSelectedRoleId] = useState<RoleId>(roles[0]?.id ?? 0);
  const [draft, setDraft] = useState<PermissionMatrixState>(() => clone(permissionMatrix));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const selectedRole = roles.find((role) => role.id === selectedRoleId);
  const isProtected = selectedRole?.isSystemProtected || selectedRoleId === 0;

  useEffect(() => { if (!roles.some((role) => role.id === selectedRoleId)) setSelectedRoleId(roles[0]?.id ?? 0); }, [roles, selectedRoleId]);
  useEffect(() => setDraft(clone(permissionMatrix)), [permissionMatrix]);

  const pages = useMemo(() => MODULES_DATA.filter((page) => {
    const text = `${page.name} ${page.description} ${page.id}`.toLowerCase();
    return (category === 'all' || page.category === category) && (!query.trim() || text.includes(query.trim().toLowerCase()));
  }), [category, query]);
  const changed = JSON.stringify(draft) !== JSON.stringify(permissionMatrix);
  const isAllowed = (pageId: string, action: ModuleAction) => Boolean(draft[pageId]?.[action]?.[selectedRoleId]);

  const updatePage = (pageId: string, action: ModuleAction, value: boolean) => {
    if (isProtected) { showToast('Protected role', 'Super Admin permissions are fixed and cannot be restricted.', 'info'); return; }
    setDraft((current) => {
      const nextPage = { ...(current[pageId] || {}), [action]: { ...current[pageId]?.[action], [selectedRoleId]: value } };
      if (action === 'view' && !value) columns.slice(1).forEach(({ key }) => { nextPage[key] = { ...nextPage[key], [selectedRoleId]: false }; });
      if (action !== 'view' && value) nextPage.view = { ...nextPage.view, [selectedRoleId]: true };
      return { ...current, [pageId]: nextPage };
    });
  };

  const setAll = (value: boolean) => {
    if (isProtected) return;
    setDraft((current) => {
      const next = clone(current);
      MODULES_DATA.forEach((page) => page.actions.forEach((action) => {
        next[page.id] = { ...next[page.id], [action]: { ...next[page.id]?.[action], [selectedRoleId]: value } };
      }));
      return next;
    });
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-[#E6E1D6] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A7A3A]"><ShieldCheck className="h-4 w-4" />Access control</div><h2 className="mt-1 text-xl font-bold text-slate-900">Page permission matrix</h2><p className="mt-1 max-w-2xl text-xs text-slate-500">Each row is a page and each column is an action. Access is the page gate; removing it also removes every action on that page.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setAll(true)} disabled={isProtected} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Select all pages</button><button type="button" onClick={() => setAll(false)} disabled={isProtected} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Clear all pages</button><button type="button" onClick={() => setDraft(clone(permissionMatrix))} disabled={!changed} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" />Discard</button><button type="button" onClick={() => updatePermissionMatrix(draft)} disabled={!changed || isProtected} className="inline-flex items-center gap-1.5 rounded-xl bg-[#701A35] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" />Save changes</button></div>
      </div>
      <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-[minmax(0,1fr)_220px]"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:bg-white focus:border-[#C5A059]" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none"><option value="all">All page groups</option>{Array.from(new Set(MODULES_DATA.map((page) => page.category))).map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold text-slate-900">Role being configured</p><p className="mt-1 text-[11px] text-slate-500">Changes apply to every user assigned to this role.</p></div><select value={selectedRoleId} onChange={(event) => setSelectedRoleId(Number(event.target.value))} className="rounded-xl border border-[#C5A059] bg-[#FFFBF2] px-3 py-2.5 text-xs font-bold text-slate-800 outline-none">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}{role.isSystemProtected ? ' · protected' : ''}</option>)}</select></div>
      <div className="overflow-x-auto"><table className="min-w-[780px] w-full border-collapse text-left text-xs"><thead><tr className="border-b border-slate-200 bg-[#FBF8F3]"><th className="sticky left-0 z-10 min-w-[270px] bg-[#FBF8F3] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Page</th>{columns.map((column) => <th key={column.key} className="min-w-[82px] px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{column.label}</th>)}</tr></thead><tbody>{pages.map((page) => <tr key={page.id} className="border-b border-slate-100 last:border-0 hover:bg-[#FCFBF9]"><td className="sticky left-0 bg-white px-5 py-3"><span className="block font-bold text-slate-800">{page.name}</span><span className="mt-0.5 block max-w-[250px] truncate text-[10px] text-slate-400">{page.description}</span></td>{columns.map((column) => { const available = page.actions.includes(column.key); const allowed = available && (isProtected || isAllowed(page.id, column.key)); return <td key={column.key} className="px-2 py-3 text-center">{available ? <button type="button" disabled={isProtected} onClick={() => updatePage(page.id, column.key, !isAllowed(page.id, column.key))} aria-label={`${column.label} ${page.name}`} aria-pressed={allowed} className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg border transition ${allowed ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-300 hover:border-[#C5A059]'} disabled:cursor-not-allowed disabled:opacity-80`}>{isProtected ? <Lock className="h-3.5 w-3.5" /> : allowed ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</button> : <span className="text-slate-200">—</span>}</td>; })}</tr>)}{pages.length === 0 && <tr><td colSpan={columns.length + 1} className="px-5 py-12 text-center text-xs text-slate-500">No pages match this filter.</td></tr>}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500"><span>{pages.length} page{pages.length === 1 ? '' : 's'} shown</span><span>{changed ? 'Unsaved changes' : 'All changes saved'}</span></div>
    </section>
  </div>;
};
