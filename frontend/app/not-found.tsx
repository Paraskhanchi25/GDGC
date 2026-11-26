import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-canvas)] px-4 text-center text-[var(--text-primary)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-espresso)] text-[var(--bg-paper)]">
        <Compass className="h-5 w-5" />
      </div>
      <p className="mt-5 text-xs uppercase tracking-widest text-[var(--text-muted)]">404 · Page Not Found</p>
      <h1 className="mt-2 font-serif-display text-3xl text-[var(--text-primary)]">
        This page does not exist in PULSE
      </h1>
      <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
        The link may be outdated or mistyped. Return to your financial workspace or sign in.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-espresso)] px-4 py-2.5 text-sm font-medium text-[var(--bg-paper)] transition hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4" />
          Go to Home
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-[var(--border-stone)] bg-[var(--bg-paper)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-muted)]"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
