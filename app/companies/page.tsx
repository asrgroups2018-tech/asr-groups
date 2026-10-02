'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { CompaniesListView } from './_components/CompaniesListView';
import { CompanyDetailsView } from './_components/CompanyDetailsView';

export default function CompaniesPage() {
  const { setActiveMainTab, selectedCompanyId } = useApp();

  useEffect(() => {
    setActiveMainTab('companies');
  }, [setActiveMainTab]);

  return (
    <AppShell>
      <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {selectedCompanyId ? <CompanyDetailsView /> : <CompaniesListView />}
      </main>
    </AppShell>
  );
}
