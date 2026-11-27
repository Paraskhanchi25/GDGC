"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LineChart,
  Repeat,
  PiggyBank,
  Calculator,
  Wallet,
  MessageCircle,
  BookOpen,
} from "lucide-react";
import { PublicHeader, StartButton } from "@/components/public-header";
import { PulseLogo } from "@/components/pulse-logo";
import { CreditSculpture } from "@/components/credit-sculpture";

const features = [
  [
    Wallet,
    "A home for every spend",
    "Keep UPI, cash and card entries together. Add a transaction in your own words.",
  ],
  [
    LineChart,
    "Find your patterns",
    "See which categories shape your month, and what changed along the way.",
  ],
  [
    Repeat,
    "Stay ahead of bills",
    "Keep recurring payments and upcoming commitments in view.",
  ],
  [
    PiggyBank,
    "Give savings a purpose",
    "Set a goal and work towards it at a pace that fits student life.",
  ],
  [
    Calculator,
    "Think before the big buy",
    "Explore how a purchase could affect your remaining money.",
  ],
  [
    MessageCircle,
    "Ask for a clearer explanation",
    "Ask the financial assistant about spending, savings and commitments when available.",
  ],
] as const;

export default function LandingPage() {
  return (
    <>
      <PublicHeader />
      <main id="main-content">
        <section className="landing-hero">
          <div className="page-width grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="eyebrow">Money skills for student life</p>
              <h1 className="editorial-title mt-6">
                Small spends.
                <br />
                Bigger <em>possibilities.</em>
              </h1>
              <p className="mt-7 max-w-md text-lg leading-relaxed text-[var(--brown-grey)]">
                From canteen lunches to your next laptop. Understand your money,
                make room for what matters, and build your financial future.
              </p>
              <div className="mt-9 flex flex-wrap items-start gap-3">
                <StartButton />
                <Link className="pulse-button secondary" href="/showcase">
                  Take a product tour
                </Link>
              </div>
              <p className="mt-5 text-sm text-[var(--brown-grey)]">
                Made for Indian college students. Every rupee in perspective.
              </p>
            </motion.div>
            <div className="hero-composition">
              <CreditSculpture />
              <div className="hero-note">
                <span className="eyebrow">
                  A little clarity goes a long way
                </span>
                <p className="mt-2 font-serif-display text-2xl">
                  Your next chapter starts here.
                </p>
                <span className="mt-2 block text-sm text-[var(--brown-grey)]">
                  Track. Plan. Learn.
                </span>
              </div>
            </div>
          </div>
        </section>
        <section id="product" className="page-width py-20">
          <div className="grid gap-10 md:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="eyebrow">The student money picture</p>
              <h2 className="section-title mt-4">
                Less guesswork.
                <br />
                More headspace.
              </h2>
            </div>
            <div className="space-y-5 text-lg leading-relaxed text-[var(--brown-grey)]">
              <p>
                An allowance arrives. A few UPI payments go out. A subscription
                renews. It’s easy to lose the thread.
              </p>
              <p>
                PULSE brings your recorded spending, upcoming commitments and
                savings plans into one clear view, so you can decide what comes
                next.
              </p>
              <Link
                className="text-base font-semibold text-[var(--deep-copper)] underline underline-offset-4"
                href="/showcase"
              >
                See an illustrative student journey
              </Link>
            </div>
          </div>
        </section>
        <section
          id="features"
          className="border-y border-[var(--border)] bg-[var(--elevated-ivory)] py-20"
        >
          <div className="page-width">
            <p className="eyebrow">Your everyday toolkit</p>
            <h2 className="section-title mt-4 max-w-xl">
              Good decisions start with a clear picture.
            </h2>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map(([Icon, title, body], i) => (
                <motion.article
                  key={title}
                  initial={false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="feature-panel"
                >
                  <Icon size={23} className="text-[var(--deep-copper)]" />
                  <h3 className="mt-6 text-xl font-medium">{title}</h3>
                  <p className="mt-3 leading-relaxed text-[var(--brown-grey)]">
                    {body}
                  </p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
        <section className="page-width py-20">
          <div className="academy-preview grid items-center gap-10 rounded-[2rem] p-7 sm:p-12 lg:grid-cols-2">
            <div>
              <span className="eyebrow">Introducing Credit Academy</span>
              <h2 className="section-title mt-4">
                Your first card?
                <br />
                <em>Learn first.</em>
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-[var(--brown-grey)]">
                Six chapters on credit, CIBIL, billing cycles and responsible
                repayment. Try the interactive examples, check your
                understanding and earn a PULSE completion certificate.
              </p>
              <Link
                href="/learn/credit-cards"
                className="pulse-button mt-7 inline-flex"
              >
                <BookOpen size={18} /> Explore Credit Academy
              </Link>
            </div>
            <div className="grid gap-3">
              {[
                "Credit is a tool, not extra income",
                "Understand the bill before the rewards",
                "Build habits at your own pace",
              ].map((t, i) => (
                <div
                  key={t}
                  className="rounded-2xl border border-white/70 bg-white/60 p-6"
                >
                  <span className="text-sm text-[var(--deep-copper)]">
                    Chapter {i * 2 + 1}
                  </span>
                  <p className="mt-2 font-serif-display text-2xl">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="about" className="page-width pb-20">
          <p className="eyebrow">Start with what you know</p>
          <h2 className="section-title mt-4">
            A few minutes. A better money habit.
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              [
                "Bring your money together",
                "Sign in and add transactions. Account activity prepared by PULSE is illustrative; it does not connect to your bank.",
              ],
              [
                "Notice the small things",
                "Explore category totals, recurring commitments and your savings progress.",
              ],
              [
                "Make your next move",
                "Plan a purchase, set a goal or learn a financial concept before you need it.",
              ],
            ].map(([title, body]) => (
              <article
                key={title}
                className="border-t border-[var(--border-strong)] pt-6"
              >
                <h3 className="text-xl font-medium">{title}</h3>
                <p className="mt-3 leading-relaxed text-[var(--brown-grey)]">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="border-y border-[var(--border)] bg-[var(--cream)] py-16">
          <div className="page-width flex flex-wrap items-center justify-between gap-8">
            <div>
              <p className="eyebrow">Make room for your future</p>
              <h2 className="section-title mt-3">Get to know your money.</h2>
            </div>
            <StartButton />
          </div>
        </section>
      </main>
      <footer className="page-width flex flex-wrap items-center justify-between gap-6 py-10">
        <PulseLogo />
        <nav aria-label="Footer" className="flex flex-wrap gap-5 text-sm">
          <Link href="/learn/credit-cards">Credit Academy</Link>
          <Link href="/showcase">Product walkthrough</Link>
          <Link href="/login">Sign in</Link>
        </nav>
        <p className="w-full text-sm text-[var(--brown-grey)]">
          PULSE offers financial tools and education. Forecasts and purchase
          scenarios are estimates. No banking access, lending or credit approval
          is provided.
        </p>
      </footer>
    </>
  );
}
