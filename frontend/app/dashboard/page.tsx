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
import { AlertTriangle, ArrowUpRight, CheckCircle2, Info, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DashboardSkeleton } from "@/components/skeletons";
import { apiFetch } from "@/lib/api";
import { formatINR, paiseToRupees } from "@/lib/format";
import type { OverviewData } from "@/types/pulse";

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery<OverviewData>({
    queryKey: ["overview"],
    queryFn: () => apiFetch<OverviewData>("/api/v1/analytics/overview"),
  });

  return (
    <AppShell unreadCount={data?.unread_notifications ?? 0}>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--amber)]">Personal Workspace</p>
            <h1 className="font-serif-display text-3xl text-[var(--foreground)]">Financial Overview</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/transactions"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-medium text-[var(--foreground-muted)] transition hover:bg-[var(--surface-raised)]"
            >
              Add Transaction
            </Link>
            <Link
              href="/simulator"
              className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-medium text-[var(--background)] transition hover:bg-[var(--accent-hover)]"
            >
              Simulate Purchase
            </Link>
          </div>
        </div>

        {isLoading && <DashboardSkeleton />}

        {error && (
          <div className="surface-metallic flex flex-col items-start justify-between gap-4 rounded-xl p-5 sm:flex-row sm:items-center">
            <p className="text-sm text-[var(--danger)]">{(error as Error).message}</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        )}

        {data && (
          <>
            {/* Top KPI Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="surface-metallic copper-glow rounded-xl p-5">
                <p className="text-xs text-[var(--foreground-secondary)]">Available Balance</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--champagne)]">
                  {formatINR(data.available_balance_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--foreground-secondary)]">Liquid funds across accounts</p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs text-[var(--foreground-secondary)]">Monthly Allowance</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                  {formatINR(data.monthly_allowance_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--positive)]">
                  Month income: {formatINR(data.totals.total_income_minor)}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs text-[var(--foreground-secondary)]">This Month Spending</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                  {formatINR(data.totals.total_expense_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--foreground-secondary)]">
                  {data.totals.transaction_count} transactions recorded
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs text-[var(--foreground-secondary)]">Remaining Allowance</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                  {formatINR(data.remaining_allowance_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--foreground-secondary)]">
                  {data.forecast.days_remaining} days left in month
                </p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 lg:col-span-7">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">30-Day Spending Trend</h2>
                    <p className="text-xs text-[var(--foreground-secondary)]">Daily outflow in INR</p>
                  </div>
                  <Link
                    href="/analytics"
                    className="inline-flex items-center gap-1 text-xs text-[var(--champagne)] hover:underline"
                  >
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#352920" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#A99B8A" }} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis tick={{ fontSize: 11, fill: "#A99B8A" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip
                        formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, "Spent"]}
                        contentStyle={{
                          backgroundColor: "#211812",
                          borderColor: "#49392E",
                          borderRadius: "8px",
                          color: "#F4EBDD",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#D59A58"
                        strokeWidth={2}
                        fill="#B8754C"
                        fillOpacity={0.25}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 lg:col-span-5">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">Category Breakdown</h2>
                  <p className="text-xs text-[var(--foreground-secondary)]">Current month expenses</p>
                </div>
                {data.categories.length === 0 ? (
                  <div className="flex h-52 flex-col items-center justify-center text-center">
                    <p className="text-sm text-[var(--foreground-muted)]">No expenses recorded this month yet.</p>
                    <Link href="/transactions" className="mt-2 text-xs text-[var(--champagne)] hover:underline">
                      Add your first transaction
                    </Link>
                  </div>
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#352920" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#A99B8A" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                        <YAxis type="category" dataKey="category" width={88} tick={{ fontSize: 11, fill: "#C8BBAA" }} tickLine={false} axisLine={false} />
                        <Tooltip
                          formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, "Spent"]}
                          contentStyle={{
                            backgroundColor: "#211812",
                            borderColor: "#49392E",
                            borderRadius: "8px",
                            color: "#F4EBDD",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="amount" fill="#B8754C" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Insights, Recurring, Goals */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Financial Insights</h2>
                <div className="mt-4 space-y-3">
                  {data.insights.map((ins) => (
                    <div key={ins.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background-elevated)] p-3">
                      <div className="flex items-start gap-2">
                        {ins.type === "warning" ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
                        ) : ins.type === "positive" ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--positive)]" />
                        ) : (
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--champagne)]" />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-[var(--foreground)]">{ins.title}</p>
                          <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">{ins.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">Upcoming Recurring</h2>
                  <Link href="/recurring" className="text-xs text-[var(--champagne)] hover:underline">
                    Manage
                  </Link>
                </div>
                {data.recurring_payments.length === 0 ? (
                  <p className="mt-6 text-xs text-[var(--foreground-secondary)]">
                    No recurring payments detected yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-2.5">
                    {data.recurring_payments.slice(0, 5).map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2.5"
                      >
                        <div>
                          <p className="text-xs font-medium text-[var(--foreground)]">{rec.merchant}</p>
                          <p className="text-[11px] text-[var(--foreground-secondary)]">
                            Due {rec.next_payment_date} · {rec.frequency}
                          </p>
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-[var(--champagne)]">
                          {formatINR(rec.expected_amount_minor)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">Savings Goals</h2>
                  <Link href="/goals" className="text-xs text-[var(--champagne)] hover:underline">
                    View all
                  </Link>
                </div>
                {data.goals.length === 0 ? (
                  <div className="mt-6">
                    <p className="text-xs text-[var(--foreground-secondary)]">No savings goals created yet.</p>
                    <Link href="/goals" className="mt-2 inline-block text-xs text-[var(--champagne)] hover:underline">
                      Create a goal
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3.5">
                    {data.goals.slice(0, 3).map((g) => (
                      <div key={g.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[var(--foreground)]">{g.name}</span>
                          <span className="tabular-nums text-[var(--foreground-secondary)]">{g.progress_percentage}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--background)]">
                          <div
                            className="h-full rounded-full bg-[var(--positive)]"
                            style={{ width: `${Math.min(100, g.progress_percentage)}%` }}
                          />
                        </div>
                        <p className="text-[11px] tabular-nums text-[var(--foreground-secondary)]">
                          {formatINR(g.current_amount_minor)} of {formatINR(g.target_amount_minor)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Recent Transactions</h2>
                <Link href="/transactions" className="text-xs text-[var(--champagne)] hover:underline">
                  View all transactions
                </Link>
              </div>
              {data.recent_transactions.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--foreground-secondary)]">
                  No transactions recorded yet. Add your first expense or import a CSV to get started.
                </p>
              ) : (
                <div className="space-y-2 sm:hidden">
                  {data.recent_transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--background-elevated)] p-3"
                    >
                      <div>
                        <p className="text-xs font-medium text-[var(--foreground)]">{tx.merchant}</p>
                        <p className="text-[11px] text-[var(--foreground-secondary)]">
                          {tx.transaction_date} · {tx.category_name}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold tabular-nums ${
                          tx.transaction_type === "income" ? "text-[var(--positive)]" : "text-[var(--foreground)]"
                        }`}
                      >
                        {tx.transaction_type === "income" ? "+" : "-"}
                        {formatINR(tx.amount_minor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {data.recent_transactions.length > 0 && (
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-xs text-[var(--foreground-secondary)]">
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium">Merchant</th>
                        <th className="pb-2 font-medium">Category</th>
                        <th className="pb-2 font-medium">Method</th>
                        <th className="pb-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {data.recent_transactions.map((tx) => (
                        <tr key={tx.id} className="text-xs">
                          <td className="py-2.5 tabular-nums text-[var(--foreground-secondary)]">{tx.transaction_date}</td>
                          <td className="py-2.5 font-medium text-[var(--foreground)]">{tx.merchant}</td>
                          <td className="py-2.5 text-[var(--foreground-muted)]">{tx.category_name}</td>
                          <td className="py-2.5 text-[var(--foreground-secondary)]">{tx.payment_method}</td>
                          <td
                            className={`py-2.5 text-right font-semibold tabular-nums ${
                              tx.transaction_type === "income" ? "text-[var(--positive)]" : "text-[var(--foreground)]"
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
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
