'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { UnderDevelopmentView } from '@/components/ui/UnderDevelopmentView';

export default function ReportsPage() {
  const { setActiveMainTab } = useApp();

  useEffect(() => {
    setActiveMainTab('reports');
  }, [setActiveMainTab]);

  return (
    <AppShell>
      <UnderDevelopmentView moduleName="reports" />
    </AppShell>
  );
}
