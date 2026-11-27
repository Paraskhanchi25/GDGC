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
import { usePulseAuth } from "@/components/providers";
import { DashboardSkeleton } from "@/components/skeletons";
import { apiFetch } from "@/lib/api";
import { formatINR, paiseToRupees } from "@/lib/format";
import type { OverviewData } from "@/types/pulse";

export default function DashboardPage() {
  const { user } = usePulseAuth();
  const firstName = user?.displayName?.split(" ")[0] || "there";

  const { data, isLoading, error, refetch } = useQuery<OverviewData>({
    queryKey: ["overview"],
    queryFn: () => apiFetch<OverviewData>("/api/v1/analytics/overview"),
  });

  return (
    <AppShell unreadCount={data?.unread_notifications ?? 0}>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--copper)]">Welcome back, {firstName}</p>
            <h1 className="font-serif-display text-3xl text-[var(--espresso)]">Financial Overview</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/transactions"
              className="rounded-xl border border-[var(--border-strong)] bg-[var(--white)] px-3.5 py-2 text-xs font-medium text-[var(--espresso)] transition hover:bg-[var(--cream)]"
            >
              Add Transaction
            </Link>
            <Link
              href="/simulator"
              className="rounded-xl bg-[var(--copper)] px-3.5 py-2 text-xs font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)]"
            >
              Simulate Purchase
            </Link>
          </div>
        </div>

        {isLoading && <DashboardSkeleton />}

        {error && (
          <div className="pulse-card flex flex-col items-start justify-between gap-4 rounded-2xl p-5 sm:flex-row sm:items-center">
            <p className="text-sm text-[var(--error-text)]">{(error as Error).message}</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3.5 py-2 text-xs font-medium text-[var(--espresso)] hover:bg-[var(--cream)]"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        )}

        {data && (
          <>
            {/* Top KPI Row with deliberate hierarchy */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--espresso)] p-5 text-[var(--white)] shadow-sm">
                <p className="text-xs text-[var(--champagne)]">Available Balance</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {formatINR(data.available_balance_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--champagne)]/80">Liquid funds across accounts</p>
              </div>

              <div className="pulse-card rounded-2xl p-5">
                <p className="text-xs text-[var(--brown-grey)]">Monthly Allowance</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--espresso)]">
                  {formatINR(data.monthly_allowance_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--positive)]">
                  Month income: {formatINR(data.totals.total_income_minor)}
                </p>
              </div>

              <div className="pulse-card rounded-2xl p-5">
                <p className="text-xs text-[var(--brown-grey)]">This Month Spending</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--espresso)]">
                  {formatINR(data.totals.total_expense_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--brown-grey)]">
                  {data.totals.transaction_count} transactions recorded
                </p>
              </div>

              <div className="pulse-card-lavender rounded-2xl p-5">
                <p className="text-xs text-[var(--plum)]">Remaining Budget</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--espresso)]">
                  {formatINR(data.remaining_allowance_minor)}
                </p>
                <p className="mt-1 text-xs text-[var(--brown-grey)]">
                  {data.forecast.days_remaining} days left in month
                </p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="pulse-card rounded-2xl p-5 lg:col-span-7">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--espresso)]">30-Day Spending Trend</h2>
                    <p className="text-xs text-[var(--brown-grey)]">Daily outflow in INR</p>
                  </div>
                  <Link
                    href="/analytics"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--copper)] hover:underline"
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#E9E4DC" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#766E66" }} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis tick={{ fontSize: 11, fill: "#766E66" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip
                        formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, "Spent"]}
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          borderColor: "#E9E4DC",
                          borderRadius: "12px",
                          color: "#29231F",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#B87950"
                        strokeWidth={2}
                        fill="#E8CBA8"
                        fillOpacity={0.38}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="pulse-card rounded-2xl p-5 lg:col-span-5">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-[var(--espresso)]">Category Breakdown</h2>
                  <p className="text-xs text-[var(--brown-grey)]">Current month expenses</p>
                </div>
                {data.categories.length === 0 ? (
                  <div className="flex h-52 flex-col items-center justify-center text-center">
                    <p className="text-sm text-[var(--brown-grey)]">No expenses recorded this month yet.</p>
                    <Link href="/transactions" className="mt-2 text-xs font-medium text-[var(--copper)] hover:underline">
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#E9E4DC" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#766E66" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                        <YAxis type="category" dataKey="category" width={88} tick={{ fontSize: 11, fill: "#29231F" }} tickLine={false} axisLine={false} />
                        <Tooltip
                          formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, "Spent"]}
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            borderColor: "#E9E4DC",
                            borderRadius: "12px",
                            color: "#29231F",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="amount" fill="#89769D" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Insights, Recurring, Goals */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="pulse-card rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[var(--espresso)]">Financial Insights</h2>
                <div className="mt-4 space-y-3">
                  {data.insights.map((ins) => (
                    <div key={ins.id} className="pulse-card-ivory rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        {ins.type === "warning" ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning-text)]" />
                        ) : ins.type === "positive" ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--positive)]" />
                        ) : (
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--blue-accent)]" />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-[var(--espresso)]">{ins.title}</p>
                          <p className="mt-0.5 text-xs text-[var(--brown-grey)]">{ins.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pulse-card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--espresso)]">Upcoming Recurring</h2>
                  <Link href="/recurring" className="text-xs font-medium text-[var(--copper)] hover:underline">
                    Manage
                  </Link>
                </div>
                {data.recurring_payments.length === 0 ? (
                  <p className="mt-6 text-xs text-[var(--brown-grey)]">No recurring payments detected yet.</p>
                ) : (
                  <div className="mt-4 space-y-2.5">
                    {data.recurring_payments.slice(0, 5).map((rec) => (
                      <div
                        key={rec.id}
                        className="pulse-card-ivory flex items-center justify-between rounded-xl px-3 py-2.5"
                      >
                        <div>
                          <p className="text-xs font-medium text-[var(--espresso)]">{rec.merchant}</p>
                          <p className="text-[11px] text-[var(--brown-grey)]">
                            Due {rec.next_payment_date} · {rec.frequency}
                          </p>
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-[var(--deep-copper)]">
                          {formatINR(rec.expected_amount_minor)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pulse-card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--espresso)]">Savings Goals</h2>
                  <Link href="/goals" className="text-xs font-medium text-[var(--copper)] hover:underline">
                    View all
                  </Link>
                </div>
                {data.goals.length === 0 ? (
                  <div className="mt-6">
                    <p className="text-xs text-[var(--brown-grey)]">No savings goals created yet.</p>
                    <Link href="/goals" className="mt-2 inline-block text-xs font-medium text-[var(--copper)] hover:underline">
                      Create a goal
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3.5">
                    {data.goals.slice(0, 3).map((g) => (
                      <div key={g.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[var(--espresso)]">{g.name}</span>
                          <span className="tabular-nums text-[var(--positive)]">{g.progress_percentage}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--sage)]">
                          <div
                            className="h-full rounded-full bg-[var(--positive)]"
                            style={{ width: `${Math.min(100, g.progress_percentage)}%` }}
                          />
                        </div>
                        <p className="text-[11px] tabular-nums text-[var(--brown-grey)]">
                          {formatINR(g.current_amount_minor)} of {formatINR(g.target_amount_minor)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="pulse-card rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--espresso)]">Recent Transactions</h2>
                <Link href="/transactions" className="text-xs font-medium text-[var(--copper)] hover:underline">
                  View all transactions
                </Link>
              </div>
              {data.recent_transactions.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--brown-grey)]">
                  No transactions recorded yet. Add your first expense or import a CSV to get started.
                </p>
              ) : (
                <>
                  <div className="space-y-2 sm:hidden">
                    {data.recent_transactions.map((tx) => (
                      <div key={tx.id} className="pulse-card-ivory flex items-center justify-between rounded-xl p-3">
                        <div>
                          <p className="text-xs font-medium text-[var(--espresso)]">{tx.merchant}</p>
                          <p className="text-[11px] text-[var(--brown-grey)]">
                            {tx.transaction_date} · {tx.category_name}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold tabular-nums ${
                            tx.transaction_type === "income" ? "text-[var(--positive)]" : "text-[var(--espresso)]"
                          }`}
                        >
                          {tx.transaction_type === "income" ? "+" : "-"}
                          {formatINR(tx.amount_minor)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-xs text-[var(--brown-grey)]">
                          <th className="pb-2 font-medium">Date</th>
                          <th className="pb-2 font-medium">Merchant</th>
                          <th className="pb-2 font-medium">Category</th>
                          <th className="pb-2 font-medium">Method</th>
                          <th className="pb-2 text-right font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {data.recent_transactions.map((tx) => (
                          <tr key={tx.id} className="text-xs">
                            <td className="py-2.5 tabular-nums text-[var(--brown-grey)]">{tx.transaction_date}</td>
                            <td className="py-2.5 font-medium text-[var(--espresso)]">{tx.merchant}</td>
                            <td className="py-2.5 text-[var(--brown-grey)]">{tx.category_name}</td>
                            <td className="py-2.5 text-[var(--muted-text)]">{tx.payment_method}</td>
                            <td
                              className={`py-2.5 text-right font-semibold tabular-nums ${
                                tx.transaction_type === "income" ? "text-[var(--positive)]" : "text-[var(--espresso)]"
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
                </>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
