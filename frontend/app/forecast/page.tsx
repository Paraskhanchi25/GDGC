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
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--blue-accent)]">Cash-Flow Projection</p>
          <h1 className="font-serif-display text-3xl text-[var(--espresso)]">Allowance Forecast</h1>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : error || !f ? (
          <div className="pulse-card rounded-2xl p-5 text-sm text-[var(--error-text)]">
            {(error as Error)?.message || "Unable to load forecast right now."}
          </div>
        ) : (
          <>
            <div className="pulse-card rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--brown-grey)]">Projected Month-End Balance</p>
                  <p
                    className={`mt-2 text-3xl font-semibold tabular-nums ${
                      f.potential_shortfall_minor > 0 ? "text-[var(--error-text)]" : "text-[var(--positive)]"
                    }`}
                  >
                    {formatINR(f.projected_month_end_balance_minor)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--brown-grey)]">{f.summary}</p>
                </div>
                <span className="rounded-xl border border-[var(--border)] bg-[var(--soft-blue)]/45 px-3 py-1.5 text-xs text-[var(--espresso)]">
                  Data Sufficiency: <strong className="capitalize text-[var(--blue-accent)]">{f.data_sufficiency}</strong>
                </span>
              </div>
              <p className="mt-4 border-t border-[var(--border)] pt-3 text-xs text-[var(--brown-grey)]">
                {f.methodology_note}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="pulse-card rounded-2xl p-5">
                <p className="text-xs text-[var(--brown-grey)]">Current Month Spending</p>
                <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--espresso)]">{formatINR(f.current_spending_minor)}</p>
                <p className="mt-1 text-xs text-[var(--brown-grey)]">{f.days_elapsed} days elapsed</p>
              </div>

              <div className="pulse-card rounded-2xl p-5">
                <p className="text-xs text-[var(--brown-grey)]">Average Daily Spending</p>
                <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--espresso)]">{formatINR(f.average_daily_spending_minor)}/day</p>
                <p className="mt-1 text-xs text-[var(--brown-grey)]">{f.days_remaining} days remaining</p>
              </div>

              <div className="pulse-card rounded-2xl p-5">
                <p className="text-xs text-[var(--brown-grey)]">Expected Remaining Variable Spend</p>
                <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--espresso)]">{formatINR(f.expected_remaining_spending_minor)}</p>
                <p className="mt-1 text-xs text-[var(--brown-grey)]">Daily rate × remaining days</p>
              </div>

              <div className="pulse-card rounded-2xl p-5">
                <p className="text-xs text-[var(--brown-grey)]">Upcoming Recurring Bills</p>
                <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--espresso)]">{formatINR(f.upcoming_recurring_minor)}</p>
                <p className="mt-1 text-xs text-[var(--brown-grey)]">
                  {f.upcoming_recurring_items.length} scheduled before {f.month_end_date}
                </p>
              </div>

              <div className="pulse-card rounded-2xl p-5">
                <p className="text-xs text-[var(--brown-grey)]">Expected Incoming Allowance</p>
                <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--espresso)]">{formatINR(f.expected_incoming_allowance_minor)}</p>
                <p className="mt-1 text-xs text-[var(--brown-grey)]">Before month end</p>
              </div>

              <div className="pulse-card rounded-2xl p-5">
                <p className="text-xs text-[var(--brown-grey)]">Potential Shortfall</p>
                <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--espresso)]">{formatINR(f.potential_shortfall_minor)}</p>
                <p className="mt-1 text-xs text-[var(--brown-grey)]">Zero means balance stays positive</p>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
