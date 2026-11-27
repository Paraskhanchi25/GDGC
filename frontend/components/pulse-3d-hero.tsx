"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { PiggyBank, Repeat, TrendingUp } from "lucide-react";

export function Pulse3DHero() {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const parallaxSlow = useTransform(scrollY, [0, 500], [0, reduceMotion ? 0 : -20]);
  const parallaxFast = useTransform(scrollY, [0, 500], [0, reduceMotion ? 0 : -36]);

  return (
    <div
      className="relative mx-auto flex w-full max-w-xl items-center justify-center py-8 sm:py-14"
      style={{ perspective: "1200px" }}
    >
      {/* Soft warm radial highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-4 rounded-full bg-[radial-gradient(circle_at_center,rgba(232,203,168,0.45)_0%,rgba(234,227,241,0.35)_45%,rgba(245,241,234,0)_75%)]"
      />

      {/* Sculptural Financial Orbit */}
      <div
        className="relative flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Outer Champagne Ring */}
        <motion.div
          aria-hidden="true"
          animate={reduceMotion ? undefined : { rotateZ: 360 }}
          transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-[var(--champagne)] shadow-[0_12px_36px_rgba(184,121,80,0.14)]"
          style={{ transform: "rotateX(65deg) rotateY(-18deg)" }}
        />

        {/* Middle Copper Metallic Ring */}
        <motion.div
          aria-hidden="true"
          animate={reduceMotion ? undefined : { rotateZ: -360 }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          className="absolute inset-6 rounded-full border-2 border-[var(--copper)]/65"
          style={{ transform: "rotateX(52deg) rotateY(26deg)" }}
        />

        {/* Inner Lavender Accent Ring */}
        <motion.div
          aria-hidden="true"
          animate={reduceMotion ? undefined : { rotateZ: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-12 hidden rounded-full border border-[var(--plum)]/40 sm:block"
          style={{ transform: "rotateX(-58deg) rotateY(16deg)" }}
        />

        {/* Translucent Central Sphere */}
        <div
          className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full border border-white/80 bg-[radial-gradient(circle_at_30%_30%,#FFFFFF_0%,#F5F1EA_52%,#E8CBA8_100%)] shadow-[0_24px_48px_-16px_rgba(148,95,64,0.32)] sm:h-32 sm:w-32"
          style={{ transform: "translateZ(28px)" }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--deep-copper)]">
            PULSE
          </span>
          <span className="mt-0.5 font-serif-display text-2xl text-[var(--espresso)]">₹</span>
        </div>
      </div>

      {/* Floating Panel 1: Monthly Spending (Top Left) */}
      <motion.div
        style={{ y: parallaxSlow, transform: "translateZ(42px) rotateY(5deg)" }}
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1 }}
        className="pulse-card absolute left-0 top-2 hidden w-48 rounded-2xl p-3.5 sm:block"
      >
        <div className="flex items-center justify-between text-[11px] text-[var(--brown-grey)]">
          <span>Monthly Spending</span>
          <TrendingUp className="h-3.5 w-3.5 text-[var(--copper)]" />
        </div>
        <p className="mt-1.5 text-lg font-semibold tabular-nums text-[var(--espresso)]">₹7,420</p>
        <p className="mt-0.5 text-[10px] text-[var(--positive)]">12% lower than last month</p>
      </motion.div>

      {/* Floating Panel 2: Savings Progress (Bottom Right) */}
      <motion.div
        style={{ y: parallaxFast, transform: "translateZ(52px) rotateY(-5deg)" }}
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.2 }}
        className="pulse-card absolute bottom-2 right-0 w-52 rounded-2xl p-3.5"
      >
        <div className="flex items-center justify-between text-[11px] text-[var(--brown-grey)]">
          <span className="flex items-center gap-1.5">
            <PiggyBank className="h-3.5 w-3.5 text-[var(--positive)]" /> Laptop Fund
          </span>
          <span className="tabular-nums font-medium text-[var(--positive)]">62%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--sage)]">
          <div className="h-full w-[62%] rounded-full bg-[var(--positive)]" />
        </div>
        <p className="mt-1.5 text-[10px] tabular-nums text-[var(--brown-grey)]">₹27,900 of ₹45,000</p>
      </motion.div>

      {/* Floating Panel 3: Upcoming Payment (Top Right on Desktop) */}
      <motion.div
        style={{ y: parallaxSlow, transform: "translateZ(30px)" }}
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.3 }}
        className="pulse-card-lavender absolute right-2 top-6 hidden w-44 rounded-2xl p-3 lg:block"
      >
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--plum)]">
          <Repeat className="h-3 w-3" />
          <span>Upcoming Bill</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="font-medium text-[var(--espresso)]">Hostel Wi-Fi</span>
          <span className="font-semibold tabular-nums text-[var(--espresso)]">₹499</span>
        </div>
      </motion.div>
    </div>
  );
}
