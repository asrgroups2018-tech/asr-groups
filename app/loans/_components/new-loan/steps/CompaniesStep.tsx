'use client';

import React from 'react';
import { Building2, Check } from 'lucide-react';
import { Company } from '@/lib/types';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';

interface CompaniesStepProps {
  companies: Company[];
  selectedCompanyIds: string[];
  setSelectedCompanyIds: (ids: string[]) => void;
  selectedCompanies: Company[];
  splitMode: 'PERCENT' | 'MANUAL';
  setSplitMode: (mode: 'PERCENT' | 'MANUAL') => void;
  companyPcts: Record<string, number>;
  setCompanyPcts: (pcts: Record<string, number>) => void;
  companyManualAmounts: Record<string, number>;
  setCompanyManualAmounts: (amounts: Record<string, number>) => void;
  totalAmount: number;
  isStep3Valid: boolean;
  splitTotalPercent: number;
  splitTotalManualAmount: number;
}

export const CompaniesStep: React.FC<CompaniesStepProps> = ({
  companies,
  selectedCompanyIds,
  setSelectedCompanyIds,
  selectedCompanies,
  splitMode,
  setSplitMode,
  companyPcts,
  setCompanyPcts,
  companyManualAmounts,
  setCompanyManualAmounts,
  totalAmount,
  isStep3Valid,
  splitTotalPercent,
  splitTotalManualAmount,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-[#240F1D] p-5 rounded-xl border border-[#3D1A2C] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#EED8A1] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#C5A059]" /> Select Funding Companies
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Select which ASR or outside entities provide capital for this loan
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center bg-[#160810] p-1 rounded-lg border border-[#3D1A2C]">
            <button
              type="button"
              onClick={() => setSplitMode('PERCENT')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                splitMode === 'PERCENT' ? 'bg-[#C5A059] text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Percentage (%)
            </button>
            <button
              type="button"
              onClick={() => setSplitMode('MANUAL')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                splitMode === 'MANUAL' ? 'bg-[#C5A059] text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Exact Amount (₹)
            </button>
          </div>
        </div>

        {/* Company Multi-Select Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {companies.map((comp) => {
            const isSelected = selectedCompanyIds.includes(comp.id);
            return (
              <button
                key={comp.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSelectedCompanyIds(selectedCompanyIds.filter((id) => id !== comp.id));
                  } else {
                    setSelectedCompanyIds([...selectedCompanyIds, comp.id]);
                  }
                }}
                className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#C5A059]/20 border-[#C5A059] text-[#EED8A1]'
                    : 'bg-[#160810] border-[#3D1A2C] text-slate-400 hover:border-slate-600'
                }`}
              >
                <div>
                  <span className="font-mono font-bold text-xs block">{comp.shortCode}</span>
                  <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">
                    {comp.isOutsideParty ? 'Outside Party' : 'ASR Group'}
                  </span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#C5A059]" />}
              </button>
            );
          })}
        </div>

        {/* Split Configuration Inputs */}
        {selectedCompanies.length > 0 && (
          <div className="pt-4 border-t border-[#2C1420] space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Overall Contribution Split
            </h4>
            <div className="space-y-2">
              {selectedCompanies.map((c) => {
                const pct = companyPcts[c.id] || 0;
                const amt = companyManualAmounts[c.id] || 0;

                return (
                  <div
                    key={c.id}
                    className="p-3 bg-[#160810] border border-[#3D1A2C] rounded-lg flex items-center justify-between gap-4"
                  >
                    <div className="w-32 shrink-0">
                      <span className="font-mono font-bold text-xs text-[#EED8A1] block">{c.shortCode}</span>
                      <span className="text-[10px] text-slate-500 truncate block">{c.name}</span>
                    </div>

                    {splitMode === 'PERCENT' ? (
                      <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={pct || ''}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCompanyPcts({ ...companyPcts, [c.id]: val });
                          }}
                          className="w-full bg-[#240F1D] border border-[#3D1A2C] rounded px-2.5 py-1 text-xs font-mono text-right text-slate-100"
                        />
                        <span className="text-xs text-slate-400 font-mono">%</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 max-w-[220px]">
                        <span className="text-xs text-[#C5A059] font-mono">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={amt || ''}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCompanyManualAmounts({ ...companyManualAmounts, [c.id]: val });
                          }}
                          className="w-full bg-[#240F1D] border border-[#3D1A2C] rounded px-2.5 py-1 text-xs font-mono text-right text-slate-100"
                        />
                      </div>
                    )}

                    <div className="text-right font-mono text-xs min-w-[120px]">
                      {splitMode === 'PERCENT' ? (
                        <>
                          <span className="text-[#EED8A1] font-bold block">₹{Math.round((totalAmount * pct) / 100).toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-slate-400 font-sans block leading-tight">{numberToWordsINR(Math.round((totalAmount * pct) / 100))}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-300 font-bold block">{totalAmount > 0 ? ((amt / totalAmount) * 100).toFixed(1) : 0}%</span>
                          <span className="text-[10px] text-slate-400 font-sans block leading-tight">{numberToWordsINR(amt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Step 3 Balance Status */}
            <div
              className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono ${
                isStep3Valid
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-400'
              }`}
            >
              <span>{splitMode === 'PERCENT' ? 'Total Allocated %:' : 'Total Allocated ₹:'}</span>
              <span className="font-bold">
                {splitMode === 'PERCENT'
                  ? `${splitTotalPercent.toFixed(1)}% / 100%`
                  : `₹${splitTotalManualAmount.toLocaleString('en-IN')} / ₹${totalAmount.toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
