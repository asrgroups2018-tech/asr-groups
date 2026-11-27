'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  BookOpen,
  X,
  ChevronDown,
  Search,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useApp } from '@/lib/store';
import { BalanceSheetDocument, BalanceSheetEntry, BalanceSheetSide, sumBalanceSheetSide } from '@/lib/balanceSheet';
import { formatINR } from '@/lib/utils/formatCurrency';
import { numberToIndianWords } from '@/lib/utils/numberToWords';
import { AccountingLine } from '@/lib/reportAccounting';
import { buildBalanceSheetAccounting } from '@/lib/balanceSheetAccounting';
import { ManualReceipt } from '@/lib/types';
import { DraftNumberInput } from '@/components/ui/DraftNumberInput';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { Loan } from '@/lib/types';
import { buildCashLedger, buildReceivablesLedger, type CashLedgerRow, ReceivablesLedgerRow } from '@/lib/receivablesLedger';
import { APP_BRAND } from '@/lib/branding';
import { ReportPeriodBar, useReportPeriod } from './ReportPeriodBar';

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

const formatTallyDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const month = date.toLocaleDateString('en-IN', { month: 'short' }).replace('.', '');
  return `${date.getDate()}-${month}-${String(date.getFullYear()).slice(-2)}`;
};

const safeFileName = (value: string) => value.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'balance_sheet';
const formatBalanceAmount = (value: number) => value < 0 ? `(-)${formatINR(Math.abs(value))}` : formatINR(value);
const pdfMoney = (value: number) => `INR ${value < 0 ? '(-)' : ''}${Math.abs(Number(value || 0)).toLocaleString('en-IN')}`;

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

function normalizeManualCapitalEntries(entries: BalanceSheetEntry[]) {
  const manualEntries = entries
    .filter((entry) => !entry.sourceKey || entry.sourceKey === 'MANUAL')
    .map((entry) => {
      const isManualCapital = entry.side === 'liabilities'
        && entry.groupName.trim().toLowerCase() === 'loans (liability)'
        && entry.label.trim().toLowerCase().includes('capital')
        && !entry.label.trim().toLowerCase().includes('funding');
      return isManualCapital ? { ...entry, groupName: 'Capital Account' } : entry;
    });
  const hasCapitalLedger = manualEntries.some((entry) => (
    entry.side === 'liabilities' && entry.groupName.trim().toLowerCase() === 'capital account'
  ));
  if (!hasCapitalLedger) {
    manualEntries.push({
      id: 'manual-capital-account',
      side: 'liabilities',
      groupName: 'Capital Account',
      label: 'Capital Amount',
      amount: 0,
      sortOrder: 5,
    });
  }
  return manualEntries;
}

function mergeLiveBalanceSheet(document: BalanceSheetDocument, accounting: ReturnType<typeof buildBalanceSheetAccounting>): BalanceSheetDocument {
  // Only entries explicitly marked manual survive the live overlay. This
  // removes legacy calculated IDs as well as old capital/receivable rows,
  // preventing stale values from being counted alongside the current period.
  const manualEntries = normalizeManualCapitalEntries(document.entries);
  const generatedEntries: BalanceSheetEntry[] = [...accounting.balanceSheetLiabilities, ...accounting.balanceSheetAssets].map((line: AccountingLine) => ({
    id: line.id,
    side: line.side,
    groupName: line.groupName,
    label: line.label,
    amount: line.amount,
    sortOrder: line.sortOrder,
    sourceKey: line.sourceKey,
  }));
  return { ...document, asOfDate: accounting.period.toDate, entries: [...manualEntries, ...generatedEntries] };
}

