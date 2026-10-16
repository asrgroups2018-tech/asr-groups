'use client';

import React, { useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AmountInput } from '@/components/ui/AmountInput';
import { DatePicker } from '@/components/ui/DatePicker';

export interface LoanChequeRow {
  id: string;
  scheduleSeqNo: number | null;
  chequeNumber: string;
  depositDate: string;
  amount: number;
  followsScheduleDate: boolean;
  followsScheduleAmount: boolean;
  isUsed: boolean;
}

interface ChequesStepProps {
  rows: LoanChequeRow[];
  onChange: (rows: LoanChequeRow[]) => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onClearEntries: () => void;
  totalAmount: number;
  allocatedAmount: number;
  hasChequeDetails: boolean;
  isValid: boolean;
}

export const ChequesStep: React.FC<ChequesStepProps> = ({
  rows,
  onChange,
  onAddRow,
  onRemoveRow,
  onClearEntries,
  totalAmount,
  allocatedAmount,
  hasChequeDetails,
  isValid,
}) => {
  const remainingAmount = totalAmount - allocatedAmount;
  const chequeNumberRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleChequeNumberKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number
  ) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

    const nextRowIndex = event.key === 'ArrowUp' ? rowIndex - 1 : rowIndex + 1;
    const nextRow = rows[nextRowIndex];
    const nextInput = nextRow ? chequeNumberRefs.current[nextRow.id] : null;

    if (nextInput) {
      event.preventDefault();
      nextInput.focus();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#3D1A2C] bg-[#240F1D] p-4">
        <div>
          <h3 className="text-sm font-bold text-[#EED8A1]">Cheque Details</h3>
          <p className="mt-1 text-xs text-slate-400">
            Deposit dates follow the EMI schedule. Edit cheque amounts to allocate the loan total across cheques.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasChequeDetails && (
            <button
              type="button"
              onClick={onClearEntries}
              className="rounded-lg border border-[#3D1A2C] px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/5"
            >
              Clear Entries
            </button>
          )}
          <button
            type="button"
            onClick={onAddRow}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A059]/50 bg-[#C5A059]/10 px-3 py-2 text-xs font-semibold text-[#EED8A1] transition-colors hover:bg-[#C5A059]/20"
          >
            <Plus className="h-4 w-4" /> Add Cheque
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid grid-cols-1 items-end gap-3 rounded-xl border border-[#3D1A2C] bg-[#160810] p-3 sm:grid-cols-12"
          >
            <div className="text-xs font-bold text-slate-400 sm:col-span-1">
              Cheque {index + 1}
              {row.scheduleSeqNo !== null && (
                <span className="mt-1 block text-[10px] font-normal text-slate-500">
                  EMI {row.scheduleSeqNo}
                </span>
              )}
            </div>

            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-300 sm:col-span-4">
              Cheque No.
              <input
                type="text"
                value={row.chequeNumber}
                ref={(input) => {
                  chequeNumberRefs.current[row.id] = input;
                }}
                onKeyDown={(event) => handleChequeNumberKeyDown(event, index)}
                onChange={(event) =>
                  onChange(
                    rows.map((item) =>
                      item.id === row.id
                        ? { ...item, chequeNumber: event.target.value, isUsed: true }
                        : item
                    )
                  )
                }
                placeholder="Enter cheque number"
                className="mt-1.5 h-10 w-full rounded-lg border border-[#3D1A2C] bg-[#240F1D] px-3 text-sm font-mono font-normal normal-case text-slate-100 outline-none focus:border-[#C5A059]"
              />
            </label>

            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-300">
                Deposit Date
              </label>
              <DatePicker
                value={row.depositDate || null}
                onChange={(depositDate) =>
                  onChange(
                    rows.map((item) =>
                      item.id === row.id
                        ? {
                            ...item,
                            depositDate,
                            followsScheduleDate: false,
                            isUsed: true,
                          }
                        : item
                    )
                  )
                }
                theme="dark"
                size="md"
                placeholder="Select deposit date"
                className="w-full"
                buttonClassName="h-10 w-full"
                showPresets={false}
              />
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-300">
                Cheque Amount (₹)
              </label>
              <AmountInput
                value={row.amount}
                onChange={(amount) =>
                  onChange(
                    rows.map((item) =>
                      item.id === row.id
                        ? {
                            ...item,
                            amount: Math.round(amount),
                            followsScheduleAmount: false,
                            isUsed: true,
                          }
                        : item
                    )
                  )
                }
                theme="dark"
                size="md"
                showWords={false}
                placeholder="Enter amount"
                inputClassName="h-10"
              />
            </div>

            <div className="flex justify-end sm:col-span-1">
              {row.scheduleSeqNo === null && (
                <button
                  type="button"
                  onClick={() => onRemoveRow(row.id)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                  aria-label={`Remove cheque ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasChequeDetails && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-xs font-mono ${
            isValid
              ? 'border-emerald-500/40 bg-emerald-950/25 text-emerald-300'
              : 'border-amber-500/40 bg-amber-950/20 text-amber-200'
          }`}
        >
          <span>
            Allocated: ₹{allocatedAmount.toLocaleString('en-IN')} / ₹{totalAmount.toLocaleString('en-IN')}
          </span>
          <span>
            {remainingAmount >= 0 ? 'Remaining' : 'Over by'}: ₹
            {Math.abs(remainingAmount).toLocaleString('en-IN')}
          </span>
          {!isValid && (
            <span className="w-full text-[11px]">
              Enter a cheque number, date, and positive amount for every row, and allocate exactly the loan total.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
