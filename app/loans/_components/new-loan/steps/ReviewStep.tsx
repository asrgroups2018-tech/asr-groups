'use client';

import React from 'react';
import { CheckCircle2, Building2 } from 'lucide-react';
import { Customer, Company } from '@/lib/types';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';

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
    <div className="space-y-6">
      <div className="bg-[#240F1D] p-5 rounded-xl border border-[#3D1A2C] space-y-4">
        <h3 className="text-sm font-bold text-[#EED8A1] flex items-center gap-2 font-serif">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Loan Verification & Review
        </h3>

        {/* Core Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#160810] rounded-lg border border-[#3D1A2C] text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-bold">Borrower Client</span>
            <span className="font-bold text-slate-100 text-sm">{targetCustomer?.name || customerSearch}</span>
            <span className="text-[10px] text-slate-400 block font-sans">{targetCustomer?.place || 'CHENNAI'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-bold">Total Capital</span>
            <MoneyDisplay
              amount={totalAmount}
              size="sm"
              amountClassName="font-bold text-[#EED8A1] block text-sm"
            />
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-bold">Installments</span>
            <span className="font-bold text-slate-100 text-sm">
              {installmentCount} × {frequency}
            </span>
            <span className="text-[10px] text-slate-400 font-sans block">
              ₹{Math.round(totalAmount / installmentCount).toLocaleString('en-IN')} / EMI
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-bold">First Due Date</span>
            <span className="font-bold text-slate-100 text-sm">{startDate}</span>
          </div>
        </div>

        {/* Company Funding Summary */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#C5A059]" />
              Funding Distribution ({selectedCompanies.length} Participating Companies)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {selectedCompanies.map((c) => {
              const pct =
                companyPcts[c.id] ||
                (totalAmount > 0 ? ((companyManualAmounts[c.id] || 0) / totalAmount) * 100 : 0);
              const amt = Math.round((totalAmount * pct) / 100);
              return (
                <div key={c.id} className="p-3 bg-[#160810] rounded-lg border border-[#3D1A2C] font-mono text-xs space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-white text-xs truncate">{c.name}</span>
                    <span className="text-amber-300 font-bold shrink-0">{pct.toFixed(1)}%</span>
                  </div>
                  <div className={`text-[10px] font-mono ${c.isOutsideParty ? 'text-purple-300' : 'text-emerald-300'}`}>
                    Code: {c.shortCode} • {c.isOutsideParty ? 'Outside Party' : 'ASR Group Internal'}
                  </div>
                  <div className="pt-1 border-t border-[#2C1420]">
                    <MoneyDisplay
                      amount={amt}
                      size="sm"
                      amountClassName="text-[#EED8A1] block text-xs font-bold"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
