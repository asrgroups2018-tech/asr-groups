'use client';

import React, { useEffect, use } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { LoanDetailsView } from '@/app/loans/_components/LoanDetailsView';

function LoanDetailContent({ loanId }: { loanId: string }) {
  const { setActiveMainTab, setSelectedLoanId } = useApp();

  useEffect(() => {
    setActiveMainTab('loans');
    if (loanId) {
      setSelectedLoanId(loanId);
    }
  }, [setActiveMainTab, setSelectedLoanId, loanId]);

  return (
    <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
      <LoanDetailsView />
    </main>
  );
}

export default function LoanDetailPage({ params }: { params: Promise<{ loanId: string }> }) {
  const resolvedParams = use(params);

  return (
    <AppShell>
      <LoanDetailContent loanId={resolvedParams.loanId} />
    </AppShell>
  );
}
