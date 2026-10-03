'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, AlertCircle, Info, Loader2 } from 'lucide-react';
import { MoneyDisplay } from './MoneyDisplay';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: React.ReactNode;
  itemName?: string;
  itemCode?: string;
  itemAmount?: number;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  message,
  itemName,
  itemCode,
  itemAmount,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading: externalLoading = false,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !internalLoading && !externalLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, internalLoading, externalLoading]);

  if (!isOpen) return null;

  const isLoading = externalLoading || internalLoading;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } catch (err) {
      console.error('ConfirmModal action error:', err);
    } finally {
      setInternalLoading(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-100 border-rose-200 text-rose-700',
          icon: <Trash2 className="w-5 h-5 text-rose-700" />,
          confirmBtn: 'bg-rose-700 hover:bg-rose-800 text-white shadow-rose-950/20',
          borderAccent: 'border-rose-200',
          headerBg: 'bg-rose-50/50',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 border-amber-200 text-amber-700',
          icon: <AlertTriangle className="w-5 h-5 text-amber-700" />,
          confirmBtn: 'bg-[#701A35] hover:bg-[#5C142B] text-white shadow-[#701A35]/20',
          borderAccent: 'border-amber-200',
          headerBg: 'bg-amber-50/50',
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-blue-100 border-blue-200 text-blue-700',
          icon: <Info className="w-5 h-5 text-blue-700" />,
          confirmBtn: 'bg-[#701A35] hover:bg-[#5C142B] text-white shadow-[#701A35]/20',
          borderAccent: 'border-blue-200',
          headerBg: 'bg-blue-50/50',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl border border-[#D0C8B8] shadow-2xl max-w-md w-full overflow-hidden motion-modal animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className={`px-5 py-4 ${styles.headerBg} border-b border-[#E6E1D6] flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${styles.iconBg}`}>
              {styles.icon}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-serif">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Action confirmation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {message ? (
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {message}
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete this record? This action is permanent and cannot be undone.
            </p>
          )}

          {/* Item details callout if provided */}
          {(itemName || itemCode || itemAmount !== undefined) && (
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E1D6] flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                {itemName && (
                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={itemName}>
                    {itemName}
                  </div>
                )}
                {itemCode && (
                  <div className="text-[11px] font-mono font-semibold text-[#701A35] mt-0.5">
                    ID: {itemCode}
                  </div>
                )}
              </div>
              {itemAmount !== undefined && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono block uppercase">Amount</span>
                  <MoneyDisplay amount={itemAmount} size="sm" amountClassName="font-extrabold text-slate-900" />
                </div>
              )}
            </div>
          )}

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span className="leading-snug">
              This will remove all associated payment schedules, installments, and logs from the cloud database.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#FAF9F6] border-t border-[#E6E1D6] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-white border border-[#D0C8B8] hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer disabled:opacity-50 btn-press"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-4 py-2 ${styles.confirmBtn} text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 btn-press`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
