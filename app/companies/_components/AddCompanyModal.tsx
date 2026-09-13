'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { Building2, X } from 'lucide-react';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({ isOpen, onClose }) => {
  const { createCompany, showToast } = useApp();

  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [isOutsideParty, setIsOutsideParty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !shortCode.trim()) {
      showToast('Validation Error', 'Company Name and Short Code are required.', 'warning');
      return;
    }

    setIsSubmitting(true);
    const created = await createCompany({
      name: name.trim(),
      shortCode: shortCode.trim().toUpperCase(),
      isOutsideParty,
    });
    setIsSubmitting(false);

    if (created) {
      onClose();
      setName('');
      setShortCode('');
      setIsOutsideParty(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E6E1D6] shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#701A35]/10 border border-[#701A35]/20 text-[#701A35] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Add Funding Company
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Register a funding or deposit entity
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Company Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. PASS TRADERS or BHAVANA ENTERPRISES"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#701A35]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Short Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. PASS, TATVA, MC"
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value.toUpperCase())}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#701A35] font-mono uppercase"
            />
          </div>

          <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D6] space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isOutsideParty}
                onChange={(e) => setIsOutsideParty(e.target.checked)}
                className="w-4 h-4 text-[#701A35] rounded border-slate-300 focus:ring-[#701A35]"
              />
              <span className="font-bold text-slate-800 text-xs">Outside-Party Company</span>
            </label>
            <p className="text-[11px] text-slate-500">
              Check this if this entity is an external syndicate/funder (e.g. CS, MC, TA, TATVA) rather than ASR Group's own internal company.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
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
              {isSubmitting ? 'Adding...' : 'Add Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
