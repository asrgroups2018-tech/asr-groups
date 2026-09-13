'use client';

import React from 'react';
import { Calendar, IndianRupee } from 'lucide-react';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';

interface TermsStepProps {
  totalAmount: number;
  setTotalAmount: (amount: number) => void;
  frequency: 'Weekly' | 'Monthly';
  setFrequency: (freq: 'Weekly' | 'Monthly') => void;
  installmentCount: number;
  setInstallmentCount: (count: number) => void;
  startDate: string;
  setStartDate: (date: string) => void;
}

export const TermsStep: React.FC<TermsStepProps> = ({
  totalAmount,
  setTotalAmount,
  frequency,
  setFrequency,
  installmentCount,
  setInstallmentCount,
  startDate,
  setStartDate,
}) => {
  return (
    <div className="space-y-6">
      {/* Total Loan Capital Amount */}
      <div className="bg-[#240F1D] p-5 rounded-xl border border-[#3D1A2C] space-y-3">
        <label className="text-sm font-semibold text-[#EED8A1] flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-[#C5A059]" /> Total Loan Capital Amount (₹)
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C5A059] font-bold text-lg">₹</span>
          <input
            type="number"
            min="1000"
            step="1000"
            value={totalAmount || ''}
            onChange={(e) => setTotalAmount(e.target.value === '' ? 0 : Number(e.target.value))}
            className="w-full bg-[#160810] border border-[#3D1A2C] rounded-lg pl-8 pr-4 py-3 text-lg font-mono font-bold text-[#EED8A1] focus:outline-hidden focus:border-[#C5A059] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="Enter loan amount (e.g. 1000000)"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
          <span>Common presets:</span>
          {[500000, 1000000, 2000000, 5000000].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setTotalAmount(val)}
              className="px-2.5 py-1 bg-[#160810] hover:bg-[#C5A059]/20 hover:text-[#EED8A1] border border-[#3D1A2C] rounded-md font-mono text-[11px] cursor-pointer transition-colors"
            >
              ₹{(val / 100000).toFixed(0)} Lakh
            </button>
          ))}
        </div>
      </div>

      {/* Repayment Terms */}
      <div className="bg-[#240F1D] p-5 rounded-xl border border-[#3D1A2C] space-y-4">
        <h3 className="text-sm font-bold text-[#EED8A1] flex items-center gap-2 font-serif">
          <Calendar className="w-4 h-4 text-[#C5A059]" /> Repayment Terms
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Frequency */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 font-bold mb-1.5">
              Repayment Frequency
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFrequency('Monthly')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  frequency === 'Monthly'
                    ? 'bg-[#C5A059] text-slate-950 font-bold shadow-xs'
                    : 'bg-[#160810] text-slate-300 border border-[#3D1A2C] hover:border-slate-500'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setFrequency('Weekly')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  frequency === 'Weekly'
                    ? 'bg-[#C5A059] text-slate-950 font-bold shadow-xs'
                    : 'bg-[#160810] text-slate-300 border border-[#3D1A2C] hover:border-slate-500'
                }`}
              >
                Weekly
              </button>
            </div>
          </div>

          {/* Number of Installments */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 font-bold mb-1.5">
              Number of EMIs
            </label>
            <input
              type="number"
              min="1"
              max="120"
              placeholder="e.g. 5"
              value={installmentCount === 0 ? '' : installmentCount}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setInstallmentCount(0);
                } else {
                  const n = parseInt(val, 10);
                  setInstallmentCount(isNaN(n) ? 0 : n);
                }
              }}
              className="w-full bg-[#160810] border border-[#3D1A2C] rounded-lg px-3.5 py-2 text-sm font-mono text-slate-100 focus:outline-hidden focus:border-[#C5A059] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 font-bold mb-1.5">
              First Due Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                try {
                  const [y, m, d] = e.target.value.split('-');
                  if (y && m && d) {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    setStartDate(`${parseInt(d, 10)}-${months[parseInt(m, 10) - 1]}-${y}`);
                  }
                } catch {}
              }}
              className="w-full bg-[#160810] border border-[#3D1A2C] rounded-lg px-3.5 py-2 text-sm font-mono text-slate-100 focus:outline-hidden focus:border-[#C5A059] cursor-pointer [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>
        </div>

        <div className="p-4 bg-[#160810] rounded-lg border border-[#3D1A2C] flex items-center justify-between text-xs">
          <span className="text-slate-400">Estimated Equal Installment:</span>
          <div className="text-right flex items-baseline gap-1.5">
            <MoneyDisplay
              amount={Math.round((totalAmount || 0) / (installmentCount || 1))}
              size="md"
              amountClassName="text-[#EED8A1] font-bold"
            />
            <span className="text-xs font-normal text-slate-400">/ {frequency === 'Weekly' ? 'week' : 'month'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
