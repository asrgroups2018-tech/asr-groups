'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Company } from '@/lib/types';
import { numberToIndianWords } from '@/lib/utils/numberToWords';
import { formatIndianCommas } from '@/lib/utils/numberToWords';
import { DatePicker } from '@/components/ui/DatePicker';
import { DraftNumberInput } from '@/components/ui/DraftNumberInput';

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
  const cellRefs = useRef(new Map<string, HTMLInputElement>());
  const cellKeys = useMemo(
    () => scheduleRows.flatMap((row) => [
      `${row.seqNo}:amount`,
      ...selectedCompanies.map((company) => `${row.seqNo}:${company.shortCode}`),
    ]),
    [scheduleRows, selectedCompanies]
  );

  const registerCell = useCallback((key: string) => (element: HTMLInputElement | null) => {
    if (element) cellRefs.current.set(key, element);
    else cellRefs.current.delete(key);
  }, []);

  const focusNextCell = useCallback((key: string) => {
    const nextKey = cellKeys[cellKeys.indexOf(key) + 1];
    if (!nextKey) return;
    requestAnimationFrame(() => {
      const nextCell = cellRefs.current.get(nextKey);
      nextCell?.focus();
      nextCell?.select();
    });
  }, [cellKeys]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          Edit individual installment amounts, due dates, or company cells below. Row company splits automatically recalculate when changing installment amount.
        </span>
        <button
          type="button"
          onClick={generateInitialSchedule}
          className="px-2.5 py-1 bg-[#240F1D] border border-[#3D1A2C] text-[#C5A059] rounded hover:bg-white/5 text-[11px] font-mono cursor-pointer"
        >
          Reset Schedule
        </button>
      </div>

      {/* Schedule Table */}
      <div className="border border-[#3D1A2C] rounded-xl overflow-hidden bg-[#160810]">
        <table className="w-full table-fixed text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#240F1D] border-b border-[#3D1A2C] text-slate-300 font-mono">
              <th className="p-2 w-[5%] text-center">#</th>
              <th className="p-2 w-[17%]">Due Date</th>
              <th className="p-2 w-[16%] text-right font-bold text-[#EED8A1]">Installment (₹)</th>
              {selectedCompanies.map((c) => (
                <th key={c.id} className="p-2 font-bold text-[#EED8A1] text-right align-bottom">
                  <div className="text-[10px] font-bold text-white leading-tight break-words">{c.name}</div>
                  <div className={`text-[9px] font-mono font-semibold mt-0.5 ${c.isOutsideParty ? 'text-purple-300' : 'text-emerald-300'}`}>
                    {c.shortCode}
                  </div>
                </th>
              ))}
              <th className="p-2 w-[9%] text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2C1420]">
            {scheduleRows.map((row, idx) => {
              const bal = rowBalances[idx];
              return (
                <tr key={row.seqNo} className="hover:bg-white/5 font-mono">
                  <td className="p-1.5 text-center text-slate-500 font-bold">{row.seqNo}</td>
                  <td className="p-1.5">
                    <DatePicker
                      value={row.dueDate}
                      onChange={(newDate) => {
                        setScheduleRows((prev) =>
                          prev.map((r) => (r.seqNo === row.seqNo ? { ...r, dueDate: newDate } : r))
                        );
                      }}
                      theme="dark"
                      size="sm"
                      compact={true}
                    />
                  </td>
                  <td className="p-1.5">
                    <DraftNumberInput
                      value={row.amountDue}
                      onCommit={(value) => handleRowAmountChange(row.seqNo, value)}
                      onEnter={() => focusNextCell(`${row.seqNo}:amount`)}
                      registerRef={registerCell(`${row.seqNo}:amount`)}
                      className="w-full min-w-0 bg-[#240F1D] border border-[#3D1A2C] rounded px-1.5 py-1 text-[11px] font-bold text-right text-[#EED8A1]"
                    />
                  </td>
                  {selectedCompanies.map((c) => {
                    const val = row.companySplits[c.shortCode] || 0;
                    return (
                      <td key={c.id} className="p-1.5">
                        <DraftNumberInput
                          value={val}
                          onCommit={(value) => handleCellSplitChange(row.seqNo, c.shortCode, value)}
                          onEnter={() => focusNextCell(`${row.seqNo}:${c.shortCode}`)}
                          registerRef={registerCell(`${row.seqNo}:${c.shortCode}`)}
                          className="w-full min-w-0 bg-[#1F0B18] border border-[#3D1A2C] rounded px-1.5 py-1 text-[11px] text-right text-slate-200 font-semibold"
                        />
                      </td>
                    );
                  })}
                  <td className="p-1.5 text-center">
                    {bal?.isBalanced ? (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px]">
                        OK
                      </span>
                    ) : (
                      <span
                        title={`Row split mismatch: Diff ₹${formatIndianCommas(bal?.diff)}`}
                        className="inline-block px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-500/30 text-[10px]"
                      >
                        {bal?.diff > 0
                          ? `+₹${formatIndianCommas(bal?.diff)}`
                          : `-₹${formatIndianCommas(Math.abs(bal?.diff))}`}
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
              <td className="p-1.5 text-center text-slate-400">TOTAL</td>
              <td className="p-1.5 text-slate-400 font-normal">{scheduleRows.length} EMIs</td>
              <td className="p-1.5 text-right font-extrabold text-[#EED8A1]">
                ₹{scheduledTotal.toLocaleString('en-IN')}
              </td>
              {selectedCompanies.map((c) => {
                const compSum = scheduleRows.reduce(
                  (sum, r) => sum + (Number(r.companySplits[c.shortCode]) || 0),
                  0
                );
                return (
                  <td key={c.id} className="p-1.5 text-right font-bold text-amber-300">
                    ₹{compSum.toLocaleString('en-IN')}
                  </td>
                );
              })}
              <td className="p-1.5 text-center text-[10px] text-emerald-400">
                {isStep4Valid ? '✓ BAL' : 'DIFF'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Step 4 Live Running Totals Bar */}
      <div
        className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 font-mono text-xs ${
          isStep4Valid
            ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-400'
            : 'bg-rose-950/25 border-rose-500/40 text-rose-400'
        }`}
      >
        <div className="flex min-w-0 items-start gap-2">
          {isStep4Valid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div className="min-w-0">
            <span className="font-bold block flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span>
                Scheduled Total:{' '}
                <strong
                  title={numberToIndianWords(scheduledTotal)}
                  className="underline decoration-dotted cursor-help text-[#EED8A1]"
                >
                  ₹{scheduledTotal.toLocaleString('en-IN')}
                </strong>
              </span>
              <span>
                vs Loan Total:{' '}
                <strong
                  title={numberToIndianWords(totalAmount)}
                  className="underline decoration-dotted cursor-help text-[#EED8A1]"
                >
                  ₹{totalAmount.toLocaleString('en-IN')}
                </strong>
              </span>
            </span>
            <span className="text-[11px] opacity-80 mt-0.5 block font-sans">
              {isStep4Valid
                ? 'All installments and company splits are perfectly balanced.'
                : !isScheduledTotalBalanced
                ? `Difference of ₹${Math.abs(totalAmount - scheduledTotal).toLocaleString('en-IN')} between installments and loan capital.`
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
