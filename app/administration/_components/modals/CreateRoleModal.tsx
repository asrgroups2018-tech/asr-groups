'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { X, ShieldPlus } from 'lucide-react';

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showToast } = useApp();

  const [roleName, setRoleName] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    showToast(
      'Custom Role Created',
      `Role "${roleName}" has been defined and registered in the permission matrix.`,
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E6E1D6] shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#1A0A13] text-white px-6 py-4 flex items-center justify-between border-b border-[#2C1420]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] text-[#701A35] border border-[#E6E1D6] flex items-center justify-center">
              <ShieldPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#EED8A1] font-serif">Create Custom Role</h3>
              <p className="text-xs text-[#C5A059]/80">Define a new operational or supervisory tier</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Role Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Senior Auditor, Credit Evaluator"
              value={roleName}
              onChange={(e) => {
                setRoleName(e.target.value);
                if (!roleCode) {
                  setRoleCode(
                    'ROLE_' +
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, '_')
                        .slice(0, 20)
                  );
                }
              }}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35] text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              System Identifier Code
            </label>
            <input
              type="text"
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
              placeholder="e.g. ROLE_AUDITOR"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35] text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Role Description & Scope
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe access privileges, operational domain, and reportees"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35] text-slate-900"
            />
          </div>

          <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E6E1D6] text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Permission Matrix Integration</p>
            <p className="text-[11px] text-slate-500">
              Custom roles inherit standard base view privileges and can be fine-tuned directly in the <strong>Permission Matrix</strong> tab.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <ShieldPlus className="w-3.5 h-3.5 text-amber-200" />
              <span>Create Role</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
