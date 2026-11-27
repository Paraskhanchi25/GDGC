"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

// Keep the server and first client render identical. Motion preferences are
// applied after hydration; users requesting reduced motion never start a loop.
export function useClientMotion() {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !reduced;
}
