'use client';

import React, { useState } from 'react';
import { X, Scissors, AlertCircle, ArrowRight, CheckCircle2, CheckSquare, Square } from 'lucide-react';
import { Loan, Installment } from '@/lib/types';
import { useApp } from '@/lib/store';

interface SplitLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
}

export const SplitLoanModal: React.FC<SplitLoanModalProps> = ({ isOpen, onClose, loan }) => {
  const { showToast, refreshAll } = useApp();

  const [selectedInstIds, setSelectedInstIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !loan) return null;

  const installments = loan.installments || [];

  const toggleInst = (id: string) => {
    setSelectedInstIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedInstIds(new Set(installments.map((i) => i.id)));
  };

  const clearAll = () => {
    setSelectedInstIds(new Set());
  };

  const extractedList = installments.filter((i) => selectedInstIds.has(i.id));
  const retainedList = installments.filter((i) => !selectedInstIds.has(i.id));

  const extractedTotal = extractedList.reduce((sum, i) => sum + i.amountDue, 0);
  const retainedTotal = retainedList.reduce((sum, i) => sum + i.amountDue, 0);

  const isValidSplit = extractedList.length > 0 && retainedList.length > 0;

  const handleSplit = async () => {
    if (!isValidSplit) {
      showToast('Validation Error', 'Must select at least 1 installment to move, while keeping at least 1 in the original loan.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/loans/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: loan.id,
          installmentIdsToExtract: Array.from(selectedInstIds),
        }),
      });

      const resJson = await res.json();
      if (!resJson.success) {
        throw new Error(resJson.error || 'Failed to split loan.');
      }

      await refreshAll();
      showToast(
        'Loan Split Successful',
        `Split ${loan.id} into ${resJson.data.parentLoan.id} (${retainedList.length} EMIs) and ${resJson.data.newLoan.id} (${extractedList.length} EMIs).`,
        'success'
      );
      onClose();
    } catch (err: any) {
      showToast('Split Error', err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#E6E1D6] shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E6E1D6] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#701A35]/10 border border-[#701A35]/20 flex items-center justify-center text-[#701A35]">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Split Loan Facility: {loan.id}
              </h2>
              <p className="text-xs text-slate-500">
                {loan.customerName} · Total ₹{loan.totalAmount.toLocaleString('en-IN')} across {installments.length} EMIs
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {/* Instructions */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-900">
            <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <p>
              Check the installments below that belong to the <strong>Second (New) Loan</strong>. The unchecked installments will stay in <strong>{loan.id}</strong>.
            </p>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 font-mono">
              Installments ({installments.length} Total):
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </div>

          {/* Installments Selection Table */}
          <div className="border border-[#E6E1D6] rounded-2xl overflow-hidden max-h-[280px] overflow-y-auto shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E6E1D6] text-[11px] font-mono text-slate-600 uppercase">
                  <th className="p-3 w-12 text-center">Move?</th>
                  <th className="p-3">#</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                  <th className="p-3">Dep / Chq</th>
                  <th className="p-3">Splits</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDE8DF]">
                {installments.map((inst, idx) => {
                  const isChecked = selectedInstIds.has(inst.id);
                  const splitsStr = Object.entries(inst.companySplits || {})
                    .filter(([_, v]) => v > 0)
                    .map(([k, v]) => `${k}: ₹${Number(v).toLocaleString('en-IN')}`)
                    .join(', ') || 'N/A';

                  return (
                    <tr
                      key={inst.id}
                      onClick={() => toggleInst(inst.id)}
                      className={`cursor-pointer transition-colors ${
                        isChecked ? 'bg-amber-50/80 font-semibold' : 'hover:bg-[#FCFBF9]'
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleInst(inst.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded text-[#701A35] accent-[#701A35] cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-mono text-slate-500">{inst.seqNo || idx + 1}</td>
                      <td className="p-3 font-mono text-slate-800">{inst.dueDate}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        ₹{inst.amountDue.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {inst.depName || '-'} {inst.chqNo ? `· #${inst.chqNo}` : ''}
                      </td>
                      <td className="p-3 text-[11px] text-slate-600 font-mono truncate max-w-xs" title={splitsStr}>
                        {splitsStr}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {inst.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Live Preview Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Loan A: Retained */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E1D6] space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                Loan A (Retained in {loan.id})
              </span>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xl font-bold font-mono text-slate-900">
                  ₹{retainedTotal.toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {retainedList.length} EMIs
                </span>
              </div>
            </div>

            {/* Loan B: Extracted */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-1.5">
              <span className="text-[10px] font-bold text-amber-900 uppercase font-mono tracking-wider">
                Loan B (Extracted to New Loan ID)
              </span>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xl font-bold font-mono text-amber-950">
                  ₹{extractedTotal.toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-mono font-bold text-amber-900">
                  {extractedList.length} EMIs
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E6E1D6] bg-[#FAF8F5] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#E6E1D6] text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isValidSplit || isSubmitting}
            onClick={handleSplit}
            className="px-5 py-2.5 bg-[#701A35] hover:bg-[#5C142B] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            {isSubmitting ? (
              <span>Splitting Loan...</span>
            ) : (
              <>
                <Scissors className="w-4 h-4" />
                <span>Confirm & Split into 2 Loans</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
