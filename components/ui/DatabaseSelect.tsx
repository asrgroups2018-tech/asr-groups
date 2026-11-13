'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DropdownOption } from '@/lib/types';

interface DatabaseSelectProps {
  optionType: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowManage?: boolean;
  compact?: boolean;
}

export const DatabaseSelect: React.FC<DatabaseSelectProps> = ({
  optionType,
  value,
  onChange,
  placeholder = 'Select',
  className = '',
  allowManage = false,
  compact = false,
}) => {
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [isManaging, setIsManaging] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [managePosition, setManagePosition] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const managePanelRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const response = await fetch(`/api/admin/dropdown-options?type=${encodeURIComponent(optionType)}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Unable to load options.');
      setOptions(json.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load options.');
    }
  };

  useEffect(() => {
    void load();
  }, [optionType]);

  useEffect(() => {
    if (!isManaging) return;
    const updateManagePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = Math.min(288, window.innerWidth - 16);
      const panelHeight = managePanelRef.current?.offsetHeight || 160;
      const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - panelWidth - 8));
      const opensUp = window.innerHeight - rect.bottom < panelHeight + 12;
      const top = opensUp
        ? Math.max(8, rect.top - panelHeight - 8)
        : Math.min(window.innerHeight - panelHeight - 8, rect.bottom + 8);
      setManagePosition({ top, left });
    };
    updateManagePosition();
    const frame = window.requestAnimationFrame(updateManagePosition);
    const closeWhenClickedOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsManaging(false);
        setManagePosition(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsManaging(false);
        setManagePosition(null);
      }
    };
    document.addEventListener('pointerdown', closeWhenClickedOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', updateManagePosition);
    window.addEventListener('scroll', updateManagePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', closeWhenClickedOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', updateManagePosition);
      window.removeEventListener('scroll', updateManagePosition, true);
    };
  }, [isManaging]);

  const visibleOptions = useMemo(() => {
    if (!value || options.some((option) => option.value === value)) return options;
    return [{ id: `legacy-${value}`, optionType, value, label: value, sortOrder: -1, isActive: true, createdAt: '' }, ...options];
  }, [optionType, options, value]);

  const addOption = async () => {
    if (!newLabel.trim()) return;
    setError('');
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/dropdown-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionType, label: newLabel.trim() }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Unable to add option.');
      }
      setNewLabel('');
      await load();
      onChange(json.data.value);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to add option.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeOption = async (id: string) => {
    setError('');
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/dropdown-options?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Unable to delete option.');
      if (options.find((option) => option.id === id)?.value === value) onChange('');
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete option.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`min-w-0 flex-1 rounded-md border border-[#3D1A2C] bg-[#240F1D] px-2 text-slate-100 outline-none focus:border-[#C5A059] ${compact ? 'h-8 text-[11px]' : 'h-10 text-sm'} ${className}`}
        >
          <option value="">{placeholder}</option>
          {visibleOptions.map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}
        </select>
        {allowManage && (
          <button
            type="button"
            onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
            onClick={(event) => {
              event.stopPropagation();
              setIsManaging((open) => {
                if (open) setManagePosition(null);
                return !open;
              });
            }}
            className="shrink-0 rounded-md border border-[#C5A059]/40 px-2 py-1 text-[10px] font-bold text-[#EED8A1] hover:bg-[#C5A059]/10"
          >
            Manage
          </button>
        )}
      </div>
      {allowManage && isManaging && managePosition && (
        <div ref={managePanelRef} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} style={managePosition ? { top: managePosition.top, left: managePosition.left } : undefined} className="fixed z-[100] w-[min(18rem,calc(100vw-1rem))] rounded-xl border border-[#6B3B50] bg-[#160810] p-3 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#EED8A1]">Manage options</span>
            <span className="text-[10px] text-slate-500">Saved to database</span>
          </div>
          <div className="flex gap-1.5">
            <input value={newLabel} onChange={(event) => setNewLabel(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void addOption(); } }} placeholder="Add option" className="min-w-0 flex-1 rounded border border-[#3D1A2C] bg-[#240F1D] px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-[#C5A059]" />
            <button type="button" disabled={isSaving} onClick={() => void addOption()} className="rounded bg-[#C5A059] px-2 text-[#160810] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Add dropdown option"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          {error && <p className="mt-1 text-[10px] text-rose-300">{error}</p>}
          <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
            {options.map((option) => <div key={option.id} className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-[11px] text-slate-300 hover:bg-white/5"><span className="truncate">{option.label}</span><button type="button" disabled={isSaving} onClick={() => void removeOption(option.id)} className="shrink-0 text-slate-500 hover:text-rose-300 disabled:opacity-50" aria-label={`Delete ${option.label}`}><Trash2 className="h-3 w-3" /></button></div>)}
          </div>
        </div>
      )}
    </div>
  );
};
