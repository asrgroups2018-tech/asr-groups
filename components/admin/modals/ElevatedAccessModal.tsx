'use client';

import React, { useState } from 'react';
import { RoleId } from '@/lib/types';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { RoleBadge } from '@/components/common/RoleBadge';

interface ElevatedAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  elevatedRoleId: RoleId;
}

export const ElevatedAccessModal: React.FC<ElevatedAccessModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  elevatedRoleId,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-amber-200 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Amber alert ribbon */}
        <div className="bg-amber-500 text-slate-950 px-6 py-3.5 flex items-center justify-between font-bold text-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-slate-950" />
            <span>SENSITIVE ACTION · ELEVATED PRIVILEGES</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-950/70 hover:text-slate-950 hover:bg-amber-600/30 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-snug">
                Grant Elevated Administrative Privileges?
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                You are assigning an elevated administrative tier to{' '}
                <span className="font-semibold text-slate-900">{userName}</span>.
              </p>
            </div>
          </div>

          <div className="bg-amber-50/80 rounded-xl p-4 border border-amber-200 mb-5 text-xs text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <span>Target Role:</span>
              <RoleBadge roleId={elevatedRoleId} size="sm" />
            </div>
            <p className="text-slate-700 leading-relaxed">
              {elevatedRoleId === 0
                ? 'Super Admin grants irrevocable power to modify system security, export database snapshots, wipe financial records, and edit the permission matrix.'
                : 'Admin grants full access to user management, elevated approval overrides, audit trail inspection, and global system configuration.'}
            </p>
            <p className="font-medium text-amber-900">
              ⚠️ This elevation will be logged immutably in the System Audit Trail with your timestamp and IP address.
            </p>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors mb-6">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-xs text-slate-700 font-medium select-none">
              I acknowledge that I am authorizing critical security permissions for this user.
            </span>
          </label>

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
              disabled={!acknowledged}
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs"
            >
              Confirm & Grant Access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
