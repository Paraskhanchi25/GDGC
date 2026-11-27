"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  Compass,
  LineChart,
  PiggyBank,
  Repeat,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { BrandedLoader } from "@/components/branded-loader";
import { usePulseAuth } from "@/components/providers";
import { Pulse3DHero } from "@/components/pulse-3d-hero";

const CAPABILITIES = [
  {
    icon: LineChart,
    title: "Unified Spending Clarity",
    desc: "Consolidate UPI payments, bank transfers, debit cards, and cash into one structured INR ledger.",
  },
  {
    icon: Repeat,
    title: "Recurring Detection",
    desc: "Spot subscriptions and monthly hostel or utility splits before they surprise your balance.",
  },
  {
    icon: TrendingUp,
    title: "Allowance Forecasting",
    desc: "Project your month-end balance transparently from daily burn rate and upcoming commitments.",
  },
  {
    icon: Calculator,
    title: "Purchase Simulator",
    desc: "Test big purchases against your liquid funds, recurring bills, and savings goal commitments.",
  },
  {
    icon: PiggyBank,
    title: "Goal Pacing",
    desc: "Calculate exact weekly and monthly contributions needed for laptops, tuition, or emergency funds.",
  },
  {
    icon: Sparkles,
    title: "Financial Copilot",
    desc: "Ask natural-language questions grounded strictly in your verified financial history.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { user, loading } = usePulseAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [loading, user, router]);

  if (loading || user) {
    return <BrandedLoader message="Opening PULSE" />;
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--background)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="surface-metallic flex h-8 w-8 items-center justify-center rounded-lg">
              <Compass className="h-4 w-4 text-[var(--champagne)]" />
            </div>
            <span className="font-serif-display text-xl tracking-tight text-[var(--foreground)]">PULSE</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--foreground-muted)] transition hover:bg-[var(--surface-raised)] sm:text-sm"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-[var(--background)] transition hover:bg-[var(--accent-hover)] sm:text-sm"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-6"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] uppercase tracking-widest text-[var(--champagne)]">
              Student Financial Intelligence · INR
            </span>
            <h1 className="mt-5 font-serif-display text-4xl leading-[1.1] tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
              Your money, with a clearer pulse.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--foreground-muted)]">
              Understand your spending, anticipate what&apos;s ahead, and make better financial decisions from one
              thoughtful workspace.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--accent-hover)]"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-raised)]"
              >
                Sign in with Google
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-2 text-xs text-[var(--foreground-secondary)]">
              <ShieldCheck className="h-4 w-4 text-[var(--positive)]" />
              <span>Private Google-authenticated workspace · Exact paise-level arithmetic</span>
            </div>
          </motion.div>

          <div className="lg:col-span-6">
            <Pulse3DHero />
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section className="border-t border-[var(--border-subtle)] bg-[var(--background-elevated)] py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-widest text-[var(--amber)]">Capabilities</p>
            <h2 className="mt-2 font-serif-display text-3xl text-[var(--foreground)]">
              Designed for fragmented student cash flow
            </h2>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">
              Every figure is computed from your verified transactions, never guessed.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="surface-metallic rounded-xl p-6 transition hover:border-[var(--accent)]/60"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-raised)] text-[var(--champagne)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-muted)]">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Simulator & Forecasting Showcase */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="surface-metallic rounded-2xl p-7">
            <p className="text-xs uppercase tracking-widest text-[var(--amber)]">Decision Engine</p>
            <h3 className="mt-2 font-serif-display text-2xl text-[var(--foreground)]">
              Know before you buy
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-muted)]">
              Test whether a major purchase fits alongside upcoming recurring bills, your safety buffer, and active
              savings targets—before committing your allowance.
            </p>
          </div>

          <div className="surface-metallic rounded-2xl p-7">
            <p className="text-xs uppercase tracking-widest text-[var(--positive)]">Forecast & Copilot</p>
            <h3 className="mt-2 font-serif-display text-2xl text-[var(--foreground)]">
              Honest projections, grounded answers
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-muted)]">
              See your projected month-end balance and ask your financial assistant questions backed directly by your
              verified ledger.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="surface-metallic copper-glow flex flex-col items-start justify-between gap-6 rounded-2xl p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-serif-display text-2xl text-[var(--foreground)] sm:text-3xl">
              Step into your private financial workspace
            </h2>
            <p className="mt-1.5 text-sm text-[var(--foreground-muted)]">
              Sign in with Google to start tracking allowances, recurring bills, and savings goals.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--accent-hover)]"
          >
            Sign in with Google
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--background-elevated)] py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-[var(--foreground-secondary)] sm:flex-row sm:px-6">
          <span>PULSE · Student Financial Intelligence</span>
          <span>Currency: INR · Private Authenticated Workspace</span>
        </div>
      </footer>
    </div>
  );
}
