"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { usePulseAuth } from "@/components/providers";
import { apiFetch, apiPrefix } from "@/lib/api";
import { formatINR } from "@/lib/format";
import type { OverviewData } from "@/types/pulse";

export default function ForecastPage() {
  const { isDemo } = usePulseAuth();
  const base = apiPrefix(isDemo);
  const endpoint = isDemo ? `${base}/overview` : `${base}/analytics/overview`;

  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["overview", isDemo],
    queryFn: () => apiFetch<OverviewData>(endpoint, { isDemo }),
  });

  const f = data?.forecast;

  return (
    <AppShell unreadCount={data?.unread_notifications ?? 0}>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Cash-Flow Projection</p>
          <h1 className="font-serif-display text-3xl text-[var(--text-primary)]">Allowance Forecast</h1>
        </div>

        {isLoading || !f ? (
          <div className="h-48 animate-pulse rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)]" />
        ) : (
          <>
            <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Projected Month-End Balance</p>
                  <p
                    className={`mt-2 text-3xl font-semibold tabular-nums ${
                      f.potential_shortfall_minor > 0 ? "text-[var(--status-danger)]" : "text-[var(--status-positive)]"
                    }`}
                  >
                    {formatINR(f.projected_month_end_balance_minor)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{f.summary}</p>
                </div>
                <span className="rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                  Data Sufficiency: <strong className="capitalize">{f.data_sufficiency}</strong>
                </span>
              </div>
              <p className="mt-4 border-t border-[var(--border-stone)] pt-3 text-xs text-[var(--text-muted)]">
                {f.methodology_note}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <p className="text-xs text-[var(--text-muted)]">Current Month Spending</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{formatINR(f.current_spending_minor)}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{f.days_elapsed} days elapsed</p>
              </div>

              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <p className="text-xs text-[var(--text-muted)]">Average Daily Spending</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{formatINR(f.average_daily_spending_minor)}/day</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{f.days_remaining} days remaining</p>
              </div>

              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <p className="text-xs text-[var(--text-muted)]">Expected Remaining Variable Spend</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{formatINR(f.expected_remaining_spending_minor)}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Daily rate × remaining days</p>
              </div>

              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <p className="text-xs text-[var(--text-muted)]">Upcoming Recurring Bills</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{formatINR(f.upcoming_recurring_minor)}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {f.upcoming_recurring_items.length} scheduled before {f.month_end_date}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <p className="text-xs text-[var(--text-muted)]">Expected Incoming Allowance</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{formatINR(f.expected_incoming_allowance_minor)}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Before month end</p>
              </div>

              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <p className="text-xs text-[var(--text-muted)]">Potential Shortfall</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{formatINR(f.potential_shortfall_minor)}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Zero means balance stays positive</p>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
