'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { ReportsView } from './_components/ReportsView';

export default function ReportsPage() {
  const { setActiveMainTab } = useApp();

  useEffect(() => {
    setActiveMainTab('reports');
  }, [setActiveMainTab]);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <ReportsView />
      </main>
    </AppShell>
  );
}
