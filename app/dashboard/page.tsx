'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardView } from './_components/DashboardView';

export default function DashboardPage() {
  const { setActiveMainTab } = useApp();

  useEffect(() => {
    setActiveMainTab('dashboard');
  }, [setActiveMainTab]);

  return (
    <AppShell>
      <DashboardView />
    </AppShell>
  );
}
