'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { Footer } from './Footer';
import { ToastContainer } from '@/components/ui/Toast';
import { useApp } from '@/lib/store';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const router = useRouter();
  const { authReady, isAuthenticated } = useApp();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (authReady && !isAuthenticated) router.replace('/login');
  }, [authReady, isAuthenticated, router]);

  if (!authReady || !isAuthenticated) {
    return <div className="flex h-screen w-screen items-center justify-center bg-[#F8F6F1]"><div className="rounded-2xl border border-[#E7DFD2] bg-white px-6 py-5 text-sm font-semibold text-slate-600 shadow-sm">Loading your ASR account…</div></div>;
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#F8F6F1] relative">
      {/* Main View Area: Sidebar + Scrollable Content */}
      <div className="flex-1 flex min-h-0 w-full overflow-hidden">
        {/* 1. Left Sidebar */}
        <Sidebar
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* 2. Main Right Scrollable Content Column */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto">
          {/* Top Header (Sticky inside right pane) */}
          <TopNav onOpenMobileMenu={() => setIsMobileSidebarOpen(true)} />

          {/* Dynamic Viewport */}
          <main className="flex-1 min-h-0 pb-6">
            {children}
          </main>
        </div>
      </div>

      {/* 3. Global Full-Width Footer (Spanning Left Bottom End to Right Bottom End) */}
      <Footer />

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};
