"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 text-center text-[var(--foreground)]">
      <div className="pulse-card max-w-md rounded-2xl p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--warning-bg)] text-[var(--warning-text)]">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-serif-display text-2xl text-[var(--espresso)]">
          Something unexpected happened
        </h1>
        <p className="mt-2 text-sm text-[var(--brown-grey)]">
          We couldn&apos;t display this view right now. Your financial records remain safe.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--copper)] px-4 py-2.5 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)]"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-4 py-2.5 text-sm font-medium text-[var(--espresso)] hover:bg-[var(--cream)]"
          >
            Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
