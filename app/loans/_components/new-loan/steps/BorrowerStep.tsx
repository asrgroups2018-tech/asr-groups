'use client';

import React from 'react';
import { Users, IndianRupee } from 'lucide-react';
import { Customer } from '@/lib/types';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';

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
  newCustomerPhone: string;
  setNewCustomerPhone: (phone: string) => void;
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
  newCustomerPhone,
  setNewCustomerPhone,
  totalAmount,
  setTotalAmount,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-[#240F1D] p-5 rounded-xl border border-[#3D1A2C] space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-[#EED8A1] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#C5A059]" /> Borrower Name
          </label>
          <button
            type="button"
            onClick={() => setIsCreatingNewCustomer(!isCreatingNewCustomer)}
            className="text-xs text-[#C5A059] hover:underline flex items-center gap-1"
          >
            {isCreatingNewCustomer ? 'Select Existing Client' : 'New Borrower'}
          </button>
        </div>

        {!isCreatingNewCustomer ? (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search borrower by name or place..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full bg-[#160810] border border-[#3D1A2C] rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#C5A059]"
            />

            <div className="max-h-40 overflow-y-auto border border-[#3D1A2C] rounded-lg divide-y divide-[#2C1420] bg-[#160810]">
              {customers
                .filter(
                  (c) =>
                    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                    c.place.toLowerCase().includes(customerSearch.toLowerCase())
                )
                .slice(0, 8)
                .map((c) => {
                  const isSelected = selectedCustomerId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustomerSearch(c.name);
                      }}
                      className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#C5A059]/20 text-[#EED8A1] font-semibold' : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <div>
                        <span className="font-bold">{c.name}</span>
                        <span className="text-slate-500 ml-2">({c.place})</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{c.phone}</span>
                    </div>
                  );
                })}
            </div>
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
                className="w-full bg-[#240F1D] border border-[#3D1A2C] rounded-md px-3 py-1.5 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Place / City</label>
              <input
                type="text"
                placeholder="e.g. CHENNAI"
                value={newCustomerPlace}
                onChange={(e) => setNewCustomerPlace(e.target.value)}
                className="w-full bg-[#240F1D] border border-[#3D1A2C] rounded-md px-3 py-1.5 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Contact Phone</label>
              <input
                type="text"
                placeholder="+91 98400..."
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                className="w-full bg-[#240F1D] border border-[#3D1A2C] rounded-md px-3 py-1.5 text-xs text-slate-100"
              />
            </div>
          </div>
        )}
      </div>

      {/* Total Loan Capital Amount */}
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
            onChange={(e) => setTotalAmount(Number(e.target.value))}
            className="w-full bg-[#160810] border border-[#3D1A2C] rounded-lg pl-8 pr-4 py-3 text-lg font-mono font-bold text-[#EED8A1] focus:outline-hidden focus:border-[#C5A059]"
            placeholder="1000000"
          />
        </div>
        {totalAmount > 0 && (
          <p className="text-xs text-[#EED8A1] font-medium font-sans">
            {numberToWordsINR(totalAmount)}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Common presets:</span>
          {[500000, 1000000, 2000000, 5000000].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setTotalAmount(val)}
              className="px-2.5 py-1 bg-[#160810] hover:bg-[#C5A059]/20 hover:text-[#EED8A1] border border-[#3D1A2C] rounded-md font-mono text-[11px]"
            >
              ₹{(val / 100000).toFixed(0)} Lakh
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
