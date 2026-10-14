'use client';

import React, { useEffect, useRef, useState } from 'react';
import { formatIndianCommas, parseFormattedNumber } from '@/lib/utils/numberToWords';

interface DraftNumberInputProps {
  value: number;
  onCommit: (value: number) => void;
  onEnter?: () => void;
  registerRef?: (element: HTMLInputElement | null) => void;
  placeholder?: string;
  className?: string;
}

/** Edits locally and commits only when the user leaves the cell or presses Enter. */
export const DraftNumberInput = React.memo<DraftNumberInputProps>(({
  value,
  onCommit,
  onEnter,
  registerRef,
  placeholder,
  className = '',
}) => {
  const [draft, setDraft] = useState(() => (value > 0 ? formatIndianCommas(value) : ''));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setDraft(value > 0 ? formatIndianCommas(value) : '');
    }
  }, [value]);

  const commit = () => {
    isFocused.current = false;
    const nextValue = parseFormattedNumber(draft);
    setDraft(nextValue > 0 ? formatIndianCommas(nextValue) : '');
    onCommit(nextValue);
  };

  return (
    <input
      ref={registerRef}
      type="text"
      inputMode="decimal"
      value={draft}
      placeholder={placeholder}
      onFocus={() => {
        isFocused.current = true;
      }}
      onChange={(event) => setDraft(event.currentTarget.value.replace(/[^0-9.]/g, ''))}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
          onEnter?.();
        }
      }}
      className={className}
    />
  );
});
