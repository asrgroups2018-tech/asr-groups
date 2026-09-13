'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';

interface TermsStepProps {
  frequency: 'Weekly' | 'Monthly';
  setFrequency: (freq: 'Weekly' | 'Monthly') => void;
  installmentCount: number;
  setInstallmentCount: (count: number) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  totalAmount: number;
}

export const TermsStep: React.FC<TermsStepProps> = ({
  frequency,
  setFrequency,
  installmentCount,
  setInstallmentCount,
  startDate,
  setStartDate,
  totalAmount,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-[#240F1D] p-5 rounded-xl border border-[#3D1A2C] space-y-5">
        <h3 className="text-sm font-semibold text-[#EED8A1] flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#C5A059]" /> Schedule Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Repayment Frequency</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Monthly', 'Weekly'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setFrequency(freq)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    frequency === freq
                      ? 'bg-[#C5A059] text-slate-950 border-[#C5A059] font-bold shadow-md'
                      : 'bg-[#160810] text-slate-300 border-[#3D1A2C] hover:bg-white/5'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Number of Installments (EMIs)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={installmentCount || ''}
              onChange={(e) => setInstallmentCount(Math.max(1, Number(e.target.value)))}
              className="w-full bg-[#160810] border border-[#3D1A2C] rounded-lg px-3.5 py-2 text-sm font-mono text-slate-100 focus:outline-hidden focus:border-[#C5A059]"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onClick={(e) => {
                try {
                  (e.target as any).showPicker?.();
                } catch {}
              }}
              className="w-full bg-[#160810] border border-[#3D1A2C] rounded-lg px-3.5 py-2 text-sm font-mono text-slate-100 focus:outline-hidden focus:border-[#C5A059] cursor-pointer [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>
        </div>

        <div className="p-4 bg-[#160810] rounded-lg border border-[#3D1A2C] flex items-center justify-between text-xs">
          <span className="text-slate-400">Estimated Equal Installment:</span>
          <div className="text-right">
            <span className="font-mono font-bold text-base text-[#EED8A1] block">
              ₹{Math.round(totalAmount / (installmentCount || 1)).toLocaleString('en-IN')}{' '}
              <span className="text-xs font-normal text-slate-400">/ {frequency === 'Weekly' ? 'week' : 'month'}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-sans block">
              {numberToWordsINR(Math.round(totalAmount / (installmentCount || 1)))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
