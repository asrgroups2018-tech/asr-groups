'use client';

import React, { useEffect } from 'react';
import { AppProvider, useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { AdminSection } from './_components/AdminSection';

function AdminContent() {
  const { setActiveMainTab } = useApp();

  useEffect(() => {
    setActiveMainTab('administration');
  }, [setActiveMainTab]);

  return <AdminSection />;
}

export default function AdministrationPage() {
  return (
    <AppProvider>
      <AppShell>
        <AdminContent />
      </AppShell>
    </AppProvider>
  );
}
