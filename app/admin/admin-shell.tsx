"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileCheck2,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";

type NavItem = {
  label: string;
  href?: string;
  icon: typeof LayoutDashboard;
  comingSoon?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const groups: NavGroup[] = [
  {
    label: "WORKSPACE",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Activity & alerts", href: "/admin/activity", icon: Activity },
    ],
  },
  {
    label: "MARKETPLACE",
    items: [
      { label: "Partners", href: "/admin/partners", icon: Users },
      { label: "Properties", href: "/admin/properties", icon: Building2 },
      { label: "Rooms", icon: Building2, comingSoon: true },
      { label: "Rate plans", icon: CalendarDays, comingSoon: true },
      { label: "Availability", icon: CalendarDays, comingSoon: true },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { label: "Bookings", href: "/admin/bookings", icon: CalendarDays },
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
      { label: "Cash refunds", href: "/admin/cash-refunds", icon: Wallet },
      { label: "Branches", href: "/admin/branches", icon: Building2 },
      { label: "Financial reports", href: "/admin/reports", icon: Wallet },
    ],
  },
  {
    label: "ADMINISTRATION",
    items: [
      { label: "Verification", href: "/admin/properties", icon: FileCheck2 },
      { label: "Users & permissions", href: "/admin/users", icon: ShieldCheck },
      { label: "Audit history", href: "/admin/audit-logs", icon: Activity },
      { label: "Settings", href: "/admin/settings", icon: Settings2 },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // The login page is intentionally outside the authenticated admin chrome.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-[#18352A] text-white">
      <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
        <Link href="/admin" className="flex min-w-0 items-center gap-3" onClick={() => setMobileOpen(false)}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#B8D99A] text-sm font-black text-[#18352A]">E</span>
          <span className={collapsed ? "hidden" : "min-w-0"}>
            <span className="block truncate text-sm font-bold tracking-wide">ETHIOPIANBOOKING</span>
            <span className="mt-0.5 block text-[10px] font-semibold tracking-[0.2em] text-[#B8D99A]">ADMIN CONSOLE</span>
          </span>
        </Link>
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
        >
          <X size={18} />
        </button>
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((value) => !value)}
          className="hidden rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white lg:block"
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
        {groups.map((group) => (
          <section key={group.label}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.18em] text-[#9DB5A5]">{group.label}</p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.href ? isActive(pathname, item.href) : false;
                const classes = `group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${active ? "bg-[#B8D99A] text-[#18352A] shadow-sm" : item.comingSoon ? "cursor-not-allowed text-white/40" : "text-white/75 hover:bg-white/10 hover:text-white"}`;
                const content = (
                  <>
                    <Icon size={17} strokeWidth={1.8} className="shrink-0" />
                    {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.comingSoon && <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/55">SOON</span>}
                    {!collapsed && active && <span className="h-1.5 w-1.5 rounded-full bg-[#18352A]" />}
                  </>
                );
                return item.href ? (
                  <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className={classes} title={collapsed ? item.label : undefined}>
                    {content}
                  </Link>
                ) : (
                  <div key={item.label} className={classes} title={collapsed ? item.label : "This module is planned for a later phase"}>
                    {content}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        {!collapsed ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-[#B8D99A]" />
              Platform operations
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-white/55">Manage the marketplace, partners and guest operations.</p>
            <Link href="/" target="_blank" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#C5E3AA] hover:text-white">
              View website <ArrowUpRight size={12} />
            </Link>
          </div>
        ) : (
          <Link href="/" target="_blank" aria-label="View public website" className="flex justify-center rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white">
            <ArrowUpRight size={17} />
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F6F2] text-[#20372B]">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 lg:block ${collapsed ? "w-[76px]" : "w-[264px]"}`}>
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close navigation overlay" className="absolute inset-0 bg-[#10251B]/55" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[290px] shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className={`min-h-screen transition-[padding] duration-200 ${collapsed ? "lg:pl-[76px]" : "lg:pl-[264px]"}`}>
        <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[#E7EAE3] bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="rounded-xl border border-[#E7EAE3] p-2 text-[#34513D] hover:bg-[#F5F7F2] lg:hidden">
              <Menu size={19} />
            </button>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-[#8A968B]">ETHIOPIANBOOKING</p>
              <p className="mt-0.5 text-sm font-semibold text-[#20372B]">Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-[#E7EAE3] px-3 py-1.5 text-[11px] font-medium text-[#657469] sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Admin workspace
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF1E5] text-xs font-bold text-[#34513D]">AD</div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-70px)]">{children}</main>
      </div>
    </div>
  );
}
