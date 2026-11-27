"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { apiFetch } from "@/lib/api";
import { formatINR, rupeesToPaise } from "@/lib/format";
import type { SimulatorResult } from "@/types/pulse";

export default function SimulatorPage() {
  const [purchaseName, setPurchaseName] = useState("Laptop");
  const [amountRupees, setAmountRupees] = useState("45000");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMonths, setPaymentMonths] = useState("1");

  const evalMutation = useMutation({
    mutationFn: () =>
      apiFetch<SimulatorResult>("/api/v1/simulator/evaluate", {
        method: "POST",
        body: JSON.stringify({
          purchase_name: purchaseName,
          purchase_amount_minor: rupeesToPaise(amountRupees),
          purchase_date: purchaseDate || null,
          payment_months: Number(paymentMonths) || 1,
        }),
      }),
  });

  const res = evalMutation.data;

  const outcomeBadge = (outcome: SimulatorResult["outcome"]) => {
    if (outcome === "affordable") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--positive)]/40 bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--positive)]">
          <CheckCircle2 className="h-4 w-4" /> Affordable
        </span>
      );
    }
    if (outcome === "affordable_with_caution") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--warning)]/40 bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--warning)]">
          <AlertTriangle className="h-4 w-4" /> Affordable with Caution
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--danger)]/40 bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--danger)]">
        <XCircle className="h-4 w-4" /> Not Recommended
      </span>
    );
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--amber)]">Decision Engine</p>
          <h1 className="font-serif-display text-3xl text-[var(--foreground)]">Purchase Affordability Simulator</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Evaluate a planned purchase against your liquid balance, upcoming commitments, and savings goals.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              evalMutation.mutate();
            }}
            className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 lg:col-span-5"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--foreground-muted)]">Purchase Name</label>
              <input
                required
                value={purchaseName}
                onChange={(e) => setPurchaseName(e.target.value)}
                placeholder="e.g., Laptop, Headphones"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-[var(--foreground)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--foreground-muted)]">Amount (INR)</label>
              <input
                required
                type="number"
                min="1"
                step="1"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-sm tabular-nums text-[var(--foreground)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--foreground-muted)]">Planned Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-xs text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--foreground-muted)]">Payment Schedule</label>
                <select
                  value={paymentMonths}
                  onChange={(e) => setPaymentMonths(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-xs text-[var(--foreground)]"
                >
                  <option value="1">Full upfront (1 month)</option>
                  <option value="3">3-month split</option>
                  <option value="6">6-month split</option>
                  <option value="12">12-month split</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: "₹45,000 Laptop", name: "Laptop", amt: "45000" },
                { label: "₹5,000 Headphones", name: "Wireless Headphones", amt: "5000" },
                { label: "₹1,800 Course", name: "Certification Course", amt: "1800" },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setPurchaseName(preset.name);
                    setAmountRupees(preset.amt);
                  }}
                  className="rounded-md border border-[var(--border)] bg-[var(--background-elevated)] px-2.5 py-1 text-[11px] text-[var(--foreground-muted)] hover:bg-[var(--surface-raised)]"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {evalMutation.isError && (
              <p className="text-xs text-[var(--danger)]">{(evalMutation.error as Error).message}</p>
            )}

            <button
              type="submit"
              disabled={evalMutation.isPending}
              className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {evalMutation.isPending ? "Calculating..." : "Evaluate Affordability"}
            </button>
          </form>

          <div className="surface-metallic rounded-xl p-5 lg:col-span-7">
            {!res ? (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <p className="text-sm font-medium text-[var(--foreground)]">Enter a purchase to run the simulation</p>
                <p className="mt-1 max-w-sm text-xs text-[var(--foreground-secondary)]">
                  PULSE calculates the result directly from your current balance, recurring bills, and savings targets.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
                  <div>
                    <p className="text-xs text-[var(--foreground-secondary)]">Simulation Result</p>
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">
                      {res.purchase_name} · {formatINR(res.purchase_amount_minor)}
                    </h2>
                  </div>
                  {outcomeBadge(res.outcome)}
                </div>

                <p className="text-sm leading-relaxed text-[var(--foreground-muted)]">{res.explanation}</p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background-elevated)] p-3.5">
                    <p className="text-xs text-[var(--foreground-secondary)]">Available Liquid Funds</p>
                    <p className="mt-1 text-base font-semibold tabular-nums">{formatINR(res.available_funds_minor)}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background-elevated)] p-3.5">
                    <p className="text-xs text-[var(--foreground-secondary)]">Expected Incoming Allowance</p>
                    <p className="mt-1 text-base font-semibold tabular-nums">
                      {formatINR(res.expected_incoming_income_minor)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background-elevated)] p-3.5">
                    <p className="text-xs text-[var(--foreground-secondary)]">Upcoming Commitments</p>
                    <p className="mt-1 text-base font-semibold tabular-nums">
                      -{formatINR(res.upcoming_commitments_minor)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background-elevated)] p-3.5">
                    <p className="text-xs text-[var(--foreground-secondary)]">Savings Commitments</p>
                    <p className="mt-1 text-base font-semibold tabular-nums">
                      -{formatINR(res.savings_commitments_minor)}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--foreground-muted)]">Projected Balance After Purchase</span>
                    <span className="text-base font-semibold tabular-nums text-[var(--champagne)]">
                      {formatINR(res.projected_balance_after_purchase_minor)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--foreground-secondary)]">
                    Recommended safety buffer: {formatINR(res.safety_buffer_minor)}
                  </p>
                </div>

                {res.goal_impacts.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-secondary)]">
                      Impact on Savings Goals
                    </h3>
                    <div className="mt-2 space-y-2">
                      {res.goal_impacts.map((gi) => (
                        <div
                          key={gi.goal_name}
                          className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-xs"
                        >
                          <span className="font-medium text-[var(--foreground)]">{gi.goal_name}</span>
                          <span className="text-[var(--foreground-secondary)]">{gi.impact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
