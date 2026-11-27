"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ListSkeleton } from "@/components/skeletons";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";
import type { OverviewData } from "@/types/pulse";

export default function RecurringPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<OverviewData>({
    queryKey: ["overview"],
    queryFn: () => apiFetch<OverviewData>("/api/v1/analytics/overview"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ merchant, status }: { merchant: string; status: "confirmed" | "dismissed" }) =>
      apiFetch(`/api/v1/recurring/${encodeURIComponent(merchant)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  return (
    <AppShell unreadCount={data?.unread_notifications ?? 0}>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--amber)]">Commitments</p>
          <h1 className="font-serif-display text-3xl text-[var(--foreground)]">Recurring Payments</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Detected from repeated merchant intervals and consistent amounts. Confirm or dismiss detections below.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          {isLoading ? (
            <ListSkeleton rows={4} />
          ) : error ? (
            <p className="text-sm text-[var(--danger)]">{(error as Error).message}</p>
          ) : !data || data.recurring_payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--foreground-secondary)]">
              Not enough repeated transactions to detect recurring commitments yet.
            </p>
          ) : (
            <div className="space-y-3">
              {data.recurring_payments.map((rec) => (
                <div
                  key={rec.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--background-elevated)] p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">{rec.merchant}</h3>
                      <span className="rounded bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                        {rec.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--foreground-secondary)]">
                      {rec.frequency} · Next expected: {rec.next_payment_date} · Confidence:{" "}
                      <span className="tabular-nums">{Math.round(rec.confidence * 100)}%</span> ({rec.occurrences} occurrences)
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-[var(--champagne)]">
                        {formatINR(rec.expected_amount_minor)}
                      </p>
                      <p className="text-[11px] tabular-nums text-[var(--foreground-secondary)]">
                        {formatINR(rec.monthly_equivalent_minor)}/mo eq.
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => statusMutation.mutate({ merchant: rec.merchant, status: "confirmed" })}
                        title="Confirm recurring"
                        aria-label={`Confirm ${rec.merchant}`}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--positive)] hover:bg-[var(--surface-raised)]"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => statusMutation.mutate({ merchant: rec.merchant, status: "dismissed" })}
                        title="Dismiss"
                        aria-label={`Dismiss ${rec.merchant}`}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--danger)] hover:bg-[var(--surface-raised)]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
