"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { usePulseAuth } from "@/components/providers";
import { apiFetch, apiPrefix } from "@/lib/api";
import { formatINR, paiseToRupees } from "@/lib/format";
import type { OverviewData } from "@/types/pulse";

export default function DashboardPage() {
  const { isDemo } = usePulseAuth();
  const endpoint = isDemo ? `${apiPrefix(true)}/overview` : `${apiPrefix(false)}/analytics/overview`;

  const { data, isLoading, error } = useQuery<OverviewData>({
    queryKey: ["overview", isDemo],
    queryFn: () => apiFetch<OverviewData>(endpoint, { isDemo }),
  });

  return (
    <AppShell unreadCount={data?.unread_notifications ?? 0}>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
              {data?.profile?.is_demo ? "Demo Workspace · Aarav Sharma" : "Personal Workspace"}
            </p>
            <h1 className="font-serif-display text-3xl text-[var(--text-primary)]">Financial Overview</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/transactions"
              className="rounded-lg border border-[var(--border-stone)] bg-[var(--bg-paper)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
            >
              Add Transaction
            </Link>
            <Link
              href="/simulator"
              className="rounded-lg bg-[var(--accent-espresso)] px-3.5 py-2 text-xs font-medium text-[var(--bg-paper)] hover:opacity-90"
            >
              Simulate Purchase
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)]" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-[var(--status-danger)] bg-[var(--bg-paper)] p-5 text-sm text-[var(--status-danger)]">
            Unable to load financial overview: {(error as Error).message}
          </div>
        )}

        {data && (
          <>
            {/* Top KPI Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <p className="text-xs text-[var(--text-muted)]">Available Balance</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                  {formatINR(data.available_balance_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Liquid funds across accounts</p>
              </div>

              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <p className="text-xs text-[var(--text-muted)]">Monthly Allowance</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                  {formatINR(data.monthly_allowance_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Month income: {formatINR(data.totals.total_income_minor)}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <p className="text-xs text-[var(--text-muted)]">This Month Spending</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                  {formatINR(data.totals.total_expense_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {data.totals.transaction_count} transactions recorded
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <p className="text-xs text-[var(--text-muted)]">Remaining Allowance</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                  {formatINR(data.remaining_allowance_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {data.forecast.days_remaining} days left in month
                </p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5 lg:col-span-7">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">30-Day Spending Trend</h2>
                    <p className="text-xs text-[var(--text-muted)]">Daily outflow in INR</p>
                  </div>
                  <Link href="/analytics" className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:underline">
                    Full analytics <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.daily_spending.map((d) => ({
                        ...d,
                        expense: paiseToRupees(d.expense_minor),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-stone)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#82776C" }} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis tick={{ fontSize: 11, fill: "#82776C" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip
                        formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, "Spent"]}
                        contentStyle={{
                          backgroundColor: "var(--bg-paper)",
                          borderColor: "var(--border-stone)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#443A33"
                        strokeWidth={2}
                        fill="#A69B8D"
                        fillOpacity={0.22}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5 lg:col-span-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">Category Breakdown</h2>
                    <p className="text-xs text-[var(--text-muted)]">Current month expenses</p>
                  </div>
                </div>
                {data.categories.length === 0 ? (
                  <p className="py-12 text-center text-sm text-[var(--text-muted)]">No expenses this month yet.</p>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={data.categories.slice(0, 6).map((c) => ({
                          category: c.category,
                          amount: paiseToRupees(c.amount_minor),
                        }))}
                        margin={{ left: 10, right: 16 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-stone)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#82776C" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                        <YAxis type="category" dataKey="category" width={88} tick={{ fontSize: 11, fill: "#443A33" }} tickLine={false} axisLine={false} />
                        <Tooltip
                          formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, "Spent"]}
                          contentStyle={{
                            backgroundColor: "var(--bg-paper)",
                            borderColor: "var(--border-stone)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="amount" fill="#858B78" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Insights, Recurring, Goals */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Insights */}
              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Financial Insights</h2>
                <div className="mt-4 space-y-3">
                  {data.insights.map((ins) => (
                    <div key={ins.id} className="rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] p-3">
                      <div className="flex items-start gap-2">
                        {ins.type === "warning" ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning)]" />
                        ) : ins.type === "positive" ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-positive)]" />
                        ) : (
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-[var(--text-primary)]">{ins.title}</p>
                          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{ins.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Recurring */}
              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Upcoming Recurring</h2>
                  <Link href="/recurring" className="text-xs text-[var(--text-secondary)] hover:underline">
                    Manage
                  </Link>
                </div>
                <div className="mt-4 space-y-2.5">
                  {data.recurring_payments.slice(0, 5).map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-3 py-2.5"
                    >
                      <div>
                        <p className="text-xs font-medium text-[var(--text-primary)]">{rec.merchant}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Due {rec.next_payment_date} · {rec.frequency}
                        </p>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                        {formatINR(rec.expected_amount_minor)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Savings Progress */}
              <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Savings Goals</h2>
                  <Link href="/goals" className="text-xs text-[var(--text-secondary)] hover:underline">
                    View all
                  </Link>
                </div>
                <div className="mt-4 space-y-3.5">
                  {data.goals.slice(0, 3).map((g) => (
                    <div key={g.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">{g.name}</span>
                        <span className="tabular-nums text-[var(--text-muted)]">{g.progress_percentage}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent-sage)]"
                          style={{ width: `${Math.min(100, g.progress_percentage)}%` }}
                        />
                      </div>
                      <p className="text-[11px] tabular-nums text-[var(--text-muted)]">
                        {formatINR(g.current_amount_minor)} of {formatINR(g.target_amount_minor)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Transactions</h2>
                <Link href="/transactions" className="text-xs text-[var(--text-secondary)] hover:underline">
                  View all transactions
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-stone)] text-xs text-[var(--text-muted)]">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Merchant</th>
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium">Method</th>
                      <th className="pb-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-stone)]">
                    {data.recent_transactions.map((tx) => (
                      <tr key={tx.id} className="text-xs">
                        <td className="py-2.5 tabular-nums text-[var(--text-muted)]">{tx.transaction_date}</td>
                        <td className="py-2.5 font-medium text-[var(--text-primary)]">{tx.merchant}</td>
                        <td className="py-2.5 text-[var(--text-secondary)]">{tx.category_name}</td>
                        <td className="py-2.5 text-[var(--text-muted)]">{tx.payment_method}</td>
                        <td
                          className={`py-2.5 text-right font-semibold tabular-nums ${
                            tx.transaction_type === "income" ? "text-[var(--status-positive)]" : "text-[var(--text-primary)]"
                          }`}
                        >
                          {tx.transaction_type === "income" ? "+" : "-"}
                          {formatINR(tx.amount_minor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
