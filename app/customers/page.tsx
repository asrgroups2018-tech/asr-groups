'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { CustomersListView } from './_components/CustomersListView';
import { CustomerDetailsView } from './_components/CustomerDetailsView';

export default function CustomersPage() {
  const { setActiveMainTab, selectedCustomerId } = useApp();

  useEffect(() => {
    setActiveMainTab('customers');
  }, [setActiveMainTab]);

  return (
    <AppShell>
      <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {selectedCustomerId ? <CustomerDetailsView /> : <CustomersListView />}
      </main>
    </AppShell>
  );
}
