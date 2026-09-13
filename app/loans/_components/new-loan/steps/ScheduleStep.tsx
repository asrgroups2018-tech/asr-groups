'use client';

import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Company } from '@/lib/types';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';

export interface ScheduleStepRow {
  seqNo: number;
  dueDate: string;
  amountDue: number;
  companySplits: Record<string, number>;
  remarks?: string;
}

export interface RowBalance {
  seqNo: number;
  amountDue: number;
  splitSum: number;
  diff: number;
  isBalanced: boolean;
}

interface ScheduleStepProps {
  scheduleRows: ScheduleStepRow[];
  setScheduleRows: React.Dispatch<React.SetStateAction<ScheduleStepRow[]>>;
  selectedCompanies: Company[];
  generateInitialSchedule: () => void;
  rowBalances: RowBalance[];
  handleRowAmountChange: (seqNo: number, newAmt: number) => void;
  handleCellSplitChange: (seqNo: number, compCode: string, newAmt: number) => void;
  scheduledTotal: number;
  totalAmount: number;
  isScheduledTotalBalanced: boolean;
  isStep4Valid: boolean;
}

export const ScheduleStep: React.FC<ScheduleStepProps> = ({
  scheduleRows,
  setScheduleRows,
  selectedCompanies,
  generateInitialSchedule,
  rowBalances,
  handleRowAmountChange,
  handleCellSplitChange,
  scheduledTotal,
  totalAmount,
  isScheduledTotalBalanced,
  isStep4Valid,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          Edit individual installment amounts or company cells below. Row company splits automatically recalculate when changing installment amount.
        </span>
        <button
          type="button"
          onClick={generateInitialSchedule}
          className="px-2.5 py-1 bg-[#240F1D] border border-[#3D1A2C] text-[#C5A059] rounded hover:bg-white/5 text-[11px] font-mono"
        >
          Reset Schedule
        </button>
      </div>

      {/* Schedule Table */}
      <div className="border border-[#3D1A2C] rounded-xl overflow-x-auto bg-[#160810]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#240F1D] border-b border-[#3D1A2C] text-slate-300 font-mono">
              <th className="p-3 w-12 text-center">#</th>
              <th className="p-3 w-32">Due Date</th>
              <th className="p-3 w-36 text-right font-bold text-[#EED8A1]">Installment (₹)</th>
              {selectedCompanies.map((c) => (
                <th key={c.id} className="p-3 font-bold text-[#EED8A1] min-w-[150px] text-right">
                  <div className="text-xs font-bold text-white leading-tight">{c.name}</div>
                  <div className={`text-[10px] font-mono font-normal mt-0.5 ${c.isOutsideParty ? 'text-purple-300' : 'text-emerald-300'}`}>
                    {c.shortCode} • {c.isOutsideParty ? 'Outside' : 'ASR'}
                  </div>
                </th>
              ))}
              <th className="p-3 w-20 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2C1420]">
            {scheduleRows.map((row, idx) => {
              const bal = rowBalances[idx];
              return (
                <tr key={row.seqNo} className="hover:bg-white/5 font-mono">
                  <td className="p-2.5 text-center text-slate-500 font-bold">{row.seqNo}</td>
                  <td className="p-2.5">
                    <input
                      type="date"
                      value={row.dueDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setScheduleRows((prev) =>
                          prev.map((r) => (r.seqNo === row.seqNo ? { ...r, dueDate: newDate } : r))
                        );
                      }}
                      onClick={(e) => {
                        try {
                          (e.target as any).showPicker?.();
                        } catch {}
                      }}
                      className="bg-[#240F1D] border border-[#3D1A2C] rounded px-2.5 py-1 text-xs font-mono text-slate-200 cursor-pointer [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={row.amountDue || ''}
                      onChange={(e) => handleRowAmountChange(row.seqNo, Number(e.target.value))}
                      className="w-full bg-[#240F1D] border border-[#3D1A2C] rounded px-2.5 py-1 text-xs font-bold text-right text-[#EED8A1]"
                    />
                  </td>
                  {selectedCompanies.map((c) => {
                    const val = row.companySplits[c.shortCode] || 0;
                    return (
                      <td key={c.id} className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          value={val || ''}
                          onChange={(e) => handleCellSplitChange(row.seqNo, c.shortCode, Number(e.target.value))}
                          className="w-full bg-[#1F0B18] border border-[#3D1A2C] rounded px-2 py-1 text-xs text-right text-slate-200 font-semibold"
                        />
                      </td>
                    );
                  })}
                  <td className="p-2.5 text-center">
                    {bal?.isBalanced ? (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px]">
                        OK
                      </span>
                    ) : (
                      <span
                        title={`Row split mismatch: Diff ₹${bal?.diff}`}
                        className="inline-block px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-500/30 text-[10px]"
                      >
                        {bal?.diff > 0 ? `+₹${bal?.diff}` : `-₹${Math.abs(bal?.diff)}`}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Schedule Column Totals Footer */}
          <tfoot className="bg-[#240F1D] border-t-2 border-[#C5A059]/40 font-mono text-xs font-bold text-slate-200">
            <tr>
              <td className="p-2.5 text-center text-slate-400">TOTAL</td>
              <td className="p-2.5 text-slate-400 font-normal">{scheduleRows.length} EMIs</td>
              <td className="p-2.5 text-right font-extrabold text-[#EED8A1]">
                ₹{scheduledTotal.toLocaleString('en-IN')}
              </td>
              {selectedCompanies.map((c) => {
                const compSum = scheduleRows.reduce(
                  (sum, r) => sum + (Number(r.companySplits[c.shortCode]) || 0),
                  0
                );
                return (
                  <td key={c.id} className="p-2.5 text-right font-bold text-amber-300">
                    ₹{compSum.toLocaleString('en-IN')}
                  </td>
                );
              })}
              <td className="p-2.5 text-center text-[10px] text-emerald-400">
                {isStep4Valid ? '✓ BAL' : 'DIFF'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Step 4 Live Running Totals Bar */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between font-mono text-xs ${
          isStep4Valid
            ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-400'
            : 'bg-rose-950/25 border-rose-500/40 text-rose-400'
        }`}
      >
        <div className="flex items-center gap-2">
          {isStep4Valid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <span className="font-bold block">
              Scheduled Total: ₹{scheduledTotal.toLocaleString('en-IN')} vs Loan Total: ₹{totalAmount.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] opacity-75 block">
              ({numberToWordsINR(scheduledTotal)})
            </span>
            <span className="text-[11px] opacity-80 mt-0.5 block font-sans">
              {isStep4Valid
                ? 'All installments and company splits are perfectly balanced.'
                : !isScheduledTotalBalanced
                ? `Difference of ₹${Math.abs(totalAmount - scheduledTotal).toLocaleString('en-IN')} (${numberToWordsINR(Math.abs(totalAmount - scheduledTotal))}) between installments and loan capital.`
                : 'Some individual row company splits do not sum to their installment amount.'}
            </span>
          </div>
        </div>
        <span className="font-bold text-xs uppercase px-2.5 py-1 rounded bg-black/40 border border-current">
          {isStep4Valid ? 'BALANCED' : 'REBALANCE REQUIRED'}
        </span>
      </div>
    </div>
  );
};
