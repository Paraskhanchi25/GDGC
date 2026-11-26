"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { usePulseAuth } from "@/components/providers";
import { apiFetch } from "@/lib/api";
import {
  mapFirebaseAuthError,
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, firebaseReady, setDemoMode } = usePulseAuth();

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/home");
    }
  }, [authLoading, user, router]);

  const syncWithBackend = async () => {
    try {
      await apiFetch("/api/v1/auth/sync", { method: "POST", isDemo: false });
    } catch {
      // Backend DB may not be configured locally; keep Firebase session active and let dashboard surface API state
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleSubmitting || submitting) return;
    setError(null);
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      setDemoMode(false);
      await syncWithBackend();
      router.push("/home");
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || googleSubmitting) return;
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "register") {
        await registerWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      setDemoMode(false);
      await syncWithBackend();
      router.push("/home");
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-stone)] bg-[var(--bg-paper)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-espresso)] text-[var(--bg-paper)]">
              <Compass className="h-4 w-4" />
            </div>
            <span className="font-serif-display text-xl tracking-tight">PULSE</span>
          </Link>
          <Link
            href="/home"
            onClick={() => setDemoMode(true)}
            className="text-xs font-medium text-[var(--text-secondary)] hover:underline"
          >
            Explore Demo instead
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
        <div className="w-full rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-7 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">PULSE Account</p>
          <h1 className="mt-1 font-serif-display text-2xl text-[var(--text-primary)]">
            {mode === "signin" ? "Sign in to your workspace" : "Create your PULSE account"}
          </h1>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Your financial records are scoped privately to your verified account.
          </p>

          {!firebaseReady && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--status-warning)] bg-[var(--bg-canvas)] p-3 text-xs text-[var(--text-secondary)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning)]" />
              <span>
                Firebase configuration is missing. Set <code>NEXT_PUBLIC_FIREBASE_*</code> variables to enable sign-in.
              </span>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--status-danger)] bg-[var(--bg-canvas)] p-3 text-xs text-[var(--status-danger)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={!firebaseReady || googleSubmitting || submitting}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-muted)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {googleSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
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
            {googleSubmitting ? "Signing in with Google..." : "Continue with Google"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border-stone)]" />
            <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">or</span>
            <div className="h-px flex-1 bg-[var(--border-stone)]" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3 text-xs">
            {mode === "register" && (
              <div>
                <label className="mb-1 block font-medium text-[var(--text-secondary)]">Full Name</label>
                <input
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Aarav Sharma"
                  className="w-full rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-espresso)]"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block font-medium text-[var(--text-secondary)]">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@college.edu"
                className="w-full rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-espresso)]"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-[var(--text-secondary)]">Password</label>
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-espresso)]"
              />
            </div>

            <button
              type="submit"
              disabled={!firebaseReady || submitting || googleSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-espresso)] py-2.5 text-sm font-medium text-[var(--bg-paper)] transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Please wait...
                </>
              ) : (
                <>
                  {mode === "signin" ? "Sign in with Email" : "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-[var(--text-muted)]">
            {mode === "signin" ? (
              <>
                New to PULSE?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className="font-medium text-[var(--text-primary)] hover:underline"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                  className="font-medium text-[var(--text-primary)] hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
