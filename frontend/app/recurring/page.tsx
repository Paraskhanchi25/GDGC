"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { usePulseAuth } from "@/components/providers";
import { apiFetch, apiPrefix } from "@/lib/api";
import { formatINR } from "@/lib/format";
import type { OverviewData } from "@/types/pulse";

export default function RecurringPage() {
  const { isDemo } = usePulseAuth();
  const base = apiPrefix(isDemo);
  const queryClient = useQueryClient();

  const overviewEndpoint = isDemo ? `${base}/overview` : `${base}/analytics/overview`;
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["overview", isDemo],
    queryFn: () => apiFetch<OverviewData>(overviewEndpoint, { isDemo }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ merchant, status }: { merchant: string; status: "confirmed" | "dismissed" }) =>
      apiFetch(`${base}/recurring/${encodeURIComponent(merchant)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
        isDemo,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  return (
    <AppShell unreadCount={data?.unread_notifications ?? 0}>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Commitments</p>
          <h1 className="font-serif-display text-3xl text-[var(--text-primary)]">Recurring Payments</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Detected from repeated merchant intervals and consistent amounts. Confirm or dismiss detections below.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Analyzing payment intervals...</p>
          ) : !data || data.recurring_payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              Not enough repeated transactions to detect recurring commitments yet.
            </p>
          ) : (
            <div className="space-y-3">
              {data.recurring_payments.map((rec) => (
                <div
                  key={rec.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-[var(--border-stone)] bg-[var(--bg-canvas)] p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{rec.merchant}</h3>
                      <span className="rounded bg-[var(--bg-muted)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                        {rec.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {rec.frequency} · Next expected: {rec.next_payment_date} · Confidence:{" "}
                      <span className="tabular-nums">{Math.round(rec.confidence * 100)}%</span> ({rec.occurrences} occurrences)
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                        {formatINR(rec.expected_amount_minor)}
                      </p>
                      <p className="text-[11px] tabular-nums text-[var(--text-muted)]">
                        {formatINR(rec.monthly_equivalent_minor)}/mo eq.
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => statusMutation.mutate({ merchant: rec.merchant, status: "confirmed" })}
                        title="Confirm recurring"
                        className="rounded-lg border border-[var(--border-stone)] bg-[var(--bg-paper)] p-1.5 text-[var(--status-positive)] hover:bg-[var(--bg-muted)]"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => statusMutation.mutate({ merchant: rec.merchant, status: "dismissed" })}
                        title="Dismiss"
                        className="rounded-lg border border-[var(--border-stone)] bg-[var(--bg-paper)] p-1.5 text-[var(--status-danger)] hover:bg-[var(--bg-muted)]"
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
