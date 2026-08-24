'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from '@/lib/store';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { AdminSection } from '@/components/admin/AdminSection';
import { UnderDevelopmentView } from '@/components/common/UnderDevelopmentView';
import { ToastContainer } from '@/components/common/Toast';

function ERPContent() {
  const { activeMainTab } = useApp();
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
          {activeMainTab === 'administration' ? (
            <AdminSection />
          ) : (
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
