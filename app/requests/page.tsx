'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { UnderDevelopmentView } from '@/components/ui/UnderDevelopmentView';

export default function RequestsPage() {
  const { setActiveMainTab } = useApp();

  useEffect(() => {
    setActiveMainTab('requests');
  }, [setActiveMainTab]);

  return (
    <AppShell>
      <UnderDevelopmentView moduleName="requests" />
    </AppShell>
  );
}
