"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, Landmark } from "lucide-react";
import type { LinkedAccount } from "@/types/pulse";

const NODES = ["Spending", "Income", "Recurring", "Savings", "Cash flow"];

export function AccountPrep3D({
  account,
  onContinue,
}: {
  account: LinkedAccount;
  onContinue: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState(1);

  useEffect(() => {
    if (reduceMotion) {
      setStage(6);
      return;
    }
    const t1 = setTimeout(() => setStage(2), 450);
    const t2 = setTimeout(() => setStage(3), 950);
    const t3 = setTimeout(() => setStage(4), 1600);
    const t4 = setTimeout(() => setStage(5), 2200);
    const t5 = setTimeout(() => setStage(6), 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [reduceMotion]);

  return (
    <div className="flex flex-col items-center py-6 text-center" style={{ perspective: "1000px" }}>
      {stage < 5 ? (
        <div className="relative flex h-64 w-64 items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
          {/* Stage 1 & 2: Copper circular ring gaining depth */}
          <motion.div
            initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              rotateX: stage >= 2 ? 52 : 0,
              rotateY: stage >= 2 ? -18 : 0,
            }}
            transition={{ duration: 0.6 }}
            className="absolute inset-4 rounded-full border-2 border-[var(--copper)] shadow-[0_12px_36px_rgba(184,121,80,0.22)]"
          />

          <motion.div
            animate={reduceMotion ? undefined : { rotateZ: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-10 rounded-full border border-[var(--champagne)]"
            style={{ transform: "rotateX(60deg) rotateY(22deg)" }}
          />

          {/* Stage 3 & 4: Structured geometric nodes */}
          {stage >= 3 && (
            <div className="relative z-10 flex flex-wrap items-center justify-center gap-1.5 px-4">
              {NODES.map((label, idx) => (
                <motion.span
                  key={label}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: stage >= 4 ? 0.94 : 1,
                  }}
                  transition={{ duration: 0.3, delay: idx * 0.06 }}
                  className="rounded-full border border-[var(--border-strong)] bg-[var(--white)] px-2.5 py-1 text-[10px] font-medium text-[var(--espresso)] shadow-sm"
                >
                  {label}
                </motion.span>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Stage 5 & 6: Resolves into the linked account card */
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, rotateX: 18, scale: 0.92 }}
          animate={{ opacity: 1, rotateX: 0, scale: 1 }}
          transition={{ duration: 0.55 }}
          className="pulse-card w-full max-w-sm rounded-2xl p-6 text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cream)] text-[var(--deep-copper)]">
              <Landmark className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--sage)] px-2.5 py-1 text-[11px] font-medium text-[var(--positive)]">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ready
            </span>
          </div>
          <p className="mt-5 text-lg font-semibold text-[var(--espresso)]">{account.bank_name}</p>
          <p className="mt-1 font-mono text-sm tracking-wider text-[var(--brown-grey)]">{account.masked_number}</p>
          <p className="mt-1 text-xs text-[var(--muted-text)]">{account.account_type}</p>
        </motion.div>
      )}

      <div className="mt-6 space-y-2">
        <h2 className="font-serif-display text-2xl text-[var(--espresso)]">
          {stage >= 6 ? "Your financial picture is ready." : "Preparing your account experience"}
        </h2>
        <p className="text-xs text-[var(--brown-grey)]">
          {stage >= 6
            ? `${account.bank_name} (${account.masked_number}) is now part of your PULSE workspace.`
            : "Organizing spending, recurring payments, and cash flow."}
        </p>
      </div>

      {stage >= 6 && (
        <button
          onClick={onContinue}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--espresso)] px-6 py-3 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)]"
        >
          Open Dashboard <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