export const BalanceSheet: React.FC = () => {
  const { showToast, loans, systemSettings } = useApp();
  const [savedDocument, setSavedDocument] = useState<BalanceSheetDocument | null>(null);
  const [documents, setDocuments] = useState<BalanceSheetDocument[]>([]);
  const [manualReceipts, setManualReceipts] = useState<ManualReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const shouldAutoSaveCapital = useRef(false);
  const [isCreatingBalanceSheet, setIsCreatingBalanceSheet] = useState(false);
  const [newBalanceSheetTitle, setNewBalanceSheetTitle] = useState('');
  const [isReceivablesLedgerOpen, setIsReceivablesLedgerOpen] = useState(false);
  const [isCashLedgerOpen, setIsCashLedgerOpen] = useState(false);
  const period = useReportPeriod();
  const companyProfile = systemSettings.companyProfile;
  const companyName = companyProfile.legalEntityName || companyProfile.companyName || APP_BRAND;
  const companyAddress = companyProfile.registeredAddress || '';
  const accounting = useMemo(() => buildBalanceSheetAccounting(loans, manualReceipts, period, savedDocument?.entries || []), [loans, manualReceipts, period, savedDocument?.entries]);
  const document = useMemo(() => savedDocument ? mergeLiveBalanceSheet(savedDocument, accounting) : null, [accounting, savedDocument]);

  const load = useCallback(async (documentId?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/balance-sheet${documentId ? `?id=${encodeURIComponent(documentId)}` : ''}`, { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.success) throw new Error(json.error || 'Unable to load balance sheet.');
      const normalizedDocument = json.data ? { ...json.data, entries: normalizeManualCapitalEntries(json.data.entries || []) } : json.data;
      setSavedDocument(normalizedDocument);
      setDocuments(json.documents || (normalizedDocument ? [normalizedDocument] : []));
      setIsDirty(false);
    } catch (error) {
      showToast('Balance sheet unavailable', error instanceof Error ? error.message : 'Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const loadManualReceipts = useCallback(async () => {
    try {
      const response = await fetch('/api/manual-receipts', { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      if (response.ok && json.success) setManualReceipts(json.data || []);
    } catch {
      // Loan and installment data remains available if optional receipts fail.
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadManualReceipts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadManualReceipts]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const createNewBalanceSheet = async () => {
    const title = newBalanceSheetTitle.trim();
    if (!title) return;
    try {
      const response = await fetch('/api/reports/balance-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, asOfDate: period.toDate }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Unable to create balance sheet.');
      await load(json.data.id);
      setIsCreatingBalanceSheet(false);
      setNewBalanceSheetTitle('');
      showToast('Balance sheet created', `${title} is now saved in the database.`, 'success');
    } catch (error) {
      showToast('Create failed', error instanceof Error ? error.message : 'Unable to create balance sheet.', 'error');
    }
  };

  const totals = useMemo(() => {
    const entries = document?.entries || [];
    const liabilities = sumBalanceSheetSide(entries, 'liabilities');
    const assets = sumBalanceSheetSide(entries, 'assets');
    return { liabilities, assets, difference: assets - liabilities, balanced: Math.abs(assets - liabilities) < 0.01 };
  }, [document]);

  const editDocument = (update: (current: BalanceSheetDocument) => BalanceSheetDocument) => {
    setSavedDocument((current) => current ? update(current) : current);
    setIsDirty(true);
  };

  const updateEntry = (id: string, updates: Partial<BalanceSheetEntry>) => {
    const currentEntry = savedDocument?.entries.find((entry) => entry.id === id);
    if (id === 'manual-capital-account' || currentEntry?.groupName.trim().toLowerCase() === 'capital account') {
      shouldAutoSaveCapital.current = true;
    }
    editDocument((current) => ({
      ...current,
      entries: current.entries.map((entry) => entry.id === id ? { ...entry, ...updates } : entry),
    }));
  };

  const addEntry = (side: BalanceSheetSide, groupName: string) => {
    if (side === 'liabilities' && groupName.trim().toLowerCase() === 'capital account') {
      shouldAutoSaveCapital.current = true;
    }
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

  const save = useCallback(async () => {
    if (!document || isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/reports/balance-sheet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...document, asOfDate: period.toDate }),
      });
      const json = await response.json().catch(() => ({}));
      if (json.queued) {
        showToast('Save sent for approval', json.message || 'Your edit is waiting for approval.', 'warning');
        return;
      }
      if (!response.ok || !json.success) throw new Error(json.error || 'Unable to save balance sheet.');
      setSavedDocument({ ...json.data, entries: normalizeManualCapitalEntries(json.data.entries || []) });
      setIsDirty(false);
      showToast('Balance sheet saved', 'Your editable Tally statement was updated.', 'success');
    } catch (error) {
      showToast('Save failed', error instanceof Error ? error.message : 'Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [document, isSaving, period.toDate, showToast]);

  useEffect(() => {
    if (!shouldAutoSaveCapital.current || !document || !isDirty || isSaving) return;
    shouldAutoSaveCapital.current = false;
    void save();
  }, [document, isDirty, isSaving, save]);

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
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text(companyName.toUpperCase(), pageWidth / 2, 38, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    const addressLines = companyAddress ? pdf.splitTextToSize(companyAddress, pageWidth - 150) : [];
    addressLines.forEach((line: string, index: number) => pdf.text(line, pageWidth / 2, 53 + index * 12, { align: 'center' }));
    const addressBottom = 53 + Math.max(0, addressLines.length - 1) * 12;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(document.title, pageWidth / 2, addressBottom + 31, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.text(`${formatTallyDate(period.fromDate)} to ${formatTallyDate(period.toDate)}`, pageWidth / 2, addressBottom + 47, { align: 'center' });

    const startY = addressBottom + 73;
    const left = 36;
    const right = pageWidth / 2 + 4;
    const width = pageWidth / 2 - 42;
    const makeRows = (side: BalanceSheetSide) => {
      const rows: string[][] = [];
      const groupRows = new Set<number>();
      groupEntries(document.entries, side).forEach(([group, entries]) => {
        groupRows.add(rows.length);
        rows.push([group, pdfMoney(entries.reduce((sum, entry) => sum + entry.amount, 0))]);
        entries.forEach((entry) => rows.push([entry.label, pdfMoney(entry.amount)]));
      });
      return { rows, groupRows };
    };
    const makeTable = (side: BalanceSheetSide, marginLeft: number, header: string, color: [number, number, number]) => {
      const table = makeRows(side);
      autoTable(pdf, {
        startY,
        margin: { left: marginLeft, right: pageWidth - marginLeft - width },
        tableWidth: width,
        head: [[header, `as at ${formatTallyDate(period.toDate)}`]],
        body: table.rows,
        foot: [['Total', pdfMoney(sumBalanceSheetSide(document.entries, side))]],
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9, textColor: [0, 0, 0], cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 }, lineColor: [0, 0, 0], lineWidth: 0 },
        headStyles: { fontStyle: 'bold', fontSize: 10, fillColor: [255, 255, 255], textColor: color, lineWidth: 0.5, lineColor: [0, 0, 0], cellPadding: { top: 4, right: 4, bottom: 4, left: 4 } },
        footStyles: { fontStyle: 'bold', fontSize: 10, fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.5, lineColor: [0, 0, 0], cellPadding: { top: 4, right: 4, bottom: 4, left: 4 } },
        columnStyles: { 0: { cellWidth: width * 0.68 }, 1: { halign: 'right', cellWidth: width * 0.32 } },
        didParseCell: (data) => {
          if (data.section === 'body') {
            if (table.groupRows.has(data.row.index)) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 10;
            } else {
              data.cell.styles.fontStyle = 'italic';
            }
          }
        },
      });
    };
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(left, startY - 1, pageWidth - left, startY - 1);
    makeTable('liabilities', left, 'Liabilities', [0, 0, 0]);
    makeTable('assets', right, 'Assets', [0, 0, 0]);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(90, 90, 90);
    pdf.text(`Balance check: ${totals.balanced ? 'In balance' : `Difference ${pdfMoney(Math.abs(totals.difference))}`}`, pageWidth / 2, pageHeight - 28, { align: 'center' });
    pdf.save(`ASR_${safeFileName(document.title)}_${document.asOfDate}.pdf`);
    showToast('PDF downloaded', 'The edited balance sheet was exported.', 'success');
  };

  if (isLoading || !document) {
    return <section className="rounded-3xl border border-[#E7DFD2] bg-white p-8 text-center text-sm text-slate-500">Loading balance sheet…</section>;
  }

  return (
    <div className="space-y-5 pb-8">
      <section className="border border-slate-300 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-center text-[15px] font-bold uppercase tracking-wide text-slate-900">{companyName}</p>
            {companyAddress && <p className="mt-1 text-center text-xs text-slate-600">{companyAddress}</p>}
            <p className="mt-2 text-center text-sm font-bold text-slate-900">{document.title} · {formatTallyDate(period.fromDate)} to {formatTallyDate(period.toDate)}</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Scale className="hidden h-7 w-7 shrink-0 text-[#701A35] sm:block" />
              <select
                value={document.id || ''}
                onChange={(event) => void load(event.target.value)}
                aria-label="Select balance sheet"
                className="max-w-[220px] rounded-lg border border-slate-200 bg-[#FCFBF9] px-2.5 py-2 text-sm font-bold text-[#24131B] outline-none focus:border-[#C5A059]"
              >
                {documents.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.asOfDate}</option>)}
              </select>
              <input
                value={document.title}
                onChange={(event) => editDocument((current) => ({ ...current, title: event.target.value }))}
                aria-label="Balance sheet title"
                className="min-w-0 flex-1 border-b-2 border-transparent bg-transparent text-2xl font-bold tracking-tight text-[#24131B] outline-none hover:border-[#E7DFD2] focus:border-[#C5A059]"
              />
              <span className="shrink-0 rounded-lg border border-[#D9D2C7] bg-[#FCFBF9] px-2.5 py-2 text-xs font-semibold text-slate-600">As at {formatAsOfDate(period.toDate)}</span>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">Editable Tally-style statement. Click any group, ledger or amount to change it; totals and balance status update instantly.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:max-w-[430px] xl:justify-end">
            <button type="button" onClick={() => setIsCreatingBalanceSheet((open) => !open)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#C5A059] bg-[#FFF9EC] px-3 py-2.5 text-xs font-bold text-[#701A35] hover:bg-[#FFF2CF]"><Plus className="h-4 w-4" /> New balance sheet</button>
            <button type="button" onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50"><FileText className="h-4 w-4" /> PDF</button>
            <button type="button" onClick={exportExcel} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50"><FileSpreadsheet className="h-4 w-4" /> Excel</button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" /> Print</button>
            <button type="button" onClick={() => void save()} disabled={!isDirty || isSaving} className="inline-flex items-center gap-1.5 rounded-xl bg-[#701A35] px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#5c142b] disabled:cursor-not-allowed disabled:opacity-45"><Save className="h-4 w-4" /> {isSaving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
        {isCreatingBalanceSheet && <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-[#E7D3A6] bg-[#FFF9EC] p-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-[10px] font-bold uppercase tracking-wide text-[#701A35]">Report name<input value={newBalanceSheetTitle} onChange={(event) => setNewBalanceSheetTitle(event.target.value)} placeholder="e.g. October 2026 Balance Sheet" className="mt-1 h-9 w-full rounded-lg border border-[#E7D3A6] bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#C5A059]" /></label>
          <span className="rounded-lg border border-[#E7D3A6] bg-white px-3 py-2 text-xs font-semibold text-[#701A35]">As at {formatAsOfDate(period.toDate)}</span>
          <button type="button" onClick={() => void createNewBalanceSheet()} disabled={!newBalanceSheetTitle.trim()} className="h-9 rounded-lg bg-[#701A35] px-3 text-xs font-bold text-white disabled:opacity-50">Create</button>
        </div>}
        <div className="mt-6 grid grid-cols-1 gap-2 border-t border-[#EEE8DE] pt-5 sm:grid-cols-3">
          <SummaryCard label="Total liabilities" value={totals.liabilities} tone="maroon" />
          <SummaryCard label="Total assets" value={totals.assets} tone="blue" />
          <SummaryCard label={totals.balanced ? 'Balance check' : 'Difference'} value={totals.balanced ? totals.assets : Math.abs(totals.difference)} tone={totals.balanced ? 'green' : 'red'} status={totals.balanced ? 'In balance' : 'Needs review'} />
        </div>
        {isDirty && <p className="mt-3 text-right text-[11px] font-semibold text-amber-700">Unsaved edits · Ctrl/Cmd + S to save</p>}
      </section>

      <ReportPeriodBar />

      <section className="grid gap-5 xl:grid-cols-2 xl:gap-0 xl:divide-x xl:divide-slate-300">
        {(['liabilities', 'assets'] as BalanceSheetSide[]).map((side) => (
          <BalanceSide
            key={side}
            side={side}
            entries={document.entries}
            total={sumBalanceSheetSide(document.entries, side)}
            asOfDate={period.toDate}
            onAddGroup={() => addGroup(side)}
            onAddEntry={(groupName) => addEntry(side, groupName)}
            onUpdateEntry={updateEntry}
            onRemoveEntry={removeEntry}
            onRenameGroup={renameGroup}
            onOpenReceivables={() => setIsReceivablesLedgerOpen(true)}
            onOpenCashLedger={() => setIsCashLedgerOpen(true)}
          />
        ))}
      </section>

      {isReceivablesLedgerOpen && (
        <ReceivablesLedgerDrawer
          loans={loans}
          receipts={manualReceipts}
          asOfDate={accounting.period.toDate}
          onClose={() => setIsReceivablesLedgerOpen(false)}
        />
      )}

      {isCashLedgerOpen && (
        <CashLedgerDrawer
          receipts={manualReceipts}
          asOfDate={accounting.period.toDate}
          onClose={() => setIsCashLedgerOpen(false)}
        />
      )}

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
  asOfDate,
  onAddGroup,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onRenameGroup,
  onOpenReceivables,
  onOpenCashLedger,
}: {
  side: BalanceSheetSide;
  entries: BalanceSheetEntry[];
  total: number;
  asOfDate: string;
  onAddGroup: () => void;
  onAddEntry: (groupName: string) => void;
  onUpdateEntry: (id: string, updates: Partial<BalanceSheetEntry>) => void;
  onRemoveEntry: (id: string) => void;
  onRenameGroup: (side: BalanceSheetSide, currentName: string, nextName: string) => void;
  onOpenReceivables: () => void;
  onOpenCashLedger: () => void;
}) {
  const groups = groupEntries(entries, side);
  const accent = { header: 'bg-white', soft: 'bg-white', text: 'text-slate-900' };

  return (
    <section className="overflow-hidden border border-slate-300 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-300 bg-white px-4 py-3 text-slate-900">
        <div><h2 className="text-sm font-bold uppercase tracking-[0.12em]">{SIDE_LABELS[side]}</h2><p className="mt-0.5 text-[10px] text-slate-500">as at {formatTallyDate(asOfDate)}</p></div>
        <button type="button" onClick={onAddGroup} className="inline-flex items-center gap-1 rounded border border-slate-400 px-2.5 py-1.5 text-[10px] font-bold text-slate-800 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /> Add group</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[430px] border-collapse text-xs">
          <thead><tr className="border-b border-slate-200 bg-[#F8F6F2] text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500"><th className="px-4 py-3 text-left">Particulars</th><th className="w-36 px-4 py-3 text-right">Amount (₹)</th><th className="w-10 px-2 py-3" aria-label="Actions" /></tr></thead>
          <tbody>
            {groups.length === 0 ? <tr><td colSpan={3} className="px-5 py-12 text-center text-sm text-slate-400">No ledgers yet. Add a group to begin.</td></tr> : groups.map(([groupName, groupEntriesForSide]) => {
              const groupTotal = groupEntriesForSide.reduce((sum, entry) => sum + entry.amount, 0);
              return <React.Fragment key={groupName}>
                <tr className={`border-b border-slate-200 ${accent.soft}`}>
                  <td className="px-4 py-2.5"><input defaultValue={groupName} onFocus={(event) => event.currentTarget.select()} onBlur={(event) => onRenameGroup(side, groupName, event.target.value)} aria-label={`${SIDE_LABELS[side]} group name`} className={`w-full bg-transparent font-bold ${accent.text} outline-none`} /></td>
                  <td className={`px-4 py-2.5 text-right font-bold ${accent.text}`}>{formatBalanceAmount(groupTotal)}</td>
                  <td />
                </tr>
                {groupEntriesForSide.map((entry) => {
                  const isLive = Boolean(entry.sourceKey && entry.sourceKey !== 'MANUAL');
                  const isReceivables = entry.sourceKey === 'CUSTOMER_RECEIVABLES';
                  const isCashLedger = entry.sourceKey === 'COLLECTIONS';
                  return <tr key={entry.id} className="border-b border-slate-200 transition-colors hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    {isReceivables ? (
                      <button type="button" onClick={onOpenReceivables} className="w-full text-left text-xs font-semibold text-[#245B9B] underline decoration-dotted underline-offset-4 hover:text-[#1B4779]" title="Open Customer Receivables ledger history">
                        {entry.label}
                      </button>
                    ) : <input value={entry.label} readOnly={isLive} onFocus={(event) => event.currentTarget.select()} onChange={(event) => onUpdateEntry(entry.id, { label: event.target.value })} aria-label={`${groupName} ledger name`} className={`w-full bg-transparent text-xs font-semibold italic outline-none placeholder:text-slate-300 focus:rounded-md focus:bg-slate-50 focus:ring-1 focus:ring-slate-400 ${isLive ? 'cursor-not-allowed text-slate-500' : 'text-slate-700'}`} placeholder="Ledger name" />}
                  </td>
                  <td className="px-4 py-2.5">
                    {isLive ? (
                      <button type="button" onClick={isReceivables ? onOpenReceivables : isCashLedger ? onOpenCashLedger : undefined} className={`w-full text-right text-xs font-bold tabular-nums ${isReceivables || isCashLedger ? 'cursor-pointer text-[#245B9B] underline decoration-dotted underline-offset-4 hover:text-[#1B4779]' : 'cursor-default text-slate-500'}`} title={isReceivables ? 'Open Customer Receivables ledger history' : isCashLedger ? 'Open Cash-in-Hand and Bank history' : 'Calculated from loan and collection data'}>
                        {formatBalanceAmount(entry.amount)}
                      </button>
                    ) : (
                      <DraftNumberInput value={entry.amount} onCommit={(amount) => onUpdateEntry(entry.id, { amount: Math.max(0, amount) })} ariaLabel={`${entry.label} amount`} className="w-full rounded-md bg-transparent px-2 py-1 text-right text-xs italic tabular-nums text-slate-800 outline-none focus:bg-slate-50 focus:ring-1 focus:ring-slate-400" />
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center">{entry.sourceKey && entry.sourceKey !== 'MANUAL' ? <span className="text-[9px] font-semibold text-slate-400">Live</span> : <button type="button" onClick={() => onRemoveEntry(entry.id)} aria-label={`Delete ${entry.label}`} title="Delete ledger" className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>}</td>
                </tr>;
                })}
                <tr><td colSpan={3} className="px-4 py-2"><button type="button" onClick={() => onAddEntry(groupName)} className={`inline-flex items-center gap-1 text-[10px] font-bold ${accent.text} hover:underline`}><Plus className="h-3 w-3" /> Add ledger under {groupName}</button></td></tr>
              </React.Fragment>;
            })}
          </tbody>
           <tfoot><tr className={`border-t-2 border-slate-300 ${accent.soft} font-bold`}><td className={`px-4 py-3 uppercase tracking-[0.08em] ${accent.text}`}>Total {SIDE_LABELS[side]}</td><td className={`px-4 py-3 text-right text-sm tabular-nums ${accent.text}`}>{formatBalanceAmount(total)}</td><td /></tr></tfoot>
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

function formatLedgerDate(value: string) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatSignedLedgerBalance(value: number) {
  if (Math.abs(value) < 0.005) return '—';
  return `${formatINR(Math.abs(value))} ${value < 0 ? 'Cr' : 'Dr'}`;
}

function CashLedgerDrawer({ receipts, asOfDate, onClose }: { receipts: ManualReceipt[]; asOfDate: string; onClose: () => void }) {
  const rows = useMemo(() => {
    return buildCashLedger(receipts, asOfDate).reduce<Array<CashLedgerRow & { runningBalance: number }>>((ledgerRows, row) => {
      const previousBalance = ledgerRows[ledgerRows.length - 1]?.runningBalance || 0;
      return [...ledgerRows, { ...row, runningBalance: previousBalance + row.credit - row.debit }];
    }, []);
  }, [asOfDate, receipts]);
  const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0);
  const closingBalance = rows[rows.length - 1]?.runningBalance || 0;

  return <ModalFrame onClose={onClose} placement="end" aria-label="Cash-in-Hand and Bank history" className="fixed inset-0 z-50 flex justify-end bg-[#1A0A13]/35">
    <aside className="relative flex h-full w-full max-w-5xl flex-col border-l border-[#E7DFD2] bg-white shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-[#E7DFD2] bg-[#FCFBF9] px-5 py-4 sm:px-7">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#A07A39]"><BookOpen className="h-3.5 w-3.5" /> Tally-style ledger</p>
          <h2 className="mt-1 truncate text-lg font-bold text-slate-900">Cash-in-Hand &amp; Bank</h2>
          <p className="mt-1 text-[11px] text-slate-500">Saved receipt history · As at {formatLedgerDate(asOfDate)}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close Cash-in-Hand and Bank history" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
      </header>

      <div className="overflow-y-auto p-4 sm:p-7">
        <div className="grid gap-2 sm:grid-cols-3">
          <LedgerSummary label="Total debit" value={totalDebit} tone="blue" />
          <LedgerSummary label="Total credit" value={totalCredit} tone="green" />
          <div className="rounded-2xl border border-[#E4B7C8] bg-[#FBF4F7] px-3.5 py-3"><span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#701A35]">Net movement</span><strong className="mt-2 block text-lg font-bold tabular-nums text-slate-900">{formatSignedLedgerBalance(closingBalance)}</strong></div>
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="border-b border-slate-200 bg-[#F8F6F2] px-4 py-3"><h3 className="text-xs font-bold text-slate-900">Receipt history</h3><p className="mt-0.5 text-[10px] text-slate-500">Every separately saved cash or bank receipt is shown here.</p></div>
          {rows.length === 0 ? <p className="px-5 py-12 text-center text-sm text-slate-500">No saved cash or bank receipts for this date.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-xs">
            <thead><tr className="border-b border-slate-200 bg-[#FAF8F5] text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500"><th className="px-3 py-2.5 text-left">Date</th><th className="px-3 py-2.5 text-left">Particulars</th><th className="px-3 py-2.5 text-left">Receipt / Ref</th><th className="px-3 py-2.5 text-left">Mode</th><th className="px-3 py-2.5 text-right">Debit</th><th className="px-3 py-2.5 text-right">Credit</th><th className="px-3 py-2.5 text-right">Balance</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="transition-colors hover:bg-[#FCFAF7]"><td className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-700">{formatLedgerDate(row.date)}</td><td className="px-3 py-2.5 font-semibold text-slate-800">{row.particulars}</td><td className="px-3 py-2.5 font-mono text-[10px] font-bold text-slate-700">{row.reference}</td><td className="px-3 py-2.5 text-[10px] font-bold text-slate-600">{row.mode}</td><td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-[#245B9B]">{row.debit > 0 ? formatINR(row.debit) : '—'}</td><td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-emerald-700">{row.credit > 0 ? formatINR(row.credit) : '—'}</td><td className={`whitespace-nowrap px-3 py-2.5 text-right font-bold ${row.runningBalance < 0 ? 'text-emerald-700' : 'text-[#701A35]'}`}>{formatSignedLedgerBalance(row.runningBalance)}</td></tr>)}</tbody>
            <tfoot><tr className="border-t-2 border-slate-200 bg-[#F8F6F2] font-bold text-slate-800"><td></td><td colSpan={3} className="px-3 py-2.5">TOTAL · {rows.length} receipt{rows.length === 1 ? '' : 's'}</td><td className="px-3 py-2.5 text-right text-[#245B9B]">{formatINR(totalDebit)}</td><td className="px-3 py-2.5 text-right text-emerald-700">{formatINR(totalCredit)}</td><td className="px-3 py-2.5 text-right text-[#701A35]">{formatSignedLedgerBalance(closingBalance)}</td></tr></tfoot>
          </table></div>}
        </section>
      </div>
    </aside>
  </ModalFrame>;
}

interface ReceivablesCustomerGroup {
  key: string;
  customerId: string;
  customerName: string;
  loanIds: string[];
  rows: ReceivablesLedgerRow[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

function groupReceivablesRows(rows: ReceivablesLedgerRow[]): ReceivablesCustomerGroup[] {
  const grouped = new Map<string, ReceivablesLedgerRow[]>();
  rows.forEach((row) => {
    const key = row.customerId || row.customerName || row.loanId;
    grouped.set(key, [...(grouped.get(key) || []), row]);
  });

  return Array.from(grouped.entries())
    .map(([key, customerRows]) => {
      let runningBalance = 0;
      const ledgerRows = customerRows.map((row) => {
        runningBalance += row.debit - row.credit;
        return { ...row, runningBalance };
      });
      return {
        key,
        customerId: customerRows[0]?.customerId || key,
        customerName: customerRows[0]?.customerName || 'Unassigned customer',
        loanIds: Array.from(new Set(customerRows.map((row) => row.loanId))),
        rows: ledgerRows,
        totalDebit: customerRows.reduce((sum, row) => sum + row.debit, 0),
        totalCredit: customerRows.reduce((sum, row) => sum + row.credit, 0),
        closingBalance: runningBalance,
      };
    })
    .sort((a, b) => a.customerName.localeCompare(b.customerName));
}

function ReceivablesLedgerDrawer({ loans, receipts, asOfDate, onClose }: { loans: Loan[]; receipts: ManualReceipt[]; asOfDate: string; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const rows = useMemo(() => buildReceivablesLedger(loans, asOfDate, receipts), [asOfDate, loans, receipts]);
  const customerGroups = useMemo(() => groupReceivablesRows(rows), [rows]);
  const visibleGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return customerGroups;
    return customerGroups.filter((group) => [group.customerName, group.customerId, ...group.loanIds].join(' ').toLowerCase().includes(normalizedQuery));
  }, [customerGroups, query]);
  const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0);
  const closingBalance = rows[rows.length - 1]?.runningBalance || 0;

  const toggleCustomer = (key: string) => setExpandedCustomers((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  return <ModalFrame onClose={onClose} placement="end" aria-label="Customer Receivables ledger" className="fixed inset-0 z-50 flex justify-end bg-[#1A0A13]/35">
    <aside className="relative flex h-full w-full max-w-5xl flex-col border-l border-[#E7DFD2] bg-white shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-[#E7DFD2] bg-[#FCFBF9] px-5 py-4 sm:px-7">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#A07A39]"><BookOpen className="h-3.5 w-3.5" /> Tally-style ledger</p>
          <h2 className="mt-1 truncate text-lg font-bold text-slate-900">Customer Receivables</h2>
          <p className="mt-1 text-[11px] text-slate-500">Complete loan and collection history · As at {formatLedgerDate(asOfDate)}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close Customer Receivables ledger" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
      </header>

      <div className="overflow-y-auto p-4 sm:p-7">
        <div className="grid gap-2 sm:grid-cols-3">
          <LedgerSummary label="Total debit" value={totalDebit} tone="blue" />
          <LedgerSummary label="Total credit" value={totalCredit} tone="green" />
          <div className="rounded-2xl border border-[#E4B7C8] bg-[#FBF4F7] px-3.5 py-3"><span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#701A35]">Closing balance</span><strong className="mt-2 block text-lg font-bold tabular-nums text-slate-900">{formatSignedLedgerBalance(closingBalance)}</strong></div>
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="border-b border-slate-200 bg-[#F8F6F2] px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div><h3 className="text-xs font-bold text-slate-900">Customer-wise receivables</h3><p className="mt-0.5 text-[10px] text-slate-500">Click a customer to open that customer&apos;s complete date-wise history.</p></div>
            <label className="relative mt-3 block sm:mt-0 sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer or loan" aria-label="Search receivables customers" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-[#C5A059]" /></label>
          </div>
          <div className="divide-y divide-slate-200">
            {visibleGroups.length === 0 ? <p className="px-5 py-12 text-center text-sm text-slate-500">No customers match this search.</p> : visibleGroups.map((group) => {
              const expanded = expandedCustomers.has(group.key);
              return <article key={group.key}>
                <button type="button" onClick={() => toggleCustomer(group.key)} aria-expanded={expanded} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-[#FCFAF7] sm:px-5">
                  <span className="min-w-0"><strong className="block truncate text-sm text-[#701A35]">{group.customerName}</strong><span className="mt-1 block truncate text-[10px] text-slate-500">{group.customerId} · {group.loanIds.length} loan{group.loanIds.length === 1 ? '' : 's'} · {group.rows.length} transaction{group.rows.length === 1 ? '' : 's'}</span></span>
                  <span className="flex shrink-0 items-center gap-3"><span className="text-right"><span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">Closing balance</span><strong className={`mt-1 block text-xs ${group.closingBalance < 0 ? 'text-emerald-700' : 'text-[#701A35]'}`}>{formatSignedLedgerBalance(group.closingBalance)}</strong></span><ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} /></span>
                </button>
                {expanded && <ReceivablesLedgerTable rows={group.rows} totalDebit={group.totalDebit} totalCredit={group.totalCredit} closingBalance={group.closingBalance} />}
              </article>;
            })}
          </div>
        </section>
      </div>
    </aside>
  </ModalFrame>;
}

function ReceivablesLedgerTable({ rows, totalDebit, totalCredit, closingBalance }: { rows: ReceivablesLedgerRow[]; totalDebit: number; totalCredit: number; closingBalance: number }) {
  return <div className="overflow-x-auto border-t border-slate-200 bg-white">
    <table className="w-full min-w-[940px] border-collapse text-xs">
      <thead><tr className="border-b border-slate-200 bg-[#FAF8F5] text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500"><th className="px-3 py-2.5 text-left">Date</th><th className="px-3 py-2.5 text-left">Customer / Particular</th><th className="px-3 py-2.5 text-left">Loan / Ref</th><th className="px-3 py-2.5 text-left">Status</th><th className="px-3 py-2.5 text-right">Debit</th><th className="px-3 py-2.5 text-right">Credit</th><th className="px-3 py-2.5 text-right">Running balance</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{rows.map((row) => <ReceivablesLedgerTableRow key={row.id} row={row} />)}</tbody>
      <tfoot><tr className="border-t-2 border-slate-200 bg-[#F8F6F2] font-bold text-slate-800"><td></td><td colSpan={3} className="px-3 py-2.5">TOTAL · {rows.length} transaction{rows.length === 1 ? '' : 's'}</td><td className="px-3 py-2.5 text-right text-[#245B9B]">{formatINR(totalDebit)}</td><td className="px-3 py-2.5 text-right text-emerald-700">{formatINR(totalCredit)}</td><td className="px-3 py-2.5 text-right text-[#701A35]">{formatSignedLedgerBalance(closingBalance)}</td></tr></tfoot>
    </table>
  </div>;
}

function ReceivablesLedgerTableRow({ row }: { row: ReceivablesLedgerRow }) {
  return <tr className="transition-colors hover:bg-[#FCFAF7]">
    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-700">{formatLedgerDate(row.date)}</td>
    <td className="px-3 py-2.5"><span className="block font-semibold text-slate-800">{row.customerName || 'Unassigned customer'}</span><span className="mt-0.5 block text-[10px] text-slate-500">{row.installmentNo ? `Installment #${row.installmentNo}` : row.remarks || 'Receivable entry'}</span></td>
    <td className="px-3 py-2.5"><span className="block font-mono text-[10px] font-bold text-slate-700">{row.loanId}</span><span className="mt-0.5 block text-[10px] text-slate-400">{row.reference || '—'}</span></td>
    <td className="px-3 py-2.5"><span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{row.status}</span>{row.receivedDate && <span className="mt-1 block text-[10px] text-emerald-700">Received {formatLedgerDate(row.receivedDate)}</span>}</td>
    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-[#245B9B]">{row.debit > 0 ? formatINR(row.debit) : '—'}</td>
    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-emerald-700">{row.credit > 0 ? formatINR(row.credit) : '—'}</td>
    <td className={`whitespace-nowrap px-3 py-2.5 text-right font-bold ${row.runningBalance < 0 ? 'text-emerald-700' : 'text-[#701A35]'}`}>{formatSignedLedgerBalance(row.runningBalance)}</td>
  </tr>;
}

function LedgerSummary({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'green' }) {
  const styles = tone === 'blue' ? 'border-blue-200 bg-blue-50/50 text-blue-700' : 'border-emerald-200 bg-emerald-50/50 text-emerald-700';
  return <div className={`rounded-2xl border px-3.5 py-3 ${styles}`}><span className="block text-[10px] font-bold uppercase tracking-[0.1em] opacity-70">{label}</span><strong className="mt-2 block text-lg font-bold tabular-nums text-slate-900">{formatINR(value)}</strong></div>;
}

