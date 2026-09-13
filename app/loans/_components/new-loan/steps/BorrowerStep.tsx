'use client';

import React, { useState } from 'react';
import { Users, IndianRupee, Check } from 'lucide-react';
import { Customer } from '@/lib/types';

interface BorrowerStepProps {
  customers: Customer[];
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  customerSearch: string;
  setCustomerSearch: (search: string) => void;
  isCreatingNewCustomer: boolean;
  setIsCreatingNewCustomer: (creating: boolean) => void;
  newCustomerName: string;
  setNewCustomerName: (name: string) => void;
  newCustomerPlace: string;
  setNewCustomerPlace: (place: string) => void;
  newCustomerCodeNo: string;
  setNewCustomerCodeNo: (code: string) => void;
  totalAmount: number;
  setTotalAmount: (amount: number) => void;
}

export const BorrowerStep: React.FC<BorrowerStepProps> = ({
  customers,
  selectedCustomerId,
  setSelectedCustomerId,
  customerSearch,
  setCustomerSearch,
  isCreatingNewCustomer,
  setIsCreatingNewCustomer,
  newCustomerName,
  setNewCustomerName,
  newCustomerPlace,
  setNewCustomerPlace,
  newCustomerCodeNo,
  setNewCustomerCodeNo,
  totalAmount,
  setTotalAmount,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const filteredCustomers = customers.filter(
    (c) =>
      !customerSearch.trim() ||
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.place && c.place.toLowerCase().includes(customerSearch.toLowerCase())) ||
      (c.codeNo && c.codeNo.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Borrower Selection / Registration */}
      <div className="bg-[#240F1D] p-5 rounded-xl border border-[#3D1A2C] space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-[#EED8A1] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#C5A059]" /> Borrower Name
          </label>
          <button
            type="button"
            onClick={() => {
              setIsCreatingNewCustomer(!isCreatingNewCustomer);
              setSelectedCustomerId('');
              setCustomerSearch('');
              setIsDropdownOpen(false);
            }}
            className="text-xs text-[#C5A059] hover:underline font-mono cursor-pointer"
          >
            {isCreatingNewCustomer ? 'Choose Existing Borrower' : '+ Register New Borrower'}
          </button>
        </div>

        {!isCreatingNewCustomer ? (
          <div className="space-y-2 relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search or select borrower name (e.g. ABI ASSOCIATES)..."
                value={customerSearch}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setSelectedCustomerId('');
                  setIsDropdownOpen(true);
                }}
                className={`w-full bg-[#160810] border rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden transition-colors ${
                  selectedCustomerId
                    ? 'border-[#C5A059] bg-[#C5A059]/10 font-semibold text-[#EED8A1]'
                    : 'border-[#3D1A2C] focus:border-[#C5A059]'
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {selectedCustomerId && (
                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" /> Selected
                  </span>
                )}
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearch('');
                      setSelectedCustomerId('');
                      setIsDropdownOpen(true);
                    }}
                    className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded cursor-pointer"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Quick dropdown matching */}
            {isDropdownOpen && !selectedCustomerId && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-[#3D1A2C] bg-[#160810] divide-y divide-[#2C1420] shadow-2xl z-20">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.slice(0, 10).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustomerSearch(c.name);
                        setIsDropdownOpen(false);
                      }}
                      className="p-3 text-xs flex items-center justify-between cursor-pointer transition-colors hover:bg-[#C5A059]/20 hover:text-[#EED8A1] text-slate-300"
                    >
                      <div>
                        <span className="font-bold">{c.name}</span>
                        {c.place && <span className="text-slate-500 ml-2">({c.place})</span>}
                        {c.codeNo && <span className="text-slate-600 font-mono ml-2">[{c.codeNo}]</span>}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Select ↵</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-slate-500 text-center">
                    No borrower found matching &ldquo;{customerSearch}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#160810] border border-[#3D1A2C] rounded-lg">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Borrower Client Name *</label>
              <input
                type="text"
                placeholder="e.g. ABI ASSOCIATES"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="w-full bg-[#240F1D] border border-[#3D1A2C] rounded-md px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#C5A059]"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Place / City</label>
              <input
                type="text"
                placeholder="e.g. CHENNAI, CBE, TIRUPUR"
                value={newCustomerPlace}
                onChange={(e) => setNewCustomerPlace(e.target.value)}
                className="w-full bg-[#240F1D] border border-[#3D1A2C] rounded-md px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#C5A059]"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Code No</label>
              <input
                type="text"
                placeholder="e.g. 101, A-12"
                value={newCustomerCodeNo}
                onChange={(e) => setNewCustomerCodeNo(e.target.value)}
                className="w-full bg-[#240F1D] border border-[#3D1A2C] rounded-md px-3 py-1.5 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-hidden focus:border-[#C5A059]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Total Loan Capital Amount for the Loan — Only shown when choosing existing borrower */}
      {!isCreatingNewCustomer && (
        <div className="bg-[#240F1D] p-5 rounded-xl border border-[#3D1A2C] space-y-3">
          <label className="text-sm font-semibold text-[#EED8A1] flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-[#C5A059]" /> Total Loan Capital Amount (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C5A059] font-bold text-lg">₹</span>
            <input
              type="number"
              min="1000"
              step="1000"
              value={totalAmount || ''}
              onChange={(e) => setTotalAmount(e.target.value === '' ? 0 : Number(e.target.value))}
              className="w-full bg-[#160810] border border-[#3D1A2C] rounded-lg pl-8 pr-4 py-3 text-lg font-mono font-bold text-[#EED8A1] focus:outline-hidden focus:border-[#C5A059] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="Enter loan amount (e.g. 1000000)"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
            <span>Common presets:</span>
            {[500000, 1000000, 2000000, 5000000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setTotalAmount(val)}
                className="px-2.5 py-1 bg-[#160810] hover:bg-[#C5A059]/20 hover:text-[#EED8A1] border border-[#3D1A2C] rounded-md font-mono text-[11px] cursor-pointer transition-colors"
              >
                ₹{(val / 100000).toFixed(0)} Lakh
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
