'use client';

import React, { useEffect } from 'react';
import { AppProvider, useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardView } from './_components/DashboardView';

function DashboardContent() {
  const { setActiveMainTab } = useApp();

  useEffect(() => {
    setActiveMainTab('dashboard');
  }, [setActiveMainTab]);

  return <DashboardView />;
}

export default function DashboardPage() {
  return (
    <AppProvider>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </AppProvider>
  );
}
