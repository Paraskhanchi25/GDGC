"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Calculator, Compass, LineChart, PiggyBank, Repeat, Sparkles, TrendingUp } from "lucide-react";
import { usePulseAuth } from "@/components/providers";

const PILLARS = [
  {
    icon: LineChart,
    title: "Unified Spending Clarity",
    desc: "Bring UPI, debit card, bank transfers, and cash expenses into one structured ledger.",
  },
  {
    icon: Repeat,
    title: "Recurring Detection",
    desc: "Spot subscriptions and monthly hostel or utility splits before they surprise your balance.",
  },
  {
    icon: TrendingUp,
    title: "Allowance Forecasting",
    desc: "See your projected month-end balance based on daily spend rate and upcoming commitments.",
  },
  {
    icon: Calculator,
    title: "Purchase Simulator",
    desc: "Test big purchases like a ₹45,000 laptop against your savings goals and safety buffer.",
  },
  {
    icon: PiggyBank,
    title: "Goal Pacing",
    desc: "Track weekly and monthly contributions needed for tuition, trips, or an emergency fund.",
  },
  {
    icon: Sparkles,
    title: "Grounded Copilot",
    desc: "Ask natural-language questions backed strictly by your verified transaction records.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, loading, firebaseReady, setDemoMode } = usePulseAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [loading, user, router]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Minimal Navigation */}
      <header className="border-b border-[var(--border-stone)] bg-[var(--bg-paper)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-espresso)] text-[var(--bg-paper)]">
              <Compass className="h-4 w-4" />
            </div>
            <span className="font-serif-display text-xl tracking-tight">PULSE</span>
          </div>
          <div className="flex items-center gap-3">
            {firebaseReady && (
              <Link
                href="/login"
                className="rounded-lg border border-[var(--border-stone)] bg-[var(--bg-paper)] px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-muted)]"
              >
                Sign in
              </Link>
            )}
            <Link
              href="/home"
              onClick={() => setDemoMode(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-espresso)] px-4 py-2 text-sm font-medium text-[var(--bg-paper)] transition hover:opacity-90"
            >
              Explore Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero / Product Introduction */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
              Student Financial Intelligence · India (INR)
            </p>
            <h1 className="font-serif-display text-4xl leading-tight tracking-tight text-[var(--text-primary)] sm:text-5xl">
              Know where your allowance stands before the month ends.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
              College finances are split across UPI apps, bank accounts, cash, and subscriptions. PULSE consolidates
              your transactions into clear forecasts, recurring reminders, and honest affordability checks.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                onClick={() => setDemoMode(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-espresso)] px-5 py-3 text-sm font-medium text-[var(--bg-paper)] transition hover:opacity-90"
              >
                Explore Live Demo (Aarav Sharma)
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/simulator"
                onClick={() => setDemoMode(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-stone)] bg-[var(--bg-paper)] px-5 py-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-muted)]"
              >
                Try Purchase Simulator
              </Link>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--border-stone)] pb-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Sample Student Snapshot</p>
                  <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">Aarav Sharma · Bengaluru</p>
                </div>
                <span className="rounded-md bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                  INR
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] p-3.5">
                  <p className="text-xs text-[var(--text-muted)]">Available Balance</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--text-primary)]">₹8,450</p>
                </div>
                <div className="rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] p-3.5">
                  <p className="text-xs text-[var(--text-muted)]">Monthly Allowance</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--text-primary)]">₹12,000</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] p-3.5">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Laptop Goal Progress</span>
                  <span className="tabular-nums">41.1%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]">
                  <div className="h-full w-[41%] rounded-full bg-[var(--accent-sage)]" />
                </div>
                <p className="mt-2 text-xs text-[var(--text-secondary)] tabular-nums">₹18,500 saved of ₹45,000</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Feature Overview */}
      <section className="border-t border-[var(--border-stone)] bg-[var(--bg-paper)] py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-serif-display text-2xl text-[var(--text-primary)] sm:text-3xl">
              Built for how students actually spend and save
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Every metric is calculated in exact paise on the backend—no guesswork, no fabricated numbers.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-canvas)] p-5"
                >
                  <Icon className="h-5 w-5 text-[var(--accent-espresso)]" />
                  <h3 className="mt-3 text-base font-semibold text-[var(--text-primary)]">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-serif-display text-2xl text-[var(--text-primary)]">
              Explore the full workspace without signing up
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Inspect 3 months of realistic student transactions, forecasts, and affordability simulations.
            </p>
          </div>
          <Link
            href="/dashboard"
            onClick={() => setDemoMode(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--accent-espresso)] px-5 py-3 text-sm font-medium text-[var(--bg-paper)] transition hover:opacity-90"
          >
            Open Demo Workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
