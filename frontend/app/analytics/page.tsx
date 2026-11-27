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
import { DashboardSkeleton } from "@/components/skeletons";
import { apiFetch } from "@/lib/api";
import { formatINR, paiseToRupees } from "@/lib/format";
import type { OverviewData } from "@/types/pulse";

export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery<OverviewData>({
    queryKey: ["overview"],
    queryFn: () => apiFetch<OverviewData>("/api/v1/analytics/overview"),
  });

  return (
    <AppShell unreadCount={data?.unread_notifications ?? 0}>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--amber)]">Intelligence</p>
          <h1 className="font-serif-display text-3xl text-[var(--foreground)]">Spending Analytics</h1>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : error || !data ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--danger)]">
            {(error as Error)?.message || "Unable to load analytics right now."}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs text-[var(--foreground-secondary)]">{data.period_comparison.current_month_label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                  {formatINR(data.period_comparison.current_month_expense_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--foreground-secondary)]">Current month expenses</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs text-[var(--foreground-secondary)]">{data.period_comparison.previous_month_label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                  {formatINR(data.period_comparison.previous_month_expense_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--foreground-secondary)]">Previous month expenses</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs text-[var(--foreground-secondary)]">Month-over-Month Change</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--champagne)]">
                  {data.period_comparison.change_percentage === null
                    ? "N/A"
                    : `${data.period_comparison.change_percentage > 0 ? "+" : ""}${data.period_comparison.change_percentage}%`}
                </p>
                <p className="mt-1 text-xs text-[var(--foreground-secondary)]">Compared to prior month</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Monthly Income vs. Expenses</h2>
              <p className="mb-4 text-xs text-[var(--foreground-secondary)]">Cash-flow history in INR</p>
              {data.monthly_trends.length === 0 ? (
                <p className="py-10 text-center text-xs text-[var(--foreground-secondary)]">
                  Not enough monthly history yet.
                </p>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.monthly_trends.map((m) => ({
                        label: m.label,
                        Income: paiseToRupees(m.income_minor),
                        Expenses: paiseToRupees(m.expense_minor),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#352920" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#A99B8A" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#A99B8A" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip
                        formatter={(val: number) => `₹${val.toLocaleString("en-IN")}`}
                        contentStyle={{
                          backgroundColor: "#211812",
                          borderColor: "#49392E",
                          borderRadius: "8px",
                          color: "#F4EBDD",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px", color: "#C8BBAA" }} />
                      <Bar dataKey="Income" fill="#91A88B" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Expenses" fill="#B8754C" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Category Totals</h2>
                <div className="mt-4 space-y-3">
                  {data.categories.length === 0 ? (
                    <p className="text-xs text-[var(--foreground-secondary)]">No category expenses recorded yet.</p>
                  ) : (
                    data.categories.map((c) => (
                      <div key={c.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[var(--foreground)]">
                            {c.category} ({c.count})
                          </span>
                          <span className="tabular-nums text-[var(--foreground-muted)]">
                            {c.amount_formatted} · {c.percentage}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--background)]">
                          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${c.percentage}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Unusual Spending Observations</h2>
                <div className="mt-4 space-y-3">
                  {data.unusual_spending.length === 0 ? (
                    <p className="text-xs text-[var(--foreground-secondary)]">No unusual spending spikes detected.</p>
                  ) : (
                    data.unusual_spending.map((u) => (
                      <div key={u.transaction_id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background-elevated)] p-3">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span>{u.merchant}</span>
                          <span className="tabular-nums text-[var(--amber)]">{u.amount_formatted}</span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--foreground-secondary)]">
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
