'use client';

import React, { useState } from 'react';
import { User } from '@/lib/types';
import { useApp } from '@/lib/store';
import { AlertOctagon, X, Ban, CheckCircle2 } from 'lucide-react';

interface SuspendUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SuspendUserModal: React.FC<SuspendUserModalProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const { toggleUserStatus } = useApp();
  const [reason, setReason] = useState('Administrative temporary lock');

  if (!isOpen || !user) return null;

  const isCurrentlySuspended = user.status === 'Suspended';
  const targetStatus = isCurrentlySuspended ? 'Active' : 'Suspended';

  const handleConfirm = () => {
    toggleUserStatus(user.id, targetStatus, isCurrentlySuspended ? undefined : reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between text-white font-bold text-sm ${
            isCurrentlySuspended ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          <div className="flex items-center gap-2">
            {isCurrentlySuspended ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertOctagon className="w-5 h-5" />
            )}
            <span>{isCurrentlySuspended ? 'Reactivate User Account' : 'Suspend User Account'}</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-black/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-700 leading-relaxed mb-4">
            Are you sure you want to {isCurrentlySuspended ? 'reactivate' : 'suspend'}{' '}
            <strong className="text-slate-900">{user.name}</strong> ({user.id})?
          </p>

          {!isCurrentlySuspended ? (
            <div className="space-y-3 mb-5">
              <label className="block text-xs font-bold text-slate-700">
                Reason for Suspension <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Overdue defaults, compliance verification, or account misuse"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <p className="text-[11px] text-slate-500">
                Suspension immediately revokes session tokens and blocks login until unlocked.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-200 mb-5 text-xs text-emerald-900">
              Reactivating will restore standard portal login and feature access for this user.
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 ${
                isCurrentlySuspended
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {isCurrentlySuspended ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
              {isCurrentlySuspended ? 'Reactivate Account' : 'Confirm Suspension'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
