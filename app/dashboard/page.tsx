'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardView } from './_components/DashboardView';
import { CustomerDashboardView } from './_components/CustomerDashboardView';

export default function DashboardPage() {
  const { setActiveMainTab, currentActor } = useApp();

  useEffect(() => {
    setActiveMainTab('dashboard');
  }, [setActiveMainTab]);

  return (
    <AppShell>
      {currentActor.isCustomer ? <CustomerDashboardView /> : <DashboardView />}
    </AppShell>
  );
}
