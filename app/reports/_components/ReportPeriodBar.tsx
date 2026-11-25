'use client';

import React from 'react';
import { CalendarRange } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getDefaultReportPeriod, getFiscalYearStart, ReportPeriod } from '@/lib/reportAccounting';

export function useReportPeriod(): ReportPeriod {
  const searchParams = useSearchParams();
  const today = new Date().toISOString().slice(0, 10);
  const toDate = searchParams.get('reportTo') || today;
  return {
    fromDate: searchParams.get('reportFrom') || getFiscalYearStart(toDate),
    toDate,
  };
}

export function ReportPeriodBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = useReportPeriod();

  const update = (key: 'reportFrom' | 'reportTo', value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    const nextPeriod = { ...period, [key === 'reportFrom' ? 'fromDate' : 'toDate']: value };
    if (nextPeriod.fromDate > nextPeriod.toDate) {
      if (key === 'reportFrom') nextPeriod.toDate = nextPeriod.fromDate;
      else nextPeriod.fromDate = nextPeriod.toDate;
    }
    next.set('reportFrom', nextPeriod.fromDate);
    next.set('reportTo', nextPeriod.toDate);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const reset = () => {
    const defaultPeriod = getDefaultReportPeriod();
    const next = new URLSearchParams(searchParams.toString());
    next.set('reportFrom', defaultPeriod.fromDate);
    next.set('reportTo', defaultPeriod.toDate);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div className={`flex flex-wrap items-end gap-3 rounded-xl border border-[#D9D2C7] bg-[#FCFBF7] ${compact ? 'p-2.5' : 'p-3'}`}>
      <div className="mr-auto flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6E5A48]">
        <CalendarRange className="h-4 w-4 text-[#A07A39]" />
        Common accounting period
      </div>
      <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#6E5A48]">
        From
        <input type="date" value={period.fromDate} onChange={(event) => update('reportFrom', event.target.value)} className="mt-1 block rounded-md border border-[#D9D2C7] bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#A07A39]" />
      </label>
      <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#6E5A48]">
        To / As at
        <input type="date" value={period.toDate} onChange={(event) => update('reportTo', event.target.value)} className="mt-1 block rounded-md border border-[#D9D2C7] bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#A07A39]" />
      </label>
      <button type="button" onClick={reset} className="rounded-md border border-[#D9D2C7] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#701A35] hover:bg-[#FFF8E8]">This financial year</button>
    </div>
  );
}
