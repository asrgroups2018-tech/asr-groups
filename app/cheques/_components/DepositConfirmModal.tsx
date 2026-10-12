'use client';

import React, { useState } from 'react';
import { Cheque } from '@/lib/types';
import { useApp } from '@/lib/store';
import { CheckCircle2, X, Landmark, Calendar, Banknote } from 'lucide-react';
import { DatePicker, toIsoDate, formatDisplayDate } from '@/components/ui/DatePicker';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';

interface DepositConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  cheque: Cheque | null;
  onSuccess?: () => void;
}

export const DepositConfirmModal: React.FC<DepositConfirmModalProps> = ({
  isOpen,
  onClose,
  cheque,
  onSuccess,
}) => {
  const { markChequeDeposited } = useApp();
  const [depositedAt, setDepositedAt] = useState<string>(toIsoDate(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !cheque) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const ok = await markChequeDeposited(cheque.id, depositedAt);
      if (ok) {
        if (onSuccess) onSuccess();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-emerald-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col motion-modal">
        {/* Header */}
        <div className="px-6 py-4 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Mark Cheque as Deposited
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Record actual bank presentation date
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleConfirm} className="p-6 space-y-4 text-xs">
          {/* Summary Box */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Cheque Number:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                #{cheque.chequeNumber}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Customer:</span>
              <span className="font-bold text-slate-900">{cheque.customerName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Amount:</span>
              <MoneyDisplay
                amount={cheque.amount}
                size="md"
                amountClassName="text-slate-900 font-bold"
              />
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Planned Deposit:</span>
              <span className="font-medium text-slate-700 font-mono">
                {formatDisplayDate(cheque.depositDate)}
              </span>
            </div>
          </div>

          {/* Actual Deposit Date Picker */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Actual Bank Deposit Date <span className="text-rose-500">*</span>
            </label>
            <DatePicker
              value={depositedAt}
              onChange={(d) => setDepositedAt(d)}
              placeholder="Select date deposited in bank"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              This updates the deposit log and marks the cheque status as Deposited.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 font-bold cursor-pointer transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating...' : 'Confirm Bank Deposit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
