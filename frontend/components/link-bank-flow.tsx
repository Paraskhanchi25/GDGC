"use client";

import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Landmark, Loader2, Search, ShieldCheck } from "lucide-react";
import { AccountPrep3D } from "@/components/account-prep-3d";
import { usePulseAuth } from "@/components/providers";
import { apiFetch } from "@/lib/api";
import type { LinkedAccount } from "@/types/pulse";

interface BankOption {
  code: string;
  name: string;
  accent: string;
  short: string;
}

const BANKS: BankOption[] = [
  { code: "hdfc", name: "HDFC Bank", short: "HD", accent: "bg-[#DCE5F6] text-[#526C9C]" },
  { code: "icici", name: "ICICI Bank", short: "IC", accent: "bg-[#F7EEDC] text-[#945F40]" },
  { code: "axis", name: "Axis Bank", short: "AX", accent: "bg-[#EAE3F1] text-[#89769D]" },
  { code: "sbi", name: "State Bank of India", short: "SB", accent: "bg-[#DCE5F6] text-[#526C9C]" },
  { code: "kotak", name: "Kotak Mahindra Bank", short: "KM", accent: "bg-[#F6E7E3] text-[#9E4738]" },
  { code: "indusind", name: "IndusInd Bank", short: "IN", accent: "bg-[#F7EEDC] text-[#8C6229]" },
  { code: "yesbank", name: "YES BANK", short: "YB", accent: "bg-[#DCE5F6] text-[#526C9C]" },
  { code: "idfcfirst", name: "IDFC FIRST Bank", short: "ID", accent: "bg-[#DDE8D8] text-[#54734C]" },
];

type FlowStep = "intro" | "agreement" | "bank" | "account" | "otp" | "preparing";

