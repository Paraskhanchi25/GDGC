"use client";

import { PulseSymbol } from "@/components/pulse-logo";
import { motion } from "framer-motion";
import { useClientMotion } from "@/lib/use-client-motion";
import { Compass } from "lucide-react";

export function BrandedLoader({ message = "Preparing your workspace" }: { message?: string }) {
  const reduceMotion = !useClientMotion();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)]">
      <div className="relative flex items-center justify-center">
        {!reduceMotion && (
          <motion.div
            aria-hidden="true"
            animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0.12, 0.55] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute h-20 w-20 rounded-full border border-[var(--copper)]/40"
          />
        )}
        <div className="pulse-card flex h-14 w-14 items-center justify-center rounded-2xl">
          <PulseSymbol className="h-6 w-6 text-[var(--copper)]" />
        </div>
      </div>

      <p className="mt-6 font-serif-display text-2xl tracking-tight text-[var(--espresso)]">PULSE</p>
      <p className="mt-1.5 text-xs tracking-wide text-[var(--brown-grey)]">{message}</p>
    </div>
  );
}
