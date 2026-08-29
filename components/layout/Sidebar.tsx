'use client';

import React from 'react';
import Image from 'next/image';
import { useApp } from '@/lib/store';
import {
  LayoutDashboard,
  ShieldCheck,
  CreditCard,
  Users,
  Building2,
  Coins,
  TrendingUp,
  Receipt,
  Banknote,
  Briefcase,
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

export const Sidebar: React.FC<SidebarProps> = ({ isOpenMobile, onCloseMobile }) => {
  const { 
    activeMainTab, 
    setActiveMainTab, 
    simulatedRoleId, 
    setSelectedUserId, 
    setSelectedCustomerId,
    setSelectedCompanyId,
    setSelectedLoanId,
    permissionMatrix 
  } = useApp();

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'administration',
      label: 'Administration',
      icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
    },
    { id: 'loans', label: 'Loans', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
    { id: 'companies', label: 'Companies', icon: <Building2 className="w-4 h-4" /> },
    { id: 'collections', label: 'Collections', icon: <Coins className="w-4 h-4" /> },
    { id: 'income', label: 'Income', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { id: 'salary', label: 'Salary & Payroll', icon: <Banknote className="w-4 h-4" /> },
    { id: 'agents', label: 'Agents', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileBarChart className="w-4 h-4" /> },
    { id: 'schedule', label: 'Schedule', icon: <CalendarDays className="w-4 h-4" /> },
    {
      id: 'requests',
      label: 'Requests & Approvals',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: '5',
      badgeClass: 'bg-[#C5A059] text-slate-950 font-bold',
    },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
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

  const handleNavClick = (tabId: string) => {
    setActiveMainTab(tabId);
    setSelectedUserId(null);
    setSelectedCustomerId(null);
    setSelectedCompanyId(null);
    setSelectedLoanId(null);
    onCloseMobile();
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
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 h-screen bg-[#1A0A13] text-slate-300 flex flex-col justify-between border-r border-[#2C1420] shrink-0 transition-transform duration-300 ease-in-out select-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="p-4 border-b border-[#2C1420] flex items-center justify-between">
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
          <div className="py-4 px-3 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#A3824E] font-mono mb-2">
                MAIN NAVIGATION
              </p>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = activeMainTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                        isActive
                          ? 'bg-[#2E1220] text-[#EED8A1] border border-[#C5A059]/40 shadow-xs'
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
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[#2C1420] text-[11px] text-slate-400 bg-[#14080F]/60 flex items-center justify-between">
          <div>
            <p className="text-[#C5A059] font-semibold">ASR Family Group</p>
            <p className="text-[10px] text-slate-500 font-mono">Enterprise Suite</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
      </aside>
    </>
  );
};
