"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Bell,
  Calculator,
  Compass,
  LayoutDashboard,
  LineChart,
  Menu,
  Moon,
  PiggyBank,
  Repeat,
  RotateCcw,
  Sparkles,
  Sun,
  TrendingUp,
  X,
  LogOut,
  LogIn,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePulseAuth } from "@/components/providers";
import { apiFetch } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/home", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/forecast", label: "Forecast", icon: TrendingUp },
  { href: "/simulator", label: "Simulator", icon: Calculator },
  { href: "/goals", label: "Savings Goals", icon: PiggyBank },
  { href: "/copilot", label: "Copilot", icon: Sparkles },
  { href: "/notifications", label: "Notifications", icon: Bell },
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
  const [resetting, setResetting] = useState(false);
  const { user, loading: authLoading, isDemo, firebaseReady, darkMode, toggleDarkMode, logout } = usePulseAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !isDemo && !user) {
      router.replace("/login");
    }
  }, [authLoading, isDemo, user, router]);

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await apiFetch("/api/v1/demo/reset", { method: "POST", isDemo: true });
      await queryClient.invalidateQueries();
    } finally {
      setResetting(false);
    }
  };

  const handleAuthAction = async () => {
    if (user) {
      await logout();
      router.push("/login");
    } else {
      router.push("/login");
    }
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between px-4 py-6">
      <div>
        <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-espresso)] text-[var(--bg-paper)]">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <span className="font-serif-display text-xl tracking-tight text-[var(--text-primary)]">PULSE</span>
            <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">Student Finance</p>
          </div>
        </Link>

        {isDemo && (
          <div className="mb-5 rounded-lg border border-[var(--border-stone)] bg-[var(--bg-muted)] px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Demo Profile</span>
              <span className="rounded bg-[var(--bg-paper)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                Aarav Sharma
              </span>
            </div>
            <button
              onClick={handleResetDemo}
              disabled={resetting}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--border-stone)] bg-[var(--bg-paper)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-canvas)] disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" />
              {resetting ? "Resetting..." : "Reset Demo Data"}
            </button>
          </div>
        )}

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href === "/home" && pathname === "/dashboard");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-[var(--accent-espresso)] font-medium text-[var(--bg-paper)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.href === "/notifications" && unreadCount > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                      active
                        ? "bg-[var(--bg-paper)] text-[var(--accent-espresso)]"
                        : "bg-[var(--bg-muted)] text-[var(--text-primary)]"
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2 border-t border-[var(--border-stone)] pt-4">
        {user && (
          <div className="flex items-center gap-2.5 rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-2.5 py-2">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "Profile"}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-espresso)] text-xs font-semibold text-[var(--bg-paper)]">
                {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                {user.displayName || "PULSE User"}
              </p>
              <p className="truncate text-[11px] text-[var(--text-muted)]">{user.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={toggleDarkMode}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-muted)]"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {darkMode ? "Warm Light" : "Quiet Dark"}
        </button>

        {firebaseReady && (
          <button
            onClick={handleAuthAction}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-muted)]"
          >
            {user ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {user ? "Sign out" : "Sign in"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-[var(--border-stone)] bg-[var(--bg-paper)] lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Header + Drawer */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--border-stone)] bg-[var(--bg-paper)] px-4 py-3 lg:hidden">
          <Link href="/" className="font-serif-display text-lg text-[var(--text-primary)]">
            PULSE
          </Link>
          <div className="flex items-center gap-2">
            {isDemo && (
              <span className="rounded bg-[var(--bg-muted)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                Demo
              </span>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation"
              className="rounded-lg border border-[var(--border-stone)] p-1.5 text-[var(--text-secondary)]"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {mobileOpen && (
          <div className="border-b border-[var(--border-stone)] bg-[var(--bg-paper)] lg:hidden">
            <SidebarContent />
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
