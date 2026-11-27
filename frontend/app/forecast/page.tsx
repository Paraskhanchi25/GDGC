"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { DashboardSkeleton } from "@/components/skeletons";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";
import type { OverviewData } from "@/types/pulse";

export default function ForecastPage() {
  const { data, isLoading, error } = useQuery<OverviewData>({
    queryKey: ["overview"],
    queryFn: () => apiFetch<OverviewData>("/api/v1/analytics/overview"),
  });

  const f = data?.forecast;

  return (
    <AppShell unreadCount={data?.unread_notifications ?? 0}>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--amber)]">Cash-Flow Projection</p>
          <h1 className="font-serif-display text-3xl text-[var(--foreground)]">Allowance Forecast</h1>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : error || !f ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--danger)]">
            {(error as Error)?.message || "Unable to load forecast right now."}
          </div>
        ) : (
          <>
            <div className="surface-metallic copper-glow rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--foreground-secondary)]">
                    Projected Month-End Balance
                  </p>
                  <p
                    className={`mt-2 text-3xl font-semibold tabular-nums ${
                      f.potential_shortfall_minor > 0 ? "text-[var(--danger)]" : "text-[var(--positive)]"
                    }`}
                  >
                    {formatINR(f.projected_month_end_balance_minor)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">{f.summary}</p>
                </div>
                <span className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--foreground-muted)]">
                  Data Sufficiency: <strong className="capitalize text-[var(--champagne)]">{f.data_sufficiency}</strong>
                </span>
              </div>
              <p className="mt-4 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--foreground-secondary)]">
                {f.methodology_note}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs text-[var(--foreground-secondary)]">Current Month Spending</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{formatINR(f.current_spending_minor)}</p>
                <p className="mt-1 text-xs text-[var(--foreground-secondary)]">{f.days_elapsed} days elapsed</p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs text-[var(--foreground-secondary)]">Average Daily Spending</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{formatINR(f.average_daily_spending_minor)}/day</p>
                <p className="mt-1 text-xs text-[var(--foreground-secondary)]">{f.days_remaining} days remaining</p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs text-[var(--foreground-secondary)]">Expected Remaining Variable Spend</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{formatINR(f.expected_remaining_spending_minor)}</p>
                <p className="mt-1 text-xs text-[var(--foreground-secondary)]">Daily rate × remaining days</p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs text-[var(--foreground-secondary)]">Upcoming Recurring Bills</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{formatINR(f.upcoming_recurring_minor)}</p>
                <p className="mt-1 text-xs text-[var(--foreground-secondary)]">
                  {f.upcoming_recurring_items.length} scheduled before {f.month_end_date}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs text-[var(--foreground-secondary)]">Expected Incoming Allowance</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{formatINR(f.expected_incoming_allowance_minor)}</p>
                <p className="mt-1 text-xs text-[var(--foreground-secondary)]">Before month end</p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs text-[var(--foreground-secondary)]">Potential Shortfall</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{formatINR(f.potential_shortfall_minor)}</p>
                <p className="mt-1 text-xs text-[var(--foreground-secondary)]">Zero means balance stays positive</p>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
