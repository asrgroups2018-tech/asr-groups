'use client';

import React, { useEffect } from 'react';
import { AppProvider, useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { ScheduleView } from './_components/ScheduleView';

function ScheduleContent() {
  const { setActiveMainTab } = useApp();

  useEffect(() => {
    setActiveMainTab('schedule');
  }, [setActiveMainTab]);

  return (
    <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
      <ScheduleView />
    </main>
  );
}

export default function SchedulePage() {
  return (
    <AppProvider>
      <AppShell>
        <ScheduleContent />
      </AppShell>
    </AppProvider>
  );
}
