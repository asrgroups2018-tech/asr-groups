'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from '@/lib/store';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { AdminSection } from '@/app/administration/_components/AdminSection';
import { DashboardView } from '@/app/dashboard/_components/DashboardView';
import { LoansListView } from '@/app/loans/_components/LoansListView';
import { LoanDetailsView } from '@/app/loans/_components/LoanDetailsView';
import { CustomersListView } from '@/app/customers/_components/CustomersListView';
import { CustomerDetailsView } from '@/app/customers/_components/CustomerDetailsView';
import { CompaniesListView } from '@/app/companies/_components/CompaniesListView';
import { CompanyDetailsView } from '@/app/companies/_components/CompanyDetailsView';
import { ScheduleView } from '@/app/schedule/_components/ScheduleView';
import { HistoricalSheetView } from '@/app/historical-sheet/_components/HistoricalSheetView';
import { UnderDevelopmentView } from '@/components/ui/UnderDevelopmentView';
import { ToastContainer } from '@/components/ui/Toast';

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
          {activeMainTab === 'dashboard' && <DashboardView />}
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
          {activeMainTab === 'schedule' && (
            <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
              <ScheduleView />
            </main>
          )}
          {activeMainTab === 'historical-sheet' && (
            <main className="p-4 sm:p-8 max-w-[100vw] w-full mx-auto space-y-6">
              <HistoricalSheetView />
            </main>
          )}
          {!['dashboard', 'administration', 'loans', 'customers', 'companies', 'schedule', 'historical-sheet'].includes(activeMainTab) && (
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
