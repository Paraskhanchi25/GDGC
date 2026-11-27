"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Compass } from "lucide-react";

export function BrandedLoader({ message = "Preparing your workspace" }: { message?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)]">
      <div className="relative flex items-center justify-center">
        {!reduceMotion && (
          <motion.div
            aria-hidden="true"
            animate={{ scale: [1, 1.35, 1], opacity: [0.45, 0.1, 0.45] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute h-20 w-20 rounded-full border border-[var(--champagne)]/40"
          />
        )}
        <div className="surface-metallic flex h-14 w-14 items-center justify-center rounded-2xl">
          <Compass className="h-6 w-6 text-[var(--champagne)]" />
        </div>
      </div>

      <p className="mt-6 font-serif-display text-2xl tracking-tight text-[var(--foreground)]">PULSE</p>
      <p className="mt-1.5 text-xs tracking-wide text-[var(--foreground-secondary)]">{message}</p>
    </div>
  );
}
