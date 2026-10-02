'use client';

import React, { useState, useId } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Layers,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { MatchedImportRow, ImportMatchResult, RawIncomingRow } from '@/lib/server/continuationMatcher';

interface ImportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportReviewModal: React.FC<ImportReviewModalProps> = ({ isOpen, onClose }) => {
  const { showToast, refreshAll, loans } = useApp();
  const fileInputId = useId();

  const [step, setStep] = useState<'UPLOAD' | 'REVIEW' | 'COMMITTING' | 'SUCCESS'>('UPLOAD');
  const [fileName, setFileName] = useState<string>('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [matchResult, setMatchResult] = useState<ImportMatchResult | null>(null);
  const [planRows, setPlanRows] = useState<MatchedImportRow[]>([]);
  const [filterTab, setFilterTab] = useState<'ALL' | 'CONTINUATION' | 'NEW_LOAN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [commitSummary, setCommitSummary] = useState<{ continuations: number; newLoans: number; total: number } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessingFile(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawJson: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!rawJson || rawJson.length === 0) {
        throw new Error('Uploaded file is empty.');
      }

      // Format into RawIncomingRow[]
      const formattedRows: RawIncomingRow[] = rawJson.map((row, idx) => {
        const cleanObj: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) {
          cleanObj[String(k).trim().toUpperCase()] = typeof v === 'string' ? v.trim() : v;
        }

        // Date parsing
        let dateStr = new Date().toISOString().slice(0, 10);
        const dVal = cleanObj['DATE'] || cleanObj['DUE DATE'] || cleanObj['START DATE'] || cleanObj['RECD DATE'];
        if (typeof dVal === 'number') {
          const utc_days = Math.floor(dVal - 25569);
          const dInfo = new Date(utc_days * 86400 * 1000);
          dateStr = `${dInfo.getFullYear()}-${String(dInfo.getMonth() + 1).padStart(2, '0')}-${String(dInfo.getDate()).padStart(2, '0')}`;
        } else if (typeof dVal === 'string' && dVal.trim()) {
          dateStr = dVal.trim();
        }

        // Splits for all 17 Companies (Codes and Full Names)
        const splits: Record<string, number> = {};
        const companyColAliases: [string, string[]][] = [
          ['PASS', ['PASS', 'PASS ENTERPRISES']],
          ['KARS', ['KARS', 'KARS ENTERPRISES']],
          ['INFIN', ['INFIN', 'INFIN GROUP']],
          ['INE', ['INE', 'INFINITY ENTERPRISES']],
          ['INS', ['INS', 'INFINITY SOLUTIONS']],
          ['IG', ['IG', 'INNOVATIVE SOLUTIONS', 'INNOVATE SOLUTIONS']],
          ['MARS', ['MARS', 'MARS SOLUTION', 'ASR ENTERPRISES']],
          ['MM', ['MM', 'MM ASSOCIATES']],
          ['TG', ['TG', 'TRIVENI GROUP', 'TREVINI GROUP']],
          ['GS', ['GS', 'GLOBAL SOLITAIRE', 'GLOBAL SOLITARE']],
          ['ALA', ['ALA', 'ALAGESH']],
          ['FIN', ['FIN', 'FINCUBE VENTURES']],
          ['CS', ['CS', 'CS ASSOCIATES']],
          ['MC', ['MC', 'M CHINNIAH']],
          ['TATVA', ['TATVA', 'TATVA ENTERPRISES']],
          ['BHAVNA', ['BHAVNA', 'BHAVANA', 'BHAVANA CORP']],
          ['TA (SS)', ['TA (SS)', 'TA(SS)', 'TA', 'THIRUCHENDURAON ASSOCIATE']],
        ];

        for (const [canonicalCode, aliases] of companyColAliases) {
          for (const alias of aliases) {
            if (cleanObj[alias] !== undefined && Number(cleanObj[alias]) > 0) {
              splits[canonicalCode] = Number(cleanObj[alias]) || 0;
              break;
            }
          }
        }

        const clientName =
          cleanObj['CLIENT NAME'] ||
          cleanObj['CUSTOMER NAME'] ||
          cleanObj['CLIENT'] ||
          cleanObj['CUSTOMER'] ||
          cleanObj['NAME'] ||
          cleanObj['PARTY'] ||
          cleanObj['BORROWER'] ||
          `Party #${idx + 1}`;

        const amount = Number(
          cleanObj['AMOUNT'] ||
          cleanObj[' AMOUNT '] ||
          cleanObj['AMOUNT DUE'] ||
          cleanObj['TOTAL'] ||
          cleanObj['LOAN AMOUNT'] ||
          0
        );

        return {
          sNo: cleanObj['S.NO'] || cleanObj['SNO'] || cleanObj['#'] || idx + 1,
          date: dateStr,
          codeNo: cleanObj['CODE NO'] || cleanObj['CODE'] || cleanObj['CODE NUMBER'] || undefined,
          place: cleanObj['PLACE'] || cleanObj['BRANCH'] || cleanObj['CITY'] || 'CHENNAI',
          clientName,
          depName: cleanObj['DEP NAME'] || cleanObj['DEPOSIT NAME'] || cleanObj['BANK'] || cleanObj['ACCOUNT'] || undefined,
          chqNo: cleanObj['CHQ NO'] || cleanObj['CHEQUE NO'] || cleanObj['CHEQUE'] || cleanObj['REF NO'] ? String(cleanObj['CHQ NO'] || cleanObj['CHEQUE NO'] || cleanObj['CHEQUE'] || cleanObj['REF NO']) : undefined,
          amount,
          status: cleanObj['STATUS'] || cleanObj[' STATUS '] || cleanObj['COLLECTION STATUS'] || 'PENDING',
          splits,
          remarks: cleanObj['REMARKS'] || cleanObj['NOTES'] || cleanObj['REMARK'] || undefined,
        };
      });

      // Call dry-run matching API
      const res = await fetch('/api/import/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: formattedRows }),
      });

      const resJson = await res.json();
      if (!resJson.success) {
        throw new Error(resJson.error || 'Failed to match import rows.');
      }

      setMatchResult(resJson.data);
      setPlanRows(resJson.data.rows);
      setStep('REVIEW');
    } catch (err: any) {
      showToast('Import Error', err.message, 'error');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const updateRowDecision = (rowIndex: number, decision: 'CONTINUATION' | 'NEW_LOAN', targetLoanId?: string) => {
    setPlanRows((prev) =>
      prev.map((r) => {
        if (r.rowIndex !== rowIndex) return r;
        return {
          ...r,
          decision,
          targetLoanId: decision === 'CONTINUATION' ? targetLoanId || r.candidateLoans[0]?.loanId : undefined,
        };
      })
    );
  };

  const handleCommit = async () => {
    setStep('COMMITTING');
    try {
      const payload = planRows.map((p) => ({
        decision: p.decision,
        targetLoanId: p.targetLoanId,
        raw: p.raw,
      }));

      const res = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planRows: payload }),
      });

      const resJson = await res.json();
      if (!resJson.success) {
        throw new Error(resJson.error || 'Failed to commit import.');
      }

      setCommitSummary({
        continuations: resJson.data.continuationsCount,
        newLoans: resJson.data.newLoansCount,
        total: resJson.data.totalCommitted,
      });

      await refreshAll();
      showToast('Import Successful', `${resJson.data.totalCommitted} rows updated in database.`, 'success');
      setStep('SUCCESS');
    } catch (err: any) {
      showToast('Commit Error', err.message, 'error');
      setStep('REVIEW');
    }
  };

  const filteredPlanRows = planRows.filter((r) => {
    if (filterTab !== 'ALL' && r.decision !== filterTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchClient = r.raw.clientName.toLowerCase().includes(q);
      const matchTarget = (r.targetLoanId || '').toLowerCase().includes(q);
      const matchChq = (r.raw.chqNo || '').toLowerCase().includes(q);
      if (!matchClient && !matchTarget && !matchChq) return false;
    }
    return true;
  });

  const continuationTotal = planRows.filter((r) => r.decision === 'CONTINUATION').length;
  const newLoanTotal = planRows.filter((r) => r.decision === 'NEW_LOAN').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#E6E1D6] shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E6E1D6] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#701A35]/10 border border-[#701A35]/20 flex items-center justify-center text-[#701A35]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-serif">
                Import Spreadsheet
              </h2>
              <p className="text-xs text-slate-500">
                Upload Excel or CSV file to import and sync records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* STEP 1: UPLOAD */}
          {step === 'UPLOAD' && (
            <div className="max-w-xl mx-auto py-10 text-center space-y-6">
              <label
                htmlFor={fileInputId}
                className="border-2 border-dashed border-[#C5A059]/40 hover:border-[#701A35] bg-[#FAF8F5] hover:bg-white rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#701A35]/10 border border-[#701A35]/20 flex items-center justify-center text-[#701A35] group-hover:scale-105 transition-all shadow-xs mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  Select or Drop Spreadsheet File
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 max-w-sm">
                  Supports Excel (.xlsx, .xls) or CSV files
                </p>
                <span className="mt-4 px-4 py-2 bg-[#701A35] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5">
                  Browse Files
                </span>
                <input
                  id={fileInputId}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {isProcessingFile && (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 animate-pulse">
                  <div className="w-4 h-4 rounded-full border-2 border-[#701A35] border-t-transparent animate-spin" />
                  <span>Processing spreadsheet and matching loan records...</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: REVIEW */}
          {step === 'REVIEW' && (
            <div className="space-y-5">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E6E1D6]">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Total Incoming Rows
                  </span>
                  <span className="text-xl font-bold text-slate-900 font-mono block mt-0.5">
                    {planRows.length}
                  </span>
                  <span className="text-[10px] text-slate-500">From {fileName}</span>
                </div>

                <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Auto-Matched Continuations
                  </span>
                  <span className="text-xl font-bold text-emerald-700 font-mono block mt-0.5">
                    {continuationTotal}
                  </span>
                  <span className="text-[10px] text-emerald-600">Appends to existing Loan IDs</span>
                </div>

                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    New Loan Candidates
                  </span>
                  <span className="text-xl font-bold text-blue-700 font-mono block mt-0.5">
                    {newLoanTotal}
                  </span>
                  <span className="text-[10px] text-blue-600">Will receive new LN2026 IDs</span>
                </div>

                <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider font-mono">
                    Total Volume
                  </span>
                  <span className="text-xl font-bold text-amber-900 font-mono block mt-0.5">
                    ₹{planRows.reduce((s, r) => s + r.raw.amount, 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-amber-700">Incoming Collection</span>
                </div>
              </div>

              {/* Action & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E6E1D6]">
                <div className="flex items-center gap-1.5 bg-[#F4F1EA] p-1 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setFilterTab('ALL')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      filterTab === 'ALL' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    All ({planRows.length})
                  </button>
                  <button
                    onClick={() => setFilterTab('CONTINUATION')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      filterTab === 'CONTINUATION' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Continuations ({continuationTotal})
                  </button>
                  <button
                    onClick={() => setFilterTab('NEW_LOAN')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      filterTab === 'NEW_LOAN' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    New Loans ({newLoanTotal})
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Filter client, loan ID, or cheque..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#FBF9F5] border border-[#E6E1D6] rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#701A35] max-w-xs"
                />
              </div>

              {/* Review Table */}
              <div className="border border-[#E6E1D6] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#E6E1D6] text-[11px] font-mono text-slate-600 uppercase">
                      <th className="p-3">#</th>
                      <th className="p-3">Client Name</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Amount (₹)</th>
                      <th className="p-3">Dep / Chq</th>
                      <th className="p-3">Company Splits</th>
                      <th className="p-3 min-w-[280px]">Decision & Target Loan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDE8DF]">
                    {filteredPlanRows.map((row) => {
                      const isCont = row.decision === 'CONTINUATION';
                      const splitsStr = Object.entries(row.raw.splits)
                        .filter(([_, v]) => v > 0)
                        .map(([k, v]) => `${k}: ₹${Number(v).toLocaleString('en-IN')}`)
                        .join(', ') || 'N/A';

                      return (
                        <tr key={row.rowIndex} className="hover:bg-[#FCFBF9] transition-colors">
                          <td className="p-3 font-mono text-slate-400">{row.rowIndex + 1}</td>
                          <td className="p-3 font-bold text-slate-900">{row.raw.clientName}</td>
                          <td className="p-3 font-mono text-slate-600">{row.raw.date}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ₹{row.raw.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {row.raw.depName || '-'} {row.raw.chqNo ? `· #${row.raw.chqNo}` : ''}
                          </td>
                          <td className="p-3 text-[11px] text-slate-600 font-mono max-w-xs truncate" title={splitsStr}>
                            {splitsStr}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <select
                                value={isCont ? row.targetLoanId || 'NEW' : 'NEW'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === 'NEW') {
                                    updateRowDecision(row.rowIndex, 'NEW_LOAN');
                                  } else {
                                    updateRowDecision(row.rowIndex, 'CONTINUATION', val);
                                  }
                                }}
                                className={`text-xs font-semibold py-1 px-2.5 rounded-lg border focus:outline-hidden cursor-pointer ${
                                  isCont
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                    : 'bg-blue-50 border-blue-300 text-blue-800'
                                }`}
                              >
                                <option value="NEW">+ Create as New Loan</option>
                                {row.candidateLoans.map((cl) => (
                                  <option key={cl.loanId} value={cl.loanId}>
                                    ✓ Match to {cl.loanId} (₹{cl.totalAmount.toLocaleString('en-IN')})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: COMMITTING */}
          {step === 'COMMITTING' && (
            <div className="py-14 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-3 border-[#701A35] border-t-transparent animate-spin mx-auto" />
              <h3 className="text-base font-bold text-slate-900 font-serif">
                Committing Import to Turso Database...
              </h3>
              <p className="text-xs text-slate-500">
                Updating existing loan schedules, appending installments, and creating new loan contracts atomically.
              </p>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'SUCCESS' && commitSummary && (
            <div className="py-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                Import Committed Successfully!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Appended <strong className="text-emerald-700">{commitSummary.continuations}</strong> installments to existing loans, and created <strong className="text-blue-700">{commitSummary.newLoans}</strong> new loans across <strong>{commitSummary.total}</strong> total rows.
              </p>
              <div className="pt-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#701A35] hover:bg-[#5C142B] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === 'REVIEW' && (
          <div className="px-6 py-4 border-t border-[#E6E1D6] bg-[#FAF8F5] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setStep('UPLOAD');
                setPlanRows([]);
              }}
              className="px-4 py-2 bg-white border border-[#E6E1D6] text-slate-700 text-xs font-bold rounded-xl hover:bg-[#FAF8F5] flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Choose Another File</span>
            </button>

            <button
              type="button"
              onClick={handleCommit}
              className="px-6 py-2.5 bg-[#701A35] hover:bg-[#5C142B] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <span>Confirm & Commit {planRows.length} Rows</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
