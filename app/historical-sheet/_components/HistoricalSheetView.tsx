'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/lib/store';
import { HistoricalReceiptRow } from '@/lib/types';
import {
  FileSpreadsheet,
  Search,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';

export const HistoricalSheetView: React.FC = () => {
  const { receipts, fetchReceipts, updateHistoricalReceipt, showToast, isSavingReceipt, isLoading } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'ASR_ONLY' | 'OUTSIDE_ONLY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [activeEditingCell, setActiveEditingCell] = useState<{ id: string; field: string } | null>(null);

  // Pagination for ultra-fast performance with 721 rows
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Filter receipts
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.clientName.toLowerCase().includes(q) ||
        r.codeNo.toLowerCase().includes(q) ||
        r.place.toLowerCase().includes(q) ||
        r.depName.toLowerCase().includes(q) ||
        r.chqNo.toLowerCase().includes(q) ||
        String(r.sNo).includes(q)
      );
    });
  }, [receipts, searchQuery]);

  const totalPages = Math.ceil(filteredReceipts.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReceipts.slice(start, start + pageSize);
  }, [filteredReceipts, page, pageSize]);

  // Overall totals
  const totalVolume = useMemo(() => {
    return filteredReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [filteredReceipts]);

  const mismatchRows = useMemo(() => {
    return receipts.filter((r) => r.isMismatch);
  }, [receipts]);

  // Handle cell edit commit
  const handleCellBlur = async (row: HistoricalReceiptRow, field: keyof HistoricalReceiptRow, newValue: any) => {
    setActiveEditingCell(null);
    if (!row.installmentId) return;

    const originalVal = row[field];
    if (originalVal === newValue) return;

    setSavingRowId(row.installmentId);

    const updates: Partial<HistoricalReceiptRow> = {
      [field]: newValue,
    };

    const ok = await updateHistoricalReceipt(row.installmentId, updates);
    if (ok) {
      showToast('Record Updated', `Row #${row.sNo} (${row.clientName}) updated successfully.`, 'success');
    }
    setSavingRowId(null);
  };

  // Export to Real Excel (.xlsx) file
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredReceipts.map((r) => ({
        'S.NO': r.sNo,
        'DATE': r.date,
        'CODE NO': r.codeNo,
        'PLACE': r.place,
        'CLIENT NAME': r.clientName,
        'DEP NAME': r.depName,
        'CHQ NO': r.chqNo,
        'AMOUNT': r.amount,
        'STATUS': r.status,
        'RECD DATE': r.recdDate || '',
        'PASS ENTERPRISES': r.pass || '',
        'KARS ENTERPRISES': r.kars || '',
        'INFIN GROUP': r.ig || '',
        'INFINITY ENTERPRISES': r.ine || '',
        'INNOVATIVE SOLUTIONS': r.ins || '',
        'MARS SOLUTION': r.mars || '',
        'MM ASSOCIATES': r.mm || '',
        'TRIVENI GROUP': r.tg || '',
        'GLOBAL SOLITAIRE': r.gs || '',
        'ALAGESH': r.ala || '',
        'FINCUBE VENTURES': r.fin || '',
        'CS ASSOCIATES': r.cs || '',
        'M CHINNIAH': r.mc || '',
        'TATVA ENTERPRISES': r.tatva || '',
        'BHAVANA CORP': r.bhavna || '',
        'THIRUCHENDURAON ASSOCIATE': r.taSS || '',
        'REMARKS': r.remarks || '',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'JULY RECEIPT DATA');
      XLSX.writeFile(wb, `ASR_July_2026_Receipt_Data_${Date.now()}.xlsx`);
      showToast('Excel Downloaded', 'Spreadsheet exported successfully.', 'success');
    } catch (err: any) {
      showToast('Export Error', err.message, 'error');
    }
  };

  // Company columns to show based on outsideCategory filter
  const showAsrCols = categoryFilter === 'ALL' || categoryFilter === 'ASR_ONLY';
  const showOutsideCols = categoryFilter === 'ALL' || categoryFilter === 'OUTSIDE_ONLY';

  if (isLoading && (!receipts || receipts.length === 0)) {
    return (
      <div className="p-4 sm:p-8 max-w-[100vw] space-y-5 animate-pulse">
        <div className="h-24 bg-slate-200 rounded-2xl w-full" />
        <div className="h-14 bg-slate-200 rounded-2xl w-full" />
        <div className="h-96 bg-slate-200 rounded-2xl w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-[100vw] space-y-5 animate-in fade-in duration-200">
      {/* ─── Top Control Header ─── */}
      <div className="bg-white p-6 rounded-2xl border border-[#E6E1D6] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#701A35] text-white">
              <FileSpreadsheet className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-serif">
                July 2026 Receipt Grid Sheet
              </h1>
              <p className="text-xs text-slate-500">
                Live Editable Spreadsheet · 721 Historical Entries · 16 Full Company Splits
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchReceipts()}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Data</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Real Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* ─── Mismatch / Integrity Warning Banner ─── */}
      {mismatchRows.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-900 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">
              Data Integrity Notice — {mismatchRows.length} Row Flagged for Review
            </span>
            {mismatchRows.map((m) => (
              <p key={m.sNo} className="text-amber-800 font-mono text-[11px]">
                • S.NO {m.sNo} ({m.clientName}): Installment Amount = <strong title={numberToWordsINR(m.amount)} className="cursor-help underline decoration-dotted">₹{m.amount.toLocaleString('en-IN')}</strong> vs Company Split Sum = <strong>₹{((m.amount - (m.mismatchDiff || 0))).toLocaleString('en-IN')}</strong> (Diff: ₹{m.mismatchDiff?.toLocaleString('en-IN')})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ─── Filter & Search Bar with Category Toggle ─── */}
      <div className="bg-white p-4 rounded-xl border border-[#E6E1D6] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 w-full">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Client, Code No, Place, Dep Name, Chq..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#FBF9F5] border border-[#E6E1D6] rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#701A35]"
            />
          </div>

          {/* Outside-Party Column Filter Toggle */}
          <div className="flex items-center bg-[#F4F1EA] p-1 rounded-lg border border-[#E6E1D6] text-xs font-semibold overflow-x-auto max-w-full">
            {[
              { id: 'ALL', label: 'All Companies (16)' },
              { id: 'ASR_ONLY', label: 'ASR Group Own (10)' },
              { id: 'OUTSIDE_ONLY', label: 'Outside Parties (6)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setCategoryFilter(f.id as any)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  categoryFilter === f.id
                    ? 'bg-[#701A35] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Total stats & pagination summary */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-slate-500">
            <span>Showing <strong className="text-slate-900">{filteredReceipts.length}</strong> rows · Total: <MoneyDisplay amount={totalVolume} size="sm" amountClassName="text-[#701A35] font-bold inline-block" /></span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded border border-[#E6E1D6] disabled:opacity-30 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded border border-[#E6E1D6] disabled:opacity-30 hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Excel-Style Editable Spreadsheet Grid with Frozen Columns ─── */}
      <div className="bg-white rounded-2xl border border-[#E6E1D6] shadow-md overflow-hidden">
        <div className="overflow-x-auto max-h-[64vh] relative">
          <table className="w-full text-left border-collapse text-xs select-none">
            {/* Sticky Header */}
            <thead className="sticky top-0 z-30 bg-[#240F1D] text-white font-mono text-[11px] font-bold tracking-wider shadow-sm">
              <tr className="border-b border-[#3D1A2C]">
                {/* Frozen Columns */}
                <th className="p-2.5 w-12 text-center sticky left-0 z-40 bg-[#240F1D] border-r border-[#3D1A2C]">
                  S.NO
                </th>
                <th className="p-2.5 w-24 sticky left-12 z-40 bg-[#240F1D] border-r border-[#3D1A2C]">
                  DATE
                </th>
                <th className="p-2.5 w-24 sticky left-36 z-40 bg-[#240F1D] border-r border-[#3D1A2C]">
                  CODE NO
                </th>
                <th className="p-2.5 w-20 sticky left-60 z-40 bg-[#240F1D] border-r border-[#3D1A2C]">
                  PLACE
                </th>
                <th className="p-2.5 min-w-[180px] sticky left-80 z-40 bg-[#240F1D] border-r border-[#4A2237] text-[#EED8A1]">
                  CLIENT NAME
                </th>

                {/* Normal Scrollable Columns */}
                <th className="p-2.5 w-24 border-r border-[#3D1A2C]">DEP NAME</th>
                <th className="p-2.5 w-24 border-r border-[#3D1A2C]">CHQ NO</th>
                <th className="p-2.5 w-32 text-right border-r border-[#3D1A2C] text-[#EED8A1]">
                  AMOUNT (₹)
                </th>
                <th className="p-2.5 w-24 text-center border-r border-[#3D1A2C]">STATUS</th>
                <th className="p-2.5 w-28 border-r border-[#3D1A2C]">RECD DATE</th>

                {/* ASR Group Own Companies (10) */}
                {showAsrCols && (
                  <>
                    <th className="p-2.5 min-w-[140px] text-right bg-[#301226] border-r border-[#3D1A2C] text-[#EED8A1]">PASS ENTERPRISES</th>
                    <th className="p-2.5 min-w-[140px] text-right bg-[#301226] border-r border-[#3D1A2C] text-[#EED8A1]">KARS ENTERPRISES</th>
                    <th className="p-2.5 min-w-[120px] text-right bg-[#301226] border-r border-[#3D1A2C] text-[#EED8A1]">INFIN GROUP</th>
                    <th className="p-2.5 min-w-[140px] text-right bg-[#301226] border-r border-[#3D1A2C] text-[#EED8A1]">INFINITY ENTERPRISES</th>
                    <th className="p-2.5 min-w-[140px] text-right bg-[#301226] border-r border-[#3D1A2C] text-[#EED8A1]">INNOVATIVE SOLUTIONS</th>
                    <th className="p-2.5 min-w-[130px] text-right bg-[#301226] border-r border-[#3D1A2C] text-[#EED8A1]">MARS SOLUTION</th>
                    <th className="p-2.5 min-w-[130px] text-right bg-[#301226] border-r border-[#3D1A2C] text-[#EED8A1]">MM ASSOCIATES</th>
                    <th className="p-2.5 min-w-[130px] text-right bg-[#301226] border-r border-[#3D1A2C] text-[#EED8A1]">TRIVENI GROUP</th>
                    <th className="p-2.5 min-w-[140px] text-right bg-[#301226] border-r border-[#3D1A2C] text-[#EED8A1]">GLOBAL SOLITAIRE</th>
                    <th className="p-2.5 min-w-[120px] text-right bg-[#301226] border-r border-[#3D1A2C] text-[#EED8A1]">ALAGESH</th>
                  </>
                )}

                {/* Outside-Party Companies (6) */}
                {showOutsideCols && (
                  <>
                    <th className="p-2.5 min-w-[140px] text-right bg-[#2A1713] border-r border-[#3D1A2C] text-amber-300">FINCUBE VENTURES</th>
                    <th className="p-2.5 min-w-[130px] text-right bg-[#2A1713] border-r border-[#3D1A2C] text-amber-300">CS ASSOCIATES</th>
                    <th className="p-2.5 min-w-[110px] text-right bg-[#2A1713] border-r border-[#3D1A2C] text-amber-300">M CHINNIAH</th>
                    <th className="p-2.5 min-w-[140px] text-right bg-[#2A1713] border-r border-[#3D1A2C] text-amber-300">TATVA ENTERPRISES</th>
                    <th className="p-2.5 min-w-[130px] text-right bg-[#2A1713] border-r border-[#3D1A2C] text-amber-300">BHAVANA CORP</th>
                    <th className="p-2.5 min-w-[160px] text-right bg-[#2A1713] border-r border-[#3D1A2C] text-amber-300">THIRUCHENDURAON ASSOCIATE</th>
                  </>
                )}

                <th className="p-2.5 min-w-[140px]">REMARKS</th>
              </tr>
            </thead>

            {/* Grid Body */}
            <tbody className="divide-y divide-[#EDE8DF] font-mono text-[11px]">
              {paginatedRows.map((row) => {
                const isSavingThis = savingRowId === row.installmentId;

                return (
                  <tr
                    key={row.installmentId || row.sNo}
                    className={`hover:bg-[#FAF8F4] transition-colors ${
                      row.isMismatch ? 'bg-rose-50/70' : ''
                    }`}
                  >
                    {/* Frozen Column 1: S.NO */}
                    <td className="p-2 text-center text-slate-400 font-bold sticky left-0 z-20 bg-inherit border-r border-[#EDE8DF]">
                      {isSavingThis ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
                      ) : (
                        row.sNo
                      )}
                    </td>

                    {/* Frozen Column 2: DATE */}
                    <td className="p-1.5 sticky left-12 z-20 bg-inherit border-r border-[#EDE8DF]">
                      <input
                        type="text"
                        defaultValue={row.date}
                        onBlur={(e) => handleCellBlur(row, 'date', e.target.value)}
                        className="w-full bg-transparent px-1.5 py-1 text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                      />
                    </td>

                    {/* Frozen Column 3: CODE NO */}
                    <td className="p-1.5 sticky left-36 z-20 bg-inherit border-r border-[#EDE8DF]">
                      <input
                        type="text"
                        defaultValue={row.codeNo}
                        onBlur={(e) => handleCellBlur(row, 'codeNo', e.target.value)}
                        className="w-full bg-transparent px-1.5 py-1 text-slate-800 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                      />
                    </td>

                    {/* Frozen Column 4: PLACE */}
                    <td className="p-1.5 sticky left-60 z-20 bg-inherit border-r border-[#EDE8DF]">
                      <input
                        type="text"
                        defaultValue={row.place}
                        onBlur={(e) => handleCellBlur(row, 'place', e.target.value)}
                        className="w-full bg-transparent px-1.5 py-1 text-slate-600 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                      />
                    </td>

                    {/* Frozen Column 5: CLIENT NAME */}
                    <td className="p-1.5 sticky left-80 z-20 bg-inherit border-r border-[#D9D3C7] shadow-xs font-bold text-slate-900">
                      <input
                        type="text"
                        defaultValue={row.clientName}
                        onBlur={(e) => handleCellBlur(row, 'clientName', e.target.value)}
                        className="w-full bg-transparent px-1.5 py-1 text-slate-900 font-bold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded truncate"
                      />
                    </td>

                    {/* Scrollable Col 6: DEP NAME */}
                    <td className="p-1.5 border-r border-[#EDE8DF]">
                      <input
                        type="text"
                        defaultValue={row.depName || ''}
                        onBlur={(e) => handleCellBlur(row, 'depName', e.target.value)}
                        className="w-full bg-transparent px-1.5 py-1 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                      />
                    </td>

                    {/* Scrollable Col 7: CHQ NO */}
                    <td className="p-1.5 border-r border-[#EDE8DF]">
                      <input
                        type="text"
                        defaultValue={row.chqNo || ''}
                        onBlur={(e) => handleCellBlur(row, 'chqNo', e.target.value)}
                        className="w-full bg-transparent px-1.5 py-1 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                      />
                    </td>

                    {/* Scrollable Col 8: AMOUNT (₹) */}
                    <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                      <input
                        type="number"
                        defaultValue={row.amount}
                        onBlur={(e) => handleCellBlur(row, 'amount', Number(e.target.value))}
                        className={`w-full bg-transparent px-1.5 py-1 text-right font-bold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded ${
                          row.isMismatch ? 'text-rose-700' : 'text-slate-900'
                        }`}
                      />
                    </td>

                    {/* Scrollable Col 9: STATUS */}
                    <td className="p-1.5 border-r border-[#EDE8DF] text-center">
                      <select
                        defaultValue={row.status}
                        onChange={(e) => handleCellBlur(row, 'status', e.target.value)}
                        className="bg-transparent text-[10px] font-bold px-1.5 py-0.5 rounded border border-transparent hover:border-slate-300 focus:bg-white focus:border-[#701A35] focus:outline-hidden"
                      >
                        {['PASS', 'NEFT', 'CASH', 'CLS', 'PENDING', 'RET', 'RET NEFT', 'RET PASS', 'CS'].map(
                          (st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          )
                        )}
                      </select>
                    </td>

                    {/* Scrollable Col 10: RECD DATE */}
                    <td className="p-1.5 border-r border-[#EDE8DF]">
                      <input
                        type="text"
                        defaultValue={row.recdDate || ''}
                        placeholder="YYYY-MM-DD"
                        onBlur={(e) => handleCellBlur(row, 'recdDate', e.target.value || null)}
                        className="w-full bg-transparent px-1.5 py-1 text-slate-600 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                      />
                    </td>

                    {/* ASR Group Company Splits (10) */}
                    {showAsrCols && (
                      <>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.pass || ''}
                            onBlur={(e) => handleCellBlur(row, 'pass', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-slate-800 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.kars || ''}
                            onBlur={(e) => handleCellBlur(row, 'kars', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-slate-800 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.ig || ''}
                            onBlur={(e) => handleCellBlur(row, 'ig', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-slate-800 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.ine || ''}
                            onBlur={(e) => handleCellBlur(row, 'ine', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-slate-800 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.ins || ''}
                            onBlur={(e) => handleCellBlur(row, 'ins', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-slate-800 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.mars || ''}
                            onBlur={(e) => handleCellBlur(row, 'mars', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-slate-800 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.mm || ''}
                            onBlur={(e) => handleCellBlur(row, 'mm', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-slate-800 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.tg || ''}
                            onBlur={(e) => handleCellBlur(row, 'tg', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-slate-800 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.gs || ''}
                            onBlur={(e) => handleCellBlur(row, 'gs', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-slate-800 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.ala || ''}
                            onBlur={(e) => handleCellBlur(row, 'ala', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-slate-800 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded"
                          />
                        </td>
                      </>
                    )}

                    {/* Outside-Party Splits (6) */}
                    {showOutsideCols && (
                      <>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.fin || ''}
                            onBlur={(e) => handleCellBlur(row, 'fin', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-amber-900 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-600 rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.cs || ''}
                            onBlur={(e) => handleCellBlur(row, 'cs', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-amber-900 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-600 rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.mc || ''}
                            onBlur={(e) => handleCellBlur(row, 'mc', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-amber-900 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-600 rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.tatva || ''}
                            onBlur={(e) => handleCellBlur(row, 'tatva', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-amber-900 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-600 rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.bhavna || ''}
                            onBlur={(e) => handleCellBlur(row, 'bhavna', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-amber-900 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-600 rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-[#EDE8DF] text-right">
                          <input
                            type="number"
                            defaultValue={row.taSS || ''}
                            onBlur={(e) => handleCellBlur(row, 'taSS', Number(e.target.value) || 0)}
                            className="w-full bg-transparent px-1.5 py-1 text-right text-amber-900 font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-600 rounded"
                          />
                        </td>
                      </>
                    )}

                    {/* Remarks */}
                    <td className="p-1.5">
                      <input
                        type="text"
                        defaultValue={row.remarks || ''}
                        onBlur={(e) => handleCellBlur(row, 'remarks', e.target.value)}
                        className="w-full bg-transparent px-1.5 py-1 text-slate-500 text-[10px] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#701A35] rounded truncate"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info & pagination */}
        <div className="p-3 bg-[#FAF8F5] border-t border-[#E6E1D6] flex items-center justify-between text-xs font-mono text-slate-500">
          <span>
            Click any cell to edit · Changes persist directly to the secure ledger
          </span>
          <div className="flex items-center gap-2">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-0.5 rounded border border-[#E6E1D6] disabled:opacity-30 bg-white"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2 py-0.5 rounded border border-[#E6E1D6] disabled:opacity-30 bg-white"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
