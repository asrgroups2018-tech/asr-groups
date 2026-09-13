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
  Building2,
  Calendar,
  RotateCcw,
  SlidersHorizontal,
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
  pass: number;
  ala: number;
  ig: number;
  gs: number;
  mars: number;
  tg: number;
  fin: number;
  mm: number;
  cs: number;
  mc: number;
  taSS: number;
  others: number;
  othersName: string;
}

const ALL_COMPANY_CODES = [
  'PASS', 'ALA', 'IG', 'GS', 'MARS', 'TG', 'FIN', 'MM',
  'CS', 'MC', 'TA (SS)', 'OTHERS',
];

export const EditLoanExcelModal: React.FC<EditLoanExcelModalProps> = ({
  isOpen,
  onClose,
  loan,
}) => {
  const { updateFullLoan, showToast, companies } = useApp();

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
    setStartDate(loan.startDate || new Date().toISOString().slice(0, 10));
    setFrequency(loan.frequency || 'Monthly');
    setStatus(loan.status || 'Active');

    const mappedRows: EditableInstallmentRow[] = (loan.installments || []).map((inst, idx) => {
      const splits = inst.companySplits || {};
      return {
        id: inst.id,
        seqNo: inst.seqNo || idx + 1,
        dueDate: inst.dueDate || '',
        amountDue: inst.amountDue || 0,
        status: inst.status || 'PENDING',
        recdDate: inst.recdDate || '',
        chqNo: inst.chqNo || '',
        place: inst.place || loan.place || 'CHENNAI',
        depName: inst.depName || '',
        remarks: inst.remarks || '',
        pass: Number(splits['PASS'] || 0),
        ala: Number(splits['ALA'] || 0),
        ig: Number(splits['IG'] || 0),
        gs: Number(splits['GS'] || 0),
        mars: Number(splits['MARS'] || 0),
        tg: Number(splits['TG'] || 0),
        fin: Number(splits['FIN'] || 0),
        mm: Number(splits['MM'] || 0),
        cs: Number(splits['CS'] || 0),
        mc: Number(splits['MC'] || 0),
        taSS: Number(splits['TA (SS)'] || splits['TA'] || 0),
        others: Number(splits['OTHERS'] || 0),
        othersName: '',
      };
    });

    setRows(mappedRows);
  }, [loan]);

  // Live totals
  const totalLoanAmount = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.amountDue) || 0), 0);
  }, [rows]);

  // Check row validation mismatches
  const rowMismatches = useMemo(() => {
    return rows.map((r) => {
      const splitSum =
        (Number(r.pass) || 0) +
        (Number(r.ala) || 0) +
        (Number(r.ig) || 0) +
        (Number(r.gs) || 0) +
        (Number(r.mars) || 0) +
        (Number(r.tg) || 0) +
        (Number(r.fin) || 0) +
        (Number(r.mm) || 0) +
        (Number(r.cs) || 0) +
        (Number(r.mc) || 0) +
        (Number(r.taSS) || 0) +
        (Number(r.others) || 0);

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
    let nextDate = '1-Jul-2026';
    if (rows.length > 0) {
      const lastDate = rows[rows.length - 1].dueDate;
      nextDate = lastDate || '1-Jul-2026';
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
      ala: 0,
      ig: 0,
      gs: 0,
      mars: 0,
      tg: 0,
      fin: 0,
      mm: 0,
      cs: 0,
      mc: 0,
      taSS: 0,
      others: 0,
      othersName: '',
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
      // Re-number sequence
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
      else if (code === 'ALA') updatedRow.ala = splitVal;
      else if (code === 'IG') updatedRow.ig = splitVal;
      else if (code === 'GS') updatedRow.gs = splitVal;
      else if (code === 'MARS') updatedRow.mars = splitVal;
      else if (code === 'TG') updatedRow.tg = splitVal;
      else if (code === 'FIN') updatedRow.fin = splitVal;
      else if (code === 'MM') updatedRow.mm = splitVal;
      else if (code === 'CS') updatedRow.cs = splitVal;
      else if (code === 'MC') updatedRow.mc = splitVal;
      else if (code.includes('TA')) updatedRow.taSS = splitVal;
      else {
        updatedRow.others = splitVal;
        updatedRow.othersName = code;
      }
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
        if (r.pass > 0) companySplits['PASS'] = Number(r.pass);
        if (r.ala > 0) companySplits['ALA'] = Number(r.ala);
        if (r.ig > 0) companySplits['IG'] = Number(r.ig);
        if (r.gs > 0) companySplits['GS'] = Number(r.gs);
        if (r.mars > 0) companySplits['MARS'] = Number(r.mars);
        if (r.tg > 0) companySplits['TG'] = Number(r.tg);
        if (r.fin > 0) companySplits['FIN'] = Number(r.fin);
        if (r.mm > 0) companySplits['MM'] = Number(r.mm);
        if (r.cs > 0) companySplits['CS'] = Number(r.cs);
        if (r.mc > 0) companySplits['MC'] = Number(r.mc);
        if (r.taSS > 0) companySplits['TA (SS)'] = Number(r.taSS);
        if (r.others > 0) companySplits['OTHERS'] = Number(r.others);

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
          othersName: r.othersName && r.othersName.trim() ? r.othersName.trim() : null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] rounded-2xl border border-[#E6E1D6] shadow-2xl w-full max-w-[96vw] h-[92vh] flex flex-col overflow-hidden">
        {/* ─── Header Bar ─── */}
        <div className="p-4 bg-white border-b border-[#E6E1D6] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#701A35]/10 border border-[#701A35]/20 flex items-center justify-center text-[#701A35] shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 font-serif">
                  Edit Loan & Schedule: {loan.customerName}
                </h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#701A35] text-white">
                  {loan.id}
                </span>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Total: ₹{totalLoanAmount.toLocaleString('en-IN')} ({numberToWordsINR(totalLoanAmount)})
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Update borrower details, EMI amounts, company splits, and payment dates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={handleAddRow}
              className="px-3.5 py-2 bg-white border border-[#E6E1D6] hover:bg-[#FAF8F5] text-slate-800 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#701A35]" />
              <span>Add EMI Row</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-[#701A35] hover:bg-[#5C142B] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-amber-200" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── Loan Metadata Config Bar ─── */}
        <div className="px-5 py-3 bg-white border-b border-[#E6E1D6] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs shrink-0">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Borrower Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-[#FAF8F5] font-bold text-slate-900"
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
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-[#FAF8F5] font-mono text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              City / Place
            </label>
            <input
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-[#FAF8F5] text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Start Date
            </label>
            <input
              type="text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-[#FAF8F5] font-mono text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Payment Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-[#FAF8F5] text-slate-800 font-semibold"
            >
              <option value="Monthly">Monthly</option>
              <option value="Weekly">Weekly</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-[#FAF8F5] text-slate-800 font-semibold"
            >
              <option value="Active">Active</option>
              <option value="On Track">On Track</option>
              <option value="Overdue">Overdue</option>
              <option value="Closed">Closed</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        {/* ─── Filter & Warning Bar ─── */}
        <div className="px-5 py-2.5 bg-[#FAF8F5] border-b border-[#E6E1D6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
          {/* Column Category Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 font-mono">Columns:</span>
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-[#E6E1D6]">
              {[
                { id: 'ALL', label: 'All Companies' },
                { id: 'ASR_ONLY', label: 'ASR Group Own' },
                { id: 'OUTSIDE_ONLY', label: 'Outside Parties' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCategoryFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    categoryFilter === f.id
                      ? 'bg-[#701A35] text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Validation Notice */}
          <div className="flex items-center gap-3">
            {hasAnyMismatches ? (
              <span className="text-rose-700 font-mono font-bold flex items-center gap-1 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Notice: Some rows have split amount differences</span>
              </span>
            ) : (
              <span className="text-emerald-700 font-mono font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>All company splits balance perfectly</span>
              </span>
            )}
            <span className="font-mono text-slate-500 text-[11px]">
              {rows.length} Total EMIs
            </span>
          </div>
        </div>

        {/* ─── Excel Spreadsheet Grid ─── */}
        <div className="flex-1 overflow-auto bg-white relative">
          <table className="w-full border-collapse text-xs select-none min-w-[1500px]">
            <thead className="bg-[#FAF8F5] text-slate-700 sticky top-0 z-20 border-b-2 border-[#E6E1D6] font-mono text-[11px] shadow-xs">
              <tr>
                <th className="p-2 border-r border-[#E6E1D6] w-12 text-center sticky left-0 z-30 bg-[#FAF8F5]">
                  EMI #
                </th>
                <th className="p-2 border-r border-[#E6E1D6] w-28 text-left">Due Date</th>
                <th className="p-2 border-r border-[#E6E1D6] w-24 text-left">Place</th>
                <th className="p-2 border-r border-[#E6E1D6] w-24 text-left">Dep Name</th>
                <th className="p-2 border-r border-[#E6E1D6] w-24 text-left">Chq No</th>
                <th className="p-2 border-r border-[#E6E1D6] w-32 text-right bg-amber-50/50 font-bold text-slate-900">
                  Amount Due (₹)
                </th>
                <th className="p-2 border-r border-[#E6E1D6] w-28 text-center">Status</th>
                <th className="p-2 border-r border-[#E6E1D6] w-28 text-left">Recd Date</th>

                {/* ASR Group Companies */}
                {showAsr && (
                  <>
                    <th className="p-2 border-r border-[#E6E1D6] w-24 text-right bg-[#701A35]/5 text-[#701A35]">PASS</th>
                    <th className="p-2 border-r border-[#E6E1D6] w-24 text-right bg-[#701A35]/5 text-[#701A35]">ALA</th>
                    <th className="p-2 border-r border-[#E6E1D6] w-24 text-right bg-[#701A35]/5 text-[#701A35]">IG</th>
                    <th className="p-2 border-r border-[#E6E1D6] w-24 text-right bg-[#701A35]/5 text-[#701A35]">GS</th>
                    <th className="p-2 border-r border-[#E6E1D6] w-24 text-right bg-[#701A35]/5 text-[#701A35]">MARS</th>
                    <th className="p-2 border-r border-[#E6E1D6] w-24 text-right bg-[#701A35]/5 text-[#701A35]">TG</th>
                    <th className="p-2 border-r border-[#E6E1D6] w-24 text-right bg-[#701A35]/5 text-[#701A35]">FIN</th>
                    <th className="p-2 border-r border-[#E6E1D6] w-24 text-right bg-[#701A35]/5 text-[#701A35]">MM</th>
                  </>
                )}

                {/* Outside Parties */}
                {showOutside && (
                  <>
                    <th className="p-2 border-r border-[#E6E1D6] w-24 text-right bg-purple-50/60 text-purple-900">CS</th>
                    <th className="p-2 border-r border-[#E6E1D6] w-24 text-right bg-purple-50/60 text-purple-900">MC</th>
                    <th className="p-2 border-r border-[#E6E1D6] w-24 text-right bg-purple-50/60 text-purple-900">TA (SS)</th>
                    <th className="p-2 border-r border-[#E6E1D6] w-24 text-right bg-purple-50/60 text-purple-900">OTHERS</th>
                    <th className="p-2 border-r border-[#E6E1D6] w-28 text-left bg-purple-50/60 text-purple-900">OTHERS NAME</th>
                  </>
                )}

                <th className="p-2 border-r border-[#E6E1D6] w-36 text-left">Remarks</th>
                <th className="p-2 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-xs">
              {rows.map((row, idx) => {
                const validation = rowMismatches[idx];

                return (
                  <tr
                    key={row.id || idx}
                    className={`hover:bg-[#FAF8F5] transition-colors ${
                      validation.isMismatch ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    {/* EMI Sequence */}
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500 sticky left-0 bg-white z-10">
                      #{row.seqNo}
                    </td>

                    {/* Due Date */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.dueDate}
                        onChange={(e) => handleCellChange(idx, 'dueDate', e.target.value)}
                        className="w-full px-1.5 py-1 bg-transparent hover:bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded font-semibold text-slate-900"
                      />
                    </td>

                    {/* Place */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.place}
                        onChange={(e) => handleCellChange(idx, 'place', e.target.value)}
                        className="w-full px-1.5 py-1 bg-transparent hover:bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded text-slate-700"
                      />
                    </td>

                    {/* Dep Name */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.depName}
                        onChange={(e) => handleCellChange(idx, 'depName', e.target.value)}
                        placeholder="e.g. PASS"
                        className="w-full px-1.5 py-1 bg-transparent hover:bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded font-bold text-slate-800 uppercase"
                      />
                    </td>

                    {/* Chq No */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.chqNo}
                        onChange={(e) => handleCellChange(idx, 'chqNo', e.target.value)}
                        placeholder="e.g. NEFT / 102938"
                        className="w-full px-1.5 py-1 bg-transparent hover:bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded text-slate-700 font-mono"
                      />
                    </td>

                    {/* Amount Due */}
                    <td className="p-1 border-r border-slate-200 bg-amber-50/30">
                      <input
                        type="number"
                        value={row.amountDue || ''}
                        onChange={(e) => handleCellChange(idx, 'amountDue', Number(e.target.value) || 0)}
                        className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded font-bold text-slate-900"
                      />
                    </td>

                    {/* Status Dropdown */}
                    <td className="p-1 border-r border-slate-200 text-center">
                      <select
                        value={row.status}
                        onChange={(e) => handleCellChange(idx, 'status', e.target.value)}
                        className="px-1.5 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-800"
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
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.recdDate}
                        onChange={(e) => handleCellChange(idx, 'recdDate', e.target.value)}
                        placeholder="e.g. 1-Jul-2026"
                        className="w-full px-1.5 py-1 bg-transparent hover:bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded text-slate-700"
                      />
                    </td>

                    {/* ASR Group Company Splits */}
                    {showAsr && (
                      <>
                        <td className="p-1 border-r border-slate-200 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.pass || ''}
                            onChange={(e) => handleCellChange(idx, 'pass', Number(e.target.value) || 0)}
                            className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-white focus:bg-white rounded"
                          />
                        </td>
                        <td className="p-1 border-r border-slate-200 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.ala || ''}
                            onChange={(e) => handleCellChange(idx, 'ala', Number(e.target.value) || 0)}
                            className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-white focus:bg-white rounded"
                          />
                        </td>
                        <td className="p-1 border-r border-slate-200 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.ig || ''}
                            onChange={(e) => handleCellChange(idx, 'ig', Number(e.target.value) || 0)}
                            className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-white focus:bg-white rounded"
                          />
                        </td>
                        <td className="p-1 border-r border-slate-200 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.gs || ''}
                            onChange={(e) => handleCellChange(idx, 'gs', Number(e.target.value) || 0)}
                            className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-white focus:bg-white rounded"
                          />
                        </td>
                        <td className="p-1 border-r border-slate-200 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.mars || ''}
                            onChange={(e) => handleCellChange(idx, 'mars', Number(e.target.value) || 0)}
                            className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-white focus:bg-white rounded"
                          />
                        </td>
                        <td className="p-1 border-r border-slate-200 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.tg || ''}
                            onChange={(e) => handleCellChange(idx, 'tg', Number(e.target.value) || 0)}
                            className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-white focus:bg-white rounded"
                          />
                        </td>
                        <td className="p-1 border-r border-slate-200 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.fin || ''}
                            onChange={(e) => handleCellChange(idx, 'fin', Number(e.target.value) || 0)}
                            className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-white focus:bg-white rounded"
                          />
                        </td>
                        <td className="p-1 border-r border-slate-200 bg-[#701A35]/5">
                          <input
                            type="number"
                            value={row.mm || ''}
                            onChange={(e) => handleCellChange(idx, 'mm', Number(e.target.value) || 0)}
                            className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-white focus:bg-white rounded"
                          />
                        </td>
                      </>
                    )}

                    {/* Outside Parties */}
                    {showOutside && (
                      <>
                        <td className="p-1 border-r border-slate-200 bg-purple-50/30">
                          <input
                            type="number"
                            value={row.cs || ''}
                            onChange={(e) => handleCellChange(idx, 'cs', Number(e.target.value) || 0)}
                            className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-white focus:bg-white rounded"
                          />
                        </td>
                        <td className="p-1 border-r border-slate-200 bg-purple-50/30">
                          <input
                            type="number"
                            value={row.mc || ''}
                            onChange={(e) => handleCellChange(idx, 'mc', Number(e.target.value) || 0)}
                            className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-white focus:bg-white rounded"
                          />
                        </td>
                        <td className="p-1 border-r border-slate-200 bg-purple-50/30">
                          <input
                            type="number"
                            value={row.taSS || ''}
                            onChange={(e) => handleCellChange(idx, 'taSS', Number(e.target.value) || 0)}
                            className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-white focus:bg-white rounded"
                          />
                        </td>
                        <td className="p-1 border-r border-slate-200 bg-purple-50/30">
                          <input
                            type="number"
                            value={row.others || ''}
                            onChange={(e) => handleCellChange(idx, 'others', Number(e.target.value) || 0)}
                            className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-white focus:bg-white rounded"
                          />
                        </td>
                        <td className="p-1 border-r border-slate-200 bg-purple-50/30">
                          <input
                            type="text"
                            value={row.othersName}
                            onChange={(e) => handleCellChange(idx, 'othersName', e.target.value)}
                            placeholder="e.g. TATVA"
                            className="w-full px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white rounded uppercase"
                          />
                        </td>
                      </>
                    )}

                    {/* Remarks */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => handleCellChange(idx, 'remarks', e.target.value)}
                        placeholder="Optional remarks"
                        className="w-full px-1.5 py-1 bg-transparent hover:bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded text-slate-600 font-sans"
                      />
                    </td>

                    {/* Actions */}
                    <td className="p-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAutoBalanceRow(idx)}
                          className="p-1 rounded text-slate-400 hover:text-[#701A35] hover:bg-[#FAF8F5]"
                          title="Auto-balance row according to loan splits"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete EMI row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals Footer */}
            <tfoot className="bg-[#FAF8F5] border-t-2 border-[#701A35] font-mono font-bold text-xs sticky bottom-0 z-20 text-slate-900 shadow-lg">
              <tr>
                <td colSpan={5} className="p-2.5 text-right font-sans uppercase tracking-wider border-r border-[#E6E1D6]">
                  Total Loan Scheduled:
                </td>
                <td className="p-2.5 text-right border-r border-[#E6E1D6] text-[#701A35] font-bold" title={numberToWordsINR(totalLoanAmount)}>
                  ₹{totalLoanAmount.toLocaleString('en-IN')}
                </td>
                <td colSpan={2} className="p-2.5 text-center text-slate-500 font-sans border-r border-[#E6E1D6] text-[11px]">
                  {rows.length} Cycles
                </td>
                {showAsr && (
                  <>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6]">
                      ₹{rows.reduce((s, r) => s + (Number(r.pass) || 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6]">
                      ₹{rows.reduce((s, r) => s + (Number(r.ala) || 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6]">
                      ₹{rows.reduce((s, r) => s + (Number(r.ig) || 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6]">
                      ₹{rows.reduce((s, r) => s + (Number(r.gs) || 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6]">
                      ₹{rows.reduce((s, r) => s + (Number(r.mars) || 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6]">
                      ₹{rows.reduce((s, r) => s + (Number(r.tg) || 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6]">
                      ₹{rows.reduce((s, r) => s + (Number(r.fin) || 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6]">
                      ₹{rows.reduce((s, r) => s + (Number(r.mm) || 0), 0).toLocaleString('en-IN')}
                    </td>
                  </>
                )}
                {showOutside && (
                  <>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6]">
                      ₹{rows.reduce((s, r) => s + (Number(r.cs) || 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6]">
                      ₹{rows.reduce((s, r) => s + (Number(r.mc) || 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6]">
                      ₹{rows.reduce((s, r) => s + (Number(r.taSS) || 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right border-r border-[#E6E1D6]">
                      ₹{rows.reduce((s, r) => s + (Number(r.others) || 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 border-r border-[#E6E1D6]" />
                  </>
                )}
                <td colSpan={2} className="p-2.5 text-center text-slate-400 font-sans text-[11px]">
                  Live Synchronization
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ─── Footer Status Bar ─── */}
        <div className="p-4 bg-white border-t border-[#E6E1D6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-bold text-slate-800">Status:</span>
            <span>Click any cell to edit · Tab to move horizontally · All changes save automatically to the ledger.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-[#701A35] hover:bg-[#5C142B] text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-amber-200" />
              <span>{isSaving ? 'Saving...' : 'Save & Update Ledger'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
