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
import { ChartSummary } from "@/components/chart-summary";
import { PageHeading } from "@/components/page-heading";
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
        <PageHeading eyebrow="Patterns" title="Spending, in perspective" description="See how your month is taking shape, and where your spending has changed." />

        {isLoading ? (
          <DashboardSkeleton />
        ) : error || !data ? (
          <div className="pulse-card rounded-2xl p-5 text-sm text-[var(--error-text)]">
            {(error as Error)?.message || "Unable to load analytics right now."}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="pulse-card rounded-2xl p-5">
                <p className="text-xs text-[var(--brown-grey)]">{data.period_comparison.current_month_label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--espresso)]">
                  {formatINR(data.period_comparison.current_month_expense_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--brown-grey)]">Current month expenses</p>
              </div>
              <div className="pulse-card rounded-2xl p-5">
                <p className="text-xs text-[var(--brown-grey)]">{data.period_comparison.previous_month_label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--espresso)]">
                  {formatINR(data.period_comparison.previous_month_expense_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--brown-grey)]">Previous month expenses</p>
              </div>
              <div className="pulse-card-lavender rounded-2xl p-5">
                <p className="text-xs text-[var(--plum)]">Month-over-Month Change</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--espresso)]">
                  {data.period_comparison.change_percentage === null
                    ? "N/A"
                    : `${data.period_comparison.change_percentage > 0 ? "+" : ""}${data.period_comparison.change_percentage}%`}
                </p>
                <p className="mt-1 text-xs text-[var(--brown-grey)]">Compared to prior month</p>
              </div>
            </div>

            <div className="pulse-card rounded-2xl p-5">
              <h2 className="text-lg font-medium text-[var(--espresso)]">Monthly income and expenses</h2>
              <ChartSummary data={data} />
              <p className="mb-4 text-xs text-[var(--brown-grey)]">Cash-flow history in INR</p>
              {data.monthly_trends.length === 0 ? (
                <p className="py-10 text-center text-xs text-[var(--brown-grey)]">Not enough monthly history yet.</p>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart accessibilityLayer
                      data={data.monthly_trends.map((m) => ({
                        label: m.label,
                        Income: paiseToRupees(m.income_minor),
                        Expenses: paiseToRupees(m.expense_minor),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E9E4DC" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 14, fill: "#766E66" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 14, fill: "#766E66" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip
                        formatter={(val: number) => `₹${val.toLocaleString("en-IN")}`}
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          borderColor: "#E9E4DC",
                          borderRadius: "12px",
                          color: "#29231F",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px", color: "#29231F" }} />
                      <Bar isAnimationActive={false} dataKey="Income" fill="#54734C" radius={[6, 6, 0, 0]} />
                      <Bar isAnimationActive={false} dataKey="Expenses" fill="#B87950" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="pulse-card rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[var(--espresso)]">Category Totals</h2>
                <div className="mt-4 space-y-3">
                  {data.categories.length === 0 ? (
                    <p className="text-xs text-[var(--brown-grey)]">No category expenses recorded yet.</p>
                  ) : (
                    data.categories.map((c) => (
                      <div key={c.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[var(--espresso)]">
                            {c.category} ({c.count})
                          </span>
                          <span className="tabular-nums text-[var(--brown-grey)]">
                            {c.amount_formatted} · {c.percentage}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--cream)]">
                          <div className="h-full rounded-full bg-[var(--copper)]" style={{ width: `${c.percentage}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pulse-card rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[var(--espresso)]">Unusual Spending Observations</h2>
                <div className="mt-4 space-y-3">
                  {data.unusual_spending.length === 0 ? (
                    <p className="text-xs text-[var(--brown-grey)]">No unusual spending spikes detected.</p>
                  ) : (
                    data.unusual_spending.map((u) => (
                      <div key={u.transaction_id} className="pulse-card-ivory rounded-xl p-3">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-[var(--espresso)]">{u.merchant}</span>
                          <span className="tabular-nums text-[var(--deep-copper)]">{u.amount_formatted}</span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--brown-grey)]">
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
