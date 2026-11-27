"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Compass, Loader2, ShieldCheck } from "lucide-react";
import { BrandedLoader } from "@/components/branded-loader";
import { usePulseAuth } from "@/components/providers";
import { apiFetch } from "@/lib/api";
import { mapFirebaseAuthError, signInWithGoogle } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, firebaseReady, sessionError } = usePulseAuth();

  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/home");
    }
  }, [authLoading, user, router]);

  if (authLoading || user) {
    return <BrandedLoader message="Checking your session" />;
  }

  const handleGoogleSignIn = async () => {
    if (googleSubmitting) return;
    setError(null);
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      try {
        await apiFetch("/api/v1/auth/sync", { method: "POST" });
      } catch {
        // Keep session active; dashboard handles offline retry state cleanly
      }
      router.replace("/home");
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const displayError = error || sessionError;

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--background-elevated)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="surface-metallic flex h-8 w-8 items-center justify-center rounded-lg">
              <Compass className="h-4 w-4 text-[var(--champagne)]" />
            </div>
            <span className="font-serif-display text-xl tracking-tight text-[var(--foreground)]">PULSE</span>
          </Link>
          <Link href="/" className="text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
            Back to overview
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
        <div className="surface-metallic copper-glow w-full rounded-2xl p-8">
          <p className="text-xs uppercase tracking-widest text-[var(--amber)]">Private Workspace</p>
          <h1 className="mt-2 font-serif-display text-3xl text-[var(--foreground)]">Sign in to PULSE</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-muted)]">
            Access your personal allowance forecast, transactions, savings goals, and financial assistant.
          </p>

          {displayError && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-[var(--danger)]/50 bg-[var(--background)] p-3.5 text-xs text-[var(--danger)]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={!firebaseReady || googleSubmitting}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-[var(--accent)] px-5 py-3.5 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {googleSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4 rounded-full bg-white p-0.5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
            )}
            {googleSubmitting ? "Signing in..." : "Continue with Google"}
          </button>

          <div className="mt-6 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--foreground-secondary)]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--positive)]" />
            <span>Only Google sign-in is enabled. Your records are private to your account.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
