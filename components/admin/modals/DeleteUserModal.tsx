'use client';

import React, { useState } from 'react';
import { User } from '@/lib/types';
import { useApp } from '@/lib/store';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const { deleteUser } = useApp();
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const targetPhrase = 'DELETE USER';

  if (!isOpen || !user) return null;

  const isConfirmed = confirmationPhrase.trim() === targetPhrase;

  const handleDelete = () => {
    if (!isConfirmed) return;
    deleteUser(user.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full overflow-hidden">
        {/* Red warning header */}
        <div className="bg-rose-700 text-white px-6 py-4 flex items-center justify-between font-bold text-sm">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-white" />
            <span>DANGER ZONE · PERMANENT DELETE</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-black/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                Permanently Delete User Account
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                You are about to irreversibly delete{' '}
                <strong className="text-slate-900">{user.name}</strong> ({user.id}).
              </p>
            </div>
          </div>

          <div className="bg-rose-50 rounded-xl p-3.5 border border-rose-200 mb-5 text-xs text-rose-900 space-y-1.5">
            <p className="font-semibold">⚠️ This action cannot be undone.</p>
            <p className="text-slate-700">
              All credentials, active sessions, and access mappings will be deleted immediately.
            </p>
          </div>

          <div className="space-y-2 mb-6">
            <label className="block text-xs font-semibold text-slate-700">
              Type <span className="font-mono font-bold text-rose-700 select-all">{targetPhrase}</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              placeholder="Type phrase here"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-rose-300 bg-rose-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
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
              type="button"
              disabled={!isConfirmed}
              onClick={handleDelete}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Account Forever
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
