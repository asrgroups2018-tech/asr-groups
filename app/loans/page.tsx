'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { LoansListView } from './_components/LoansListView';
import { LoanDetailsView } from './_components/LoanDetailsView';

export default function LoansPage() {
  const { setActiveMainTab, selectedLoanId } = useApp();

  useEffect(() => {
    setActiveMainTab('loans');
  }, [setActiveMainTab]);

  return (
    <AppShell>
      <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {selectedLoanId ? <LoanDetailsView /> : <LoansListView />}
      </main>
    </AppShell>
  );
}
