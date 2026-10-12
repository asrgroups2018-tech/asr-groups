'use client';

import React, { useMemo } from 'react';
import { Building2, Check, RefreshCw } from 'lucide-react';
import { Company } from '@/lib/types';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { formatIndianCommas, parseFormattedNumber } from '@/lib/utils/numberToWords';

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
  // Exclude Infinity Enterprises (INE) and Innovative Solutions (INS) and any inactive companies from creation form
  const activeCompanies = useMemo(() => {
    return companies.filter(
      (c) =>
        c.isActive !== false &&
        !['INE', 'INS'].includes(c.shortCode.toUpperCase()) &&
        !c.name.toUpperCase().includes('INFINITY ENTERPRISES') &&
        !c.name.toUpperCase().includes('INNOVATIVE SOLUTIONS')
    );
  }, [companies]);

  // ASR Internal (PASS, KARS, IG, MARS, TG, GS, ALA, ASR)
  const asrCompanies = useMemo(() => activeCompanies.filter((c) => !c.isOutsideParty), [activeCompanies]);
  // Outside Parties (MM, FIN, CS, MC, TATVA, BHAVANA, TA (SS))
  const outsideCompanies = useMemo(() => activeCompanies.filter((c) => c.isOutsideParty), [activeCompanies]);

  // Quick preset handlers
  const handleSelectAllAsr = () => {
    const asrIds = asrCompanies.map((c) => c.id);
    const combined = Array.from(new Set([...selectedCompanyIds, ...asrIds]));
    setSelectedCompanyIds(combined);
    autoDistributePercent(combined);
  };

  const handleSelectAllOutside = () => {
    const outsideIds = outsideCompanies.map((c) => c.id);
    const combined = Array.from(new Set([...selectedCompanyIds, ...outsideIds]));
    setSelectedCompanyIds(combined);
    autoDistributePercent(combined);
  };

  const handleSelectAllActive = () => {
    const allIds = activeCompanies.map((c) => c.id);
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

    // Also distribute manual amount
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

  const handleToggleCompany = (companyId: string) => {
    let nextIds: string[];
    if (selectedCompanyIds.includes(companyId)) {
      nextIds = selectedCompanyIds.filter((id) => id !== companyId);
      const nextPcts = { ...companyPcts };
      delete nextPcts[companyId];
      setCompanyPcts(nextPcts);

      const nextAmts = { ...companyManualAmounts };
      delete nextAmts[companyId];
      setCompanyManualAmounts(nextAmts);
    } else {
      nextIds = [...selectedCompanyIds, companyId];
    }
    setSelectedCompanyIds(nextIds);
    autoDistributePercent(nextIds);
  };

  // Handle entering percentage for a company row
  const handlePctChange = (companyId: string, val: number) => {
    const nextPcts = { ...companyPcts, [companyId]: val };
    setCompanyPcts(nextPcts);
    const nextAmt = Math.round((totalAmount * val) / 100);
    setCompanyManualAmounts({ ...companyManualAmounts, [companyId]: nextAmt });
  };

  // Handle entering exact amount for a company row
  const handleAmountChange = (companyId: string, val: number) => {
    const nextAmts = { ...companyManualAmounts, [companyId]: val };
    setCompanyManualAmounts(nextAmts);
    const nextPct = totalAmount > 0 ? Number(((val / totalAmount) * 100).toFixed(1)) : 0;
    setCompanyPcts({ ...companyPcts, [companyId]: nextPct });
  };

  return (
    <div className="space-y-6">
      {/* ── Section 1: Company Selection Cards ── */}
      <div className="bg-[#240F1D] p-5 rounded-xl border border-[#3D1A2C] space-y-5">
        {/* Header */}
        <div>
          <h3 className="text-sm font-bold text-[#EED8A1] flex items-center gap-2 font-serif">
            <Building2 className="w-4 h-4 text-[#C5A059]" /> Select Funding Companies
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Choose funding entities from ASR Internal Group and Outside Parties
          </p>
        </div>

        {/* Quick Selection Toolbar */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-[#3D1A2C]">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold mr-1">Quick Select:</span>
          <button
            type="button"
            onClick={handleSelectAllAsr}
            className="px-2.5 py-1 bg-[#160810] hover:bg-[#C5A059]/20 hover:text-[#EED8A1] border border-[#3D1A2C] rounded text-[11px] font-mono cursor-pointer transition-colors"
          >
            All ASR Group ({asrCompanies.length})
          </button>
          <button
            type="button"
            onClick={handleSelectAllOutside}
            className="px-2.5 py-1 bg-[#160810] hover:bg-[#C5A059]/20 hover:text-[#EED8A1] border border-[#3D1A2C] rounded text-[11px] font-mono cursor-pointer transition-colors"
          >
            All Outside Parties ({outsideCompanies.length})
          </button>
          <button
            type="button"
            onClick={handleSelectAllActive}
            className="px-2.5 py-1 bg-[#160810] hover:bg-[#C5A059]/20 hover:text-[#EED8A1] border border-[#3D1A2C] rounded text-[11px] font-mono cursor-pointer transition-colors"
          >
            All Active ({activeCompanies.length})
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="px-2 py-1 text-slate-400 hover:text-rose-400 text-[11px] font-mono cursor-pointer ml-auto transition-colors"
          >
            Clear All
          </button>
        </div>

        {/* ASR Companies Group */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              ASR Companies ({asrCompanies.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {asrCompanies.map((company) => {
              const isSelected = selectedCompanyIds.includes(company.id);

              return (
                <div
                  key={company.id}
                  onClick={() => handleToggleCompany(company.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#331427] border-[#C5A059] shadow-md ring-1 ring-[#C5A059]/40'
                      : 'bg-[#160810] border-[#3D1A2C] hover:border-slate-600 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate font-serif">{company.name}</div>
                      {/* Short code only — no ASR Group text inside the box */}
                      <div className="text-[10px] font-mono text-emerald-400 font-bold mt-0.5">
                        {company.shortCode}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                        isSelected
                          ? 'bg-[#C5A059] border-[#C5A059] text-slate-950 font-bold'
                          : 'border-[#3D1A2C] bg-[#160810]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Outside Parties Group (Includes MM Associates & Fincube) */}
        <div className="space-y-2.5 pt-2 border-t border-[#3D1A2C]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-purple-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
              Outside Parties ({outsideCompanies.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {outsideCompanies.map((company) => {
              const isSelected = selectedCompanyIds.includes(company.id);

              return (
                <div
                  key={company.id}
                  onClick={() => handleToggleCompany(company.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#331427] border-[#C5A059] shadow-md ring-1 ring-[#C5A059]/40'
                      : 'bg-[#160810] border-[#3D1A2C] hover:border-slate-600 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate font-serif">{company.name}</div>
                      {/* Short code only — no Outside Party text inside the box */}
                      <div className="text-[10px] font-mono text-purple-300 font-bold mt-0.5">
                        {company.shortCode}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                        isSelected
                          ? 'bg-[#C5A059] border-[#C5A059] text-slate-950 font-bold'
                          : 'border-[#3D1A2C] bg-[#160810]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Section 2: Contribution Split Configuration (Shown when companies are selected) ── */}
      {selectedCompanies.length > 0 && (
        <div className="bg-[#240F1D] p-5 rounded-xl border border-[#3D1A2C] space-y-4">
          {/* Split Section Header with Toggle Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#3D1A2C]">
            <span className="text-xs font-mono font-bold uppercase text-[#EED8A1] tracking-wider">
              Contribution Split Configuration ({selectedCompanies.length} Companies Selected)
            </span>

            {/* Split Mode Toggle Button: Percentage (%) vs Exact Amount (₹) */}
            <div className="flex items-center bg-[#160810] p-1 rounded-lg border border-[#3D1A2C] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSplitMode('PERCENT')}
                className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  splitMode === 'PERCENT'
                    ? 'bg-[#C5A059] text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('MANUAL')}
                className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  splitMode === 'MANUAL'
                    ? 'bg-[#C5A059] text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Exact Amount (₹)
              </button>
            </div>
          </div>

          {/* List of Selected Company Split Rows */}
          <div className="space-y-2.5">
            {selectedCompanies.map((company) => {
              const pct = companyPcts[company.id] || 0;
              const manualAmt = companyManualAmounts[company.id] || Math.round((totalAmount * pct) / 100);

              return (
                <div
                  key={company.id}
                  className="p-3.5 bg-[#160810] rounded-xl border border-[#3D1A2C] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white font-serif">{company.name}</div>
                    {/* Short code only */}
                    <div className={`text-[10px] font-mono font-bold mt-0.5 ${
                      company.isOutsideParty ? 'text-purple-300' : 'text-emerald-400'
                    }`}>
                      {company.shortCode}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                    {splitMode === 'PERCENT' ? (
                      <>
                        {/* Percentage Input */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={pct === 0 ? '' : pct}
                            placeholder="0"
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              handlePctChange(company.id, val);
                            }}
                            className="w-20 bg-[#240F1D] border border-[#3D1A2C] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-right text-[#EED8A1] focus:outline-hidden focus:border-[#C5A059]"
                          />
                          <span className="text-xs text-slate-400 font-mono font-bold">%</span>
                        </div>

                        {/* Calculated Amount Display */}
                        <div className="min-w-[120px] text-right font-mono font-bold text-xs text-[#EED8A1]">
                          <MoneyDisplay
                            amount={Math.round((totalAmount * pct) / 100)}
                            size="sm"
                            amountClassName="text-[#EED8A1] font-bold text-xs block text-right"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Exact Amount Input */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[#C5A059] font-mono font-bold">₹</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={manualAmt ? formatIndianCommas(manualAmt) : ''}
                            placeholder="0"
                            onChange={(e) => {
                              const cleanDigits = e.target.value.replace(/[^0-9.]/g, '');
                              const num = parseFormattedNumber(cleanDigits);
                              handleAmountChange(company.id, num);
                            }}
                            className="w-32 bg-[#240F1D] border border-[#3D1A2C] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-right text-[#EED8A1] focus:outline-hidden focus:border-[#C5A059]"
                          />
                        </div>

                        {/* Calculated Percentage Display */}
                        <div className="min-w-[80px] text-right font-mono font-bold text-xs text-slate-300">
                          {totalAmount > 0 ? ((manualAmt / totalAmount) * 100).toFixed(1) : '0.0'}%
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Validation Summary Bar */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
              isStep3Valid
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-400'
            }`}
          >
            <div>
              <span className="font-bold block">
                {splitMode === 'PERCENT'
                  ? `Total Allocated %: ${splitTotalPercent.toFixed(1)}% / 100%`
                  : `Total Allocated: ₹${splitTotalManualAmount.toLocaleString('en-IN')} / ₹${totalAmount.toLocaleString('en-IN')}`}
              </span>
              <span className="text-[11px] opacity-80 mt-0.5 block font-sans">
                {isStep3Valid
                  ? 'Split ratio matches loan capital.'
                  : splitMode === 'PERCENT'
                  ? `Difference of ${(100 - splitTotalPercent).toFixed(1)}% remaining to allocate.`
                  : `Difference of ₹${Math.abs(totalAmount - splitTotalManualAmount).toLocaleString('en-IN')} remaining.`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => autoDistributePercent(selectedCompanyIds)}
              className="px-2.5 py-1 bg-[#160810] border border-current rounded-lg text-[11px] font-bold hover:bg-white/10 cursor-pointer transition-colors"
            >
              Auto Equal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
