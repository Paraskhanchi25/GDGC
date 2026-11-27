"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { PulseLogo } from "@/components/pulse-logo";
import { usePulseAuth } from "@/components/providers";
import { signInWithGoogle, mapFirebaseAuthError } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export function StartButton({
  className = "pulse-button",
}: {
  className?: string;
}) {
  const { user, loading, firebaseReady } = usePulseAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <span className="inline-flex flex-col gap-2">
      <button
        className={className}
        disabled={busy || loading}
        onClick={async () => {
          if (user) {
            router.push("/home");
            return;
          }
          if (!firebaseReady) {
            router.push("/login");
            return;
          }
          setBusy(true);
          setError("");
          try {
            await signInWithGoogle();
            let destination = "/home";
            try {
              const r = await apiFetch<{
                profile?: { onboarding_completed?: boolean };
              }>("/api/v1/auth/sync", { method: "POST" });
              if (r.profile?.onboarding_completed === false)
                destination = "/onboarding";
            } catch {
              /* The dashboard provides retry if the connection is interrupted. */
            }
            router.push(destination);
          } catch (e) {
            setError(mapFirebaseAuthError(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Signing you in…" : user ? "Open Dashboard" : "Get Started"}
      </button>
      {error && (
        <span
          role="alert"
          className="max-w-xs text-sm text-[var(--error-text)]"
        >
          {error}
        </span>
      )}
    </span>
  );
}

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const links = [
    ["/#product", "Product"],
    ["/#features", "Features"],
    ["/learn/credit-cards", "Credit Academy"],
    ["/#about", "About"],
  ];
  return (
    <header className="public-header">
      <div className="page-width flex flex-wrap items-center justify-between gap-3 py-5">
        <PulseLogo />
        <nav
          aria-label="Website"
          className="hidden items-center gap-7 text-sm lg:flex"
        >
          {links.map(([href, label]) => (
            <Link href={href} key={label}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-5 lg:flex">
          <Link href="/login" className="text-sm">
            Sign in
          </Link>
          <StartButton />
        </div>
        <button
          className="pulse-button secondary public-menu-toggle lg:hidden"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        {open && (
          <nav
            aria-label="Mobile website"
            className="grid w-full gap-4 border-t border-[var(--border)] py-4 lg:hidden"
          >
            {links.map(([href, label]) => (
              <Link href={href} key={label} onClick={() => setOpen(false)}>
                {label}
              </Link>
            ))}
            <Link href="/login">Sign in</Link>
            <StartButton />
          </nav>
        )}
      </div>
    </header>
  );
}
