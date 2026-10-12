'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { CollectionsView } from './_components/CollectionsView';

export default function CollectionsPage() {
  const { setActiveMainTab } = useApp();
  useEffect(() => { setActiveMainTab('collections'); }, [setActiveMainTab]);
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <CollectionsView />
      </main>
    </AppShell>
  );
}
