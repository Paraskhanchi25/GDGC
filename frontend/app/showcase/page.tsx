"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Play, RotateCcw } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { CreditSculpture } from "@/components/credit-sculpture";
import { AcademyTools } from "@/components/academy-tools";
import { apiFetch } from "@/lib/api";
import { usePulseAuth } from "@/components/providers";

const stages = [
  "Meet the student",
  "Understand the money",
  "Look ahead",
  "Ask the assistant",
  "Learn before borrowing",
  "Inside PULSE",
];
const categories = [
  { name: "Food", amount: 3200, color: "#945F40" },
  { name: "Shopping", amount: 1800, color: "#756184" },
  { name: "Transport", amount: 1400, color: "#526C9C" },
  { name: "Subscriptions", amount: 1150, color: "#54734C" },
];
const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const fallback =
  "In this illustrative month, food is Aarav’s largest category at ₹3,200 out of ₹7,550 spent (about 42%). One practical experiment is to plan a few canteen meals instead of ordering delivery, then compare next month’s food total. Any savings depend on what he actually chooses and pays.";

export default function Showcase() {
  const { user } = usePulseAuth();
  const reduced = useReducedMotion();
  const [step, setStep] = useState(-1);
  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState(
    "Deterministic example · not a live AI response",
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const restart = () => {
    setStep(-1);
    setAnswer("");
    setNotice("");
    setSource("Deterministic example · not a live AI response");
  };
  return (
    <>
      <PublicHeader />
      <main
        id="main-content"
        className="page-width py-12 sm:py-16"
        onKeyDown={(e) => {
          if (
            (e.target as HTMLElement).closest(
              "input, select, textarea, button, a",
            )
          )
            return;
          if (e.key === "ArrowRight") setStep((s) => Math.min(5, s + 1));
          if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
        }}
      >
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <span className="rounded-full border border-[var(--border-strong)] bg-white px-4 py-2 text-sm">
            Showcase · fictional student data
          </span>
          <Link className="text-sm underline underline-offset-4" href="/">
            Exit showcase
          </Link>
        </div>
        {step < 0 ? (
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="eyebrow">The student fintech journey</p>
              <h1 className="editorial-title mt-5">
                A better start
                <br />
                with <em>money.</em>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-[var(--brown-grey)]">
                Student spending is fragmented. Credit is often unfamiliar.
                PULSE connects day-to-day money awareness with the skills to
                make better decisions.
              </p>
              <button className="pulse-button mt-8" onClick={() => setStep(0)}>
                <Play size={18} /> Start guided demo
              </button>
              <p className="mt-5 text-sm text-[var(--brown-grey)]">
                Six short stages. No personal financial records are changed.
              </p>
            </div>
            <CreditSculpture />
          </div>
        ) : (
          <>
            <div className="mb-10 grid gap-5 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="eyebrow">Stage {step + 1} of 6</p>
                <progress
                  aria-label="Walkthrough progress"
                  value={step + 1}
                  max={6}
                  className="mt-4 h-2 w-full accent-[var(--deep-copper)]"
                />
              </div>
              <label className="field-label">
                Skip to section
                <select
                  className="field-input"
                  value={step}
                  onChange={(e) => setStep(+e.target.value)}
                >
                  {stages.map((s, i) => (
                    <option value={i} key={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <motion.section
              key={step}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="min-h-[430px]"
              aria-live="polite"
              tabIndex={0}
            >
              <h1 className="section-title">{stages[step]}</h1>
              {step === 0 && (
                <div className="mt-8 grid gap-8 lg:grid-cols-2">
                  <article className="academy-preview rounded-3xl p-8">
                    <div className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-white font-serif-display text-3xl">
                      AS
                    </div>
                    <h2 className="font-serif-display text-3xl">
                      Aarav Sharma
                    </h2>
                    <p className="mt-3 text-lg">
                      A fictional college student balancing classes, friends and
                      an allowance.
                    </p>
                    <p className="mt-6 text-sm">Illustrative monthly income</p>
                    <p className="mt-2 text-4xl tabular-nums">₹12,000</p>
                  </article>
                  <div className="space-y-6 py-4">
                    <h2 className="font-serif-display text-3xl">
                      “Where did it all go?”
                    </h2>
                    <p className="lesson-text">
                      Aarav pays for food, rides and subscriptions in small
                      amounts. He wants to save for a laptop, but cannot see how
                      those daily choices fit together.
                    </p>
                    <p className="lesson-text">
                      Follow his money picture, explore a useful explanation,
                      then learn what to ask before a first credit card.
                    </p>
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="mt-8 grid gap-7 lg:grid-cols-2">
                  <div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ["Income", 12000],
                        ["Expenses", 7550],
                        ["Remaining from income", 4450],
                      ].map(([label, value]) => (
                        <div key={label} className="pulse-card rounded-2xl p-5">
                          <p className="text-sm text-[var(--brown-grey)]">
                            {label}
                          </p>
                          <p className="mt-3 text-3xl tabular-nums">
                            {money(Number(value))}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-[var(--brown-grey)]">
                      Remaining income is not a verified bank balance.
                    </p>
                    <div className="pulse-card mt-6 rounded-2xl p-6">
                      <h2 className="text-lg font-medium">
                        Recent entries · illustrative
                      </h2>
                      {[
                        ["College canteen", 250],
                        ["Metro recharge", 300],
                        ["Netflix", 799],
                      ].map(([name, value]) => (
                        <div
                          key={name}
                          className="flex justify-between gap-3 border-b border-[var(--border)] py-4"
                        >
                          <span>{name}</span>
                          <span className="tabular-nums">
                            {money(Number(value))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pulse-card rounded-2xl p-7">
                    <h2 className="font-serif-display text-2xl">
                      Spending by category
                    </h2>
                    <div className="mt-8 space-y-6">
                      {categories.map((c) => (
                        <div key={c.name}>
                          <div className="mb-3 flex justify-between">
                            <span>{c.name}</span>
                            <span className="tabular-nums">
                              {money(c.amount)}
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-[var(--cream)]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(c.amount / 7550) * 100}%`,
                                background: c.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-7 text-sm">
                      Food is the biggest category: about 42% of ₹7,550 spent.
                    </p>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="mt-8 grid gap-6 md:grid-cols-3">
                  {[
                    [
                      "Notice the pattern",
                      "₹3,200 on food",
                      "A category total makes it easier to compare choices next month.",
                    ],
                    [
                      "See what is coming",
                      "₹1,150 recurring",
                      "Aarav keeps his illustrative subscriptions visible before renewal.",
                    ],
                    [
                      "Make space for a goal",
                      "₹2,000 saved",
                      "Against an illustrative ₹30,000 laptop goal. The pace depends on future contributions.",
                    ],
                  ].map(([title, value, body]) => (
                    <article key={title} className="pulse-card rounded-2xl p-7">
                      <p className="eyebrow">{title}</p>
                      <h2 className="mt-6 font-serif-display text-3xl">
                        {value}
                      </h2>
                      <p className="mt-5 leading-relaxed text-[var(--brown-grey)]">
                        {body}
                      </p>
                    </article>
                  ))}
                  <div className="feedback md:col-span-3">
                    A forecast is an estimate from recorded activity and
                    expected commitments. It is not a promise of future income
                    or spending.
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="academy-preview mt-8 rounded-3xl p-6 sm:p-10">
                  <p className="text-lg font-medium">
                    “Explain my biggest spending category and suggest one
                    practical way to save.”
                  </p>
                  <div className="mt-6 rounded-2xl bg-white p-6">
                    <p className="eyebrow">{source}</p>
                    <p className="mt-4 whitespace-pre-wrap leading-relaxed">
                      {answer || fallback}
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <button
                      className="pulse-button"
                      disabled={busy || !user}
                      onClick={async () => {
                        setBusy(true);
                        setNotice("");
                        try {
                          const r = await apiFetch<{
                            status: string;
                            answer?: string;
                          }>("/api/v1/showcase/ask", { method: "POST" });
                          if (r.status === "ok" && r.answer) {
                            setAnswer(r.answer);
                            setSource(
                              "Live assistant response · fictional context only",
                            );
                          } else {
                            setAnswer(fallback);
                            setSource(
                              "Deterministic example · not a live AI response",
                            );
                            setNotice(
                              "The live assistant is unavailable. The example remains available for the walkthrough.",
                            );
                          }
                        } catch {
                          setNotice(
                            "The live assistant could not respond. This is a deterministic example.",
                          );
                          setAnswer(fallback);
                          setSource(
                            "Deterministic example · not a live AI response",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {busy ? "Asking…" : "Try a live answer"}
                    </button>
                    {!user && (
                      <Link href="/login" className="text-sm underline">
                        Sign in to try the live assistant
                      </Link>
                    )}
                  </div>
                  {notice && (
                    <p className="mt-4 text-sm" role="status">
                      {notice}
                    </p>
                  )}
                  <p className="mt-5 text-sm text-[var(--brown-grey)]">
                    A live request uses the direct Google Gemini API with only
                    the fictional profile shown here. The example stays available
                    if the assistant cannot respond.
                  </p>
                </div>
              )}
              {step === 4 && (
                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                  <div>
                    <p className="lesson-text">
                      Credit Academy teaches borrowing, CIBIL, FD-backed cards,
                      billing and repayment in six chapters. Try this billing
                      visualiser without changing any learning records.
                    </p>
                    <div className="pulse-card my-6 rounded-2xl p-6">
                      <p className="eyebrow">
                        Illustrative completion experience
                      </p>
                      <h2 className="mt-3 font-serif-display text-2xl">
                        PULSE Credit Academy
                      </h2>
                      <p className="mt-3">
                        Aarav Sharma · sample certificate preview
                      </p>
                      <p className="mt-4 text-sm">
                        Real certificates require all six chapter checks and at
                        least 80% on the final assessment. This preview issues
                        no certificate or saved progress.
                      </p>
                    </div>
                    <Link
                      href="/learn/credit-cards"
                      className="pulse-button secondary"
                    >
                      Open the Academy
                    </Link>
                  </div>
                  <AcademyTools kind="billing" />
                </div>
              )}
              {step === 5 && (
                <div className="mt-8">
                  <p className="max-w-3xl text-lg leading-relaxed text-[var(--brown-grey)]">
                    One existing application, with financial calculations kept
                    separate from optional AI explanations.
                  </p>
                  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      [
                        "Next.js",
                        "Responsive interface and same-origin API proxy",
                      ],
                      [
                        "Firebase Authentication",
                        "Google sign-in and server-verified identity",
                      ],
                      [
                        "FastAPI + Neon PostgreSQL",
                        "User-owned records and deterministic finance calculations",
                      ],
                      [
                        "Google Gemini Developer API",
                        "Official backend SDK with bounded context and per-user request limits",
                      ],
                    ].map(([title, body]) => (
                      <article
                        key={title}
                        className="pulse-card rounded-2xl p-6"
                      >
                        <h2 className="text-lg font-medium">{title}</h2>
                        <p className="mt-4 text-sm leading-relaxed text-[var(--brown-grey)]">
                          {body}
                        </p>
                      </article>
                    ))}
                  </div>
                  <div className="mt-7 rounded-2xl border border-[var(--border-strong)] p-6">
                    <h2 className="text-lg font-medium">Data flow</h2>
                    <p className="mt-3 leading-relaxed">
                      Browser signs in with Google → backend verifies the
                      identity → queries are scoped to that user → finance
                      services calculate metrics → the optional assistant
                      explains a small, aggregated context.
                    </p>
                    <p className="mt-4 text-sm text-[var(--brown-grey)]">
                      Existing VPS / Coolify hosting. One Dockerfile and
                      container, with Next.js and FastAPI managed together.
                      Local persistent storage and SMTP remain in place. No
                      production deployment was performed.
                    </p>
                  </div>
                </div>
              )}
            </motion.section>
            <div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-[var(--border)] pt-6">
              <button
                className="pulse-button secondary"
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
              >
                Previous
              </button>
              <button className="pulse-button secondary" onClick={restart}>
                <RotateCcw size={16} /> Restart
              </button>
              {step < 5 ? (
                <button
                  className="pulse-button"
                  onClick={() => setStep(step + 1)}
                >
                  Next step
                </button>
              ) : (
                <Link href="/" className="pulse-button">
                  Back to PULSE
                </Link>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
