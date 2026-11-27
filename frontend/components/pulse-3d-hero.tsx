"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Calculator, PiggyBank, Repeat, TrendingUp } from "lucide-react";

export function Pulse3DHero() {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const parallaxSlow = useTransform(scrollY, [0, 500], [0, reduceMotion ? 0 : -24]);
  const parallaxFast = useTransform(scrollY, [0, 500], [0, reduceMotion ? 0 : -44]);

  return (
    <div
      className="relative mx-auto flex w-full max-w-lg items-center justify-center py-8 sm:py-12"
      style={{ perspective: "1200px" }}
    >
      {/* Subtle warm radial ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-6 rounded-full bg-[radial-gradient(circle_at_center,rgba(184,117,76,0.22),rgba(23,18,15,0)_70%)]"
      />

      {/* Signature 3D Orbital Core */}
      <div
        className="relative flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Outer Champagne Ring */}
        <motion.div
          aria-hidden="true"
          animate={reduceMotion ? undefined : { rotateZ: 360 }}
          transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-[var(--champagne)]/35 shadow-[0_0_40px_rgba(233,200,154,0.12)]"
          style={{ transform: "rotateX(64deg) rotateY(-18deg)" }}
        />

        {/* Middle Copper Ring */}
        <motion.div
          aria-hidden="true"
          animate={reduceMotion ? undefined : { rotateZ: -360 }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          className="absolute inset-6 rounded-full border-2 border-[var(--accent)]/55"
          style={{ transform: "rotateX(52deg) rotateY(28deg)" }}
        />

        {/* Inner Machined Core */}
        <div
          className="surface-metallic copper-glow flex h-28 w-28 flex-col items-center justify-center rounded-full sm:h-32 sm:w-32"
          style={{ transform: "translateZ(24px)" }}
        >
          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--champagne)]">PULSE</span>
          <span className="mt-1 font-serif-display text-xl text-[var(--foreground)]">INR</span>
        </div>
      </div>

      {/* Floating Panel 1: Liquid Balance (Top Left) */}
      <motion.div
        style={{ y: parallaxSlow, transform: "translateZ(40px) rotateY(6deg)" }}
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="surface-metallic absolute left-0 top-2 hidden w-48 rounded-xl p-3.5 sm:block"
      >
        <div className="flex items-center justify-between text-[11px] text-[var(--foreground-secondary)]">
          <span>Available Balance</span>
          <TrendingUp className="h-3.5 w-3.5 text-[var(--positive)]" />
        </div>
        <p className="mt-1.5 text-lg font-semibold tabular-nums text-[var(--foreground)]">₹18,450</p>
        <p className="mt-0.5 text-[10px] text-[var(--positive)]">On track for month end</p>
      </motion.div>

      {/* Floating Panel 2: Purchase Simulator (Bottom Right) */}
      <motion.div
        style={{ y: parallaxFast, transform: "translateZ(56px) rotateY(-6deg)" }}
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="surface-metallic absolute bottom-2 right-0 w-52 rounded-xl p-3.5"
      >
        <div className="flex items-center justify-between text-[11px] text-[var(--foreground-secondary)]">
          <span>Affordability Check</span>
          <Calculator className="h-3.5 w-3.5 text-[var(--amber)]" />
        </div>
        <p className="mt-1 text-xs font-medium text-[var(--foreground)]">₹45,000 Laptop</p>
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--background)] px-2 py-0.5 text-[10px] font-medium text-[var(--warning)]">
          Protects savings buffer
        </span>
      </motion.div>

      {/* Floating Panel 3: Recurring & Goal (Top Right on Desktop) */}
      <motion.div
        style={{ y: parallaxSlow, transform: "translateZ(32px)" }}
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="surface-metallic absolute right-2 top-6 hidden w-44 rounded-xl p-3 lg:block"
      >
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--foreground-secondary)]">
          <Repeat className="h-3 w-3 text-[var(--champagne)]" />
          <span>Upcoming Bill</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="font-medium text-[var(--foreground)]">Wi-Fi Split</span>
          <span className="tabular-nums text-[var(--champagne)]">₹499</span>
        </div>
      </motion.div>

      {/* Floating Panel 4: Savings Goal (Bottom Left on Desktop) */}
      <motion.div
        style={{ y: parallaxFast, transform: "translateZ(36px)" }}
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="surface-metallic absolute bottom-4 left-2 hidden w-44 rounded-xl p-3 lg:block"
      >
        <div className="flex items-center justify-between text-[11px] text-[var(--foreground-secondary)]">
          <span className="flex items-center gap-1">
            <PiggyBank className="h-3 w-3 text-[var(--positive)]" /> Laptop Goal
          </span>
          <ArrowUpRight className="h-3 w-3 text-[var(--foreground-secondary)]" />
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--background)]">
          <div className="h-full w-[62%] rounded-full bg-[var(--positive)]" />
        </div>
        <p className="mt-1 text-[10px] tabular-nums text-[var(--foreground-muted)]">₹620 / week pacing</p>
      </motion.div>
    </div>
  );
}
