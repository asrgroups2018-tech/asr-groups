'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { ToastContainer } from '@/components/ui/Toast';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
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
          {children}
        </div>
      </div>

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};
