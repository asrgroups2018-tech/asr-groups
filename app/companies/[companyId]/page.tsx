'use client';

import React, { useEffect, use } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { CompanyDetailsView } from '@/app/companies/_components/CompanyDetailsView';

function CompanyDetailContent({ companyId }: { companyId: string }) {
  const { setActiveMainTab, setSelectedCompanyId } = useApp();

  useEffect(() => {
    setActiveMainTab('companies');
    if (companyId) {
      setSelectedCompanyId(companyId);
    }
  }, [setActiveMainTab, setSelectedCompanyId, companyId]);

  return (
    <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
      <CompanyDetailsView />
    </main>
  );
}

export default function CompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const resolvedParams = use(params);

  return (
    <AppShell>
      <CompanyDetailContent companyId={resolvedParams.companyId} />
    </AppShell>
  );
}
