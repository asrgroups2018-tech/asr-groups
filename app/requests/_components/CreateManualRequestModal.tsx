'use client';

import React, { useState } from 'react';
import { ChangeType, RoleId } from '@/lib/types';
import { useApp } from '@/lib/store';
import { X, PlusCircle, ShieldCheck } from 'lucide-react';
import { evaluateApprovalAction } from '@/lib/utils/approvalRouting';

interface CreateManualRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateManualRequestModal: React.FC<CreateManualRequestModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentActor, approvalRules, createApprovalRequest } = useApp();

  const [changeType, setChangeType] = useState<ChangeType>('Loan Update');
  const [title, setTitle] = useState('');
  const [entityId, setEntityId] = useState('');
  const [amount, setAmount] = useState<number>(100000);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const evaluation = evaluateApprovalAction(
      changeType,
      Number(amount) || 0,
      currentActor.primaryRoleId,
      approvalRules
    );

    const status = evaluation.action === 'AUTO_APPROVE_QUEUE' ? 'Auto-Approved' : 'Pending';

    await createApprovalRequest({
      ruleId: evaluation.rule?.id,
      changeType,
      title: title || `${changeType}: ${entityId || 'Manual Request'}`,
      description,
      entityType: changeType.startsWith('Loan') ? 'loan' : changeType.includes('Customer') ? 'customer' : 'user',
      entityId: entityId || 'MANUAL-ENTRY',
      requesterId: currentActor.id,
      requesterName: currentActor.name,
      requesterRoleId: currentActor.primaryRoleId,
      approverRoleId: evaluation.approverRoleId,
      amount: Number(amount) || 0,
      status,
      beforePayload: { note: 'Manual submission without prior snapshot' },
      proposedPayload: {
        changeType,
        targetEntity: entityId,
        requestedAmount: Number(amount) || 0,
        notes: description,
      },
    });

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden motion-modal">
        {/* Header */}
        <div className="bg-[#1A0A13] text-white px-6 py-4 flex items-center justify-between border-b border-[#2C1420]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] text-[#701A35] border border-[#E6E1D6] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#EED8A1] font-serif">Submit Approval Request</h3>
              <p className="text-xs text-[#C5A059]/80">Route workflow through Administration governance rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Change / Workflow Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={changeType}
              onChange={(e) => setChangeType(e.target.value as ChangeType)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#701A35] font-medium text-slate-800"
            >
              <option value="Loan Update">Loan Update / Restructuring</option>
              <option value="Loan Split">Loan Split / Extraction</option>
              <option value="Loan Merge">Loan Merge / Consolidation</option>
              <option value="Historical Correction">Historical July Receipt Correction</option>
              <option value="Collection Correction">Collection Receipt Adjustment</option>
              <option value="Customer Update">Customer KYC / Bank Amendment</option>
              <option value="Role Change">Role Elevation / Access Assignment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Request Title / Summary <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rate adjustment request for LN20260012"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#701A35]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Entity ID (Loan / Client / User)
              </label>
              <input
                type="text"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="e.g. LN20260012 or CUST-0042"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#701A35] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Financial Value Involved (₹)
              </label>
              <input
                type="number"
                min="0"
                step="10000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#701A35] font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Business Justification & Notes <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail the operational reason for this exception or change..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#701A35]"
            />
          </div>

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
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-200" />
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
