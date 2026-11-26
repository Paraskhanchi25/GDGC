"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { usePulseAuth } from "@/components/providers";
import { apiFetch, apiPrefix } from "@/lib/api";
import { formatINR, paiseToRupees } from "@/lib/format";
import type { OverviewData } from "@/types/pulse";

export default function AnalyticsPage() {
  const { isDemo } = usePulseAuth();
  const endpoint = isDemo ? `${apiPrefix(true)}/overview` : `${apiPrefix(false)}/analytics/overview`;

  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["overview", isDemo],
    queryFn: () => apiFetch<OverviewData>(endpoint, { isDemo }),
  });

  return (
    <AppShell unreadCount={data?.unread_notifications ?? 0}>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Intelligence</p>
          <h1 className="font-serif-display text-3xl text-[var(--text-primary)]">Spending Analytics</h1>
        </div>

        {isLoading || !data ? (
          <div className="h-64 animate-pulse rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)]" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <p className="text-xs text-[var(--text-muted)]">{data.period_comparison.current_month_label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {formatINR(data.period_comparison.current_month_expense_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Current month expenses</p>
              </div>
              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <p className="text-xs text-[var(--text-muted)]">{data.period_comparison.previous_month_label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {formatINR(data.period_comparison.previous_month_expense_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Previous month expenses</p>
              </div>
              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <p className="text-xs text-[var(--text-muted)]">Month-over-Month Change</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {data.period_comparison.change_percentage === null
                    ? "N/A"
                    : `${data.period_comparison.change_percentage > 0 ? "+" : ""}${data.period_comparison.change_percentage}%`}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Compared to prior month</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Monthly Income vs. Expenses</h2>
              <p className="mb-4 text-xs text-[var(--text-muted)]">Real monthly cash-flow history</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.monthly_trends.map((m) => ({
                      label: m.label,
                      Income: paiseToRupees(m.income_minor),
                      Expenses: paiseToRupees(m.expense_minor),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-stone)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#82776C" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#82776C" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      formatter={(val: number) => `₹${val.toLocaleString("en-IN")}`}
                      contentStyle={{
                        backgroundColor: "var(--bg-paper)",
                        borderColor: "var(--border-stone)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="Income" fill="#858B78" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expenses" fill="#443A33" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Category Totals</h2>
                <div className="mt-4 space-y-3">
                  {data.categories.map((c) => (
                    <div key={c.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">
                          {c.category} ({c.count})
                        </span>
                        <span className="tabular-nums text-[var(--text-secondary)]">
                          {c.amount_formatted} · {c.percentage}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]">
                        <div className="h-full rounded-full bg-[var(--accent-espresso)]" style={{ width: `${c.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Unusual Spending Observations</h2>
                <div className="mt-4 space-y-3">
                  {data.unusual_spending.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">No unusual spending spikes detected in recent history.</p>
                  ) : (
                    data.unusual_spending.map((u) => (
                      <div key={u.transaction_id} className="rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] p-3">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span>{u.merchant}</span>
                          <span className="tabular-nums">{u.amount_formatted}</span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {u.date} · {u.reason}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
