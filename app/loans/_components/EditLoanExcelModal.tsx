'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { Loan, Installment, Company } from '@/lib/types';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';
import {
  FileSpreadsheet,
  X,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

interface EditLoanExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
}

interface EditableInstallmentRow {
  id?: string;
  seqNo: number;
  dueDate: string;
  amountDue: number;
  status: string;
  recdDate: string;
  chqNo: string;
  place: string;
  depName: string;
  remarks: string;
  // ASR Companies (10)
  pass: number;
  kars: number;
  ig: number;
  ine: number;
  ins: number;
  mars: number;
  mm: number;
  tg: number;
  gs: number;
  ala: number;
  // Outside Companies (6)
  fin: number;
  cs: number;
  mc: number;
  tatva: number;
  bhavna: number;
  taSS: number;
}

function formatToIso(dStr: string | null | undefined): string {
  if (!dStr) return '';
  const trimmed = dStr.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parts = trimmed.split(/[-/]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1];
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(year) && isNaN(Number(monthStr))) {
      const monthIdx = [
        'jan', 'feb', 'mar', 'apr', 'may', 'jun',
        'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
      ].indexOf(monthStr.toLowerCase().slice(0, 3));
      if (monthIdx !== -1) {
        const fullYear = year < 100 ? 2000 + year : year;
        return `${fullYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return '';
}

export const EditLoanExcelModal: React.FC<EditLoanExcelModalProps> = ({
  isOpen,
  onClose,
  loan,
}) => {
  const { updateFullLoan, showToast } = useApp();

  // Top Loan Form Fields
  const [customerName, setCustomerName] = useState('');
  const [codeNo, setCodeNo] = useState('');
  const [place, setPlace] = useState('');
  const [startDate, setStartDate] = useState('');
  const [frequency, setFrequency] = useState<'Weekly' | 'Monthly'>('Monthly');
  const [status, setStatus] = useState<Loan['status']>('Active');

  // Spreadsheet Rows
  const [rows, setRows] = useState<EditableInstallmentRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Column View Filter
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'ASR_ONLY' | 'OUTSIDE_ONLY'>('ALL');

  // Initialize rows when loan changes
  useEffect(() => {
    if (!loan) return;

    setCustomerName(loan.customerName || '');
    setCodeNo(loan.codeNo || '');
    setPlace(loan.place || 'CHENNAI');
    setStartDate(formatToIso(loan.startDate) || new Date().toISOString().slice(0, 10));
    setFrequency(loan.frequency || 'Monthly');
    setStatus(loan.status || 'Active');

    const mappedRows: EditableInstallmentRow[] = (loan.installments || []).map((inst, idx) => {
      const splits = inst.companySplits || {};
      return {
        id: inst.id,
        seqNo: inst.seqNo || idx + 1,
        dueDate: formatToIso(inst.dueDate) || '2026-07-01',
        amountDue: inst.amountDue || 0,
        status: inst.status || 'PENDING',
        recdDate: formatToIso(inst.recdDate) || '',
        chqNo: inst.chqNo || '',
        place: inst.place || loan.place || 'CHENNAI',
        depName: inst.depName || '',
        remarks: inst.remarks || '',
        // ASR Companies (10)
        pass: Number(splits['PASS'] || splits['PASS ENTERPRISES'] || 0),
        kars: Number(splits['KARS'] || splits['KARS ENTERPRISES'] || 0),
        ig: Number(splits['IG'] || splits['INFIN GROUP'] || splits['INFIN'] || 0),
        ine: Number(splits['INE'] || splits['INFINITY ENTERPRISES'] || 0),
        ins: Number(splits['INS'] || splits['INNOVATIVE SOLUTIONS'] || splits['INNOVATE SOLUTIONS'] || 0),
        mars: Number(splits['MARS'] || splits['MARS SOLUTION'] || 0),
        mm: Number(splits['MM'] || splits['MM ASSOCIATES'] || 0),
        tg: Number(splits['TG'] || splits['TRIVENI GROUP'] || splits['TREVINI GROUP'] || 0),
        gs: Number(splits['GS'] || splits['GLOBAL SOLITAIRE'] || splits['GLOBAL SOLITARE'] || 0),
        ala: Number(splits['ALA'] || splits['ALAGESH'] || 0),
        // Outside Companies (6)
        fin: Number(splits['FIN'] || splits['FINCUBE VENTURES'] || 0),
        cs: Number(splits['CS'] || splits['CS ASSOCIATES'] || 0),
        mc: Number(splits['MC'] || splits['M CHINNIAH'] || 0),
        tatva: Number(splits['TATVA'] || splits['TATVA ENTERPRISES'] || 0),
        bhavna: Number(splits['BHAVNA'] || splits['BHAVANA'] || splits['BHAVANA CORP'] || 0),
        taSS: Number(splits['TA (SS)'] || splits['TA'] || splits['THIRUCHENDURAON ASSOCIATE'] || 0),
      };
    });

    setRows(mappedRows);
  }, [loan]);

  // Live totals
  const totalLoanAmount = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.amountDue) || 0), 0);
  }, [rows]);

  // Column totals
  const companySums = useMemo(() => {
    return {
      pass: rows.reduce((s, r) => s + (Number(r.pass) || 0), 0),
      kars: rows.reduce((s, r) => s + (Number(r.kars) || 0), 0),
      ig: rows.reduce((s, r) => s + (Number(r.ig) || 0), 0),
      ine: rows.reduce((s, r) => s + (Number(r.ine) || 0), 0),
      ins: rows.reduce((s, r) => s + (Number(r.ins) || 0), 0),
      mars: rows.reduce((s, r) => s + (Number(r.mars) || 0), 0),
      mm: rows.reduce((s, r) => s + (Number(r.mm) || 0), 0),
      tg: rows.reduce((s, r) => s + (Number(r.tg) || 0), 0),
      gs: rows.reduce((s, r) => s + (Number(r.gs) || 0), 0),
      ala: rows.reduce((s, r) => s + (Number(r.ala) || 0), 0),
      fin: rows.reduce((s, r) => s + (Number(r.fin) || 0), 0),
      cs: rows.reduce((s, r) => s + (Number(r.cs) || 0), 0),
      mc: rows.reduce((s, r) => s + (Number(r.mc) || 0), 0),
      tatva: rows.reduce((s, r) => s + (Number(r.tatva) || 0), 0),
      bhavna: rows.reduce((s, r) => s + (Number(r.bhavna) || 0), 0),
      taSS: rows.reduce((s, r) => s + (Number(r.taSS) || 0), 0),
    };
  }, [rows]);

  // Check row validation mismatches
  const rowMismatches = useMemo(() => {
    return rows.map((r) => {
      const splitSum =
        (Number(r.pass) || 0) +
        (Number(r.kars) || 0) +
        (Number(r.ig) || 0) +
        (Number(r.ine) || 0) +
        (Number(r.ins) || 0) +
        (Number(r.mars) || 0) +
        (Number(r.mm) || 0) +
        (Number(r.tg) || 0) +
        (Number(r.gs) || 0) +
        (Number(r.ala) || 0) +
        (Number(r.fin) || 0) +
        (Number(r.cs) || 0) +
        (Number(r.mc) || 0) +
        (Number(r.tatva) || 0) +
        (Number(r.bhavna) || 0) +
        (Number(r.taSS) || 0);

      const amt = Number(r.amountDue) || 0;
      const isMismatch = splitSum > 0 && Math.abs(amt - splitSum) > 0.01;
      return {
        seqNo: r.seqNo,
        splitSum,
        amt,
        diff: amt - splitSum,
        isMismatch,
      };
    });
  }, [rows]);

  const hasAnyMismatches = rowMismatches.some((m) => m.isMismatch);

  // Update cell handler
  const handleCellChange = (index: number, field: keyof EditableInstallmentRow, val: any) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Add new EMI row
  const handleAddRow = () => {
    const nextSeq = rows.length + 1;
    let nextDate = '2026-07-01';
    if (rows.length > 0) {
      const lastDate = rows[rows.length - 1].dueDate;
      nextDate = lastDate || '2026-07-01';
    }

    const defaultAmt = rows.length > 0 ? rows[0].amountDue : 100000;

    const newRow: EditableInstallmentRow = {
      id: `INST-NEW-${Date.now()}-${nextSeq}`,
      seqNo: nextSeq,
      dueDate: nextDate,
      amountDue: defaultAmt,
      status: 'PENDING',
      recdDate: '',
      chqNo: '',
      place: place || 'CHENNAI',
      depName: '',
      remarks: '',
      pass: 0,
      kars: 0,
      ig: 0,
      ine: 0,
      ins: 0,
      mars: 0,
      mm: 0,
      tg: 0,
      gs: 0,
      ala: 0,
      fin: 0,
      cs: 0,
      mc: 0,
      tatva: 0,
      bhavna: 0,
      taSS: 0,
    };

    setRows((prev) => [...prev, newRow]);
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    if (rows.length <= 1) {
      showToast('Action Blocked', 'A loan must have at least one installment.', 'warning');
      return;
    }
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((r, i) => ({ ...r, seqNo: i + 1 }));
    });
  };

  // Auto-balance row splits based on initial percentages
  const handleAutoBalanceRow = (index: number) => {
    if (!loan || !loan.splits || loan.splits.length === 0) return;
    const row = rows[index];
    if (!row) return;
    const amt = Number(row.amountDue) || 0;
    if (amt <= 0) return;

    const updatedRow = { ...row };
    loan.splits.forEach((sp) => {
      const splitVal = Math.round((amt * sp.splitPercent) / 100);
      const code = sp.companyCode.toUpperCase();
      if (code === 'PASS') updatedRow.pass = splitVal;
      else if (code === 'KARS') updatedRow.kars = splitVal;
      else if (code === 'IG' || code === 'INFIN') updatedRow.ig = splitVal;
      else if (code === 'INE') updatedRow.ine = splitVal;
      else if (code === 'INS') updatedRow.ins = splitVal;
      else if (code === 'MARS') updatedRow.mars = splitVal;
      else if (code === 'MM') updatedRow.mm = splitVal;
      else if (code === 'TG') updatedRow.tg = splitVal;
      else if (code === 'GS') updatedRow.gs = splitVal;
      else if (code === 'ALA') updatedRow.ala = splitVal;
      else if (code === 'FIN') updatedRow.fin = splitVal;
      else if (code === 'CS') updatedRow.cs = splitVal;
      else if (code === 'MC') updatedRow.mc = splitVal;
      else if (code === 'TATVA') updatedRow.tatva = splitVal;
      else if (code === 'BHAVNA' || code === 'BHAVANA') updatedRow.bhavna = splitVal;
      else if (code.includes('TA')) updatedRow.taSS = splitVal;
    });
    setRows((prev) => {
      const next = [...prev];
      next[index] = updatedRow;
      return next;
    });
    showToast('Row Balanced', `EMI #${row.seqNo} company splits aligned to loan ratio.`, 'info');
  };

  // Save changes back to Turso Cloud DB
  const handleSave = async () => {
    if (!loan) return;
    if (!customerName.trim()) {
      showToast('Validation Error', 'Customer / Client Name is required.', 'warning');
      return;
    }
    if (rows.length === 0) {
      showToast('Validation Error', 'At least one installment row is required.', 'warning');
      return;
    }

    setIsSaving(true);

    const payload = {
      customerName: customerName.trim(),
      codeNo: codeNo.trim() || undefined,
      place: place.trim() || 'CHENNAI',
      status,
      frequency,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      installments: rows.map((r) => {
        const companySplits: Record<string, number> = {};
        // ASR Companies (10)
        if (r.pass > 0) companySplits['PASS'] = Number(r.pass);
        if (r.kars > 0) companySplits['KARS'] = Number(r.kars);
        if (r.ig > 0) companySplits['IG'] = Number(r.ig);
        if (r.ine > 0) companySplits['INE'] = Number(r.ine);
        if (r.ins > 0) companySplits['INS'] = Number(r.ins);
        if (r.mars > 0) companySplits['MARS'] = Number(r.mars);
        if (r.mm > 0) companySplits['MM'] = Number(r.mm);
        if (r.tg > 0) companySplits['TG'] = Number(r.tg);
        if (r.gs > 0) companySplits['GS'] = Number(r.gs);
        if (r.ala > 0) companySplits['ALA'] = Number(r.ala);
        // Outside Companies (6)
        if (r.fin > 0) companySplits['FIN'] = Number(r.fin);
        if (r.cs > 0) companySplits['CS'] = Number(r.cs);
        if (r.mc > 0) companySplits['MC'] = Number(r.mc);
        if (r.tatva > 0) companySplits['TATVA'] = Number(r.tatva);
        if (r.bhavna > 0) companySplits['BHAVNA'] = Number(r.bhavna);
        if (r.taSS > 0) companySplits['TA (SS)'] = Number(r.taSS);

        return {
          id: r.id && !r.id.startsWith('INST-NEW') ? r.id : undefined,
          seqNo: Number(r.seqNo),
          dueDate: r.dueDate,
          amountDue: Number(r.amountDue) || 0,
          status: r.status || 'PENDING',
          recdDate: r.recdDate && r.recdDate.trim() ? r.recdDate.trim() : null,
          chqNo: r.chqNo && r.chqNo.trim() ? r.chqNo.trim() : null,
          place: r.place || place || 'CHENNAI',
          depName: r.depName && r.depName.trim() ? r.depName.trim() : null,
          remarks: r.remarks && r.remarks.trim() ? r.remarks.trim() : null,
          companySplits,
        };
      }),
    };

    const result = await updateFullLoan(loan.id, payload);
    setIsSaving(false);

    if (result) {
      onClose();
    }
  };

  const showAsr = categoryFilter === 'ALL' || categoryFilter === 'ASR_ONLY';
  const showOutside = categoryFilter === 'ALL' || categoryFilter === 'OUTSIDE_ONLY';

  if (!isOpen || !loan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] rounded-2xl border border-[#D0C8B8] shadow-2xl w-full max-w-[99vw] h-[96vh] flex flex-col overflow-hidden">
        {/* ─── Excel Modal Top Toolbar ─── */}
        <div className="p-4 bg-white border-b border-[#D0C8B8] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#701A35]/10 border border-[#701A35]/20 flex items-center justify-center text-[#701A35] shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 font-serif">
                  Spreadsheet Editor: {loan.customerName}
                </h2>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-[#701A35] text-white">
                  {loan.id}
                </span>
                <span className="font-mono text-xs font-bold px-3 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                  Total Loan: ₹{totalLoanAmount.toLocaleString('en-IN')} ({numberToWordsINR(totalLoanAmount)})
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Official Company Ledgers • Full Company Names • Direct Cell Editing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={handleAddRow}
              className="px-3.5 py-2 bg-white border border-[#D0C8B8] hover:bg-[#FAF8F5] text-slate-800 text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#701A35]" />
              <span>Insert Row</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-[#701A35] hover:bg-[#5C142B] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
            >
              <Save className="w-4 h-4 text-amber-200" />
              <span>{isSaving ? 'Saving...' : 'Save & Sync'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── Excel Metadata Properties Bar ─── */}
        <div className="px-5 py-3 bg-[#FDFCFA] border-b border-[#D0C8B8] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs shrink-0">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Borrower Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-bold text-slate-900 focus:outline-2 focus:outline-[#701A35]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Code No
            </label>
            <input
              type="text"
              value={codeNo}
              onChange={(e) => setCodeNo(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono text-slate-800 focus:outline-2 focus:outline-[#701A35]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Place
            </label>
            <input
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-800 focus:outline-2 focus:outline-[#701A35]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onClick={(e) => {
                try {
                  (e.target as any).showPicker?.();
                } catch {}
              }}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono font-semibold text-slate-900 cursor-pointer focus:outline-2 focus:outline-[#701A35] [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-800 font-semibold focus:outline-2 focus:outline-[#701A35] cursor-pointer"
            >
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-800 font-semibold focus:outline-2 focus:outline-[#701A35] cursor-pointer"
            >
              <option value="Active">Active</option>
              <option value="On Track">On Track</option>
              <option value="Overdue">Overdue</option>
              <option value="Closed">Closed</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        {/* ─── Filter & Balance Status Bar ─── */}
        <div className="px-5 py-2 bg-[#F4F1EA] border-b border-[#D0C8B8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 font-mono uppercase">View Columns:</span>
            <div className="flex items-center bg-white rounded border border-[#D0C8B8] p-0.5">
              {[
                { id: 'ALL', label: 'All Companies (16)' },
                { id: 'ASR_ONLY', label: 'ASR Companies (10)' },
                { id: 'OUTSIDE_ONLY', label: 'Outside Companies (6)' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCategoryFilter(f.id as any)}
                  className={`px-3 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    categoryFilter === f.id
                      ? 'bg-[#701A35] text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasAnyMismatches ? (
              <span className="text-rose-700 font-mono font-bold flex items-center gap-1 text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-300">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Notice: Some rows have split differences</span>
              </span>
            ) : (
              <span className="text-emerald-700 font-mono font-bold flex items-center gap-1 text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>All company splits balance perfectly</span>
              </span>
            )}
            <span className="font-mono text-slate-600 font-bold text-[11px]">
              {rows.length} Installment Rows
            </span>
          </div>
        </div>

        {/* ─── Excel Spreadsheet Grid: Authentic Grid Sheet with Full Company Names ─── */}
        <div className="flex-1 overflow-auto bg-white relative">
          <table className="w-full border-collapse text-xs select-none border border-slate-300 min-w-[2300px]">
            {/* Header Row */}
            <thead className="bg-[#EBE5DC] text-slate-800 sticky top-0 z-20 border-b border-slate-400 font-mono text-[11px] shadow-2xs">
              <tr className="divide-x divide-slate-300">
                <th className="p-2.5 w-12 min-w-[48px] text-center sticky left-0 z-30 bg-[#E5DFC7] font-bold border-r border-slate-400">
                  #
                </th>
                <th className="p-2.5 w-36 min-w-[140px] text-left font-bold">Due Date</th>
                <th className="p-2.5 w-24 min-w-[90px] text-left font-bold">Place</th>
                <th className="p-2.5 w-28 min-w-[100px] text-left font-bold">Dep Name</th>
                <th className="p-2.5 w-24 min-w-[90px] text-left font-bold">Chq No</th>
                <th className="p-2.5 w-36 min-w-[135px] text-right bg-amber-200/80 font-extrabold text-amber-950 border-x border-slate-400">
                  Amount Due (₹)
                </th>
                <th className="p-2.5 w-28 min-w-[105px] text-center font-bold">Status</th>
                <th className="p-2.5 w-36 min-w-[140px] text-left font-bold">Recd Date</th>

                {/* ASR Group Companies (10): Full Names */}
                {showAsr && (
                  <>
                    <th className="p-2.5 w-36 min-w-[130px] text-right bg-[#701A35]/15 text-[#701A35] font-bold">
                      PASS ENTERPRISES
                    </th>
                    <th className="p-2.5 w-36 min-w-[130px] text-right bg-[#701A35]/15 text-[#701A35] font-bold">
                      KARS ENTERPRISES
                    </th>
                    <th className="p-2.5 w-32 min-w-[115px] text-right bg-[#701A35]/15 text-[#701A35] font-bold">
                      INFIN GROUP
                    </th>
                    <th className="p-2.5 w-36 min-w-[130px] text-right bg-[#701A35]/15 text-[#701A35] font-bold">
                      INFINITY ENTERPRISES
                    </th>
                    <th className="p-2.5 w-36 min-w-[130px] text-right bg-[#701A35]/15 text-[#701A35] font-bold">
                      INNOVATIVE SOLUTIONS
                    </th>
                    <th className="p-2.5 w-36 min-w-[130px] text-right bg-[#701A35]/15 text-[#701A35] font-bold">
                      MARS SOLUTION
                    </th>
                    <th className="p-2.5 w-36 min-w-[130px] text-right bg-[#701A35]/15 text-[#701A35] font-bold">
                      MM ASSOCIATES
                    </th>
                    <th className="p-2.5 w-32 min-w-[115px] text-right bg-[#701A35]/15 text-[#701A35] font-bold">
                      TRIVENI GROUP
                    </th>
                    <th className="p-2.5 w-36 min-w-[130px] text-right bg-[#701A35]/15 text-[#701A35] font-bold">
                      GLOBAL SOLITAIRE
                    </th>
                    <th className="p-2.5 w-32 min-w-[110px] text-right bg-[#701A35]/15 text-[#701A35] font-bold">
                      ALAGESH
                    </th>
                  </>
                )}

                {/* Outside Parties Companies (6): Full Names */}
                {showOutside && (
                  <>
                    <th className="p-2.5 w-36 min-w-[130px] text-right bg-purple-100 text-purple-950 font-bold">
                      FINCUBE VENTURES
                    </th>
                    <th className="p-2.5 w-36 min-w-[130px] text-right bg-purple-100 text-purple-950 font-bold">
                      CS ASSOCIATES
                    </th>
                    <th className="p-2.5 w-28 min-w-[100px] text-right bg-purple-100 text-purple-950 font-bold">
                      M CHINNIAH
                    </th>
                    <th className="p-2.5 w-36 min-w-[130px] text-right bg-purple-200 text-purple-950 font-extrabold">
                      TATVA ENTERPRISES
                    </th>
                    <th className="p-2.5 w-36 min-w-[130px] text-right bg-purple-200 text-purple-950 font-extrabold">
                      BHAVANA CORP
                    </th>
                    <th className="p-2.5 w-44 min-w-[160px] text-right bg-purple-100 text-purple-950 font-bold">
                      THIRUCHENDURAON ASSOCIATE
                    </th>
                  </>
                )}

                <th className="p-2.5 w-48 min-w-[160px] text-left font-bold">Remarks</th>
                <th className="p-2.5 w-16 min-w-[60px] text-center font-bold">Act</th>
              </tr>
            </thead>

            {/* Grid Cells */}
            <tbody className="divide-y divide-slate-300 font-mono text-xs">
              {rows.map((row, idx) => {
                const validation = rowMismatches[idx];

                return (
                  <tr
                    key={row.id || idx}
                    className={`divide-x divide-slate-300 transition-colors ${
                      validation.isMismatch ? 'bg-rose-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F6]'
                    } hover:bg-amber-50/40`}
                  >
                    {/* S.No */}
                    <td className="p-0 text-center font-bold text-slate-500 sticky left-0 bg-[#F4F1EA] z-10 border-r border-slate-300">
                      <div className="py-2">{row.seqNo}</div>
                    </td>

                    {/* Due Date: Clean Excel Date Cell with Calendar Selector */}
                    <td className="p-0">
                      <input
                        type="date"
                        value={formatToIso(row.dueDate)}
                        onChange={(e) => handleCellChange(idx, 'dueDate', e.target.value)}
                        onClick={(e) => {
                          try {
                            (e.target as any).showPicker?.();
                          } catch {}
                        }}
                        className="w-full h-full px-2.5 py-2 bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] font-mono text-xs font-semibold text-slate-900 cursor-pointer [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                    </td>

                    {/* Place */}
                    <td className="p-0">
                      <input
                        type="text"
                        value={row.place}
                        onChange={(e) => handleCellChange(idx, 'place', e.target.value)}
                        className="w-full h-full px-2.5 py-2 bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] text-slate-800"
                      />
                    </td>

                    {/* Dep Name */}
                    <td className="p-0">
                      <input
                        type="text"
                        value={row.depName}
                        onChange={(e) => handleCellChange(idx, 'depName', e.target.value)}
                        placeholder="DEP"
                        className="w-full h-full px-2.5 py-2 bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] font-bold text-slate-800 uppercase"
                      />
                    </td>

                    {/* Chq No */}
                    <td className="p-0">
                      <input
                        type="text"
                        value={row.chqNo}
                        onChange={(e) => handleCellChange(idx, 'chqNo', e.target.value)}
                        placeholder="CHQ"
                        className="w-full h-full px-2.5 py-2 bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] text-slate-700 font-mono"
                      />
                    </td>

                    {/* Amount Due */}
                    <td className="p-0 bg-amber-50/50">
                      <input
                        type="number"
                        value={row.amountDue || ''}
                        onChange={(e) => handleCellChange(idx, 'amountDue', Number(e.target.value) || 0)}
                        className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-amber-600 font-bold text-slate-900 [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                      />
                    </td>

                    {/* Status Dropdown */}
                    <td className="p-0 text-center">
                      <select
                        value={row.status}
                        onChange={(e) => handleCellChange(idx, 'status', e.target.value)}
                        className="w-full h-full px-1.5 py-2 bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] text-xs font-bold text-slate-800 cursor-pointer"
                      >
                        <option value="PASS">PASS</option>
                        <option value="NEFT">NEFT</option>
                        <option value="CASH">CASH</option>
                        <option value="CLS">CLS</option>
                        <option value="CS">CS</option>
                        <option value="RET">RET</option>
                        <option value="RET NEFT">RET NEFT</option>
                        <option value="RET PASS">RET PASS</option>
                        <option value="PENDING">PENDING</option>
                      </select>
                    </td>

                    {/* Recd Date */}
                    <td className="p-0">
                      <input
                        type="date"
                        value={formatToIso(row.recdDate)}
                        onChange={(e) => handleCellChange(idx, 'recdDate', e.target.value)}
                        onClick={(e) => {
                          try {
                            (e.target as any).showPicker?.();
                          } catch {}
                        }}
                        className="w-full h-full px-2.5 py-2 bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] font-mono text-xs text-slate-800 cursor-pointer [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                    </td>

                    {/* ASR Group Company Splits (10) */}
                    {showAsr && (
                      <>
                        <td className="p-0 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.pass || ''}
                            onChange={(e) => handleCellChange(idx, 'pass', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] text-slate-900 font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                        <td className="p-0 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.kars || ''}
                            onChange={(e) => handleCellChange(idx, 'kars', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] text-slate-900 font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                        <td className="p-0 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.ig || ''}
                            onChange={(e) => handleCellChange(idx, 'ig', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] text-slate-900 font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                        <td className="p-0 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.ine || ''}
                            onChange={(e) => handleCellChange(idx, 'ine', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] text-slate-900 font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                        <td className="p-0 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.ins || ''}
                            onChange={(e) => handleCellChange(idx, 'ins', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] text-slate-900 font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                        <td className="p-0 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.mars || ''}
                            onChange={(e) => handleCellChange(idx, 'mars', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] text-slate-900 font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                        <td className="p-0 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.mm || ''}
                            onChange={(e) => handleCellChange(idx, 'mm', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] text-slate-900 font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                        <td className="p-0 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.tg || ''}
                            onChange={(e) => handleCellChange(idx, 'tg', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] text-slate-900 font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                        <td className="p-0 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.gs || ''}
                            onChange={(e) => handleCellChange(idx, 'gs', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] text-slate-900 font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                        <td className="p-0 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.ala || ''}
                            onChange={(e) => handleCellChange(idx, 'ala', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] text-slate-900 font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                      </>
                    )}

                    {/* Outside Parties Company Splits (6) */}
                    {showOutside && (
                      <>
                        <td className="p-0 bg-purple-50/30">
                          <input
                            type="number"
                            value={row.fin || ''}
                            onChange={(e) => handleCellChange(idx, 'fin', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-purple-700 text-slate-900 font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                        <td className="p-0 bg-purple-50/30">
                          <input
                            type="number"
                            value={row.cs || ''}
                            onChange={(e) => handleCellChange(idx, 'cs', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-purple-700 text-slate-900 font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                        <td className="p-0 bg-purple-50/30">
                          <input
                            type="number"
                            value={row.mc || ''}
                            onChange={(e) => handleCellChange(idx, 'mc', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-purple-700 text-slate-900 font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                        <td className="p-0 bg-purple-50/40">
                          <input
                            type="number"
                            value={row.tatva || ''}
                            onChange={(e) => handleCellChange(idx, 'tatva', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-purple-800 text-purple-950 font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                        <td className="p-0 bg-purple-50/40">
                          <input
                            type="number"
                            value={row.bhavna || ''}
                            onChange={(e) => handleCellChange(idx, 'bhavna', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-purple-800 text-purple-950 font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                        <td className="p-0 bg-purple-50/30">
                          <input
                            type="number"
                            value={row.taSS || ''}
                            onChange={(e) => handleCellChange(idx, 'taSS', Number(e.target.value) || 0)}
                            className="w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 focus:outline-purple-700 text-slate-900 font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
                          />
                        </td>
                      </>
                    )}

                    {/* Remarks */}
                    <td className="p-0">
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => handleCellChange(idx, 'remarks', e.target.value)}
                        placeholder="Remarks"
                        className="w-full h-full px-2.5 py-2 bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] text-slate-700 font-sans text-xs"
                      />
                    </td>

                    {/* Actions: Re-balance & Delete */}
                    <td className="p-0 text-center">
                      <div className="flex items-center justify-center gap-1 py-1">
                        <button
                          type="button"
                          onClick={() => handleAutoBalanceRow(idx)}
                          className="p-1 rounded text-slate-400 hover:text-[#701A35] hover:bg-slate-200 cursor-pointer"
                          title="Auto-balance row"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* ─── Exact Aligned Footer Totals Row ─── */}
            <tfoot className="bg-[#EBE5DC] border-t-2 border-[#701A35] font-mono text-xs font-bold text-slate-900 sticky bottom-0 z-20 shadow-xs divide-x divide-slate-400">
              <tr>
                <td className="p-2.5 text-center sticky left-0 bg-[#E5DFC7] z-30 font-extrabold border-r border-slate-400">
                  TOTAL
                </td>
                <td className="p-2.5 text-slate-700 font-bold">
                  {rows.length} EMIs
                </td>
                <td className="p-2.5" />
                <td className="p-2.5" />
                <td className="p-2.5" />
                <td className="p-2.5 text-right bg-amber-200 text-amber-950 font-extrabold border-x border-slate-400">
                  ₹{totalLoanAmount.toLocaleString('en-IN')}
                </td>
                <td className="p-2.5 text-center text-slate-700 font-semibold">
                  {rows.filter((r) => ['PASS', 'Paid'].includes(r.status)).length} Paid
                </td>
                <td className="p-2.5" />

                {/* ASR Group Totals (10) */}
                {showAsr && (
                  <>
                    <td className="p-2.5 text-right text-[#701A35] bg-[#701A35]/15 font-bold">
                      ₹{companySums.pass.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right text-[#701A35] bg-[#701A35]/15 font-bold">
                      ₹{companySums.kars.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right text-[#701A35] bg-[#701A35]/15 font-bold">
                      ₹{companySums.ig.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right text-[#701A35] bg-[#701A35]/15 font-bold">
                      ₹{companySums.ine.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right text-[#701A35] bg-[#701A35]/15 font-bold">
                      ₹{companySums.ins.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right text-[#701A35] bg-[#701A35]/15 font-bold">
                      ₹{companySums.mars.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right text-[#701A35] bg-[#701A35]/15 font-bold">
                      ₹{companySums.mm.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right text-[#701A35] bg-[#701A35]/15 font-bold">
                      ₹{companySums.tg.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right text-[#701A35] bg-[#701A35]/15 font-bold">
                      ₹{companySums.gs.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right text-[#701A35] bg-[#701A35]/15 font-bold">
                      ₹{companySums.ala.toLocaleString('en-IN')}
                    </td>
                  </>
                )}

                {/* Outside Parties Totals (6) */}
                {showOutside && (
                  <>
                    <td className="p-2.5 text-right text-purple-950 bg-purple-100 font-bold">
                      ₹{companySums.fin.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right text-purple-950 bg-purple-100 font-bold">
                      ₹{companySums.cs.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right text-purple-950 bg-purple-100 font-bold">
                      ₹{companySums.mc.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right text-purple-950 bg-purple-200 font-extrabold">
                      ₹{companySums.tatva.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right text-purple-950 bg-purple-200 font-extrabold">
                      ₹{companySums.bhavna.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right text-purple-950 bg-purple-100 font-bold">
                      ₹{companySums.taSS.toLocaleString('en-IN')}
                    </td>
                  </>
                )}

                <td className="p-2.5" />
                <td className="p-2.5 text-center text-slate-500 font-normal">Sync</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
