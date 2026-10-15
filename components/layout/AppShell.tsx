'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { ToastContainer } from '@/components/ui/Toast';
import { useApp } from '@/lib/store';
import { Menu } from 'lucide-react';

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
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#F8F6F1]">
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <Sidebar
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="fixed left-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-lg md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-6 pt-12 md:pt-0">
            {children}
          </main>
          <Footer />
        </div>
      </div>

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};
