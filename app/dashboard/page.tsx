"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, CreditCard, Users, HandCoins, TrendingUp,
  TrendingDown, Wallet, UserCheck, BarChart3, Calendar,
  ClipboardCheck, Settings, ChevronRight, Building2, LogOut,
  Shield, Menu, Search, Bell, ChevronDown, RefreshCw, Plus,
  ArrowUpRight, ArrowDownRight, DollarSign, Clock,
  AlertTriangle, CheckCircle
} from "lucide-react";
import "./dashboard.css";

// ─── Types ───────────────────────────────────────────────────────────────────
type PageKey =
  | "dashboard" | "loans" | "customers" | "collections"
  | "income" | "expenses" | "salary" | "agents"
  | "reports" | "schedule" | "approvals" | "settings";

// ─── Nav config ──────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: PageKey; label: string; icon: any; badge?: number }[] = [
  { id: "dashboard",  label: "Dashboard",          icon: LayoutDashboard },
  { id: "loans",      label: "Loans",              icon: CreditCard },
  { id: "customers",  label: "Customers",          icon: Users },
  { id: "collections",label: "Collections",        icon: HandCoins },
  { id: "income",     label: "Income",             icon: TrendingUp },
  { id: "expenses",   label: "Expenses",           icon: TrendingDown },
  { id: "salary",     label: "Salary & Payroll",   icon: Wallet },
  { id: "agents",     label: "Agents",             icon: UserCheck },
  { id: "reports",    label: "Reports",            icon: BarChart3 },
  { id: "schedule",   label: "Schedule",           icon: Calendar },
  { id: "approvals",  label: "Requests & Approvals", icon: ClipboardCheck, badge: 5 },
  { id: "settings",   label: "Settings",           icon: Settings },
];

const PAGE_LABELS: Record<PageKey, string> = {
  dashboard: "Dashboard", loans: "Loans", customers: "Customers",
  collections: "Collections", income: "Income", expenses: "Expenses",
  salary: "Salary & Payroll", agents: "Agents", reports: "Reports",
  schedule: "Schedule", approvals: "Requests & Approvals", settings: "Settings",
};

