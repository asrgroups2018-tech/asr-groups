'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { Users, X, Phone, MapPin } from 'lucide-react';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  onSuccess?: (createdCustomer: any) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  initialName = '',
  onSuccess,
}) => {
  const { createCustomer, showToast } = useApp();

  const [name, setName] = useState(initialName);
  const [place, setPlace] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Validation Error', 'Customer Name is required.', 'warning');
      return;
    }

    setIsSubmitting(true);
    const created = await createCustomer({
      name: name.trim(),
      place: place.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    setIsSubmitting(false);

    if (created) {
      if (onSuccess) onSuccess(created);
      onClose();
      setName('');
      setPlace('');
      setPhone('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E6E1D6] shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#701A35]/10 border border-[#701A35]/20 text-[#701A35] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Register Customer (Borrower)
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Borrower / Client Entity
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
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Customer / Client Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. ABI ASSOCIATES or K. RAJAN"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#701A35]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Place / City (Optional)
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="e.g. COIMBATORE, TIRUPUR, CHENNAI"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#701A35]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Phone Number (Optional)
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="+91 98400 99887"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#701A35] font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Registering...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
