'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from '@/lib/store';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { AdminSection } from '@/components/admin/AdminSection';
import { LoansListView } from '@/components/loans/LoansListView';
import { LoanDetailsView } from '@/components/loans/LoanDetailsView';
import { CustomersListView } from '@/components/customers/CustomersListView';
import { CustomerDetailsView } from '@/components/customers/CustomerDetailsView';
import { CompaniesListView } from '@/components/companies/CompaniesListView';
import { CompanyDetailsView } from '@/components/companies/CompanyDetailsView';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { UnderDevelopmentView } from '@/components/common/UnderDevelopmentView';
import { ToastContainer } from '@/components/common/Toast';

function ERPContent() {
  const {
    activeMainTab,
    selectedLoanId,
    selectedCustomerId,
    selectedCompanyId,
  } = useApp();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#F8F6F1]">
      {/* 1. Left Sticky Sidebar */}
      <Sidebar
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Right Scrollable Content Column */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-y-auto">
        {/* Top Header (Sticky inside right pane) */}
        <TopNav onOpenMobileMenu={() => setIsMobileSidebarOpen(true)} />

        {/* Dynamic Viewport */}
        <div className="flex-1 min-h-0">
          {activeMainTab === 'administration' && <AdminSection />}
          {activeMainTab === 'loans' && (
            <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
              {selectedLoanId ? <LoanDetailsView /> : <LoansListView />}
            </main>
          )}
          {activeMainTab === 'customers' && (
            <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
              {selectedCustomerId ? <CustomerDetailsView /> : <CustomersListView />}
            </main>
          )}
          {activeMainTab === 'companies' && (
            <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
              {selectedCompanyId ? <CompanyDetailsView /> : <CompaniesListView />}
            </main>
          )}
          {activeMainTab === 'schedule' && <ScheduleView />}
          {!['administration', 'loans', 'customers', 'companies', 'schedule'].includes(activeMainTab) && (
            <UnderDevelopmentView moduleName={activeMainTab} />
          )}
        </div>
      </div>

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <ERPContent />
    </AppProvider>
  );
}
