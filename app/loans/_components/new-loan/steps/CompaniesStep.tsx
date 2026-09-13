'use client';

import React from 'react';
import { Building2, Check, Sparkles, Layers, RefreshCw, X } from 'lucide-react';
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
  const asrCompanies = companies.filter((c) => !c.isOutsideParty);
  const outsideCompanies = companies.filter((c) => c.isOutsideParty);

  // Quick preset handlers
  const handleSelectAllAsr = () => {
    const asrIds = asrCompanies.map((c) => c.id);
    setSelectedCompanyIds(Array.from(new Set([...selectedCompanyIds, ...asrIds])));
    autoDistributePercent(Array.from(new Set([...selectedCompanyIds, ...asrIds])));
  };

  const handleSelectAllOutside = () => {
    const outsideIds = outsideCompanies.map((c) => c.id);
    setSelectedCompanyIds(Array.from(new Set([...selectedCompanyIds, ...outsideIds])));
    autoDistributePercent(Array.from(new Set([...selectedCompanyIds, ...outsideIds])));
  };

  const handleSelectAll16 = () => {
    const allIds = companies.map((c) => c.id);
    setSelectedCompanyIds(allIds);
    autoDistributePercent(allIds);
  };

  const handleClearAll = () => {
    setSelectedCompanyIds([]);
    setCompanyPcts({});
    setCompanyManualAmounts({});
  };

  const autoDistributePercent = (ids: string[]) => {
    if (ids.length === 0) return;
    const basePct = Number((100 / ids.length).toFixed(1));
    const newPcts: Record<string, number> = {};
    let allocated = 0;
    ids.forEach((id, idx) => {
      if (idx === ids.length - 1) {
        newPcts[id] = Number((100 - allocated).toFixed(1));
      } else {
        newPcts[id] = basePct;
        allocated += basePct;
      }
    });
    setCompanyPcts(newPcts);

    // Also distribute manual amount if in manual mode
    const equalAmt = Math.round(totalAmount / ids.length);
    const newAmts: Record<string, number> = {};
    let allocAmt = 0;
    ids.forEach((id, idx) => {
      if (idx === ids.length - 1) {
        newAmts[id] = totalAmount - allocAmt;
      } else {
        newAmts[id] = equalAmt;
        allocAmt += equalAmt;
      }
    });
    setCompanyManualAmounts(newAmts);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#240F1D] p-5 rounded-xl border border-[#3D1A2C] space-y-5">
        {/* Header & Mode Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#EED8A1] flex items-center gap-2 font-serif">
              <Building2 className="w-4 h-4 text-[#C5A059]" /> Select Funding Companies (All 16 Entities)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Choose one or more companies from the 10 ASR Internal and 6 Outside parties
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center bg-[#160810] p-1 rounded-lg border border-[#3D1A2C] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSplitMode('PERCENT')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                splitMode === 'PERCENT' ? 'bg-[#C5A059] text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Percentage (%)
            </button>
            <button
              type="button"
              onClick={() => setSplitMode('MANUAL')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                splitMode === 'MANUAL' ? 'bg-[#C5A059] text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Exact Amount (₹)
            </button>
          </div>
        </div>

        {/* Quick Selection Toolbar */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-[#3D1A2C]">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold mr-1">Quick Select:</span>
          <button
            type="button"
            onClick={handleSelectAllAsr}
            className="px-2.5 py-1 rounded bg-[#160810] hover:bg-[#3D1A2C] text-emerald-300 border border-emerald-500/30 text-[11px] font-mono transition-all cursor-pointer"
          >
            + All ASR Internal (10)
          </button>
          <button
            type="button"
            onClick={handleSelectAllOutside}
            className="px-2.5 py-1 rounded bg-[#160810] hover:bg-[#3D1A2C] text-purple-300 border border-purple-500/30 text-[11px] font-mono transition-all cursor-pointer"
          >
            + All Outside (6)
          </button>
          <button
            type="button"
            onClick={handleSelectAll16}
            className="px-2.5 py-1 rounded bg-[#160810] hover:bg-[#3D1A2C] text-amber-300 border border-amber-500/30 text-[11px] font-mono transition-all cursor-pointer"
          >
            + All 16 Companies
          </button>
          {selectedCompanyIds.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => autoDistributePercent(selectedCompanyIds)}
                className="px-2.5 py-1 rounded bg-[#160810] hover:bg-[#3D1A2C] text-slate-300 border border-[#3D1A2C] text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1"
                title="Split equally across selected companies"
              >
                <RefreshCw className="w-3 h-3 text-[#C5A059]" /> Equal Split
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1 rounded bg-[#160810] hover:bg-rose-950/40 text-rose-400 border border-rose-500/30 text-[11px] font-mono transition-all cursor-pointer ml-auto flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            </>
          )}
        </div>

        {/* SECTION 1: ASR Group Internal (10 Companies) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              ASR Group Internal Companies (10)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {asrCompanies.filter((c) => selectedCompanyIds.includes(c.id)).length} / 10 Selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {asrCompanies.map((comp) => {
              const isSelected = selectedCompanyIds.includes(comp.id);
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => {
                    const newIds = isSelected
                      ? selectedCompanyIds.filter((id) => id !== comp.id)
                      : [...selectedCompanyIds, comp.id];
                    setSelectedCompanyIds(newIds);
                    if (!isSelected && selectedCompanyIds.length === 0) {
                      setCompanyPcts({ [comp.id]: 100 });
                      setCompanyManualAmounts({ [comp.id]: totalAmount });
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/30 border-emerald-500/60 text-[#EED8A1] shadow-xs ring-1 ring-emerald-500/40'
                      : 'bg-[#160810] border-[#3D1A2C] text-slate-400 hover:border-slate-600 hover:bg-[#1f0c18]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-white block truncate">{comp.name}</span>
                      <span className="font-mono text-[10px] text-emerald-300 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30 font-semibold">
                        {comp.shortCode}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold block mt-0.5 text-emerald-400/80">
                      ASR Group Internal
                    </span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Outside Parties (6 Companies) */}
        <div className="space-y-2.5 pt-2 border-t border-[#3D1A2C]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Outside Party Companies (6)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {outsideCompanies.filter((c) => selectedCompanyIds.includes(c.id)).length} / 6 Selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {outsideCompanies.map((comp) => {
              const isSelected = selectedCompanyIds.includes(comp.id);
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => {
                    const newIds = isSelected
                      ? selectedCompanyIds.filter((id) => id !== comp.id)
                      : [...selectedCompanyIds, comp.id];
                    setSelectedCompanyIds(newIds);
                    if (!isSelected && selectedCompanyIds.length === 0) {
                      setCompanyPcts({ [comp.id]: 100 });
                      setCompanyManualAmounts({ [comp.id]: totalAmount });
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-purple-950/30 border-purple-500/60 text-[#EED8A1] shadow-xs ring-1 ring-purple-500/40'
                      : 'bg-[#160810] border-[#3D1A2C] text-slate-400 hover:border-slate-600 hover:bg-[#1f0c18]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-white block truncate">{comp.name}</span>
                      <span className="font-mono text-[10px] text-purple-300 bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-500/30 font-semibold">
                        {comp.shortCode}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold block mt-0.5 text-purple-400/80">
                      Outside Party
                    </span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-purple-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Split Configuration Inputs */}
        {selectedCompanies.length > 0 && (
          <div className="pt-4 border-t border-[#2C1420] space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Contribution Split Configuration ({selectedCompanies.length} Companies Selected)
            </h4>
            <div className="space-y-2">
              {selectedCompanies.map((c) => {
                const pct = companyPcts[c.id] || 0;
                const amt = companyManualAmounts[c.id] || 0;

                return (
                  <div
                    key={c.id}
                    className="p-3 bg-[#160810] border border-[#3D1A2C] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-[200px]">
                      <span className="font-bold text-xs text-white block">{c.name}</span>
                      <span className={`text-[10px] font-mono ${c.isOutsideParty ? 'text-purple-300' : 'text-emerald-300'}`}>
                        {c.shortCode} • {c.isOutsideParty ? 'Outside Party' : 'ASR Group Internal'}
                      </span>
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
                          className="w-full bg-[#240F1D] border border-[#3D1A2C] rounded px-2.5 py-1 text-xs font-mono text-right text-slate-100 focus:outline-hidden focus:border-[#C5A059]"
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
                          className="w-full bg-[#240F1D] border border-[#3D1A2C] rounded px-2.5 py-1 text-xs font-mono text-right text-slate-100 focus:outline-hidden focus:border-[#C5A059]"
                        />
                      </div>
                    )}

                    <div className="text-right font-mono text-xs min-w-[140px]">
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

