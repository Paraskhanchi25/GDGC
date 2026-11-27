"use client";

import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { usePulseAuth } from "@/components/providers";

export default function NotFoundPage() {
  const { user } = usePulseAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 text-center text-[var(--foreground)]">
      <div className="surface-metallic copper-glow flex h-14 w-14 items-center justify-center rounded-2xl">
        <Compass className="h-6 w-6 text-[var(--champagne)]" />
      </div>
      <p className="mt-5 text-xs uppercase tracking-widest text-[var(--foreground-secondary)]">404 · Not Found</p>
      <h1 className="mt-2 font-serif-display text-3xl text-[var(--foreground)]">
        This page could not be found
      </h1>
      <p className="mt-2 max-w-md text-sm text-[var(--foreground-muted)]">
        The address may be mistyped or no longer available.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {user ? (
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--accent-hover)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--accent-hover)]"
            >
              Sign in with Google
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--foreground-muted)] transition hover:bg-[var(--surface-raised)]"
            >
              Back to Home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
