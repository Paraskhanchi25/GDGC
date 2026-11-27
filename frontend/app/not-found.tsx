"use client";

import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { usePulseAuth } from "@/components/providers";

export default function NotFoundPage() {
  const { user } = usePulseAuth();

  return (
    <div className="pulse-grid-bg flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 text-center text-[var(--foreground)]">
      <div className="pulse-card flex h-14 w-14 items-center justify-center rounded-2xl">
        <Compass className="h-6 w-6 text-[var(--copper)]" />
      </div>
      <p className="mt-5 text-xs uppercase tracking-widest text-[var(--brown-grey)]">404 · Page Not Found</p>
      <h1 className="mt-2 font-serif-display text-3xl text-[var(--espresso)]">
        This page could not be found
      </h1>
      <p className="mt-2 max-w-md text-sm text-[var(--brown-grey)]">
        The address may be mistyped or no longer available.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {user ? (
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--copper)] px-5 py-2.5 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Open Dashboard
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--copper)] px-5 py-2.5 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)]"
          >
            Get Started
          </Link>
        )}
        <Link
          href="/"
          className="rounded-xl border border-[var(--border-strong)] bg-[var(--white)] px-5 py-2.5 text-sm font-medium text-[var(--espresso)] transition hover:bg-[var(--cream)]"
        >
          Visit Homepage
        </Link>
      </div>
    </div>
  );
}
