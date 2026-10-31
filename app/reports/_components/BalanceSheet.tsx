'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Plus,
  Printer,
  Save,
  Scale,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useApp } from '@/lib/store';
import { BalanceSheetDocument, BalanceSheetEntry, BalanceSheetSide, sumBalanceSheetSide } from '@/lib/balanceSheet';
import { formatINR } from '@/lib/utils/formatCurrency';
import { numberToIndianWords } from '@/lib/utils/numberToWords';

const SIDE_LABELS: Record<BalanceSheetSide, string> = {
  liabilities: 'Liabilities',
  assets: 'Assets',
};

const makeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const formatAsOfDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const safeFileName = (value: string) => value.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'balance_sheet';
const pdfMoney = (value: number) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;

function groupEntries(entries: BalanceSheetEntry[], side: BalanceSheetSide) {
  const groups = new Map<string, BalanceSheetEntry[]>();
  entries
    .filter((entry) => entry.side === side)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .forEach((entry) => {
      const current = groups.get(entry.groupName) || [];
      current.push(entry);
      groups.set(entry.groupName, current);
    });
  return Array.from(groups.entries());
}

export const BalanceSheet: React.FC = () => {
  const { showToast } = useApp();
  const [document, setDocument] = useState<BalanceSheetDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reports/balance-sheet', { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.success) throw new Error(json.error || 'Unable to load balance sheet.');
      setDocument(json.data);
      setIsDirty(false);
    } catch (error) {
      showToast('Balance sheet unavailable', error instanceof Error ? error.message : 'Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const totals = useMemo(() => {
    const entries = document?.entries || [];
    const liabilities = sumBalanceSheetSide(entries, 'liabilities');
    const assets = sumBalanceSheetSide(entries, 'assets');
    return { liabilities, assets, difference: assets - liabilities, balanced: Math.abs(assets - liabilities) < 0.01 };
  }, [document]);

  const editDocument = (update: (current: BalanceSheetDocument) => BalanceSheetDocument) => {
    setDocument((current) => current ? update(current) : current);
    setIsDirty(true);
  };

  const updateEntry = (id: string, updates: Partial<BalanceSheetEntry>) => {
    editDocument((current) => ({
      ...current,
      entries: current.entries.map((entry) => entry.id === id ? { ...entry, ...updates } : entry),
    }));
  };

  const addEntry = (side: BalanceSheetSide, groupName: string) => {
    editDocument((current) => ({
      ...current,
      entries: [...current.entries, {
        id: makeId(),
        side,
        groupName,
        label: 'New Ledger',
        amount: 0,
        sortOrder: Math.max(0, ...current.entries.filter((entry) => entry.side === side).map((entry) => entry.sortOrder)) + 10,
      }],
    }));
  };

  const addGroup = (side: BalanceSheetSide) => {
    const groupName = side === 'assets' ? 'New Asset Group' : 'New Liability Group';
    addEntry(side, groupName);
  };

  const removeEntry = (id: string) => {
    editDocument((current) => ({ ...current, entries: current.entries.filter((entry) => entry.id !== id) }));
  };

  const renameGroup = (side: BalanceSheetSide, currentName: string, nextName: string) => {
    const cleanName = nextName.trim() || currentName;
    editDocument((current) => ({
      ...current,
      entries: current.entries.map((entry) => entry.side === side && entry.groupName === currentName ? { ...entry, groupName: cleanName } : entry),
    }));
  };

  const save = async () => {
    if (!document || isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/reports/balance-sheet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(document),
      });
      const json = await response.json().catch(() => ({}));
      if (json.queued) {
        showToast('Save sent for approval', json.message || 'Your edit is waiting for approval.', 'warning');
        return;
      }
      if (!response.ok || !json.success) throw new Error(json.error || 'Unable to save balance sheet.');
      setDocument(json.data);
      setIsDirty(false);
      showToast('Balance sheet saved', 'Your editable Tally statement was updated.', 'success');
    } catch (error) {
      showToast('Save failed', error instanceof Error ? error.message : 'Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const exportExcel = () => {
    if (!document) return;
    const rows = (['liabilities', 'assets'] as BalanceSheetSide[]).flatMap((side) => [
      { Side: SIDE_LABELS[side], Group: '', Ledger: 'TOTAL', Amount: sumBalanceSheetSide(document.entries, side) },
      ...groupEntries(document.entries, side).flatMap(([group, entries]) => [
        { Side: SIDE_LABELS[side], Group: group, Ledger: 'Group total', Amount: entries.reduce((sum, entry) => sum + entry.amount, 0) },
        ...entries.map((entry) => ({ Side: SIDE_LABELS[side], Group: group, Ledger: entry.label, Amount: entry.amount })),
      ]),
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Balance Sheet');
    XLSX.writeFile(workbook, `ASR_${safeFileName(document.title)}_${document.asOfDate}.xlsx`);
    showToast('Excel downloaded', 'The edited balance sheet was exported.', 'success');
  };

  const exportPdf = () => {
    if (!document) return;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setFillColor(112, 26, 53);
    pdf.rect(0, 0, pageWidth, 58, 'F');
    pdf.setFillColor(197, 160, 89);
    pdf.rect(0, 56, pageWidth, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`ASR GROUP · ${document.title}`, 32, 28);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(238, 216, 161);
    pdf.text(`As at ${formatAsOfDate(document.asOfDate)} · Tally-style balance sheet`, 32, 44);

    const makeRows = (side: BalanceSheetSide): string[][] => groupEntries(document.entries, side).flatMap(([group, entries]) => [
      [group, ''],
      ...entries.map((entry) => [entry.label, pdfMoney(entry.amount)]),
    ]);
    const left = 32;
    const right = pageWidth / 2 + 8;
    const width = pageWidth / 2 - 48;
    autoTable(pdf, {
      startY: 78,
      margin: { left, right: pageWidth - left - width },
      tableWidth: width,
      head: [['Liabilities', 'Amount']],
      body: makeRows('liabilities'),
      foot: [['TOTAL', pdfMoney(totals.liabilities)]],
      theme: 'grid',
      headStyles: { fillColor: [112, 26, 53], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8, cellPadding: 4 },
      footStyles: { fillColor: [243, 239, 230], textColor: [112, 26, 53], fontStyle: 'bold', fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
    });
    autoTable(pdf, {
      startY: 78,
      margin: { left: right, right: pageWidth - right - width },
      tableWidth: width,
      head: [['Assets', 'Amount']],
      body: makeRows('assets'),
      foot: [['TOTAL', pdfMoney(totals.assets)]],
      theme: 'grid',
      headStyles: { fillColor: [36, 91, 155], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8, cellPadding: 4 },
      footStyles: { fillColor: [239, 246, 255], textColor: [36, 91, 155], fontStyle: 'bold', fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
    });
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(totals.balanced ? 'BALANCE SHEET: IN BALANCE' : `CHECK BALANCE: DIFFERENCE ${pdfMoney(Math.abs(totals.difference))}`, pageWidth / 2, pageHeight - 28, { align: 'center' });
    pdf.save(`ASR_${safeFileName(document.title)}_${document.asOfDate}.pdf`);
    showToast('PDF downloaded', 'The edited balance sheet was exported.', 'success');
  };

  if (isLoading || !document) {
    return <section className="rounded-3xl border border-[#E7DFD2] bg-white p-8 text-center text-sm text-slate-500">Loading balance sheet…</section>;
  }

  return (
    <div className="space-y-5 pb-8">
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">Tally — Balance Sheet</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Scale className="hidden h-7 w-7 shrink-0 text-[#701A35] sm:block" />
              <input
                value={document.title}
                onChange={(event) => editDocument((current) => ({ ...current, title: event.target.value }))}
                aria-label="Balance sheet title"
                className="min-w-0 flex-1 border-b-2 border-transparent bg-transparent text-2xl font-bold tracking-tight text-[#24131B] outline-none hover:border-[#E7DFD2] focus:border-[#C5A059]"
              />
              <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500">
                As at
                <input
                  type="date"
                  value={document.asOfDate}
                  onChange={(event) => editDocument((current) => ({ ...current, asOfDate: event.target.value }))}
                  aria-label="Balance sheet date"
                  className="rounded-lg border border-slate-200 bg-[#FCFBF9] px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#C5A059]"
                />
              </label>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">Editable Tally-style statement. Click any group, ledger or amount to change it; totals and balance status update instantly.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:max-w-[430px] xl:justify-end">
            <button type="button" onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50"><FileText className="h-4 w-4" /> PDF</button>
            <button type="button" onClick={exportExcel} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50"><FileSpreadsheet className="h-4 w-4" /> Excel</button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" /> Print</button>
            <button type="button" onClick={() => void save()} disabled={!isDirty || isSaving} className="inline-flex items-center gap-1.5 rounded-xl bg-[#701A35] px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#5c142b] disabled:cursor-not-allowed disabled:opacity-45"><Save className="h-4 w-4" /> {isSaving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-2 border-t border-[#EEE8DE] pt-5 sm:grid-cols-3">
          <SummaryCard label="Total liabilities" value={totals.liabilities} tone="maroon" />
          <SummaryCard label="Total assets" value={totals.assets} tone="blue" />
          <SummaryCard label={totals.balanced ? 'Balance check' : 'Difference'} value={totals.balanced ? totals.assets : Math.abs(totals.difference)} tone={totals.balanced ? 'green' : 'red'} status={totals.balanced ? 'In balance' : 'Needs review'} />
        </div>
        {isDirty && <p className="mt-3 text-right text-[11px] font-semibold text-amber-700">Unsaved edits · Ctrl/Cmd + S to save</p>}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {(['liabilities', 'assets'] as BalanceSheetSide[]).map((side) => (
          <BalanceSide
            key={side}
            side={side}
            entries={document.entries}
            total={sumBalanceSheetSide(document.entries, side)}
            onAddGroup={() => addGroup(side)}
            onAddEntry={(groupName) => addEntry(side, groupName)}
            onUpdateEntry={updateEntry}
            onRemoveEntry={removeEntry}
            onRenameGroup={renameGroup}
          />
        ))}
      </section>

      <section className={`rounded-2xl border p-4 text-center ${totals.balanced ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}`}>
        <div className={`flex items-center justify-center gap-2 text-sm font-bold ${totals.balanced ? 'text-emerald-800' : 'text-rose-800'}`}>
          {totals.balanced ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {totals.balanced ? 'Balance Sheet is IN BALANCE — Total Assets = Total Liabilities' : `Out of balance by ${formatINR(Math.abs(totals.difference))} — edit the ledgers before saving`}
        </div>
        <p className="mt-1 text-[11px] text-slate-500">{numberToIndianWords(totals.assets)} · As at {formatAsOfDate(document.asOfDate)}</p>
      </section>
    </div>
  );
};

function BalanceSide({
  side,
  entries,
  total,
  onAddGroup,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onRenameGroup,
}: {
  side: BalanceSheetSide;
  entries: BalanceSheetEntry[];
  total: number;
  onAddGroup: () => void;
  onAddEntry: (groupName: string) => void;
  onUpdateEntry: (id: string, updates: Partial<BalanceSheetEntry>) => void;
  onRemoveEntry: (id: string) => void;
  onRenameGroup: (side: BalanceSheetSide, currentName: string, nextName: string) => void;
}) {
  const groups = groupEntries(entries, side);
  const accent = side === 'assets' ? { header: 'bg-[#245B9B]', soft: 'bg-blue-50/40', text: 'text-[#245B9B]' } : { header: 'bg-[#701A35]', soft: 'bg-[#FBF4F7]', text: 'text-[#701A35]' };

  return (
    <section className="overflow-hidden rounded-3xl border border-[#E7DFD2] bg-white shadow-[0_12px_32px_rgba(58,34,22,0.04)]">
      <div className={`flex items-center justify-between px-4 py-3.5 text-white ${accent.header}`}>
        <div><h2 className="text-sm font-bold uppercase tracking-[0.12em]">{SIDE_LABELS[side]}</h2><p className="mt-0.5 text-[10px] text-white/75">Particulars · Ledger accounts · Editable</p></div>
        <button type="button" onClick={onAddGroup} className="inline-flex items-center gap-1 rounded-lg border border-white/30 px-2.5 py-1.5 text-[10px] font-bold hover:bg-white/10"><Plus className="h-3.5 w-3.5" /> Add group</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[430px] border-collapse text-xs">
          <thead><tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500"><th className="px-4 py-3 text-left">Particulars</th><th className="w-36 px-4 py-3 text-right">Amount (₹)</th><th className="w-10 px-2 py-3" aria-label="Actions" /></tr></thead>
          <tbody>
            {groups.length === 0 ? <tr><td colSpan={3} className="px-5 py-12 text-center text-sm text-slate-400">No ledgers yet. Add a group to begin.</td></tr> : groups.map(([groupName, groupEntriesForSide]) => {
              const groupTotal = groupEntriesForSide.reduce((sum, entry) => sum + entry.amount, 0);
              return <React.Fragment key={groupName}>
                <tr className={`border-b border-slate-100 ${accent.soft}`}>
                  <td className="px-4 py-2.5"><input defaultValue={groupName} onFocus={(event) => event.currentTarget.select()} onBlur={(event) => onRenameGroup(side, groupName, event.target.value)} aria-label={`${SIDE_LABELS[side]} group name`} className={`w-full bg-transparent font-bold ${accent.text} outline-none`} /></td>
                  <td className={`px-4 py-2.5 text-right font-bold ${accent.text}`}>{formatINR(groupTotal)}</td>
                  <td />
                </tr>
                {groupEntriesForSide.map((entry) => <tr key={entry.id} className="border-b border-slate-100 transition-colors hover:bg-[#FCFAF7]">
                  <td className="px-4 py-2.5"><input value={entry.label} onFocus={(event) => event.currentTarget.select()} onChange={(event) => onUpdateEntry(entry.id, { label: event.target.value })} aria-label={`${groupName} ledger name`} className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:rounded-md focus:bg-[var(--surface-raised)] focus:ring-1 focus:ring-[#C5A059]" placeholder="Ledger name" /></td>
                  <td className="px-4 py-2.5"><input type="number" min="0" step="0.01" value={entry.amount} onFocus={(event) => event.currentTarget.select()} onChange={(event) => onUpdateEntry(entry.id, { amount: Math.max(0, Number(event.target.value) || 0) })} aria-label={`${entry.label} amount`} className="w-full rounded-md bg-transparent px-2 py-1 text-right text-xs font-bold tabular-nums text-slate-800 outline-none hover:bg-white focus:bg-[var(--surface-raised)] focus:ring-1 focus:ring-[#C5A059]" /></td>
                  <td className="px-2 py-2.5 text-center"><button type="button" onClick={() => onRemoveEntry(entry.id)} aria-label={`Delete ${entry.label}`} title="Delete ledger" className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>)}
                <tr><td colSpan={3} className="px-4 py-2"><button type="button" onClick={() => onAddEntry(groupName)} className={`inline-flex items-center gap-1 text-[10px] font-bold ${accent.text} hover:underline`}><Plus className="h-3 w-3" /> Add ledger under {groupName}</button></td></tr>
              </React.Fragment>;
            })}
          </tbody>
          <tfoot><tr className={`border-t-2 border-slate-300 ${accent.soft} font-bold`}><td className={`px-4 py-3 uppercase tracking-[0.08em] ${accent.text}`}>Total {SIDE_LABELS[side]}</td><td className={`px-4 py-3 text-right text-sm tabular-nums ${accent.text}`}>{formatINR(total)}</td><td /></tr></tfoot>
        </table>
      </div>
    </section>
  );
}

function SummaryCard({ label, value, tone, status }: { label: string; value: number; tone: 'maroon' | 'blue' | 'green' | 'red'; status?: string }) {
  const styles = {
    maroon: 'border-[#E4B7C8] bg-[#FBF4F7] text-[#701A35]',
    blue: 'border-blue-200 bg-blue-50/50 text-blue-700',
    green: 'border-emerald-200 bg-emerald-50/50 text-emerald-700',
    red: 'border-rose-200 bg-rose-50/50 text-rose-700',
  };
  return <div className={`rounded-2xl border px-3.5 py-3 ${styles[tone]}`}><span className="block text-[10px] font-bold uppercase tracking-[0.1em] opacity-70">{label}</span><strong className="mt-2 block text-lg font-bold tabular-nums text-slate-900">{formatINR(value)}</strong>{status && <span className="mt-1 block text-[10px] font-bold">{status}</span>}</div>;
}

