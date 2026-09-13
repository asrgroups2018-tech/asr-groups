'use client';

import React, { useState } from 'react';
import { X, GitMerge, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Loan } from '@/lib/types';
import { useApp } from '@/lib/store';

interface MergeLoansModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLoan?: Loan | null;
}

export const MergeLoansModal: React.FC<MergeLoansModalProps> = ({ isOpen, onClose, initialLoan }) => {
  const { loans, showToast, refreshAll } = useApp();

  const [targetLoanId, setTargetLoanId] = useState<string>(initialLoan?.id || (loans[0]?.id ?? ''));
  const [sourceLoanId, setSourceLoanId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const targetLoan = loans.find((l) => l.id === targetLoanId);

  // Available source loans (ideally same client, but allow any other loan)
  const availableSourceLoans = loans.filter((l) => l.id !== targetLoanId);

  const sourceLoan = loans.find((l) => l.id === sourceLoanId);

  const combinedAmount = (targetLoan?.totalAmount || 0) + (sourceLoan?.totalAmount || 0);
  const combinedEMIs = (targetLoan?.installments?.length || targetLoan?.installmentCount || 0) + (sourceLoan?.installments?.length || sourceLoan?.installmentCount || 0);

  const handleMerge = async () => {
    if (!targetLoanId || !sourceLoanId) {
      showToast('Validation Error', 'Please select both target and source loans.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/loans/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLoanId, sourceLoanId }),
      });

      const resJson = await res.json();
      if (!resJson.success) {
        throw new Error(resJson.error || 'Failed to merge loans.');
      }

      await refreshAll();
      showToast('Loans Merged', `Merged ${sourceLoanId} into ${targetLoanId} successfully.`, 'success');
      onClose();
    } catch (err: any) {
      showToast('Merge Error', err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#E6E1D6] shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E6E1D6] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#701A35]/10 border border-[#701A35]/20 flex items-center justify-center text-[#701A35]">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Merge Two Loan Records
              </h2>
              <p className="text-xs text-slate-500">
                Combine split installments into a single continuous loan facility
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Target Loan Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono block mb-1.5">
              1. Target Primary Loan (Will Keep this Loan ID)
            </label>
            <select
              value={targetLoanId}
              onChange={(e) => setTargetLoanId(e.target.value)}
              className="w-full bg-[#FBF9F5] border border-[#E6E1D6] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-hidden focus:border-[#701A35] cursor-pointer"
            >
              {loans.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id} · {l.customerName} (₹{l.totalAmount.toLocaleString('en-IN')}, {l.installmentCount} EMIs)
                </option>
              ))}
            </select>
          </div>

          {/* Source Loan Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono block mb-1.5">
              2. Source Loan (Will be merged into Target and removed)
            </label>
            <select
              value={sourceLoanId}
              onChange={(e) => setSourceLoanId(e.target.value)}
              className="w-full bg-[#FBF9F5] border border-[#E6E1D6] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-hidden focus:border-[#701A35] cursor-pointer"
            >
              <option value="">-- Select Source Loan to Merge --</option>
              {availableSourceLoans.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id} · {l.customerName} (₹{l.totalAmount.toLocaleString('en-IN')}, {l.installmentCount} EMIs)
                </option>
              ))}
            </select>
          </div>

          {/* Preview Card */}
          {targetLoan && sourceLoan && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <span className="text-[11px] font-bold text-emerald-900 uppercase font-mono block">
                Combined Result Preview:
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Retained Loan ID:</span>
                  <strong className="font-mono text-emerald-800">{targetLoan.id}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Client:</span>
                  <strong className="text-slate-900">{targetLoan.customerName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Combined Amount:</span>
                  <strong className="font-mono text-emerald-800 text-sm">
                    ₹{combinedAmount.toLocaleString('en-IN')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Total EMIs:</span>
                  <strong className="font-mono text-slate-900">{combinedEMIs} Installments</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E6E1D6] bg-[#FAF8F5] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#E6E1D6] text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!targetLoanId || !sourceLoanId || isSubmitting}
            onClick={handleMerge}
            className="px-5 py-2.5 bg-[#701A35] hover:bg-[#5C142B] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Merging...</span>
            ) : (
              <>
                <GitMerge className="w-4 h-4" />
                <span>Confirm Merge</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
