'use client';

import React from 'react';
import { Calendar, IndianRupee } from 'lucide-react';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { AmountInput } from '@/components/ui/AmountInput';
import { DatePicker } from '@/components/ui/DatePicker';
import { RepaymentFrequency } from '@/lib/types';
import { DraftNumberInput } from '@/components/ui/DraftNumberInput';

interface TermsStepProps {
  totalAmount: number;
  setTotalAmount: (amount: number) => void;
  disbursedAmount: number;
  setDisbursedAmount: (amount: number) => void;
  interestAmount: number;
  setInterestAmount: (amount: number) => void;
  includeInterest: boolean;
  setIncludeInterest: (include: boolean) => void;
  openingBalance: number;
  setOpeningBalance: (amount: number) => void;
  openingBalanceType: 'DEBIT' | 'CREDIT';
  setOpeningBalanceType: (type: 'DEBIT' | 'CREDIT') => void;
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
  includeInterest,
  setIncludeInterest,
  openingBalance,
  setOpeningBalance,
  openingBalanceType,
  setOpeningBalanceType,
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
            if (!includeInterest) {
              setInterestAmount(0);
              setDisbursedAmount(val);
            } else if (interestAmount > 0 && val > interestAmount) {
              setDisbursedAmount(val - interestAmount);
            } else if (disbursedAmount > val) {
              setDisbursedAmount(val);
            }
          }}
          placeholder="e.g. 1,00,000"
          theme="dark"
          size="lg"
          showWords={true}
          deferChange
          presets={[500000, 1000000, 2000000, 5000000]}
          onPresetClick={(val) => {
            setTotalAmount(val);
            if (!includeInterest) {
              setInterestAmount(0);
              setDisbursedAmount(val);
            } else if (interestAmount > 0 && val > interestAmount) {
              setDisbursedAmount(val - interestAmount);
            } else if (disbursedAmount > val) {
              setDisbursedAmount(val);
            }
          }}
        />
      </div>

      {/* Optional Opening Balance */}
      <div className="bg-[#240F1D] p-4.5 rounded-xl border border-[#3D1A2C] space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-xs font-mono uppercase text-[#EED8A1] font-bold block">
            Opening Balance <span className="normal-case text-slate-400">(Optional)</span>
          </label>
          <span className="text-[10px] text-slate-400">Starting ledger balance</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
          <AmountInput
            value={openingBalance}
            onChange={setOpeningBalance}
            placeholder="e.g. 1,00,000"
            theme="dark"
            size="md"
            showWords={true}
            deferChange
          />
          <select
            value={openingBalanceType}
            onChange={(event) => setOpeningBalanceType(event.target.value as 'DEBIT' | 'CREDIT')}
            className="h-10 rounded-xl border border-[#3D1A2C] bg-[#160810] px-3 text-xs font-bold text-slate-100 focus:outline-hidden focus:border-[#C5A059]"
            aria-label="Loan opening balance type"
          >
            <option value="DEBIT">Debit</option>
            <option value="CREDIT">Credit</option>
          </select>
        </div>
        <span className="text-[11px] text-slate-400 block">
          Leave blank if this loan has no opening balance.
        </span>
      </div>

      {/* Disbursed Amount & Optional Upfront Interest (ASR Earnings) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#240F1D] p-4.5 rounded-xl border border-[#3D1A2C] space-y-2">
          <label className="text-xs font-mono uppercase text-slate-300 font-bold block">
            Net Disbursed / Paid (₹)
          </label>
          <AmountInput
            value={disbursedAmount}
            onChange={(val) => {
              const cappedAmount = Math.min(val, totalAmount);
              setDisbursedAmount(cappedAmount);
              if (includeInterest && totalAmount > 0) setInterestAmount(totalAmount - cappedAmount);
            }}
            placeholder="e.g. 8,50,000"
            theme="dark"
            size="md"
            showWords={true}
            max={totalAmount}
            deferChange
          />
          <span className="text-[11px] text-slate-400 block">
            {includeInterest ? 'Principal given to the borrower' : 'Interest is off; net disbursed remains editable'}
          </span>
        </div>

        <div className="bg-[#240F1D] p-4.5 rounded-xl border border-amber-500/30 bg-gradient-to-br from-[#240F1D] to-[#2D1223] space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-mono uppercase text-[#EED8A1] font-bold block">
                Upfront Interest (₹)
              </label>
              <span className="text-[10px] text-slate-400">Only for this new loan</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={includeInterest}
              onClick={() => {
                const nextValue = !includeInterest;
                setIncludeInterest(nextValue);
                if (!nextValue) {
                  setInterestAmount(0);
                  setDisbursedAmount(totalAmount);
                }
              }}
              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                includeInterest
                  ? 'border-amber-400/50 bg-amber-400/20 text-amber-200'
                  : 'border-slate-600 bg-slate-800/70 text-slate-400'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${includeInterest ? 'bg-amber-300' : 'bg-slate-500'}`} />
              {includeInterest ? 'ON' : 'OFF'}
            </button>
          </div>
          {includeInterest ? (
            <>
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
                deferChange
              />
              <span className="text-[11px] text-amber-300/80 block">
                Deducted upfront upon loan creation
              </span>
            </>
          ) : (
            <div className="flex min-h-20 items-center rounded-lg border border-dashed border-slate-600/70 bg-slate-900/30 px-3 text-xs text-slate-400">
              Upfront interest is off for this loan. Net Disbursed remains available above.
            </div>
          )}
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
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#160810] rounded-xl border border-[#3D1A2C] h-10 items-center">
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
            <DraftNumberInput
              value={installmentCount}
              onCommit={(value) => setInstallmentCount(Math.min(120, Math.max(0, Math.round(value))))}
              placeholder="e.g. 5"
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
