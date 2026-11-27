"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  Compass,
  LineChart,
  Menu,
  PiggyBank,
  Repeat,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { usePulseAuth } from "@/components/providers";
import { Pulse3DHero } from "@/components/pulse-3d-hero";

const OVERVIEW_ITEMS = [
  { icon: LineChart, title: "Transaction Ledger", desc: "Track UPI, bank transfers, cards, and cash in one place." },
  { icon: TrendingUp, title: "Spending Analytics", desc: "See category totals, daily trends, and month-over-month shifts." },
  { icon: Repeat, title: "Recurring Bills", desc: "Catch subscriptions and monthly splits before they surprise you." },
  { icon: PiggyBank, title: "Savings Goals", desc: "Set target dates and see weekly or monthly pacing." },
  { icon: Calculator, title: "Purchase Simulator", desc: "Check how a big buy affects your month-end cushion." },
  { icon: Sparkles, title: "AI Copilot", desc: "Ask plain-English questions about your actual spending." },
];

export default function LandingPage() {
  const { user, loading } = usePulseAuth();
  const reduceMotion = useReducedMotion();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isAuthenticated = !loading && Boolean(user);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Section 1: Sticky Navbar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--elevated-ivory)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="pulse-card flex h-8 w-8 items-center justify-center rounded-xl">
              <Compass className="h-4 w-4 text-[var(--copper)]" />
            </div>
            <span className="font-serif-display text-xl tracking-tight text-[var(--espresso)]">PULSE</span>
          </Link>

          <nav aria-label="Homepage sections" className="hidden items-center gap-7 text-sm text-[var(--brown-grey)] md:flex">
            <a href="#features" className="transition hover:text-[var(--espresso)]">Features</a>
            <a href="#intelligence" className="transition hover:text-[var(--espresso)]">Intelligence</a>
            <a href="#copilot" className="transition hover:text-[var(--espresso)]">AI Copilot</a>
            <a href="#how-it-works" className="transition hover:text-[var(--espresso)]">How it works</a>
            <a href="#about" className="transition hover:text-[var(--espresso)]">About</a>
          </nav>

          <div className="hidden items-center gap-2.5 md:flex">
            {isAuthenticated ? (
              <Link
                href="/home"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--espresso)] px-4 py-2 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)]"
              >
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl border border-[var(--border-strong)] bg-[var(--white)] px-4 py-2 text-sm font-medium text-[var(--espresso)] transition hover:bg-[var(--cream)]"
                >
                  Sign in
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--copper)] px-4 py-2 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)]"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileNavOpen}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--white)] p-2 text-[var(--espresso)] md:hidden"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-[var(--border)] bg-[var(--elevated-ivory)] px-4 py-4 md:hidden">
            <div className="flex flex-col space-y-3 text-sm text-[var(--espresso)]">
              <a href="#features" onClick={() => setMobileNavOpen(false)}>Features</a>
              <a href="#intelligence" onClick={() => setMobileNavOpen(false)}>Intelligence</a>
              <a href="#copilot" onClick={() => setMobileNavOpen(false)}>AI Copilot</a>
              <a href="#how-it-works" onClick={() => setMobileNavOpen(false)}>How it works</a>
              <a href="#about" onClick={() => setMobileNavOpen(false)}>About</a>
              <div className="pt-2">
                {isAuthenticated ? (
                  <Link
                    href="/home"
                    onClick={() => setMobileNavOpen(false)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--espresso)] px-4 py-2.5 text-sm font-medium text-[var(--white)]"
                  >
                    Open Dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--copper)] px-4 py-2.5 text-sm font-medium text-[var(--white)]"
                  >
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Section 2 & 3: Hero + Signature 3D Composition */}
      <section className="pulse-grid-bg border-b border-[var(--border)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:py-20">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-6"
          >
            <span className="inline-block rounded-full border border-[var(--border-strong)] bg-[var(--white)] px-3.5 py-1 text-xs font-medium text-[var(--deep-copper)]">
              Built for Indian college students · INR
            </span>
            <h1 className="mt-5 font-serif-display text-4xl leading-[1.1] tracking-tight text-[var(--espresso)] sm:text-5xl lg:text-6xl">
              Your money deserves a clearer picture.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--brown-grey)]">
              Understand your spending, plan ahead, and make smarter financial decisions with one intelligent workspace
              built for student life.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {isAuthenticated ? (
                <Link
                  href="/home"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--espresso)] px-6 py-3 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)]"
                >
                  Open Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--copper)] px-6 py-3 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)]"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <a
                href="#features"
                className="rounded-xl border border-[var(--border-strong)] bg-[var(--white)] px-5 py-3 text-sm font-medium text-[var(--espresso)] transition hover:bg-[var(--cream)]"
              >
                Explore PULSE
              </a>
            </div>
          </motion.div>

          <div className="lg:col-span-6">
            <Pulse3DHero />
          </div>
        </div>
      </section>

      {/* Section 4: Product Overview */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--copper)]">Product Overview</p>
          <h2 className="mt-2 font-serif-display text-3xl text-[var(--espresso)] sm:text-4xl">
            Everything about your money, in one place.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--brown-grey)]">
            Student money moves across UPI apps, bank accounts, cards, and cash. PULSE brings every transaction into one
            calm, organized workspace.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {OVERVIEW_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="pulse-card rounded-2xl p-6 transition hover:border-[var(--copper)]/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cream)] text-[var(--deep-copper)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-[var(--espresso)]">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--brown-grey)]">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 5: Spending Intelligence */}
      <section id="intelligence" className="border-y border-[var(--border)] bg-[var(--elevated-ivory)] py-16 lg:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--copper)]">Spending Intelligence</p>
            <h2 className="mt-2 font-serif-display text-3xl text-[var(--espresso)]">Know where your money goes.</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--brown-grey)]">
              Track income and expenses, inspect category breakdowns, compare spending across months, and spot repeated
              subscriptions automatically.
            </p>
          </div>
          <div className="lg:col-span-7">
            <div className="pulse-card rounded-3xl p-6">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div>
                  <p className="text-xs text-[var(--brown-grey)]">Illustrative Category Breakdown</p>
                  <p className="text-lg font-semibold tabular-nums text-[var(--espresso)]">₹9,180 this month</p>
                </div>
                <span className="rounded-full bg-[var(--sage)] px-3 py-1 text-xs font-medium text-[var(--positive)]">
                  Within allowance
                </span>
              </div>
              <div className="mt-5 space-y-3.5 text-xs">
                {[
                  { label: "Food & Canteen", pct: 38, amt: "₹3,490", color: "bg-[var(--copper)]" },
                  { label: "Transport & Metro", pct: 24, amt: "₹2,200", color: "bg-[var(--plum)]" },
                  { label: "Groceries", pct: 21, amt: "₹1,930", color: "bg-[var(--blue-accent)]" },
                  { label: "Subscriptions", pct: 17, amt: "₹1,560", color: "bg-[var(--champagne)]" },
                ].map((row) => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between font-medium text-[var(--espresso)]">
                      <span>{row.label}</span>
                      <span className="tabular-nums text-[var(--brown-grey)]">{row.amt} · {row.pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--cream)]">
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6 & 7: Financial Forecasting & Savings Goals */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="pulse-card rounded-3xl p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--blue-accent)]">
              Financial Forecasting
            </p>
            <h2 className="mt-2 font-serif-display text-2xl text-[var(--espresso)]">
              Make decisions with tomorrow in mind.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--brown-grey)]">
              See your projected month-end balance based on your daily spend rate, upcoming recurring bills, and expected
              allowance—without pretending an estimate is a guarantee.
            </p>
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--soft-blue)]/40 p-4">
              <div className="flex items-center justify-between text-xs text-[var(--brown-grey)]">
                <span>Projected Month-End Balance</span>
                <span className="font-semibold tabular-nums text-[var(--blue-accent)]">₹2,820</span>
              </div>
              <p className="mt-1.5 text-[11px] text-[var(--brown-grey)]">
                Includes ₹1,307 in upcoming recurring bills before month end.
              </p>
            </div>
          </div>

          <div className="pulse-card rounded-3xl p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--positive)]">Savings Goals</p>
            <h2 className="mt-2 font-serif-display text-2xl text-[var(--espresso)]">
              Small steps. Bigger financial goals.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--brown-grey)]">
              Set target dates for a laptop, semester trip, or emergency cushion, record contributions, and see exact
              weekly pacing.
            </p>
            <div className="mt-6 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--sage)]/45 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-[var(--espresso)]">
                <span>Emergency Buffer</span>
                <span className="tabular-nums text-[var(--positive)]">₹9,500 / ₹15,000</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--white)]">
                <div className="h-full w-[63%] rounded-full bg-[var(--positive)]" />
              </div>
              <p className="text-[11px] tabular-nums text-[var(--brown-grey)]">Suggested pace: ₹430 / week</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 8: Purchase Simulator */}
      <section className="border-y border-[var(--border)] bg-[var(--elevated-ivory)] py-16 lg:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="pulse-card rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--brown-grey)]">Purchase Simulation Preview</span>
                <span className="rounded-full bg-[var(--warning-bg)] px-3 py-1 text-xs font-medium text-[var(--warning-text)]">
                  Affordable with Caution
                </span>
              </div>
              <p className="mt-3 text-lg font-semibold text-[var(--espresso)]">Noise-Cancelling Headphones · ₹5,000</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-[var(--elevated-ivory)] p-3">
                  <p className="text-[var(--brown-grey)]">Current Balance</p>
                  <p className="mt-1 font-semibold tabular-nums text-[var(--espresso)]">₹8,450</p>
                </div>
                <div className="rounded-xl bg-[var(--elevated-ivory)] p-3">
                  <p className="text-[var(--brown-grey)]">Projected After</p>
                  <p className="mt-1 font-semibold tabular-nums text-[var(--espresso)]">₹2,143</p>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--copper)]">Purchase Simulator</p>
            <h2 className="mt-2 font-serif-display text-3xl text-[var(--espresso)]">
              Before you buy, see what it changes.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--brown-grey)]">
              Enter any planned expense to check how it affects your liquid funds, upcoming bills, and active savings
              goals—calculated deterministically in INR before you spend.
            </p>
          </div>
        </div>
      </section>

      {/* Section 9: AI Copilot */}
      <section id="copilot" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="pulse-card-lavender grid items-center gap-8 rounded-3xl p-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <span className="inline-block rounded-full bg-[var(--white)] px-3 py-1 text-xs font-medium text-[var(--plum)]">
              Financial Assistant
            </span>
            <h2 className="mt-3 font-serif-display text-3xl text-[var(--espresso)]">
              A smarter way to think about your finances.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--brown-grey)]">
              Ask clear questions about where your allowance went, which bills are coming up, or how much to set aside
              weekly—with answers grounded in your actual records.
            </p>
          </div>
          <div className="space-y-3 lg:col-span-6">
            <div className="ml-auto max-w-sm rounded-2xl bg-[var(--espresso)] px-4 py-3 text-xs text-[var(--white)]">
              Where did most of my spending go this month?
            </div>
            <div className="max-w-md rounded-2xl border border-[var(--lavender)] bg-[var(--white)] px-4 py-3 text-xs leading-relaxed text-[var(--espresso)]">
              Food and Groceries accounted for 59% of your expenses this month, followed by Transport and monthly
              subscriptions.
            </div>
          </div>
        </div>
      </section>

      {/* Section 10: How PULSE Works */}
      <section id="how-it-works" className="border-t border-[var(--border)] bg-[var(--elevated-ivory)] py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--copper)]">How It Works</p>
            <h2 className="mt-2 font-serif-display text-3xl text-[var(--espresso)]">Three calm steps to clarity</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { step: "01", title: "Bring your financial activity together", desc: "Log expenses or import CSV statements in seconds." },
              { step: "02", title: "Understand your money through clear insights", desc: "Review category breakdowns, recurring bills, and spending pace." },
              { step: "03", title: "Plan your next move with more confidence", desc: "Simulate purchases and pace savings goals before spending." },
            ].map((s) => (
              <div key={s.step} className="pulse-card rounded-2xl p-6">
                <span className="font-serif-display text-2xl text-[var(--copper)]">{s.step}</span>
                <h3 className="mt-3 text-base font-semibold text-[var(--espresso)]">{s.title}</h3>
                <p className="mt-1.5 text-sm text-[var(--brown-grey)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 11: Final CTA */}
      <section id="about" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="pulse-card flex flex-col items-start justify-between gap-6 rounded-3xl p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-serif-display text-2xl text-[var(--espresso)] sm:text-3xl">
              Make your next financial decision a better one.
            </h2>
            <p className="mt-1.5 text-sm text-[var(--brown-grey)]">Start seeing your money with more clarity.</p>
          </div>
          {isAuthenticated ? (
            <Link
              href="/home"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--espresso)] px-6 py-3 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)]"
            >
              Open Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--copper)] px-6 py-3 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)]"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>

      {/* Section 12: Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--elevated-ivory)] py-10">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-[var(--copper)]" />
              <span className="font-serif-display text-lg text-[var(--espresso)]">PULSE</span>
            </div>
            <p className="mt-1 text-xs text-[var(--brown-grey)]">
              Student financial intelligence for allowances, recurring bills, and savings goals (INR).
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-xs text-[var(--brown-grey)]">
            <a href="#features" className="hover:text-[var(--espresso)]">Features</a>
            <a href="#intelligence" className="hover:text-[var(--espresso)]">Intelligence</a>
            <a href="#copilot" className="hover:text-[var(--espresso)]">AI Copilot</a>
            <a href="#how-it-works" className="hover:text-[var(--espresso)]">How it works</a>
            <Link href={isAuthenticated ? "/home" : "/login"} className="font-medium text-[var(--espresso)] hover:underline">
              {isAuthenticated ? "Dashboard" : "Sign in"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
