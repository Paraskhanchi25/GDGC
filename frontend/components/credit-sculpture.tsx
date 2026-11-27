"use client";
import { motion } from "framer-motion";
import { useClientMotion } from "@/lib/use-client-motion";
import { PulseSymbol } from "@/components/pulse-logo";
export function CreditSculpture() {
  const reduced = !useClientMotion();
  return (
    <div
      className="sculpture-stage"
      aria-label="Illustrative PULSE learning card, not a payment card"
      role="img"
    >
      <div className="sculpture-orbit" />
      <div className="sculpture-plinth" />
      <motion.div
        className="sculpture-card"
        initial={false}
        animate={
          reduced
            ? {}
            : { rotateY: [-14, -5, -14], rotateX: [12, 6, 12], y: [0, -10, 0] }
        }
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-lg tracking-[.24em]">PULSE</span>
          <PulseSymbol className="h-10 w-10" />
        </div>
        <div className="sculpture-chip" />
        <p className="mt-7 font-serif-display text-3xl">
          A little wiser.
          <br />
          Every day.
        </p>
        <p className="mt-5 text-xs tracking-[.22em]">
          STUDENT LIFE · IN PERSPECTIVE
        </p>
      </motion.div>
    </div>
  );
}
