'use client';

import React, { useEffect, useRef, useState } from 'react';

type BalanceType = 'DEBIT' | 'CREDIT';

interface InlineOpeningBalanceEditorProps {
  amount?: number;
  type?: BalanceType;
  onSave: (amount: number, type: BalanceType) => Promise<void> | void;
  className?: string;
  compact?: boolean;
  showType?: boolean;
}

export const InlineOpeningBalanceEditor: React.FC<InlineOpeningBalanceEditorProps> = ({
  amount = 0,
  type = 'DEBIT',
  onSave,
  className = '',
  compact = false,
  showType = true,
}) => {
  const [editing, setEditing] = useState(false);
  const [draftAmount, setDraftAmount] = useState(String(amount || ''));
  const [draftType, setDraftType] = useState<BalanceType>(type === 'CREDIT' ? 'CREDIT' : 'DEBIT');
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!editing) {
      setDraftAmount(amount ? String(amount) : '');
      setDraftType(type === 'CREDIT' ? 'CREDIT' : 'DEBIT');
    }
  }, [amount, type, editing]);

  const beginEditing = () => {
    setEditing(true);
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const cancel = () => {
    setEditing(false);
    setDraftAmount(amount ? String(amount) : '');
    setDraftType(type === 'CREDIT' ? 'CREDIT' : 'DEBIT');
  };

  const commit = async (nextType: BalanceType = draftType) => {
    if (savingRef.current) return;
    const parsed = draftAmount.trim() === '' ? 0 : Number(draftAmount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDraftAmount(amount ? String(amount) : '');
      setEditing(false);
      return;
    }
    savingRef.current = true;
    try {
      await onSave(parsed, nextType);
      setEditing(false);
    } finally {
      savingRef.current = false;
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={beginEditing}
        className={`group inline-flex min-w-[92px] flex-col items-end rounded-md px-2 py-1 text-right hover:bg-[#FCFAF7] focus:bg-[#FCFAF7] focus:outline-none focus:ring-1 focus:ring-[#C5A059] ${className}`}
        title="Click to edit opening balance"
      >
        <span className={`font-bold tabular-nums ${compact ? 'text-xs' : 'text-sm'} ${amount ? (type === 'CREDIT' ? 'text-emerald-700' : 'text-[#701A35]') : 'text-slate-400'}`}>
          {amount ? `₹${Number(amount).toLocaleString('en-IN')}` : '—'}
        </span>
        {showType && <span className={`text-[9px] font-bold ${amount ? (type === 'CREDIT' ? 'text-emerald-700' : 'text-[#701A35]') : 'text-slate-400'}`}>
          {amount ? (type === 'CREDIT' ? 'Cr' : 'Dr') : 'Click to add'}
        </span>}
      </button>
    );
  }

  return (
    <div ref={editorRef} className={`flex ${showType ? 'min-w-[150px]' : 'min-w-[100px]'} items-center justify-end gap-1 ${className}`} onClick={(event) => event.stopPropagation()}>
      <input
        ref={inputRef}
        type="number"
        min="0"
        step="0.01"
        value={draftAmount}
        onChange={(event) => setDraftAmount(event.target.value)}
        onBlur={(event) => {
          if (!event.relatedTarget || !editorRef.current?.contains(event.relatedTarget as Node)) void commit();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void commit();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
          }
        }}
        aria-label="Opening balance amount"
        className="w-24 rounded-md border border-[#C5A059] bg-white px-2 py-1 text-right text-xs font-bold tabular-nums text-slate-800 outline-none ring-1 ring-[#C5A059]/30"
      />
      {showType && <select
          value={draftType}
          onChange={(event) => {
            const nextType = event.target.value === 'CREDIT' ? 'CREDIT' : 'DEBIT';
            setDraftType(nextType);
            void commit(nextType);
          }}
          onBlur={() => void commit()}
          aria-label="Opening balance type"
          className="rounded-md border border-slate-200 bg-white px-1 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-[#C5A059]"
        >
          <option value="DEBIT">Dr</option>
          <option value="CREDIT">Cr</option>
        </select>}
    </div>
  );
};
