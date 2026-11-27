"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Bell,
  Calculator,
  Compass,
  Globe,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  PiggyBank,
  Repeat,
  Settings,
  Sparkles,
  TrendingUp,
  UserCircle,
  X,
} from "lucide-react";
import { BrandedLoader } from "@/components/branded-loader";
import { usePulseAuth } from "@/components/providers";

const PRIMARY_NAV = [
  { href: "/home", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/forecast", label: "Forecast", icon: TrendingUp },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/goals", label: "Savings Goals", icon: PiggyBank },
  { href: "/simulator", label: "Simulator", icon: Calculator },
  { href: "/copilot", label: "Copilot", icon: Sparkles },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const ACCOUNT_NAV = [
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  unreadCount = 0,
}: {
  children: React.ReactNode;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { user, loading: authLoading, logout } = usePulseAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return <BrandedLoader message="Verifying your session" />;
  }

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      router.replace("/login");
    } finally {
      setSigningOut(false);
    }
  };

  const renderNavLink = (item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const Icon = item.icon;
    const active = pathname === item.href || (item.href === "/home" && pathname === "/dashboard");
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
          active
            ? "bg-[var(--espresso)] font-medium text-[var(--white)]"
            : "text-[var(--brown-grey)] hover:bg-[var(--cream)] hover:text-[var(--espresso)]"
        }`}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" />
          {item.label}
        </span>
        {item.href === "/notifications" && unreadCount > 0 && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
              active
                ? "bg-[var(--copper)] text-[var(--white)]"
                : "bg-[var(--lavender)] text-[var(--plum)]"
            }`}
          >
            {unreadCount}
          </span>
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between px-4 py-6">
      <div>
        <div className="mb-7 flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2.5" title="Return to PULSE homepage">
            <div className="pulse-card flex h-8 w-8 items-center justify-center rounded-xl">
              <Compass className="h-4 w-4 text-[var(--copper)]" />
            </div>
            <div>
              <span className="font-serif-display text-xl tracking-tight text-[var(--espresso)]">PULSE</span>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-text)]">Student Finance</p>
            </div>
          </Link>
        </div>

        <nav aria-label="Primary navigation" className="space-y-1">
          {PRIMARY_NAV.map(renderNavLink)}
        </nav>

        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <p className="mb-2 px-3 text-[10px] uppercase tracking-widest text-[var(--muted-text)]">Account</p>
          <nav aria-label="Account navigation" className="space-y-1">
            {ACCOUNT_NAV.map(renderNavLink)}
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--brown-grey)] transition hover:bg-[var(--cream)] hover:text-[var(--espresso)]"
            >
              <Globe className="h-4 w-4 shrink-0" />
              Website
            </Link>
          </nav>
        </div>
      </div>

      <div className="space-y-2 border-t border-[var(--border)] pt-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-2">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || "Profile"}
              referrerPolicy="no-referrer"
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--copper)] text-xs font-semibold text-[var(--white)]">
              {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--espresso)]">
              {user.displayName || "PULSE Member"}
            </p>
            <p className="truncate text-[11px] text-[var(--brown-grey)]">{user.email}</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--brown-grey)] transition hover:bg-[var(--cream)] hover:text-[var(--espresso)] disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--elevated-ivory)] lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Main Content + Mobile Header */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--elevated-ivory)] px-4 py-3 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-[var(--copper)]" />
            <span className="font-serif-display text-lg text-[var(--espresso)]">PULSE</span>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--white)] p-2 text-[var(--espresso)]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {mobileOpen && (
          <div className="border-b border-[var(--border)] bg-[var(--elevated-ivory)] lg:hidden">
            <SidebarContent />
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
