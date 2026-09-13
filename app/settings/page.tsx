'use client';

import React, { useEffect } from 'react';
import { AppProvider, useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { SystemSettingsTab } from '@/app/administration/_components/SystemSettingsTab';

function SettingsContent() {
  const { setActiveMainTab } = useApp();

  useEffect(() => {
    setActiveMainTab('settings');
  }, [setActiveMainTab]);

  return (
    <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
      <SystemSettingsTab />
    </main>
  );
}

export default function SettingsPage() {
  return (
    <AppProvider>
      <AppShell>
        <SettingsContent />
      </AppShell>
    </AppProvider>
  );
}
