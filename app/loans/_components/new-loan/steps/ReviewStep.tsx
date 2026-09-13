'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Customer, Company } from '@/lib/types';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';

interface ReviewStepProps {
  targetCustomer: Customer | undefined;
  customerSearch: string;
  totalAmount: number;
  installmentCount: number;
  frequency: 'Weekly' | 'Monthly';
  startDate: string;
  selectedCompanies: Company[];
  companyPcts: Record<string, number>;
  companyManualAmounts: Record<string, number>;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  targetCustomer,
  customerSearch,
  totalAmount,
  installmentCount,
  frequency,
  startDate,
  selectedCompanies,
  companyPcts,
  companyManualAmounts,
}) => {
  return (
    <div className="space-y-5">
      <div className="bg-[#240F1D] p-5 rounded-xl border border-[#3D1A2C] space-y-4">
        <h3 className="text-sm font-semibold text-[#EED8A1] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#C5A059]" /> Review Loan Syndication
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#160810] rounded-lg border border-[#3D1A2C] font-mono text-xs">
          <div>
            <span className="text-slate-500 block text-[10px]">Borrower Client</span>
            <span className="font-bold text-slate-100">{targetCustomer?.name || customerSearch}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Total Capital</span>
            <span className="font-bold text-[#EED8A1] block">₹{totalAmount.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-slate-400 font-sans block leading-tight">{numberToWordsINR(totalAmount)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Installments</span>
            <span className="font-bold text-slate-100">
              {installmentCount} × {frequency}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">First Due Date</span>
            <span className="font-bold text-slate-100">{startDate}</span>
          </div>
        </div>

        {/* Company Funding Summary */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-300">Funding Distribution</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {selectedCompanies.map((c) => {
              const pct =
                companyPcts[c.id] ||
                (totalAmount > 0 ? ((companyManualAmounts[c.id] || 0) / totalAmount) * 100 : 0);
              const amt = Math.round((totalAmount * pct) / 100);
              return (
                <div key={c.id} className="p-3 bg-[#160810] rounded-lg border border-[#3D1A2C] font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#EED8A1]">{c.shortCode}</span>
                    <span className="text-slate-400">{pct.toFixed(1)}%</span>
                  </div>
                  <span className="text-slate-200 block text-[11px] mt-1 font-bold">₹{amt.toLocaleString('en-IN')}</span>
                  <span className="text-slate-400 block text-[10px] font-sans leading-tight">{numberToWordsINR(amt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
