'use client';

import React, { useEffect } from 'react';
import { AppProvider, useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { CustomersListView } from './_components/CustomersListView';
import { CustomerDetailsView } from './_components/CustomerDetailsView';

function CustomersContent() {
  const { setActiveMainTab, selectedCustomerId } = useApp();

  useEffect(() => {
    setActiveMainTab('customers');
  }, [setActiveMainTab]);

  return (
    <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
      {selectedCustomerId ? <CustomerDetailsView /> : <CustomersListView />}
    </main>
  );
}

export default function CustomersPage() {
  return (
    <AppProvider>
      <AppShell>
        <CustomersContent />
      </AppShell>
    </AppProvider>
  );
}
