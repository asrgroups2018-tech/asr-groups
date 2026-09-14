'use client';

import React, { useMemo } from 'react';
import { Loan } from '@/lib/types';
import {
  FileSpreadsheet,
  FileText,
  X,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import {
  exportLoansToExcel,
  exportLoansToPDF,
  flattenLoansForExport,
} from '@/lib/utils/exportLoansLedger';

interface ExportLoansModalProps {
  isOpen: boolean;
  onClose: () => void;
  loans: Loan[];
  dateRangeLabel: string;
  onSuccess: (type: 'excel' | 'pdf') => void;
}

export const ExportLoansModal: React.FC<ExportLoansModalProps> = ({
  isOpen,
  onClose,
  loans,
  dateRangeLabel,
  onSuccess,
}) => {
  const flattenedRows = useMemo(() => flattenLoansForExport(loans), [loans]);
  const totalAmount = useMemo(
    () => flattenedRows.reduce((sum, r) => sum + r.amountDue, 0),
    [flattenedRows]
  );

  if (!isOpen) return null;

  const handleExportExcel = () => {
    exportLoansToExcel(loans, dateRangeLabel);
    onSuccess('excel');
    onClose();
  };

  const handleExportPdf = () => {
    exportLoansToPDF(loans, dateRangeLabel);
    onSuccess('pdf');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#E6E1D6] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-b from-[#FAF8F5] to-white border-b border-[#E6E1D6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#701A35] text-[#EED8A1] flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-serif">
                Export Loans Data
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose your preferred export format for the active selection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Summary Banner */}
        <div className="px-6 py-3 bg-[#F4F1EA]/80 border-b border-[#E6E1D6] flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#701A35]" />
            <span>Range: <strong className="text-slate-900">{dateRangeLabel || 'All Dates'}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span>Facilities: <strong className="text-slate-900">{loans.length}</strong></span>
            <span>Entries: <strong className="text-slate-900">{flattenedRows.length}</strong></span>
            <span>Volume: <strong className="text-slate-900">₹{totalAmount.toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* Modal Body: Two Export Options */}
        <div className="p-6 space-y-4">
          <p className="text-xs font-semibold text-slate-600">
            Select export format:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option 1: Export as Excel */}
            <button
              onClick={handleExportExcel}
              className="group text-left p-5 rounded-2xl border-2 border-emerald-200 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full font-mono">
                    .XLSX
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                    Export as Excel
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Full 28-column ledger with all 16 funding company splits, Loan IDs, dates, and calculated summary totals.
                  </p>
                </div>
              </div>

              <div className="w-full py-2 px-3 rounded-xl bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors">
                <Download className="w-3.5 h-3.5" />
                <span>Download Excel (.xlsx)</span>
              </div>
            </button>

            {/* Option 2: Export as PDF */}
            <button
              onClick={handleExportPdf}
              className="group text-left p-5 rounded-2xl border-2 border-[#E2D2B0] hover:border-[#701A35] bg-[#FAF8F5] hover:bg-[#F5EFE6] transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#701A35] text-[#EED8A1] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-[#701A35] bg-[#701A35]/10 border border-[#701A35]/30 px-2 py-0.5 rounded-full font-mono">
                    .PDF
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#701A35] transition-colors">
                    Export as PDF
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Formatted landscape executive report with KPI metric banners, loan schedules, recovery status, and page numbering.
                  </p>
                </div>
              </div>

              <div className="w-full py-2 px-3 rounded-xl bg-[#701A35] group-hover:bg-[#5C142B] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors">
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF (.pdf)</span>
              </div>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Export applies strictly to active filtered dates & criteria
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
