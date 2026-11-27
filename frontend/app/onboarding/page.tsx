"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";
import { PulseSymbol } from "@/components/pulse-logo";
import { BrandedLoader } from "@/components/branded-loader";
import { LinkBankFlow } from "@/components/link-bank-flow";
import { usePulseAuth } from "@/components/providers";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = usePulseAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <BrandedLoader message="Preparing onboarding" />;
  }

  return (
    <div className="pulse-grid-bg flex min-h-screen flex-col justify-between bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--elevated-ivory)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="pulse-card flex h-8 w-8 items-center justify-center rounded-xl">
              <PulseSymbol className="h-4 w-4 text-[var(--copper)]" />
            </div>
            <span className="font-serif-display text-xl tracking-tight text-[var(--espresso)]">PULSE</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-10">
        <LinkBankFlow
          allowSkip={true}
          onSkip={() => router.replace("/home")}
          onComplete={() => router.replace("/home")}
        />
      </main>
    </div>
  );
}
