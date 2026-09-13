'use client';

import React, { useEffect, use } from 'react';
import { AppProvider, useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { CustomerDetailsView } from '@/app/customers/_components/CustomerDetailsView';

function CustomerDetailContent({ customerId }: { customerId: string }) {
  const { setActiveMainTab, setSelectedCustomerId } = useApp();

  useEffect(() => {
    setActiveMainTab('customers');
    if (customerId) {
      setSelectedCustomerId(customerId);
    }
  }, [setActiveMainTab, setSelectedCustomerId, customerId]);

  return (
    <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
      <CustomerDetailsView />
    </main>
  );
}

export default function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const resolvedParams = use(params);

  return (
    <AppProvider>
      <AppShell>
        <CustomerDetailContent customerId={resolvedParams.customerId} />
      </AppShell>
    </AppProvider>
  );
}
