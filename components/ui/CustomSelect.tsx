'use client';

import React, { useState, useRef, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { FloatingPopover } from './FloatingPopover';

export interface CustomSelectOption<T extends string = string> {
  value: T;
  label: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  colorClass?: string;
}

interface CustomSelectProps<T extends string = string> {
  value: T;
  options: (CustomSelectOption<T> | T)[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  noTruncate?: boolean;
  'aria-label'?: string;
}

export function CustomSelect<T extends string = string>({
  value,
  options,
  onChange,
  placeholder = 'Select option',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  size = 'sm',
  disabled = false,
  noTruncate = false,
  'aria-label': ariaLabel,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef({ text: '', time: 0 });

  const normalizedOptions: CustomSelectOption<T>[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt as T, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value) || {
    value,
    label: value || placeholder,
  };

  const openMenu = () => {
    setActiveIndex(Math.max(0, normalizedOptions.findIndex((option) => option.value === value)));
    setIsOpen(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Tab') { setIsOpen(false); return; }
    let nextIndex = activeIndex;
    if (event.key === 'ArrowDown') nextIndex = isOpen ? (activeIndex + 1) % normalizedOptions.length : Math.max(0, normalizedOptions.findIndex((option) => option.value === value));
    else if (event.key === 'ArrowUp') nextIndex = isOpen ? (activeIndex - 1 + normalizedOptions.length) % normalizedOptions.length : Math.max(0, normalizedOptions.length - 1);
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = normalizedOptions.length - 1;
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!isOpen) openMenu();
      else if (normalizedOptions[activeIndex]) { onChange(normalizedOptions[activeIndex].value); setIsOpen(false); }
      return;
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      const text = (now - searchRef.current.time < 600 ? searchRef.current.text : '') + event.key.toLowerCase();
      searchRef.current = { text, time: now };
      const match = normalizedOptions.findIndex((option) => option.label.toLowerCase().startsWith(text));
      if (match < 0) return;
      nextIndex = match;
    } else return;
    event.preventDefault();
    if (!normalizedOptions.length) return;
    setIsOpen(true);
    setActiveIndex(nextIndex);
    requestAnimationFrame(() => document.getElementById(`${listId}-${nextIndex}`)?.scrollIntoView({ block: 'nearest' }));
  };

  return (
    <div className={`relative min-w-0 ${className}`} ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        role="combobox"
        aria-label={ariaLabel || selectedOption.label || placeholder}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-activedescendant={isOpen ? `${listId}-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={(event) => { event.stopPropagation(); if (isOpen) setIsOpen(false); else openMenu(); }}
        onKeyDown={handleKeyDown}
        className={`app-select-trigger w-full flex items-center justify-between gap-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 transition-colors cursor-pointer shadow-2xs hover:border-[#701A35] focus-visible:outline-2 focus-visible:outline-[#701A35] ${
          size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${buttonClassName}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
          {selectedOption.icon}
          <span className={noTruncate ? 'break-words' : 'truncate'}>{selectedOption.label}</span>
          {selectedOption.badge}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-[#701A35]' : ''
          }`}
        />
      </button>

      <FloatingPopover
          open={isOpen && !disabled}
          anchorRef={triggerRef}
          onClose={() => setIsOpen(false)}
          id={listId}
          role="listbox"
          aria-label={ariaLabel || placeholder}
          className={`app-select-menu flex flex-col gap-1 bg-white rounded-xl border border-[#D0C8B8] shadow-xl p-1.5 ${menuClassName}`}
        >
          {normalizedOptions.map((opt, index) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                id={`${listId}-${index}`}
                aria-selected={isSelected}
                tabIndex={-1}
                onPointerMove={() => setActiveIndex(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.preventDefault();
                  onChange(opt.value);
                  setIsOpen(false);
                  triggerRef.current?.focus({ preventScroll: true });
                }}
                className={`app-select-option w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#701A35] text-white font-bold'
                    : index === activeIndex ? 'bg-slate-100 text-slate-900' : 'text-slate-800 hover:bg-[#FAF5ED] hover:text-[#701A35]'
                } ${opt.colorClass || ''}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {opt.icon}
                  <span className="whitespace-normal break-words">{opt.label}</span>
                  {opt.badge}
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-amber-200" />}
              </button>
            );
          })}
        </FloatingPopover>
    </div>
  );
}