export function LinkBankFlow({
  allowSkip = false,
  skipIntro = false,
  onSkip,
  onComplete,
}: {
  allowSkip?: boolean;
  skipIntro?: boolean;
  onSkip?: () => void;
  onComplete: (account: LinkedAccount) => void;
}) {
  const { user } = usePulseAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<FlowStep>(skipIntro ? "agreement" : "intro");
  const [agreed, setAgreed] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [selectedBank, setSelectedBank] = useState<BankOption | null>(null);
  const [accountType, setAccountType] = useState<"Savings Account" | "Current Account">("Savings Account");

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAccount, setCreatedAccount] = useState<LinkedAccount | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const filteredBanks = BANKS.filter((b) =>
    b.name.toLowerCase().includes(bankSearch.trim().toLowerCase())
  );

  const handleSendOtp = async () => {
    if (!selectedBank || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ challenge_id: string; cooldown_seconds: number }>(
        "/api/v1/accounts/otp/send",
        {
          method: "POST",
          body: JSON.stringify({
            bank_code: selectedBank.code,
            account_type: accountType,
            disclosure_accepted: agreed,
          }),
        }
      );
      setChallengeId(res.challenge_id);
      setCooldown(res.cooldown_seconds || 30);
      setOtpCode("");
      setStep("otp");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!challengeId || cooldown > 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ challenge_id: string; cooldown_seconds: number }>(
        "/api/v1/accounts/otp/resend",
        {
          method: "POST",
          body: JSON.stringify({ challenge_id: challengeId }),
        }
      );
      setChallengeId(res.challenge_id);
      setCooldown(res.cooldown_seconds || 30);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId || otpCode.length !== 6 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ status: string; account: LinkedAccount }>(
        "/api/v1/accounts/otp/verify",
        {
          method: "POST",
          body: JSON.stringify({ challenge_id: challengeId, otp_code: otpCode }),
        }
      );
      setCreatedAccount(res.account);
      setStep("preparing");
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pulse-card w-full max-w-xl rounded-3xl p-6 sm:p-8">
      {/* Step 1: Link Bank Introduction */}
      {step === "intro" && (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--cream)] text-[var(--copper)]">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-serif-display text-3xl text-[var(--espresso)]">Bring your money into PULSE</h1>
            <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-[var(--brown-grey)]">
              See your spending, cash flow, recurring payments and financial outlook in one place.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep("agreement")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--copper)] px-5 py-3.5 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)]"
            >
              Link a bank account <ArrowRight className="h-4 w-4" />
            </button>
            {allowSkip && onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="w-full rounded-xl py-2.5 text-xs font-medium text-[var(--brown-grey)] hover:text-[var(--espresso)]"
              >
                Maybe later
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Agreement & Disclosure (MUST come before Bank Selection) */}
      {step === "agreement" && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--copper)]">Disclosure</p>
            <h1 className="mt-1 font-serif-display text-2xl text-[var(--espresso)]">Before we begin</h1>
          </div>

          <div className="pulse-card-ivory space-y-3 rounded-2xl p-5 text-sm leading-relaxed text-[var(--brown-grey)]">
            <p>
              PULSE uses your selected bank and account type to organize a complete financial picture including
              spending, income, recurring payments, and cash flow.
            </p>
            <p className="font-medium text-[var(--espresso)]">
              You will never be asked for your bank password, debit card PIN, or UPI PIN.
            </p>
            <p>
              The account experience is prepared within PULSE so you can explore your financial outlook safely. It does
              not connect to or retrieve live records from your real bank login.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--white)] p-3.5 text-xs text-[var(--espresso)]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--copper)]"
            />
            <span>I understand and agree to continue setting up this PULSE account experience.</span>
          </label>

          <div className="flex items-center justify-between gap-3 pt-1">
            {!skipIntro ? (
              <button
                type="button"
                onClick={() => setStep("intro")}
                className="inline-flex items-center gap-1 text-xs text-[var(--brown-grey)] hover:text-[var(--espresso)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={!agreed}
              onClick={() => {
                setError(null);
                setStep("bank");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--espresso)] px-5 py-2.5 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Agree & Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Bank Selection */}
      {step === "bank" && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--copper)]">Step 1 of 3</p>
            <h1 className="mt-1 font-serif-display text-2xl text-[var(--espresso)]">Choose your bank</h1>
            <p className="mt-1 text-xs text-[var(--brown-grey)]">Select the bank you&apos;d like to add to PULSE.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[var(--muted-text)]" />
            <input
              value={bankSearch}
              onChange={(e) => setBankSearch(e.target.value)}
              placeholder="Search Indian banks..."
              aria-label="Search banks"
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] py-2 pl-10 pr-3 text-sm text-[var(--espresso)] outline-none focus:border-[var(--copper)]"
            />
          </div>

          <div className="grid max-h-72 gap-2.5 overflow-y-auto sm:grid-cols-2">
            {filteredBanks.map((bank) => {
              const selected = selectedBank?.code === bank.code;
              return (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => setSelectedBank(bank)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-[var(--copper)] bg-[var(--elevated-ivory)] ring-1 ring-[var(--copper)]"
                      : "border-[var(--border)] bg-[var(--white)] hover:bg-[var(--elevated-ivory)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${bank.accent}`}>
                      {bank.short}
                    </span>
                    <span className="text-xs font-medium text-[var(--espresso)]">{bank.name}</span>
                  </div>
                  {selected && <Check className="h-4 w-4 text-[var(--copper)]" />}
                </button>
              );
            })}
            {filteredBanks.length === 0 && (
              <p className="col-span-2 py-6 text-center text-xs text-[var(--brown-grey)]">
                No matching banks found.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep("agreement")}
              className="inline-flex items-center gap-1 text-xs text-[var(--brown-grey)] hover:text-[var(--espresso)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              type="button"
              disabled={!selectedBank}
              onClick={() => {
                setError(null);
                setStep("account");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--espresso)] px-5 py-2.5 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)] disabled:opacity-45"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Account Type Selection */}
      {step === "account" && selectedBank && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--copper)]">Step 2 of 3</p>
            <h1 className="mt-1 font-serif-display text-2xl text-[var(--espresso)]">Choose an account</h1>
            <p className="mt-1 text-xs text-[var(--brown-grey)]">
              Select the {selectedBank.name} account type you&apos;d like to add.
            </p>
          </div>

          <div className="space-y-3">
            {(["Savings Account", "Current Account"] as const).map((type) => {
              const selected = accountType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAccountType(type)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-[var(--copper)] bg-[var(--elevated-ivory)] ring-1 ring-[var(--copper)]"
                      : "border-[var(--border)] bg-[var(--white)] hover:bg-[var(--elevated-ivory)]"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--espresso)]">{type}</p>
                    <p className="mt-0.5 text-xs text-[var(--brown-grey)]">
                      {type === "Savings Account"
                        ? "Everyday student spending, UPI transfers, and savings."
                        : "Dedicated account for freelance or project cash flow."}
                    </p>
                  </div>
                  {selected && <Check className="h-4 w-4 text-[var(--copper)]" />}
                </button>
              );
            })}
          </div>

          {error && <p className="text-xs text-[var(--error-text)]">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep("bank")}
              className="inline-flex items-center gap-1 text-xs text-[var(--brown-grey)] hover:text-[var(--espresso)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSendOtp}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--copper)] px-5 py-2.5 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Sending code..." : "Continue to Verification"}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Email OTP Verification */}
      {step === "otp" && (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--copper)]">Step 3 of 3</p>
            <h1 className="mt-1 font-serif-display text-2xl text-[var(--espresso)]">Verify your email</h1>
            <p className="mt-1 text-xs leading-relaxed text-[var(--brown-grey)]">
              We sent a 6-digit PULSE verification code to <strong className="text-[var(--espresso)]">{user?.email}</strong>.
            </p>
          </div>

          <div>
            <label htmlFor="otp-input" className="mb-1.5 block text-xs font-medium text-[var(--espresso)]">
              6-digit verification code
            </label>
            <input
              id="otp-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoComplete="one-time-code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-4 py-3.5 text-center font-mono text-2xl tracking-[0.35em] text-[var(--espresso)] outline-none focus:border-[var(--copper)]"
            />
          </div>

          {error && <p className="text-xs text-[var(--error-text)]">{error}</p>}

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              disabled={cooldown > 0 || submitting}
              onClick={handleResendOtp}
              className="font-medium text-[var(--copper)] hover:underline disabled:text-[var(--muted-text)] disabled:no-underline"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
            <span className="inline-flex items-center gap-1 text-[var(--muted-text)]">
              <ShieldCheck className="h-3.5 w-3.5" /> Expires in 10 min
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep("account")}
              className="inline-flex items-center gap-1 text-xs text-[var(--brown-grey)] hover:text-[var(--espresso)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              type="submit"
              disabled={otpCode.length !== 6 || submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--espresso)] px-6 py-2.5 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)] disabled:opacity-45"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Verifying..." : "Verify"}
            </button>
          </div>
        </form>
      )}

      {/* Step 6: 3D Account Preparation Sequence */}
      {step === "preparing" && createdAccount && (
        <AccountPrep3D account={createdAccount} onContinue={() => onComplete(createdAccount)} />
      )}
    </div>
  );
}
