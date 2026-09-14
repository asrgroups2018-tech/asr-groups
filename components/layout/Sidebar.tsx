'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/lib/store';
import {
  LayoutDashboard,
  ShieldCheck,
  CreditCard,
  Users,
  Building2,
  FileBarChart,
  CalendarDays,
  CheckSquare,
  Settings,
  ChevronRight,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeClass?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpenMobile, onCloseMobile }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    setActiveMainTab, 
    simulatedRoleId, 
    setSelectedUserId, 
    setSelectedCustomerId,
    setSelectedCompanyId,
    setSelectedLoanId,
    permissionMatrix 
  } = useApp();

  const allNavItems: NavItem[] = [
    { id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'loans', href: '/loans', label: 'Loans', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'customers', href: '/customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
    { id: 'companies', href: '/companies', label: 'Companies', icon: <Building2 className="w-4 h-4" /> },
    { id: 'schedule', href: '/schedule', label: 'Schedule', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'reports', href: '/reports', label: 'Reports', icon: <FileBarChart className="w-4 h-4" /> },
    {
      id: 'requests',
      href: '/requests',
      label: 'Requests & Approvals',
      icon: <CheckSquare className="w-4 h-4" />,
    },
    { id: 'settings', href: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    {
      id: 'administration',
      href: '/administration',
      label: 'Administration',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
  ];

  // Dynamic filter: Role 0 sees all. Other roles see only modules where 'view' permission is allowed!
  const navItems = allNavItems.filter((item) => {
    if (simulatedRoleId === 0) return true; // Super admin sees all
    if (permissionMatrix && permissionMatrix[item.id]?.view !== undefined) {
      return !!permissionMatrix[item.id]?.view?.[simulatedRoleId];
    }
    // Fallback: Administration is restricted to roles <= 1
    if (item.id === 'administration') return simulatedRoleId <= 1;
    // Customer sees only customer portal pages
    if (simulatedRoleId === 6) {
      return ['dashboard', 'loans', 'requests', 'settings'].includes(item.id);
    }
    return true;
  });

  const handleNavClick = (tabId: string, href: string) => {
    setActiveMainTab(tabId);
    setSelectedUserId(null);
    setSelectedCustomerId(null);
    setSelectedCompanyId(null);
    setSelectedLoanId(null);
    onCloseMobile();
    router.push(href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:relative top-0 inset-y-0 left-0 z-40 w-64 h-full bg-[#1A0A13] text-slate-300 flex flex-col border-r border-[#2C1420] shrink-0 transition-transform duration-300 ease-in-out select-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[#2C1420] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Logo container that cleanly fills the box edge-to-edge */}
            <div className="w-12 h-12 rounded-xl border border-[#C5A059]/50 overflow-hidden relative shadow-md shrink-0">
              <Image
                src="/Groups Finalized.png"
                alt="ASR Groups Logo"
                fill
                sizes="48px"
                className="object-cover scale-105"
                priority
              />
            </div>
            <div>
              <h1 className="font-serif text-sm font-bold text-[#EED8A1] tracking-wide leading-tight">
                ASR Groups
              </h1>
              <p className="text-[10px] tracking-widest text-[#C5A059]/80 uppercase font-mono font-medium">
                FINANCE ERP
              </p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="py-4 px-3 space-y-6 overflow-y-auto flex-1">
          <div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  (item.id === 'dashboard' && (pathname === '/' || pathname === '/dashboard' || pathname.startsWith('/dashboard'))) ||
                  (item.id === 'settings' && (pathname === '/settings' || pathname.startsWith('/settings'))) ||
                  (item.id !== 'dashboard' && item.id !== 'settings' && pathname.startsWith(`/${item.id}`));

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id, item.href)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                      isActive
                        ? 'bg-[#2E1220] text-[#EED8A1] border border-[#C5A059]/40 shadow-xs font-bold'
                        : 'text-slate-300/80 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`transition-colors ${
                          isActive
                            ? 'text-[#C5A059]'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] border ${
                            item.badgeClass || 'bg-white/10 text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <ChevronRight className="w-3.5 h-3.5 text-[#C5A059]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
};
