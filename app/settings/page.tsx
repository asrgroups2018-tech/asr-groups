'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { SystemSettingsTab } from '@/app/administration/_components/SystemSettingsTab';

export default function SettingsPage() {
  const { setActiveMainTab } = useApp();

  useEffect(() => {
    setActiveMainTab('settings');
  }, [setActiveMainTab]);

  return (
    <AppShell>
      <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        <SystemSettingsTab />
      </main>
    </AppShell>
  );
}
