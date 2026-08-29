'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import {
  CustomerInvestor,
  BorrowerCompany,
  LoanCustomerShare,
  LoanCompanySplit,
  RepaymentInstallment,
} from '@/lib/types';
import {
  X,
  Plus,
  Trash2,
  Check,
  Building2,
  Users,
  Percent,
  Calendar,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Search,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { AddCustomerModal } from '@/components/customers/AddCustomerModal';
import { AddCompanyModal } from '@/components/companies/AddCompanyModal';

const COMPANY_COLORS = [
  '#701A35', // Maroon primary
  '#C5A059', // Gold accent
  '#1E293B', // Slate dark
  '#0D9488', // Teal
  '#D97706', // Amber
  '#6366F1', // Indigo
  '#E11D48', // Rose
  '#059669', // Emerald
];

interface NewLoanWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewLoanWizardModal: React.FC<NewLoanWizardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { customers, companies, createLoan, showToast } = useApp();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Customer(s) & Capital Amount
  const [selectedCustomers, setSelectedCustomers] = useState<
    { customer: CustomerInvestor; percentage: number; amount: number }[]
  >([]);
  const [customerSplitMode, setCustomerSplitMode] = useState<'percentage' | 'manual'>('percentage');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isQuickAddCustomerOpen, setIsQuickAddCustomerOpen] = useState(false);
  const [totalLoanAmount, setTotalLoanAmount] = useState<number>(20000000); // ₹2 Cr default

  // Customer Split Validations & Helpers
  const totalCustomerAllocatedPercentage = selectedCustomers.reduce(
    (acc, sc) => acc + (sc.percentage || 0),
    0
  );
  const totalCustomerAllocatedAmount = selectedCustomers.reduce(
    (acc, sc) => acc + (sc.amount || 0),
    0
  );
  const isCustomerSplitValid =
    selectedCustomers.length <= 1 ||
    (customerSplitMode === 'percentage'
      ? Math.abs(totalCustomerAllocatedPercentage - 100) < 0.2
      : Math.abs(totalCustomerAllocatedAmount - totalLoanAmount) < 50);

  const handleAutoBalanceCustomerSplits = () => {
    if (selectedCustomers.length === 0) return;
    const count = selectedCustomers.length;
    const equalPct = Math.floor((100 / count) * 10) / 10;
    const remainder = Math.round((100 - equalPct * count) * 10) / 10;
    const updated = selectedCustomers.map((sc, idx) => {
      const pct = idx === 0 ? Math.round((equalPct + remainder) * 10) / 10 : equalPct;
      return {
        ...sc,
        percentage: pct,
        amount: Math.round((totalLoanAmount * pct) / 100),
      };
    });
    setSelectedCustomers(updated);
  };

  const handleUpdateCustomerPercentage = (idx: number, percentage: number) => {
    const updated = [...selectedCustomers];
    updated[idx].percentage = percentage;
    updated[idx].amount = Math.round((totalLoanAmount * percentage) / 100);
    setSelectedCustomers(updated);
  };

  const handleUpdateCustomerAmount = (idx: number, amount: number) => {
    const updated = [...selectedCustomers];
    updated[idx].amount = amount;
    const newTotal = updated.reduce((acc, sc) => acc + (sc.amount || 0), 0);
    if (newTotal > 0) {
      updated.forEach((sc) => {
        sc.percentage = Math.round(((sc.amount || 0) / newTotal) * 1000) / 10;
      });
      setTotalLoanAmount(newTotal);
      if (selectedCompanyIds.length > 0) {
        const nextSplits = { ...companySplits };
        Object.keys(nextSplits).forEach((cId) => {
          nextSplits[cId].amount = Math.round((newTotal * nextSplits[cId].percentage) / 100);
        });
        setCompanySplits(nextSplits);
      }
    }
    setSelectedCustomers(updated);
  };

  // Step 3: Companies & Split
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<'percentage' | 'manual'>('percentage');
  const [companySplits, setCompanySplits] = useState<
    Record<string, { percentage: number; amount: number; customRate?: number }>
  >({});
  const [isQuickAddCompanyOpen, setIsQuickAddCompanyOpen] = useState(false);

  // Step 4: Interest & Terms (Revolving Cycles)
  const [defaultInterestRate, setDefaultInterestRate] = useState<number>(24); // 24% p.a. (2% p.m.)
  const [asrCommissionRate, setAsrCommissionRate] = useState<number>(4); // 4% ASR Income
  const [tenureMonths, setTenureMonths] = useState<number>(3); // 3 months default
  const [frequency, setFrequency] = useState<'Monthly' | 'Weekly'>('Monthly');
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [scheduleDates, setScheduleDates] = useState<Record<number, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter existing customers for autocomplete in Step 1
  const matchingCustomers = customers.filter(
    (c) =>
      !selectedCustomers.some((sc) => sc.customer.id === c.id) &&
      (c.fullName.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        (c.companyName && c.companyName.toLowerCase().includes(customerSearchQuery.toLowerCase())) ||
        c.phone.includes(customerSearchQuery))
  );

  // Helper to add customer to loan
  const handleSelectCustomer = (customer: CustomerInvestor) => {
    const updated = [
      ...selectedCustomers,
      {
        customer,
        percentage: selectedCustomers.length === 0 ? 100 : 0,
        amount: selectedCustomers.length === 0 ? totalLoanAmount : 0,
      },
    ];
    // Balance percentages equally if multiple
    if (updated.length > 1) {
      const equalShare = Math.floor(100 / updated.length);
      const remainder = 100 - equalShare * updated.length;
      updated.forEach((sc, idx) => {
        sc.percentage = equalShare + (idx === 0 ? remainder : 0);
        sc.amount = Math.round((totalLoanAmount * sc.percentage) / 100);
      });
    }
    setSelectedCustomers(updated);
    setCustomerSearchQuery('');
  };

  const handleRemoveCustomer = (customerId: string) => {
    const updated = selectedCustomers.filter((sc) => sc.customer.id !== customerId);
    if (updated.length === 1) {
      updated[0].percentage = 100;
      updated[0].amount = totalLoanAmount;
    }
    setSelectedCustomers(updated);
  };

  // Toggle company selection in Step 3
  const handleToggleCompany = (company: BorrowerCompany) => {
    let nextIds: string[];
    if (selectedCompanyIds.includes(company.id)) {
      nextIds = selectedCompanyIds.filter((id) => id !== company.id);
    } else {
      nextIds = [...selectedCompanyIds, company.id];
    }
    setSelectedCompanyIds(nextIds);

    // Recompute splits
    if (nextIds.length > 0) {
      const equalPct = Math.floor(100 / nextIds.length);
      const rem = 100 - equalPct * nextIds.length;
      const nextSplits: Record<string, { percentage: number; amount: number; customRate?: number }> = {};
      nextIds.forEach((cId, idx) => {
        const pct = equalPct + (idx === 0 ? rem : 0);
        const comp = companies.find((c) => c.id === cId);
        nextSplits[cId] = {
          percentage: pct,
          amount: Math.round((totalLoanAmount * pct) / 100),
          customRate: comp?.defaultInterestRate || 24,
        };
      });
      setCompanySplits(nextSplits);
    } else {
      setCompanySplits({});
    }
  };

  const handleUpdateSplitPercentage = (companyId: string, percentage: number) => {
    const amt = Math.round((totalLoanAmount * percentage) / 100);
    setCompanySplits((prev) => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        percentage,
        amount: amt,
      },
    }));
  };

  const handleUpdateSplitAmount = (companyId: string, amount: number) => {
    const pct = totalLoanAmount > 0 ? (amount / totalLoanAmount) * 100 : 0;
    setCompanySplits((prev) => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        amount,
        percentage: Math.round(pct * 10) / 10,
      },
    }));
  };

  // Step 3 Split validation calculations & Auto-balance
  const totalAllocatedPercentage = Object.values(companySplits).reduce(
    (acc, s) => acc + (s.percentage || 0),
    0
  );
  const totalAllocatedAmount = Object.values(companySplits).reduce(
    (acc, s) => acc + (s.amount || 0),
    0
  );
  const isCompanySplitValid =
    selectedCompanyIds.length > 0 &&
    (splitMode === 'percentage'
      ? Math.abs(totalAllocatedPercentage - 100) < 0.2
      : Math.abs(totalAllocatedAmount - totalLoanAmount) < 50);

  const handleAutoBalanceSplits = () => {
    if (selectedCompanyIds.length === 0) return;
    const count = selectedCompanyIds.length;
    const equalPct = Math.floor((100 / count) * 10) / 10;
    const remainder = Math.round((100 - equalPct * count) * 10) / 10;

    const nextSplits = { ...companySplits };
    selectedCompanyIds.forEach((cId, idx) => {
      const pct = idx === 0 ? Math.round((equalPct + remainder) * 10) / 10 : equalPct;
      const amt = Math.round((totalLoanAmount * pct) / 100);
      const comp = companies.find((c) => c.id === cId);
      nextSplits[cId] = {
        percentage: pct,
        amount: amt,
        customRate: nextSplits[cId]?.customRate || comp?.defaultInterestRate || defaultInterestRate,
      };
    });
    setCompanySplits(nextSplits);
  };

  // Step 4 Financial Calculations (Monthly Revolving Credit Cycles: Full Principal + Interest per month)
  const calculations = useMemo(() => {
    let monthlyTotalInterest = 0;
    const splits: LoanCompanySplit[] = [];

    selectedCompanyIds.forEach((cId) => {
      const comp = companies.find((c) => c.id === cId);
      const split = companySplits[cId];
      if (!comp || !split) return;

      const rate = split.customRate ?? defaultInterestRate;
      const principal = split.amount;
      const oneMonthInterest = principal * (rate / 100) * (1 / 12);
      monthlyTotalInterest += oneMonthInterest;

      splits.push({
        companyId: comp.id,
        companyName: comp.companyName,
        percentage: split.percentage,
        amount: principal,
        interestRate: rate,
        monthlyInterest: Math.round(oneMonthInterest),
        totalDuePerMonth: Math.round(principal + oneMonthInterest),
        monthlyEmi: Math.round(principal + oneMonthInterest),
      });
    });

    const totalInterestExpected = monthlyTotalInterest * (tenureMonths || 1);
    const asrIncome = totalInterestExpected * (asrCommissionRate / (defaultInterestRate || 1));
    const customerNetProfit = totalInterestExpected - asrIncome;

    return {
      monthlyTotalInterest: Math.round(monthlyTotalInterest),
      totalInterestExpected: Math.round(totalInterestExpected),
      asrIncome: Math.round(asrIncome),
      customerNetProfit: Math.round(customerNetProfit),
      splits,
    };
  }, [
    selectedCompanyIds,
    companies,
    companySplits,
    defaultInterestRate,
    asrCommissionRate,
    tenureMonths,
    totalLoanAmount,
  ]);

  // Step 5 Spreadsheet Repayment Schedule Generator (with Editable Dates)
  const generatedSchedule: RepaymentInstallment[] = useMemo(() => {
    if (calculations.splits.length === 0) return [];
    const schedule: RepaymentInstallment[] = [];
    const baseDate = new Date(startDate || new Date());

    for (let i = 1; i <= (tenureMonths || 1); i++) {
      let dateISO = scheduleDates[i];
      if (!dateISO) {
        const d = new Date(baseDate);
        if (frequency === 'Weekly') {
          d.setDate(d.getDate() + i * 7);
        } else {
          d.setMonth(d.getMonth() + i);
        }
        const pad = (n: number) => n.toString().padStart(2, '0');
        dateISO = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      }

      const dObj = new Date(dateISO);
      const dateFormatted = !isNaN(dObj.getTime())
        ? `${dObj.getDate()}-${dObj.toLocaleString('en-US', { month: 'short' })}-${dObj.getFullYear()}`
        : dateISO;

      let totalCycleAmount = 0;
      const companyShares: Record<string, number> = {};
      const companyPrincipalShares: Record<string, number> = {};
      const companyInterestShares: Record<string, number> = {};

      calculations.splits.forEach((s) => {
        companyShares[s.companyId] = s.totalDuePerMonth;
        companyPrincipalShares[s.companyId] = s.amount;
        companyInterestShares[s.companyId] = s.monthlyInterest;
        totalCycleAmount += s.totalDuePerMonth;
      });

      schedule.push({
        sNo: i,
        date: dateFormatted,
        dueDate: dateISO,
        particulars: `Month #${i} Revolving Cycle (Full Principal + Interest)`,
        principalAmount: totalLoanAmount,
        interestAmount: calculations.monthlyTotalInterest,
        totalAmount: totalCycleAmount,
        companyShares,
        companyPrincipalShares,
        companyInterestShares,
        status: 'Pending',
      });
    }

    return schedule;
  }, [calculations, tenureMonths, frequency, startDate, scheduleDates, totalLoanAmount]);

  // Final Step: Submit and Create Loan
  const handleCreateLoan = async () => {
    if (selectedCustomers.length === 0) {
      showToast('Validation Error', 'Please pick at least one Customer / Investor in Step 1.', 'warning');
      setCurrentStep(1);
      return;
    }
    if (selectedCompanyIds.length === 0) {
      showToast('Validation Error', 'Please select at least one Borrower Company in Step 3.', 'warning');
      setCurrentStep(3);
      return;
    }
    if (!isCompanySplitValid) {
      showToast('Validation Error', 'Company split must equal 100% of the loan amount.', 'warning');
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);

    const loanCustomerShares: LoanCustomerShare[] = selectedCustomers.map((sc) => ({
      customerId: sc.customer.id,
      customerName: sc.customer.fullName,
      sharePercentage: sc.percentage,
      shareAmount: Math.round((totalLoanAmount * (sc.percentage || 100)) / 100),
    }));

    const finalSplits: LoanCompanySplit[] =
      calculations.splits.length > 0
        ? calculations.splits
        : selectedCompanyIds.map((cId) => {
            const comp = companies.find((c) => c.id === cId);
            const split = companySplits[cId] || { percentage: 100, amount: totalLoanAmount };
            const rate = split.customRate ?? defaultInterestRate;
            const principal = split.amount;
            const oneMonthInterest = principal * (rate / 100) * (1 / 12);
            return {
              companyId: cId,
              companyName: comp?.companyName || 'Borrower Company',
              percentage: split.percentage,
              amount: principal,
              interestRate: rate,
              monthlyInterest: Math.round(oneMonthInterest),
              totalDuePerMonth: Math.round(principal + oneMonthInterest),
              monthlyEmi: Math.round(principal + oneMonthInterest),
            };
          });

    const totalInterestExpected = calculations.totalInterestExpected;
    const asrIncome = calculations.asrIncome;
    const customerNetProfit = calculations.customerNetProfit;

    const created = await createLoan({
      totalAmount: totalLoanAmount,
      disbursedDate: startDate,
      tenureMonths: tenureMonths || 1,
      frequency,
      defaultInterestRate,
      asrCommissionRate,
      customers: loanCustomerShares,
      companies: finalSplits,
      totalInterestExpected,
      asrIncome,
      customerNetProfit,
      status: 'Active',
      schedule: generatedSchedule,
    });

    setIsSubmitting(false);
    if (created) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E6E1D6] shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Wizard Header with Progress Steps */}
        <div className="px-6 py-4 border-b border-slate-100 bg-[#FAF8F5]">
          <div className="flex items-center justify-between pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Syndicate New Loan Deal
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Intermediary Capital Syndication: Investors ➔ ASR ➔ Borrower Companies
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 4-Step Segmented Wizard Navigation Bar */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[
              { num: 1, label: '1. Customers & Capital' },
              { num: 2, label: '2. Borrower Companies & Split' },
              { num: 3, label: '3. Rates & Months' },
              { num: 4, label: '4. Review & Schedule' },
            ].map((step) => {
              const isCompleted = currentStep > step.num;
              const isActive = currentStep === step.num;

              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => {
                    if (step.num < currentStep || isCompanySplitValid) {
                      setCurrentStep(step.num as any);
                    }
                  }}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold tracking-tight text-center transition-all flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-[#701A35] text-white shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-white text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted && <Check className="w-3 h-3 text-emerald-600" />}
                  <span className="truncate">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-5">
          {/* ================= STEP 1: Customer(s) & Capital Amount ================= */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-serif">
                  Step 1: Select Capital Provider(s) & Investment Amount
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Pick the customer investor(s) providing the capital and specify the total investment amount.
                </p>
              </div>

              {/* Autocomplete Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Type investor name, holding company, or phone..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#701A35] text-xs"
                />

                {/* Autocomplete Results Dropdown */}
                {customerSearchQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {matchingCustomers.length > 0 ? (
                      matchingCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full p-3 hover:bg-[#FAF8F5] transition-colors text-left flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">{c.fullName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {c.companyName ? `${c.companyName} · ` : ''}{c.phone} · {c.id}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 text-[11px] font-bold text-[#701A35] bg-[#701A35]/10 rounded-lg">
                            + Select
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center">
                        <p className="text-slate-500 text-xs">No matching customer found.</p>
                        <button
                          type="button"
                          onClick={() => setIsQuickAddCustomerOpen(true)}
                          className="mt-2 text-xs font-bold text-[#701A35] hover:underline"
                        >
                          + Add new customer '{customerSearchQuery}'
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Customers List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Participating Investors ({selectedCustomers.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddCustomerOpen(true)}
                    className="text-xs font-bold text-[#701A35] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Quick Create Customer</span>
                  </button>
                </div>

                {selectedCustomers.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">No investor selected yet.</p>
                    <p className="text-[11px]">Search an investor above or quick create a new customer account.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Single Customer Investment Amount Input */}
                    {selectedCustomers.length === 1 && (
                      <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E6E1D6] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-xs">
                            Investor: <span className="text-[#701A35]">{selectedCustomers[0].customer.fullName}</span> ({selectedCustomers[0].customer.id})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomer(selectedCustomers[0].customer.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1 text-xs">
                            Total Investment Capital Amount (₹ INR) <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-base font-bold text-[#701A35] font-mono">₹</span>
                            <input
                              type="number"
                              step="10000"
                              min="0"
                              placeholder="e.g. 20000000"
                              value={totalLoanAmount === 0 ? '' : totalLoanAmount}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const val = raw === '' ? 0 : parseFloat(raw) || 0;
                                setTotalLoanAmount(val);
                                setSelectedCustomers((prev) =>
                                  prev.map((sc) => ({ ...sc, amount: val, percentage: 100 }))
                                );
                                if (selectedCompanyIds.length > 0) {
                                  const nextSplits = { ...companySplits };
                                  Object.keys(nextSplits).forEach((cId) => {
                                    nextSplits[cId].amount = Math.round((val * nextSplits[cId].percentage) / 100);
                                  });
                                  setCompanySplits(nextSplits);
                                }
                              }}
                              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-sm bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#701A35]"
                            />
                          </div>
                        </div>

                        {/* Words helper */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono bg-white p-2 rounded-lg border border-slate-200">
                          <span>Amount in Format:</span>
                          <span className="font-bold text-[#701A35]">
                            ₹{totalLoanAmount.toLocaleString('en-IN')}
                            {totalLoanAmount >= 10000000 && ` (${(totalLoanAmount / 10000000).toFixed(2)} Crore)`}
                            {totalLoanAmount >= 100000 && totalLoanAmount < 10000000 && ` (${(totalLoanAmount / 100000).toFixed(2)} Lakhs)`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Multiple Customers List */}
                    {selectedCustomers.length > 1 && (
                      <div className="space-y-2">
                        {/* Overall Total Deal Amount Field */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-700 text-xs block">
                              Total Syndicate Capital Deal (₹)
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ₹{totalLoanAmount.toLocaleString('en-IN')}
                              {totalLoanAmount >= 10000000 && ` (${(totalLoanAmount / 10000000).toFixed(2)} Cr)`}
                              {totalLoanAmount >= 100000 && totalLoanAmount < 10000000 && ` (${(totalLoanAmount / 100000).toFixed(2)} L)`}
                            </span>
                          </div>
                          {customerSplitMode === 'percentage' && (
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 font-mono font-bold text-[#701A35] text-xs">₹</span>
                              <input
                                type="number"
                                step="10000"
                                min="0"
                                placeholder="0"
                                value={totalLoanAmount === 0 ? '' : totalLoanAmount}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const val = raw === '' ? 0 : parseFloat(raw) || 0;
                                  setTotalLoanAmount(val);
                                  setSelectedCustomers((prev) =>
                                    prev.map((sc) => ({
                                      ...sc,
                                      amount: Math.round((val * (sc.percentage || 100)) / 100),
                                    }))
                                  );
                                  if (selectedCompanyIds.length > 0) {
                                    const nextSplits = { ...companySplits };
                                    Object.keys(nextSplits).forEach((cId) => {
                                      nextSplits[cId].amount = Math.round((val * nextSplits[cId].percentage) / 100);
                                    });
                                    setCompanySplits(nextSplits);
                                  }
                                }}
                                className="w-40 pl-6 pr-3 py-1.5 rounded-xl border border-slate-300 font-mono font-bold text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#701A35]"
                              />
                            </div>
                          )}
                        </div>

                        {selectedCustomers.map((sc, idx) => (
                          <div
                            key={sc.customer.id}
                            className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D6] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{sc.customer.fullName}</span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                  {sc.customer.id}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                                {sc.customer.phone} · {sc.customer.companyName || 'Individual Investor'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              {customerSplitMode === 'percentage' ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.5"
                                      placeholder="0"
                                      value={sc.percentage === 0 ? '' : sc.percentage}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        handleUpdateCustomerPercentage(
                                          idx,
                                          raw === '' ? 0 : parseFloat(raw) || 0
                                        );
                                      }}
                                      className="w-16 px-2 py-1 rounded-lg border border-slate-300 font-mono font-bold text-xs bg-white text-right"
                                    />
                                    <span className="font-mono text-xs font-bold text-slate-500">%</span>
                                  </div>
                                  <span className="font-mono text-xs text-slate-600 min-w-[100px] text-right">
                                    ≈ ₹{sc.amount.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1 font-mono font-bold text-slate-400 text-xs">
                                      ₹
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="10000"
                                      placeholder="0"
                                      value={sc.amount === 0 ? '' : sc.amount}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        handleUpdateCustomerAmount(
                                          idx,
                                          raw === '' ? 0 : parseFloat(raw) || 0
                                        );
                                      }}
                                      className="w-32 pl-6 pr-2 py-1 rounded-lg border border-slate-300 font-mono font-bold text-xs bg-white text-right"
                                    />
                                  </div>
                                  <span className="font-mono text-[11px] text-slate-500 min-w-[50px]">
                                    ({sc.percentage}%)
                                  </span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomer(sc.customer.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 2: Companies & Split (Horizontal Stacked Bar) ================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-serif">
                    Step 2: Select Borrower Companies & Allocation Split
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    Select borrowing companies and define their share of ₹{totalLoanAmount.toLocaleString('en-IN')}.
                  </p>
                </div>

                {/* Split Mode Toggle & Actions */}
                <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                  {selectedCompanyIds.length > 1 && (
                    <button
                      type="button"
                      onClick={handleAutoBalanceSplits}
                      className="px-2.5 py-1.5 text-xs font-bold text-[#701A35] bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                      title="Evenly distribute 100% across selected companies"
                    >
                      <span>⚡ Auto-Balance 100%</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsQuickAddCompanyOpen(true)}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#701A35]" />
                    <span>+ Onboard Company</span>
                  </button>

                  <div className="flex items-center bg-[#FAF8F5] p-1 rounded-xl border border-[#E6E1D6]">
                    <button
                      type="button"
                      onClick={() => setSplitMode('percentage')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        splitMode === 'percentage'
                          ? 'bg-[#701A35] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      % Percentage Split
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitMode('manual')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        splitMode === 'manual'
                          ? 'bg-[#701A35] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ₹ Manual Amount
                    </button>
                  </div>
                </div>
              </div>

              {/* Stacked Split Progress Bar */}
              {selectedCompanyIds.length > 0 && (
                <div className="space-y-1.5 p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E6E1D6]">
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-slate-700 font-sans">
                      Principal Allocation Progress (₹{totalLoanAmount.toLocaleString('en-IN')})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        isCompanySplitValid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {splitMode === 'percentage'
                        ? `${totalAllocatedPercentage}% / 100%`
                        : `₹${totalAllocatedAmount.toLocaleString('en-IN')} / ₹${totalLoanAmount.toLocaleString('en-IN')}`}
                    </span>
                  </div>

                  <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                    {selectedCompanyIds.map((cId, idx) => {
                      const split = companySplits[cId];
                      const comp = companies.find((c) => c.id === cId);
                      if (!split || split.percentage <= 0) return null;
                      const color = COMPANY_COLORS[idx % COMPANY_COLORS.length];

                      return (
                        <div
                          key={cId}
                          style={{
                            width: `${Math.min(split.percentage, 100)}%`,
                            backgroundColor: color,
                          }}
                          className="h-full transition-all duration-300 relative group cursor-pointer"
                          title={`${comp?.companyName}: ${split.percentage}% (₹${split.amount.toLocaleString('en-IN')})`}
                        />
                      );
                    })}
                  </div>

                  {/* Micro Legend Chips */}
                  <div className="flex items-center gap-3 flex-wrap pt-1 text-[11px]">
                    {selectedCompanyIds.map((cId, idx) => {
                      const split = companySplits[cId];
                      const comp = companies.find((c) => c.id === cId);
                      const color = COMPANY_COLORS[idx % COMPANY_COLORS.length];
                      if (!split) return null;

                      return (
                        <div key={cId} className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-bold text-slate-800">{comp?.companyName}</span>
                          <span className="font-mono text-slate-500">
                            ({split.percentage}% · ₹{split.amount.toLocaleString('en-IN')})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Companies Selection Grid */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Select Borrower Companies ({selectedCompanyIds.length} Selected)
                </span>

                {companies.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">No borrowing companies available.</p>
                    <p className="text-[11px]">Click '+ Onboard Company' above to register the first borrower.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {companies.map((c) => {
                      const isSelected = selectedCompanyIds.includes(c.id);
                      const split = companySplits[c.id];

                      return (
                        <div
                          key={c.id}
                          onClick={() => handleToggleCompany(c)}
                          className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-white border-[#701A35] shadow-xs'
                              : 'bg-[#FAF8F5] border-[#E6E1D6] hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCompany(c)}
                              className="rounded border-slate-300 text-[#701A35] focus:ring-[#701A35] cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-slate-900 block">{c.companyName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Contact: {c.contactPerson} ({c.phone}) · Area: {c.area || 'General'}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="flex items-center gap-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                              {splitMode === 'percentage' ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    placeholder="0"
                                    value={split?.percentage === 0 ? '' : (split?.percentage ?? '')}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      handleUpdateSplitPercentage(c.id, raw === '' ? 0 : parseFloat(raw) || 0);
                                    }}
                                    className="w-16 px-2 py-1 rounded-lg border border-slate-300 font-mono font-bold text-xs bg-white text-right"
                                  />
                                  <span className="font-mono text-slate-500">%</span>
                                  <span className="font-mono text-slate-700 font-bold ml-2">
                                    ₹{split?.amount?.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-slate-400">₹</span>
                                  <input
                                    type="number"
                                    step="10000"
                                    min="0"
                                    placeholder="0"
                                    value={split?.amount === 0 ? '' : (split?.amount ?? '')}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      handleUpdateSplitAmount(c.id, raw === '' ? 0 : parseFloat(raw) || 0);
                                    }}
                                    className="w-28 px-2 py-1 rounded-lg border border-slate-300 font-mono font-bold text-xs bg-white text-right"
                                  />
                                  <span className="font-mono text-slate-500 text-[11px] ml-1">
                                    ({split?.percentage}%)
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 3: Interest & Terms ================= */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-serif">
                  Step 3: Interest Rates, Number of Months & ASR Income Cut
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Configure revolving monthly credit cycles. In each cycle, companies repay the full principal + monthly interest.
                </p>
              </div>

              {/* Credit Card / Revolving Model Explanation Banner */}
              <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-slate-900">Revolving Settlement Model (Credit Card Style):</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Unlike amortized EMI splits, the customer supplies the full principal of <strong>₹{totalLoanAmount.toLocaleString('en-IN')}</strong> to the companies, and the companies settle the full principal plus interest on the scheduled date each month. Both parties share the exact same cycle dates.
                  </p>
                </div>
              </div>

              {/* Terms Parameters Form */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#FAF8F5] p-5 rounded-2xl border border-[#E6E1D6]">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    Borrowing Interest Rate (% p.a.)
                  </label>
                  <div className="relative">
                    <Percent className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="0"
                      value={defaultInterestRate === 0 ? '' : defaultInterestRate}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setDefaultInterestRate(raw === '' ? 0 : parseFloat(raw) || 0);
                      }}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-xs bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    ({(defaultInterestRate / 12).toFixed(2)}% interest per month)
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    ASR Platform Cut (% p.a.)
                  </label>
                  <div className="relative">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={defaultInterestRate}
                      placeholder="0"
                      value={asrCommissionRate === 0 ? '' : asrCommissionRate}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setAsrCommissionRate(raw === '' ? 0 : parseFloat(raw) || 0);
                      }}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-xs bg-white text-[#701A35]"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Net Investor Yield: {(defaultInterestRate - asrCommissionRate).toFixed(1)}% p.a.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    Number of Months (Cycles)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      placeholder="e.g. 3"
                      value={tenureMonths === 0 ? '' : tenureMonths}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setTenureMonths(raw === '' ? 0 : parseInt(raw) || 0);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-xs bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {tenureMonths} monthly settlement cycle(s)
                  </span>
                </div>
              </div>

              {/* 3 Plain Numbers Live Calculation Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                    Monthly Interest per Cycle
                  </span>
                  <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
                    ₹{calculations.monthlyTotalInterest.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Total ₹{calculations.totalInterestExpected.toLocaleString('en-IN')} over {tenureMonths} months
                  </span>
                </div>

                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 font-mono block">
                    ASR Income (Commission)
                  </span>
                  <span className="text-xl font-bold text-[#701A35] font-mono block mt-1">
                    ₹{calculations.asrIncome.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-amber-700 mt-0.5 block">
                    (₹{Math.round(calculations.asrIncome / (tenureMonths || 1)).toLocaleString('en-IN')} / month)
                  </span>
                </div>

                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 font-mono block">
                    Net Profit to Customer(s)
                  </span>
                  <span className="text-xl font-bold text-emerald-700 font-mono block mt-1">
                    ₹{calculations.customerNetProfit.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-emerald-600 mt-0.5 block">
                    (₹{Math.round(calculations.customerNetProfit / (tenureMonths || 1)).toLocaleString('en-IN')} / month)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: Review & Real Spreadsheet Repayment Schedule ================= */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-serif">
                    Step 4: Review Schedule & Edit Cycle Dates
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    You can edit the date for any month directly below if a company delays payment or agrees on a custom date.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-[#701A35] text-white self-start">
                  ₹{totalLoanAmount.toLocaleString('en-IN')} · {tenureMonths} Months
                </span>
              </div>

              {/* Exact Spreadsheet Table Format with Editable Dates */}
              <div className="border border-[#E6E1D6] rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="sticky top-0 bg-[#FAF8F5] border-b border-[#E6E1D6] text-[11px] font-mono text-slate-600 z-10">
                      <tr>
                        <th className="p-2.5 border-r border-[#E6E1D6] w-12 text-center">Cycle #</th>
                        <th className="p-2.5 border-r border-[#E6E1D6] w-40">Scheduled Date (Edit)</th>
                        <th className="p-2.5 border-r border-[#E6E1D6]">Particulars</th>
                        <th className="p-2.5 border-r border-[#E6E1D6] text-right font-mono">Principal (₹)</th>
                        <th className="p-2.5 border-r border-[#E6E1D6] text-right font-mono">Interest (₹)</th>
                        <th className="p-2.5 border-r border-[#E6E1D6] text-right font-bold text-slate-900 bg-[#FAF8F5]/80">
                          Total Repayment (₹)
                        </th>
                        {calculations.splits.map((s) => (
                          <th key={s.companyId} className="p-2.5 border-r border-[#E6E1D6] text-right font-mono">
                            {s.companyName} (Due)
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {generatedSchedule.map((row) => (
                        <tr key={row.sNo} className="hover:bg-[#FAF8F5]/60 transition-colors">
                          <td className="p-2.5 border-r border-[#E6E1D6] text-center text-slate-500 font-bold">
                            #{row.sNo}
                          </td>
                          <td className="p-2.5 border-r border-[#E6E1D6]">
                            <input
                              type="date"
                              value={row.dueDate || ''}
                              onChange={(e) =>
                                setScheduleDates((prev) => ({
                                  ...prev,
                                  [row.sNo]: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 rounded border border-slate-300 font-mono text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#701A35]"
                            />
                          </td>
                          <td className="p-2.5 border-r border-[#E6E1D6] text-slate-700 font-sans">
                            {row.particulars}
                          </td>
                          <td className="p-2.5 border-r border-[#E6E1D6] text-right text-slate-700">
                            ₹{row.principalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 border-r border-[#E6E1D6] text-right text-[#701A35] font-bold">
                            ₹{row.interestAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 border-r border-[#E6E1D6] text-right font-bold text-slate-900 bg-[#FAF8F5]/40">
                            ₹{row.totalAmount.toLocaleString('en-IN')}
                          </td>
                          {calculations.splits.map((s) => (
                            <td key={s.companyId} className="p-2.5 border-r border-[#E6E1D6] text-right text-slate-700">
                              ₹{(row.companyShares[s.companyId] || 0).toLocaleString('en-IN')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    {/* Bold Totals Footer Row */}
                    <tfoot className="bg-[#FAF8F5] border-t-2 border-[#701A35] font-mono font-bold text-slate-900 text-xs">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right uppercase tracking-wider font-sans border-r border-[#E6E1D6]">
                          Per Cycle Settlement Total:
                        </td>
                        <td className="p-2.5 text-right border-r border-[#E6E1D6]">
                          ₹{totalLoanAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right border-r border-[#E6E1D6] text-[#701A35]">
                          ₹{calculations.monthlyTotalInterest.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right border-r border-[#E6E1D6] text-[#701A35]">
                          ₹{(totalLoanAmount + calculations.monthlyTotalInterest).toLocaleString('en-IN')}
                        </td>
                        {calculations.splits.map((s) => (
                          <td key={s.companyId} className="p-2.5 text-right border-r border-[#E6E1D6]">
                            ₹{s.totalDuePerMonth.toLocaleString('en-IN')}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 bg-[#FAF8F5] flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-30 flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1) {
                    if (selectedCustomers.length === 0) {
                      showToast('Validation', 'Select at least one customer investor.', 'warning');
                      return;
                    }
                    if (totalLoanAmount <= 0) {
                      showToast('Validation', 'Please enter a valid investment capital amount.', 'warning');
                      return;
                    }
                    if (!isCustomerSplitValid) {
                      showToast(
                        'Validation',
                        'Customer capital split must balance to 100% (or total loan amount). Click Auto-Balance to balance equally.',
                        'warning'
                      );
                      return;
                    }
                  }
                  if (currentStep === 2 && (!isCompanySplitValid || selectedCompanyIds.length === 0)) {
                    showToast('Validation', 'Company allocation split must equal 100%.', 'warning');
                    return;
                  }
                  setCurrentStep((prev) => (prev + 1) as any);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreateLoan}
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] disabled:opacity-50 flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>{isSubmitting ? 'Syndicating Deal...' : 'Confirm & Disburse Loan'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      <AddCustomerModal
        isOpen={isQuickAddCustomerOpen}
        onClose={() => setIsQuickAddCustomerOpen(false)}
        initialName={customerSearchQuery}
        onSuccess={(created) => handleSelectCustomer(created)}
      />

      {/* Quick Onboard Company Modal */}
      <AddCompanyModal
        isOpen={isQuickAddCompanyOpen}
        onClose={() => setIsQuickAddCompanyOpen(false)}
      />
    </div>
  );
};
