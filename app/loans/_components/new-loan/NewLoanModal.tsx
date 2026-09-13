'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/store';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react';
import { BorrowerStep } from './steps/BorrowerStep';
import { TermsStep } from './steps/TermsStep';
import { CompaniesStep } from './steps/CompaniesStep';
import { ScheduleStep, ScheduleStepRow } from './steps/ScheduleStep';
import { ReviewStep } from './steps/ReviewStep';

interface NewLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewLoanModal: React.FC<NewLoanModalProps> = ({ isOpen, onClose }) => {
  const { customers, companies, createCustomer, createLoan, showToast } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Customer & Borrower
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerPlace, setNewCustomerPlace] = useState<string>('');
  const [newCustomerCodeNo, setNewCustomerCodeNo] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<number>(0);

  // Step 2: Repayment Schedule
  const [frequency, setFrequency] = useState<'Weekly' | 'Monthly'>('Monthly');
  const [installmentCount, setInstallmentCount] = useState<number>(5);
  const [startDate, setStartDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Step 3: Companies & Overall Split
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<'PERCENT' | 'MANUAL'>('PERCENT');
  const [companyPcts, setCompanyPcts] = useState<Record<string, number>>({});
  const [companyManualAmounts, setCompanyManualAmounts] = useState<Record<string, number>>({});

  // Step 4: Schedule Rows (Installment-level grid)
  const [scheduleRows, setScheduleRows] = useState<ScheduleStepRow[]>([]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setSelectedCustomerId('');
      setCustomerSearch('');
      setIsCreatingNewCustomer(false);
      setNewCustomerName('');
      setNewCustomerPlace('');
      setNewCustomerCodeNo('');
      setTotalAmount(0);
      setFrequency('Monthly');
      setInstallmentCount(5);
      setStartDate(new Date().toISOString().slice(0, 10));
      setScheduleRows([]);

      // Pick default ASR companies if none selected
      if (selectedCompanyIds.length === 0 && companies.length > 0) {
        const asrComps = companies.filter((c) => !c.isOutsideParty).slice(0, 3);
        const ids = asrComps.map((c) => c.id);
        setSelectedCompanyIds(ids);

        const initialPcts: Record<string, number> = {};
        if (ids.length === 1) initialPcts[ids[0]] = 100;
        else if (ids.length === 2) {
          initialPcts[ids[0]] = 50;
          initialPcts[ids[1]] = 50;
        } else if (ids.length === 3) {
          initialPcts[ids[0]] = 50;
          initialPcts[ids[1]] = 30;
          initialPcts[ids[2]] = 20;
        }
        setCompanyPcts(initialPcts);
      }
    }
  }, [isOpen, companies]);

  // Selected company objects
  const selectedCompanies = useMemo(() => {
    return companies.filter((c) => selectedCompanyIds.includes(c.id));
  }, [companies, selectedCompanyIds]);

  // Step 3 total percent or manual sum
  const splitTotalPercent = useMemo(() => {
    return selectedCompanyIds.reduce((sum, id) => sum + (companyPcts[id] || 0), 0);
  }, [selectedCompanyIds, companyPcts]);

  const splitTotalManualAmount = useMemo(() => {
    return selectedCompanyIds.reduce((sum, id) => sum + (companyManualAmounts[id] || 0), 0);
  }, [selectedCompanyIds, companyManualAmounts]);

  const isStep3Valid = useMemo(() => {
    if (selectedCompanyIds.length === 0) return false;
    if (splitMode === 'PERCENT') {
      return Math.abs(splitTotalPercent - 100) < 0.01;
    }
    return Math.abs(splitTotalManualAmount - totalAmount) < 1;
  }, [selectedCompanyIds, splitMode, splitTotalPercent, splitTotalManualAmount, totalAmount]);

  // Generate initial Step 4 Schedule from Step 2 & 3
  const generateInitialSchedule = () => {
    const rows: ScheduleStepRow[] = [];
    const equalEmi = Math.round(totalAmount / installmentCount);

    for (let i = 0; i < installmentCount; i++) {
      const d = new Date(startDate);
      if (frequency === 'Weekly') {
        d.setDate(d.getDate() + i * 7);
      } else {
        d.setMonth(d.getMonth() + i);
      }
      const dueDate = d.toISOString().slice(0, 10);

      const splits: Record<string, number> = {};
      let allocated = 0;

      selectedCompanies.forEach((c, cIdx) => {
        const pct =
          splitMode === 'PERCENT'
            ? companyPcts[c.id] || 0
            : totalAmount > 0
            ? ((companyManualAmounts[c.id] || 0) / totalAmount) * 100
            : 0;

        if (cIdx === selectedCompanies.length - 1) {
          splits[c.shortCode] = equalEmi - allocated;
        } else {
          const cut = Math.round((equalEmi * pct) / 100);
          splits[c.shortCode] = cut;
          allocated += cut;
        }
      });

      rows.push({
        seqNo: i + 1,
        dueDate,
        amountDue: equalEmi,
        companySplits: splits,
      });
    }

    // Adjust last installment so sum of rows equals totalAmount
    const currentSum = rows.reduce((s, r) => s + r.amountDue, 0);
    const diff = totalAmount - currentSum;
    if (diff !== 0 && rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      lastRow.amountDue += diff;
      let lastAlloc = 0;
      selectedCompanies.forEach((c, cIdx) => {
        const pct =
          splitMode === 'PERCENT'
            ? companyPcts[c.id] || 0
            : totalAmount > 0
            ? ((companyManualAmounts[c.id] || 0) / totalAmount) * 100
            : 0;
        if (cIdx === selectedCompanies.length - 1) {
          lastRow.companySplits[c.shortCode] = lastRow.amountDue - lastAlloc;
        } else {
          const cut = Math.round((lastRow.amountDue * pct) / 100);
          lastRow.companySplits[c.shortCode] = cut;
          lastAlloc += cut;
        }
      });
    }

    setScheduleRows(rows);
  };

  // Step 4 Calculations & Live Validations
  const scheduledTotal = useMemo(() => {
    return scheduleRows.reduce((sum, r) => sum + (Number(r.amountDue) || 0), 0);
  }, [scheduleRows]);

  const isScheduledTotalBalanced = Math.abs(scheduledTotal - totalAmount) < 1;

  const rowBalances = useMemo(() => {
    return scheduleRows.map((r) => {
      const splitSum = Object.values(r.companySplits).reduce((s, v) => s + (Number(v) || 0), 0);
      const isBalanced = Math.abs((Number(r.amountDue) || 0) - splitSum) < 1;
      return {
        seqNo: r.seqNo,
        amountDue: r.amountDue,
        splitSum,
        diff: (Number(r.amountDue) || 0) - splitSum,
        isBalanced,
      };
    });
  }, [scheduleRows]);

  const areAllRowsBalanced = rowBalances.every((b) => b.isBalanced);
  const isStep4Valid = isScheduledTotalBalanced && areAllRowsBalanced;

  // Handle row amount change -> recalculates that row's company cells automatically
  const handleRowAmountChange = (seqNo: number, newAmt: number) => {
    setScheduleRows((prev) =>
      prev.map((row) => {
        if (row.seqNo !== seqNo) return row;
        const newSplits: Record<string, number> = {};
        let allocated = 0;

        selectedCompanies.forEach((c, cIdx) => {
          const pct =
            splitMode === 'PERCENT'
              ? companyPcts[c.id] || 0
              : totalAmount > 0
              ? ((companyManualAmounts[c.id] || 0) / totalAmount) * 100
              : 0;

          if (cIdx === selectedCompanies.length - 1) {
            newSplits[c.shortCode] = newAmt - allocated;
          } else {
            const cut = Math.round((newAmt * pct) / 100);
            newSplits[c.shortCode] = cut;
            allocated += cut;
          }
        });

        return {
          ...row,
          amountDue: newAmt,
          companySplits: newSplits,
        };
      })
    );
  };

  // Handle manual per-cell company amount override
  const handleCellSplitChange = (seqNo: number, compCode: string, newAmt: number) => {
    setScheduleRows((prev) =>
      prev.map((row) => {
        if (row.seqNo !== seqNo) return row;
        return {
          ...row,
          companySplits: {
            ...row.companySplits,
            [compCode]: newAmt,
          },
        };
      })
    );
  };

  // Next step handler
  const handleNext = async () => {
    if (currentStep === 1) {
      if (isCreatingNewCustomer) {
        if (!newCustomerName.trim()) {
          showToast('Validation Error', 'Customer name is required.', 'warning');
          return;
        }
        const created = await createCustomer({
          name: newCustomerName.trim(),
          place: newCustomerPlace.trim() || undefined,
          codeNo: newCustomerCodeNo.trim() || undefined,
        });
        if (created) {
          setSelectedCustomerId(created.id);
          setIsCreatingNewCustomer(false);
        } else {
          return;
        }
      }
      if (!selectedCustomerId && !newCustomerName) {
        showToast('Validation Error', 'Please select or create a borrower customer.', 'warning');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (totalAmount <= 0) {
        showToast('Validation Error', 'Total loan capital amount must be greater than zero.', 'warning');
        return;
      }
      if (installmentCount <= 0) {
        showToast('Validation Error', 'Number of EMIs must be at least 1.', 'warning');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!isStep3Valid) {
        showToast(
          'Split Mismatch',
          'Company contribution split must total exactly 100% (or total loan amount).',
          'warning'
        );
        return;
      }
      generateInitialSchedule();
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!isStep4Valid) {
        showToast(
          'Balance Error',
          'All installment rows and the overall total must balance before proceeding.',
          'warning'
        );
        return;
      }
      setCurrentStep(5);
    }
  };

  // Final Submit
  const handleFinalCreate = async () => {
    const formattedSplits = selectedCompanies.map((c) => {
      const pct =
        splitMode === 'PERCENT'
          ? companyPcts[c.id] || 0
          : totalAmount > 0
          ? ((companyManualAmounts[c.id] || 0) / totalAmount) * 100
          : 0;
      const amt =
        splitMode === 'MANUAL'
          ? companyManualAmounts[c.id] || 0
          : Math.round((totalAmount * pct) / 100);

      return {
        companyId: c.id,
        splitPercent: pct,
        splitAmount: amt,
      };
    });

    const formattedInstallments = scheduleRows.map((r) => ({
      dueDate: r.dueDate,
      amountDue: r.amountDue,
      companySplits: r.companySplits,
      remarks: r.remarks,
    }));

    const result = await createLoan({
      customerId: selectedCustomerId,
      totalAmount,
      startDate,
      frequency,
      splits: formattedSplits,
      installments: formattedInstallments,
    });

    if (result) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const targetCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#1A0A13] border border-[#3D1A2C] rounded-2xl shadow-2xl text-slate-100 flex flex-col my-8 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#2C1420] flex items-center justify-between bg-[#230D1B]">
          <div>
            <h2 className="font-serif text-lg font-bold text-[#EED8A1] tracking-wide">
              Create New Loan
            </h2>
            <p className="text-xs text-slate-400">
              Step {currentStep} of 5 —{' '}
              {currentStep === 1
                ? 'Borrower Details'
                : currentStep === 2
                ? 'Loan Amount & Terms'
                : currentStep === 3
                ? 'Funding Companies'
                : currentStep === 4
                ? 'EMI Schedule'
                : 'Review & Save'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="grid grid-cols-5 border-b border-[#2C1420] bg-[#160810] text-xs font-mono">
          {[
            { num: 1, label: '1. Borrower' },
            { num: 2, label: '2. Terms' },
            { num: 3, label: '3. Companies' },
            { num: 4, label: '4. Schedule' },
            { num: 5, label: '5. Review' },
          ].map((s) => {
            const isActive = currentStep === s.num;
            const isDone = currentStep > s.num;
            return (
              <div
                key={s.num}
                className={`py-2.5 text-center border-r border-[#2C1420] last:border-r-0 transition-colors ${
                  isActive
                    ? 'bg-[#C5A059]/20 text-[#EED8A1] font-bold border-b-2 border-b-[#C5A059]'
                    : isDone
                    ? 'text-emerald-400 bg-emerald-950/20'
                    : 'text-slate-500'
                }`}
              >
                {isDone ? `✓ ${s.label}` : s.label}
              </div>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[68vh] space-y-6">
          {currentStep === 1 && (
            <BorrowerStep
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              setSelectedCustomerId={setSelectedCustomerId}
              customerSearch={customerSearch}
              setCustomerSearch={setCustomerSearch}
              isCreatingNewCustomer={isCreatingNewCustomer}
              setIsCreatingNewCustomer={setIsCreatingNewCustomer}
              newCustomerName={newCustomerName}
              setNewCustomerName={setNewCustomerName}
              newCustomerPlace={newCustomerPlace}
              setNewCustomerPlace={setNewCustomerPlace}
              newCustomerCodeNo={newCustomerCodeNo}
              setNewCustomerCodeNo={setNewCustomerCodeNo}
              totalAmount={totalAmount}
              setTotalAmount={setTotalAmount}
            />
          )}

          {currentStep === 2 && (
            <TermsStep
              totalAmount={totalAmount}
              setTotalAmount={setTotalAmount}
              frequency={frequency}
              setFrequency={setFrequency}
              installmentCount={installmentCount}
              setInstallmentCount={setInstallmentCount}
              startDate={startDate}
              setStartDate={setStartDate}
            />
          )}

          {currentStep === 3 && (
            <CompaniesStep
              companies={companies}
              selectedCompanyIds={selectedCompanyIds}
              setSelectedCompanyIds={setSelectedCompanyIds}
              selectedCompanies={selectedCompanies}
              splitMode={splitMode}
              setSplitMode={setSplitMode}
              companyPcts={companyPcts}
              setCompanyPcts={setCompanyPcts}
              companyManualAmounts={companyManualAmounts}
              setCompanyManualAmounts={setCompanyManualAmounts}
              totalAmount={totalAmount}
              isStep3Valid={isStep3Valid}
              splitTotalPercent={splitTotalPercent}
              splitTotalManualAmount={splitTotalManualAmount}
            />
          )}

          {currentStep === 4 && (
            <ScheduleStep
              scheduleRows={scheduleRows}
              setScheduleRows={setScheduleRows}
              selectedCompanies={selectedCompanies}
              generateInitialSchedule={generateInitialSchedule}
              rowBalances={rowBalances}
              handleRowAmountChange={handleRowAmountChange}
              handleCellSplitChange={handleCellSplitChange}
              scheduledTotal={scheduledTotal}
              totalAmount={totalAmount}
              isScheduledTotalBalanced={isScheduledTotalBalanced}
              isStep4Valid={isStep4Valid}
            />
          )}

          {currentStep === 5 && (
            <ReviewStep
              targetCustomer={targetCustomer}
              customerSearch={customerSearch}
              totalAmount={totalAmount}
              installmentCount={installmentCount}
              frequency={frequency}
              startDate={startDate}
              selectedCompanies={selectedCompanies}
              companyPcts={companyPcts}
              companyManualAmounts={companyManualAmounts}
            />
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-[#2C1420] bg-[#230D1B] flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-2 bg-[#160810] hover:bg-white/5 border border-[#3D1A2C] rounded-lg text-xs font-semibold text-slate-300 flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 hover:bg-white/5 text-slate-400 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={
                  (currentStep === 3 && !isStep3Valid) ||
                  (currentStep === 4 && !isStep4Valid)
                }
                className={`px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  (currentStep === 3 && !isStep3Valid) ||
                  (currentStep === 4 && !isStep4Valid)
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-[#C5A059] text-slate-950 hover:bg-[#D4AF37] font-bold shadow-lg'
                }`}
              >
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalCreate}
                className="px-6 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Check className="w-4 h-4" /> Save Loan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