const PAGE_DESC: Record<PageKey, string> = {
  dashboard:   "Financial overview and key metrics",
  loans:       "Manage all loan accounts and disbursements",
  customers:   "Customer profiles and financial history",
  collections: "Daily collections and recovery management",
  income:      "Income tracking and ledger",
  expenses:    "Expense management and approvals",
  salary:      "Payroll processing and salary management",
  agents:      "Agent management and performance",
  reports:     "Financial reports and analytics",
  schedule:    "Collection schedule and tasks",
  approvals:   "Review and approve pending requests",
  settings:    "System configuration and user management",
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({
  active, onNavigate, collapsed,
}: {
  active: PageKey;
  onNavigate: (p: PageKey) => void;
  collapsed: boolean;
}) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("asr_token");
    localStorage.removeItem("asr_user");
    sessionStorage.removeItem("asr_token");
    sessionStorage.removeItem("asr_user");
    router.push("/login");
  };

  return (
    <aside className={`db-sidebar ${collapsed ? "db-sidebar--collapsed" : ""}`}>
      {/* Logo */}
      <div className="db-sidebar__logo">
        <div className="db-sidebar__logo-icon">
          <Image
            src="/Asr-White-gold.png"
            alt="ASR Groups"
            width={34}
            height={34}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
        {!collapsed && (
          <div>
            <div className="db-sidebar__logo-name">ASR Family</div>
            <div className="db-sidebar__logo-sub">FINANCE ERP</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="db-sidebar__nav">
        {!collapsed && (
          <div className="db-sidebar__nav-label">Main Navigation</div>
        )}
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`db-sidebar__item ${isActive ? "db-sidebar__item--active" : ""} ${collapsed ? "db-sidebar__item--collapsed" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={17} className="db-sidebar__item-icon" />
              {!collapsed && (
                <>
                  <span className="db-sidebar__item-label">{item.label}</span>
                  {item.badge && (
                    <span className="db-sidebar__badge">{item.badge}</span>
                  )}
                  {isActive && <ChevronRight size={14} className="db-sidebar__item-arrow" />}
                </>
              )}
              {collapsed && isActive && <div className="db-sidebar__active-bar" />}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      {!collapsed && (
        <div className="db-sidebar__footer">
          <div className="db-sidebar__user">
            <div className="db-sidebar__avatar">SA</div>
            <div className="db-sidebar__user-info">
              <div className="db-sidebar__user-name">Super Admin</div>
              <div className="db-sidebar__user-role">
                <Shield size={9} />
                <span>Full Access</span>
              </div>
            </div>
            <button
              type="button"
              className="db-sidebar__logout-btn"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={14} className="db-sidebar__logout" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({
  activePage,
  onToggleSidebar,
  onNavigate,
}: {
  activePage: PageKey;
  onToggleSidebar: () => void;
  onNavigate: (p: PageKey) => void;
}) {
  const [search, setSearch] = useState("");
  const [showNotif, setShowNotif] = useState(false);

  return (
    <header className="db-header">
      <button className="db-header__menu" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <Menu size={20} />
      </button>

      {/* Logo + breadcrumb */}
      <div className="db-header__brand">
        <Image
          src="/Asr-White-gold.png"
          alt="ASR Groups"
          width={32}
          height={32}
          style={{ objectFit: "contain" }}
          priority
        />
        <ChevronRight size={12} className="db-header__chevron" />
        <span className="db-header__page">{PAGE_LABELS[activePage]}</span>
      </div>
      <span className="db-header__desc">— {PAGE_DESC[activePage]}</span>

      <div style={{ flex: 1 }} />

      {/* Search */}
      <div className="db-header__search-wrap">
        <Search size={14} className="db-header__search-icon" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers, loans..."
          className="db-header__search"
        />
      </div>

      <button className="db-header__icon-btn" aria-label="Refresh">
        <RefreshCw size={16} />
      </button>

      <button
        className="db-header__new-loan"
        onClick={() => onNavigate("loans")}
      >
        <Plus size={14} />
        New Loan
      </button>

      {/* Notifications */}
      <div style={{ position: "relative" }}>
        <button
          className="db-header__icon-btn"
          onClick={() => setShowNotif((v) => !v)}
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="db-header__notif-badge">5</span>
        </button>
        {showNotif && (
          <div className="db-header__notif-panel">
            <div className="db-header__notif-head">
              <span>Notifications</span>
              <span className="db-header__notif-count">5 pending</span>
            </div>
            {[
              "Loan approval requested by Raj Kumar",
              "New expense report submitted",
              "Agent Priya missed target",
              "EMI overdue — Sundar Finance",
            ].map((msg, i) => (
              <div key={i} className="db-header__notif-item" onClick={() => { setShowNotif(false); onNavigate("approvals"); }}>
                <div className="db-header__notif-msg">{msg}</div>
                <div className="db-header__notif-time">Aug 08 · {9 + i}:00 AM</div>
              </div>
            ))}
            <div className="db-header__notif-footer">
              <button onClick={() => { setShowNotif(false); onNavigate("approvals"); }}>
                View all requests →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="db-header__user">
        <div className="db-header__avatar">SA</div>
        <div>
          <div className="db-header__user-name">Super Admin</div>
          <div className="db-header__user-role">ASR Family</div>
        </div>
        <ChevronDown size={12} className="db-header__chevron" />
      </div>
    </header>
  );
}

// ─── Placeholder content for pages not yet built ─────────────────────────────
function PlaceholderPage({ page }: { page: PageKey }) {
  return (
    <div className="db-placeholder">
      <div className="db-placeholder__icon">🚧</div>
      <h2 className="db-placeholder__title">{PAGE_LABELS[page]}</h2>
      <p className="db-placeholder__sub">This module is under development.</p>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="db-root">
      <Sidebar
        active={activePage}
        onNavigate={setActivePage}
        collapsed={collapsed}
      />
      <div className="db-main">
        <Header
          activePage={activePage}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          onNavigate={setActivePage}
        />
        <main className="db-content">
          {/* TODO: Replace PlaceholderPage with actual page components */}
          <PlaceholderPage page={activePage} />
        </main>
      </div>
    </div>
  );
}
