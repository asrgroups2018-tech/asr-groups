'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { Landmark, X, User, IndianRupee, CalendarDays, Search, Check } from 'lucide-react';
import { DatePicker, toIsoDate } from '@/components/ui/DatePicker';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';

interface AddChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (cheque: any) => void;
}

export const AddChequeModal: React.FC<AddChequeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { customers, createCheque, showToast } = useApp();

  const [chequeNumber, setChequeNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [depositDate, setDepositDate] = useState<string>(toIsoDate(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autocomplete state
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter customers for autocomplete
  const filteredCustomers = useMemo(() => {
    if (!customerName.trim()) {
      return (customers || []).slice(0, 8);
    }
    const q = customerName.toLowerCase().trim();
    return (customers || [])
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.codeNo && c.codeNo.toLowerCase().includes(q)) ||
          (c.place && c.place.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [customers, customerName]);

  // Click outside listener for autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amount) || 0;

  const handleSelectCustomer = (cust: { id: string; name: string }) => {
    setCustomerName(cust.name);
    setSelectedCustomerId(cust.id);
    setShowDropdown(false);
  };

  const handleCustomerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerName(val);
    setSelectedCustomerId(null);
    setShowDropdown(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanChequeNo = chequeNumber.trim();
    const cleanCustName = customerName.trim();

    if (!cleanChequeNo) {
      showToast('Validation Error', 'Cheque Number is required.', 'warning');
      return;
    }
    if (!cleanCustName) {
      showToast('Validation Error', 'Customer Name is required.', 'warning');
      return;
    }
    if (parsedAmount <= 0) {
      showToast('Validation Error', 'Please enter a valid cheque amount greater than ₹0.', 'warning');
      return;
    }
    if (!depositDate) {
      showToast('Validation Error', 'Deposit Date is required.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createCheque({
        chequeNumber: cleanChequeNo,
        customerId: selectedCustomerId,
        customerName: cleanCustName,
        amount: parsedAmount,
        depositDate,
      });

      if (created) {
        if (onSuccess) onSuccess(created);
        onClose();
        // Reset form
        setChequeNumber('');
        setCustomerName('');
        setSelectedCustomerId(null);
        setAmount('');
        setDepositDate(toIsoDate(new Date()));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E6E1D6] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col motion-modal">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#701A35]/10 border border-[#701A35]/20 text-[#701A35] flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Log Customer Cheque
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Physical cheque received · Pending bank deposit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Cheque Number */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Cheque Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. 402918 or CHQ-8921"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#701A35]/20 focus:border-[#701A35] font-mono text-sm uppercase tracking-wider font-semibold text-slate-900 placeholder:normal-case placeholder:font-normal"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Enter the 6-digit cheque number or instrument identifier
            </span>
          </div>

          {/* Customer Name Autocomplete */}
          <div className="relative">
            <label className="block font-bold text-slate-700 mb-1">
              Customer Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search or enter customer name (e.g. ABI ASSOCIATES)..."
                value={customerName}
                onChange={handleCustomerInputChange}
                onFocus={() => setShowDropdown(true)}
                required
                autoComplete="off"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#701A35]/20 focus:border-[#701A35] text-xs font-medium text-slate-900"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && (
              <div
                ref={dropdownRef}
                className="absolute z-20 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Customer Directory Lookup</span>
                  <span className="font-normal lowercase">read-only</span>
                </div>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => {
                    const isSelected = selectedCustomerId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className={`w-full px-3 py-2 text-left text-xs hover:bg-[#FAF8F5] flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-[#701A35]/5 font-bold text-[#701A35]' : 'text-slate-700'
                        }`}
                      >
                        <div className="truncate">
                          <span className="font-bold">{c.name}</span>
                          {c.place && (
                            <span className="text-[10px] text-slate-400 ml-2 font-normal">
                              ({c.place})
                            </span>
                          )}
                        </div>
                        {c.codeNo && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                            #{c.codeNo}
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-3 text-slate-400 text-center text-[11px]">
                    No matching customer in directory. Custom name will be used.
                  </div>
                )}
              </div>
            )}
            <span className="text-[10px] text-slate-400 mt-1 block">
              Read-only directory lookup. Type custom name or pick from existing borrowers.
            </span>
          </div>

          {/* Amount & Date to Deposit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Amount */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="e.g. 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#701A35]/20 focus:border-[#701A35] font-mono font-bold text-slate-900"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
              </div>
              {parsedAmount > 0 && (
                <span className="text-[10px] text-emerald-700 font-medium block mt-1 line-clamp-1 italic">
                  {numberToWordsINR(parsedAmount)}
                </span>
              )}
            </div>

            {/* Date to Deposit */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Date to Deposit <span className="text-rose-500">*</span>
              </label>
              <DatePicker
                value={depositDate}
                onChange={(d) => setDepositDate(d)}
                placeholder="Select planned deposit date"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Planned bank presentation date
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#701A35] text-white hover:bg-[#852040] font-bold cursor-pointer transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Landmark className="w-4 h-4" />
              <span>{isSubmitting ? 'Logging Cheque...' : 'Log Cheque Deposit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
