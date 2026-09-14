'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { ScheduleView } from './_components/ScheduleView';

export default function SchedulePage() {
  const { setActiveMainTab } = useApp();

  useEffect(() => {
    setActiveMainTab('schedule');
  }, [setActiveMainTab]);

  return (
    <AppShell>
      <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        <ScheduleView />
      </main>
    </AppShell>
  );
}
