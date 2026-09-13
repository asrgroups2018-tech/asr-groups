'use client';

import React, { useEffect } from 'react';
import { AppProvider, useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { HistoricalSheetView } from './_components/HistoricalSheetView';

function HistoricalSheetContent() {
  const { setActiveMainTab } = useApp();

  useEffect(() => {
    setActiveMainTab('historical-sheet');
  }, [setActiveMainTab]);

  return (
    <main className="p-4 sm:p-8 max-w-[100vw] w-full mx-auto space-y-6">
      <HistoricalSheetView />
    </main>
  );
}

export default function HistoricalSheetPage() {
  return (
    <AppProvider>
      <AppShell>
        <HistoricalSheetContent />
      </AppShell>
    </AppProvider>
  );
}
