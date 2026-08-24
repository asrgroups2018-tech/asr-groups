'use client';

import React, { useState } from 'react';
import { ChangeType, RoleId } from '@/lib/types';
import { useApp } from '@/lib/store';
import { X, PlusCircle, ShieldCheck } from 'lucide-react';
import { RoleBadge } from '@/components/common/RoleBadge';

interface AddApprovalRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddApprovalRuleModal: React.FC<AddApprovalRuleModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { roles, addApprovalRule } = useApp();

  const [changeType, setChangeType] = useState<ChangeType>('Loan Update');
  const [description, setDescription] = useState('');
  const [whoCanRaise, setWhoCanRaise] = useState<RoleId[]>([2, 3]);
  const [whoMustApprove, setWhoMustApprove] = useState<RoleId>(1);
  const [amountThreshold, setAmountThreshold] = useState<number>(25000);
  const [autoApproveBelow, setAutoApproveBelow] = useState(true);
  const [isActive, setIsActive] = useState(true);

  if (!isOpen) return null;

  const toggleRaiseRole = (rId: RoleId) => {
    if (whoCanRaise.includes(rId)) {
      if (whoCanRaise.length === 1) return;
      setWhoCanRaise(whoCanRaise.filter((id) => id !== rId));
    } else {
      setWhoCanRaise([...whoCanRaise, rId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addApprovalRule({
      changeType,
      description: description || `Standard workflow control for ${changeType}`,
      whoCanRaise,
      whoMustApprove,
      amountThreshold: Number(amountThreshold) || 0,
      autoApproveBelow,
      isActive,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#1A0A13] text-white px-6 py-4 flex items-center justify-between border-b border-[#2C1420]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] text-[#701A35] border border-[#E6E1D6] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#EED8A1] font-serif">Add Financial Approval Rule</h3>
              <p className="text-xs text-[#C5A059]/80">Configure threshold-based multi-tier authorization</p>
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
              Change / Transaction Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={changeType}
              onChange={(e) => setChangeType(e.target.value as ChangeType)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
            >
              <option value="Loan Update">Loan Update (Principal / Interest / Tenure)</option>
              <option value="Collection Correction">Collection Correction (Receipt edit / reversal)</option>
              <option value="Expense Edit">Expense Edit (Voucher / Branch Expense)</option>
              <option value="Salary Change">Salary Change (Base pay / Special allowance)</option>
              <option value="Customer Update">Customer Update (KYC / Bank details)</option>
              <option value="Role Change">Role Change (Elevated permissions)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Rule Description / Justification
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Requires branch manager sign-off for expenses above threshold"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Who Can Initiate / Raise This Request?
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
              {roles.map((r) => {
                const isSelected = whoCanRaise.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRaiseRole(r.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>Role {r.id} · {r.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Minimum Approver Role Level <span className="text-rose-500">*</span>
              </label>
              <select
                value={whoMustApprove}
                onChange={(e) => setWhoMustApprove(Number(e.target.value) as RoleId)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
              >
                {roles
                  .filter((r) => r.id <= 3) // Only managers and above
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      Role {r.id} · {r.name} (and higher)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Monetary Threshold (₹ INR)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={amountThreshold}
                onChange={(e) => setAmountThreshold(Number(e.target.value))}
                placeholder="0 for non-monetary rules"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Auto-Approve Below Threshold
                </span>
                <p className="text-[11px] text-slate-500">
                  Requests below ₹{amountThreshold.toLocaleString('en-IN')} will auto-pass without manual queue
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoApproveBelow}
                onChange={(e) => setAutoApproveBelow(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800">Rule Active</span>
                <p className="text-[11px] text-slate-500">Enable this rule immediately upon creation</p>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </label>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
              <PlusCircle className="w-3.5 h-3.5 text-amber-200" />
              <span>Save Rule</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
