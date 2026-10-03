'use client';

import React from 'react';
import { Calendar, IndianRupee } from 'lucide-react';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { AmountInput } from '@/components/ui/AmountInput';
import { DatePicker } from '@/components/ui/DatePicker';
import { RepaymentFrequency } from '@/lib/types';

interface TermsStepProps {
  totalAmount: number;
  setTotalAmount: (amount: number) => void;
  disbursedAmount: number;
  setDisbursedAmount: (amount: number) => void;
  interestAmount: number;
  setInterestAmount: (amount: number) => void;
  frequency: RepaymentFrequency;
  setFrequency: (freq: RepaymentFrequency) => void;
  installmentCount: number;
  setInstallmentCount: (count: number) => void;
  startDate: string;
  setStartDate: (date: string) => void;
}

export const TermsStep: React.FC<TermsStepProps> = ({
  totalAmount,
  setTotalAmount,
  disbursedAmount,
  setDisbursedAmount,
  interestAmount,
  setInterestAmount,
  frequency,
  setFrequency,
  installmentCount,
  setInstallmentCount,
  startDate,
  setStartDate,
}) => {
  const frequencyOptions: { label: string; value: RepaymentFrequency; subtitle?: string }[] = [
    { label: 'Monthly', value: 'Monthly' },
    { label: 'Weekly', value: 'Weekly' },
    { label: 'Bi-Weekly', value: 'Bi-Weekly', subtitle: '14 days' },
    { label: 'Custom', value: 'Custom', subtitle: 'Manual' },
  ];

  return (
    <div className="space-y-6">
      {/* Total Loan Capital Amount */}
      <div className="bg-[#240F1D] p-5 rounded-xl border border-[#3D1A2C] space-y-3">
        <label className="text-sm font-semibold text-[#EED8A1] flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-[#C5A059]" /> Total Loan Account Amount (₹)
        </label>
        <AmountInput
          value={totalAmount}
          onChange={(val) => {
            setTotalAmount(val);
            if (interestAmount > 0 && val > interestAmount) {
              setDisbursedAmount(val - interestAmount);
            }
          }}
          placeholder="e.g. 1,00,000"
          theme="dark"
          size="lg"
          showWords={true}
          presets={[500000, 1000000, 2000000, 5000000]}
          onPresetClick={(val) => {
            setTotalAmount(val);
            if (interestAmount > 0 && val > interestAmount) {
              setDisbursedAmount(val - interestAmount);
            }
          }}
        />
      </div>

      {/* Disbursed Amount & Upfront Interest (ASR Earnings) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#240F1D] p-4.5 rounded-xl border border-[#3D1A2C] space-y-2">
          <label className="text-xs font-mono uppercase text-slate-300 font-bold block">
            Net Disbursed / Paid (₹)
          </label>
          <AmountInput
            value={disbursedAmount}
            onChange={(val) => {
              setDisbursedAmount(val);
              if (totalAmount > 0 && val <= totalAmount) {
                setInterestAmount(totalAmount - val);
              }
            }}
            placeholder="e.g. 8,50,000"
            theme="dark"
            size="md"
            showWords={true}
          />
          <span className="text-[11px] text-slate-400 block">
            Principal given to the borrower
          </span>
        </div>

        <div className="bg-[#240F1D] p-4.5 rounded-xl border border-amber-500/30 bg-gradient-to-br from-[#240F1D] to-[#2D1223] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase text-[#EED8A1] font-bold block">
              Upfront Interest (₹)
            </label>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono">
              ASR Profit
            </span>
          </div>
          <AmountInput
            value={interestAmount}
            onChange={(val) => {
              setInterestAmount(val);
              if (totalAmount > 0 && val <= totalAmount) {
                setDisbursedAmount(totalAmount - val);
              }
            }}
            placeholder="e.g. 1,50,000"
            theme="dark"
            size="md"
            showWords={true}
          />
          <span className="text-[11px] text-amber-300/80 block">
            Deducted upfront upon loan creation
          </span>
        </div>
      </div>

      {/* Repayment Terms */}
      <div className="bg-[#240F1D] p-5 rounded-xl border border-[#3D1A2C] space-y-4">
        <h3 className="text-sm font-bold text-[#EED8A1] flex items-center gap-2 font-serif">
          <Calendar className="w-4 h-4 text-[#C5A059]" /> Repayment Terms
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          {/* Frequency - 4 Options: Monthly, Weekly, Bi-Weekly, Custom */}
          <div className="md:col-span-6">
            <label className="block text-xs font-mono uppercase text-slate-300 font-bold mb-1.5">
              Repayment Frequency
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#160810] rounded-xl border border-[#3D1A2C] h-10 items-center">
              {frequencyOptions.map((opt) => {
                const isSelected = frequency === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFrequency(opt.value)}
                    className={`h-8 px-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center text-center whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#C5A059] text-slate-950 font-bold shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                    title={opt.subtitle ? `${opt.label} (${opt.subtitle})` : opt.label}
                  >
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Number of Installments */}
          <div className="md:col-span-2">
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
              className="w-full h-10 bg-[#160810] border border-[#3D1A2C] rounded-xl px-3 text-sm font-mono text-slate-100 focus:outline-hidden focus:border-[#C5A059] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-center"
            />
          </div>

          {/* Start Date / First Due Date with Custom DatePicker */}
          <div className="md:col-span-4">
            <label className="block text-xs font-mono uppercase text-slate-300 font-bold mb-1.5">
              First Due Date
            </label>
            <DatePicker
              value={startDate}
              onChange={(d) => setStartDate(d)}
              theme="dark"
              size="md"
              placeholder="Select first due date..."
              className="w-full"
              buttonClassName="w-full h-10"
            />
          </div>
        </div>

        <div className="p-3.5 bg-[#160810] rounded-xl border border-[#3D1A2C] flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Estimated Equal Installment:</span>
          <div className="text-right flex items-baseline gap-1.5">
            <MoneyDisplay
              amount={Math.round((totalAmount || 0) / (installmentCount || 1))}
              size="md"
              amountClassName="text-[#EED8A1] font-bold text-base"
            />
            <span className="text-xs font-normal text-slate-400">
              /{' '}
              {frequency === 'Weekly'
                ? 'week'
                : frequency === 'Bi-Weekly'
                ? '14 days'
                : frequency === 'Custom'
                ? 'installment'
                : 'month'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
