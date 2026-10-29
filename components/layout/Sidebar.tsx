'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/lib/store';
import {
  LayoutDashboard,
  ShieldCheck,
  CreditCard,
  Users,
  Building2,
  Banknote,
  FileBarChart,
  CalendarDays,
  CheckSquare,
  Landmark,
  ChevronRight,
  X,
  Bell,
  ChevronDown,
  LogOut,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { FloatingPopover } from '@/components/ui/FloatingPopover';
import { ModalFrame } from '@/components/ui/ModalFrame';

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
    setSelectedUserId, 
    setSelectedCustomerId,
    setSelectedCompanyId,
    setSelectedLoanId,
    currentActor,
    hasModulePermission,
    simulatedRoleId,
    roles,
    showToast,
  } = useApp();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const activeRoleName = roles.find((role) => role.id === simulatedRoleId)?.name || 'Role';

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
    } catch (error) {
      console.error('Sign out request failed:', error);
    } finally {
      localStorage.removeItem('asr_token');
      localStorage.removeItem('asr_user');
      sessionStorage.removeItem('asr_token');
      sessionStorage.removeItem('asr_user');
      router.replace('/login');
      router.refresh();
    }
  };

  const allNavItems: NavItem[] = [
    { id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'loans', href: '/loans', label: 'Loans', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'customers', href: '/customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
    { id: 'companies', href: '/companies', label: 'Companies', icon: <Building2 className="w-4 h-4" /> },
    { id: 'cheques', href: '/cheques', label: 'Cheques', icon: <Landmark className="w-4 h-4" /> },
    { id: 'schedule', href: '/schedule', label: 'Schedule', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'collections', href: '/collections', label: 'Collections', icon: <Banknote className="w-4 h-4" /> },
    { id: 'reports', href: '/reports', label: 'Reports', icon: <FileBarChart className="w-4 h-4" /> },
    {
      id: 'requests',
      href: '/requests',
      label: 'Requests & Approvals',
      icon: <CheckSquare className="w-4 h-4" />,
    },
    {
      id: 'administration',
      href: '/administration',
      label: 'Administration',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
  ];

  // Every account, including customers, follows the persisted view permission
  // for its effective role. The database seed provides the default customer
  // pages; any additional saved page access is picked up here automatically.
  const navItems = allNavItems.filter((item) => {
    if (currentActor.assignedRoleIds.includes(0)) return true;
    return hasModulePermission(item.id, 'view');
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
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-40 h-full w-60 shrink-0 bg-[#1A0A13] text-slate-300 flex flex-col border-r border-[#2C1420] transition-transform duration-300 ease-in-out select-none md:relative md:inset-auto md:left-auto md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#2C1420] px-3 py-2.5">
          <div className="flex items-center gap-3">
            {/* Circular Logo - no square container or background */}
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full shadow-xs">
              <Image
                src="/groups-finalized.png"
                alt="ASR GROUP Logo"
                fill
                sizes="36px"
                className="object-cover"
                priority
              />
            </div>
            <div>
              <h1 className="font-serif text-sm font-bold text-[#EED8A1] tracking-wide leading-tight">
                ASR GROUP
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="min-h-0 flex-1 overflow-hidden px-2.5 py-3">
          <div>
            <nav aria-label="Main menu" className="space-y-0.5">
              {navItems.map((item) => {
                const isActive =
                  (item.id === 'dashboard' && (pathname === '/' || pathname === '/dashboard' || pathname.startsWith('/dashboard'))) ||
                  (item.id !== 'dashboard' && pathname.startsWith(`/${item.id}`));

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id, item.href)}
                    onMouseEnter={() => router.prefetch(item.href)}
                    onFocus={() => router.prefetch(item.href)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`card-float w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-all duration-140 ease-out group cursor-pointer btn-press ${
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

        {/* Account controls stay at the bottom so sign out is always easy to find. */}
        <div className="relative shrink-0 border-t border-[#2C1420] p-2.5" ref={profileRef}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Workspace</span>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => showToast('Notifications', 'No new unread notifications.', 'info')} className="relative inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white" title="Notifications" aria-label="Notifications"><Bell className="h-3.5 w-3.5" /></button>
              <ThemeToggle className="!h-7 !w-7 !border-white/10 !bg-white/5 !text-slate-300 hover:!border-white/20 hover:!bg-white/10 hover:!text-white" />
            </div>
          </div>
          <button type="button" onClick={() => setIsProfileOpen((open) => !open)} className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1.5 text-left transition hover:border-[#C5A059]/40 hover:bg-white/10" aria-expanded={isProfileOpen}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-[#831843] text-[10px] font-bold tracking-wider text-amber-100">{currentActor.initials}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold text-white">{currentActor.name}</p><p className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-slate-400"><span className="truncate">{activeRoleName}</span><ChevronDown className="h-3 w-3 shrink-0" /></p></div>
          </button>
          {isProfileOpen && <FloatingPopover anchorRef={profileRef} open={isProfileOpen} onClose={() => setIsProfileOpen(false)} preferredSide="top" width={256} className="rounded-2xl border border-[#3C2330] bg-[#21121B] p-3 shadow-2xl">
            <div className="border-b border-white/10 px-2 pb-3"><p className="text-xs font-bold text-white">{currentActor.name}</p><p className="mt-1 truncate text-[11px] text-slate-400">{currentActor.email}</p><div className="mt-2 flex flex-wrap items-center gap-1.5"><RoleBadge roleId={simulatedRoleId} roleName={activeRoleName} size="xs" /><span className="font-mono text-[10px] text-slate-500">ID: {currentActor.id}</span></div></div>
            <div className="pt-2"><button type="button" onClick={() => { setIsProfileOpen(false); setIsSignOutOpen(true); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"><LogOut className="h-3.5 w-3.5" /><span>Sign Out</span></button></div>
          </FloatingPopover>}
        </div>
      </aside>

      {isSignOutOpen && (
        <ModalFrame onClose={() => setIsSignOutOpen(false)} dismissible={!isSigningOut}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSigningOut) setIsSignOutOpen(false);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="sidebar-sign-out-title">
            <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><ShieldAlert className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <h2 id="sidebar-sign-out-title" className="text-base font-bold text-slate-900">Sign out of ASR GROUP?</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">Your current session will be securely ended on this device.</p>
              </div>
              <button type="button" aria-label="Close sign out dialog" disabled={isSigningOut} onClick={() => setIsSignOutOpen(false)} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-col-reverse gap-2 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button type="button" disabled={isSigningOut} onClick={() => setIsSignOutOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50">Stay signed in</button>
              <button type="button" disabled={isSigningOut} onClick={handleSignOut} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-70">
                {isSigningOut && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSigningOut ? 'Signing out…' : 'Confirm sign out'}
              </button>
            </div>
          </div>
        </ModalFrame>
      )}
    </>
  );
};
