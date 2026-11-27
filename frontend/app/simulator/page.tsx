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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--sage)] px-3 py-1 text-xs font-semibold text-[var(--positive)]">
          <CheckCircle2 className="h-4 w-4" /> Affordable
        </span>
      );
    }
    if (outcome === "affordable_with_caution") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--warning-bg)] px-3 py-1 text-xs font-semibold text-[var(--warning-text)]">
          <AlertTriangle className="h-4 w-4" /> Affordable with Caution
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--error-bg)] px-3 py-1 text-xs font-semibold text-[var(--error-text)]">
        <XCircle className="h-4 w-4" /> Not Recommended
      </span>
    );
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--copper)]">Decision Engine</p>
          <h1 className="font-serif-display text-3xl text-[var(--espresso)]">Purchase Affordability Simulator</h1>
          <p className="mt-1 text-sm text-[var(--brown-grey)]">
            Evaluate a planned purchase against your liquid balance, upcoming commitments, and savings goals.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              evalMutation.mutate();
            }}
            className="pulse-card space-y-4 rounded-2xl p-5 lg:col-span-5"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--espresso)]">Purchase Name</label>
              <input
                required
                value={purchaseName}
                onChange={(e) => setPurchaseName(e.target.value)}
                placeholder="e.g., Laptop, Headphones"
                className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-sm text-[var(--espresso)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--espresso)]">Amount (INR)</label>
              <input
                required
                type="number"
                min="1"
                step="1"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-sm tabular-nums text-[var(--espresso)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--espresso)]">Planned Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-xs text-[var(--espresso)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--espresso)]">Payment Schedule</label>
                <select
                  value={paymentMonths}
                  onChange={(e) => setPaymentMonths(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-xs text-[var(--espresso)]"
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
                  className="rounded-lg border border-[var(--border)] bg-[var(--elevated-ivory)] px-2.5 py-1 text-[11px] text-[var(--brown-grey)] hover:bg-[var(--cream)]"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {evalMutation.isError && (
              <p className="text-xs text-[var(--error-text)]">{(evalMutation.error as Error).message}</p>
            )}

            <button
              type="submit"
              disabled={evalMutation.isPending}
              className="w-full rounded-xl bg-[var(--copper)] py-2.5 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)] disabled:opacity-50"
            >
              {evalMutation.isPending ? "Calculating..." : "Evaluate Affordability"}
            </button>
          </form>

          <div className="pulse-card rounded-2xl p-6 lg:col-span-7">
            {!res ? (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <p className="text-sm font-medium text-[var(--espresso)]">Enter a purchase to run the simulation</p>
                <p className="mt-1 max-w-sm text-xs text-[var(--brown-grey)]">
                  PULSE calculates the result directly from your current balance, recurring bills, and savings targets.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                  <div>
                    <p className="text-xs text-[var(--brown-grey)]">Simulation Result</p>
                    <h2 className="text-lg font-semibold text-[var(--espresso)]">
                      {res.purchase_name} · {formatINR(res.purchase_amount_minor)}
                    </h2>
                  </div>
                  {outcomeBadge(res.outcome)}
                </div>

                <p className="text-sm leading-relaxed text-[var(--brown-grey)]">{res.explanation}</p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="pulse-card-ivory rounded-xl p-3.5">
                    <p className="text-xs text-[var(--brown-grey)]">Available Liquid Funds</p>
                    <p className="mt-1 text-base font-semibold tabular-nums text-[var(--espresso)]">{formatINR(res.available_funds_minor)}</p>
                  </div>
                  <div className="pulse-card-ivory rounded-xl p-3.5">
                    <p className="text-xs text-[var(--brown-grey)]">Expected Incoming Allowance</p>
                    <p className="mt-1 text-base font-semibold tabular-nums text-[var(--espresso)]">
                      {formatINR(res.expected_incoming_income_minor)}
                    </p>
                  </div>
                  <div className="pulse-card-ivory rounded-xl p-3.5">
                    <p className="text-xs text-[var(--brown-grey)]">Upcoming Commitments</p>
                    <p className="mt-1 text-base font-semibold tabular-nums text-[var(--espresso)]">
                      -{formatINR(res.upcoming_commitments_minor)}
                    </p>
                  </div>
                  <div className="pulse-card-ivory rounded-xl p-3.5">
                    <p className="text-xs text-[var(--brown-grey)]">Savings Commitments</p>
                    <p className="mt-1 text-base font-semibold tabular-nums text-[var(--espresso)]">
                      -{formatINR(res.savings_commitments_minor)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--cream)] p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--espresso)]">Projected Balance After Purchase</span>
                    <span className="text-base font-semibold tabular-nums text-[var(--deep-copper)]">
                      {formatINR(res.projected_balance_after_purchase_minor)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--brown-grey)]">
                    Recommended safety buffer: {formatINR(res.safety_buffer_minor)}
                  </p>
                </div>

                {res.goal_impacts.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--brown-grey)]">
                      Impact on Savings Goals
                    </h3>
                    <div className="mt-2 space-y-2">
                      {res.goal_impacts.map((gi) => (
                        <div
                          key={gi.goal_name}
                          className="pulse-card-ivory flex items-center justify-between rounded-xl px-3 py-2 text-xs"
                        >
                          <span className="font-medium text-[var(--espresso)]">{gi.goal_name}</span>
                          <span className="text-[var(--brown-grey)]">{gi.impact}</span>
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
