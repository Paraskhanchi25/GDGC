"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ListSkeleton } from "@/components/skeletons";
import { apiFetch } from "@/lib/api";
import { formatINR, rupeesToPaise } from "@/lib/format";
import type { SavingsGoal } from "@/types/pulse";

export default function GoalsPage() {
  const queryClient = useQueryClient();

  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDate, setNewDate] = useState("2027-05-01");
  const [contribAmounts, setContribAmounts] = useState<Record<string, string>>({});

  const { data: goals, isLoading, error } = useQuery<SavingsGoal[]>({
    queryKey: ["goals"],
    queryFn: () => apiFetch<SavingsGoal[]>("/api/v1/goals"),
  });

  const createGoal = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/goals", {
        method: "POST",
        body: JSON.stringify({
          name: newName,
          target_amount_minor: rupeesToPaise(newTarget),
          current_amount_minor: 0,
          target_date: newDate,
        }),
      }),
    onSuccess: () => {
      setNewName("");
      setNewTarget("");
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  const contribute = useMutation({
    mutationFn: ({ goalId, rupees }: { goalId: string; rupees: string }) =>
      apiFetch(`/api/v1/goals/${goalId}/contributions`, {
        method: "POST",
        body: JSON.stringify({ amount_minor: rupeesToPaise(rupees) }),
      }),
    onSuccess: () => {
      setContribAmounts({});
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--amber)]">Targets</p>
          <h1 className="font-serif-display text-3xl text-[var(--foreground)]">Savings Goals</h1>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createGoal.mutate();
          }}
          className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:grid-cols-4"
        >
          <input
            required
            placeholder="Goal name (e.g., Tuition, Laptop)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-xs text-[var(--foreground)]"
          />
          <input
            required
            type="number"
            min="100"
            placeholder="Target amount (INR)"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-xs text-[var(--foreground)]"
          />
          <input
            required
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-xs text-[var(--foreground)]"
          />
          <button
            type="submit"
            disabled={createGoal.isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-[var(--background)] disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> {createGoal.isPending ? "Creating..." : "Add Goal"}
          </button>
        </form>

        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : error ? (
          <p className="text-sm text-[var(--danger)]">{(error as Error).message}</p>
        ) : !goals || goals.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--foreground-secondary)]">
            No savings goals yet. Create your first goal above.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {goals.map((g) => (
              <div key={g.id} className="surface-metallic space-y-4 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--foreground)]">{g.name}</h2>
                    <p className="text-xs text-[var(--foreground-secondary)]">
                      Target date: {g.target_date} · {g.days_remaining} days left
                    </p>
                  </div>
                  <span className="rounded bg-[var(--background)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--champagne)]">
                    {g.progress_percentage}%
                  </span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--background)]">
                  <div
                    className="h-full rounded-full bg-[var(--positive)]"
                    style={{ width: `${Math.min(100, g.progress_percentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span>Saved: {formatINR(g.current_amount_minor)}</span>
                  <span className="text-[var(--foreground-secondary)]">Target: {formatINR(g.target_amount_minor)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--background-elevated)] p-3 text-xs">
                  <div>
                    <p className="text-[11px] text-[var(--foreground-secondary)]">Required Weekly</p>
                    <p className="font-semibold tabular-nums">{formatINR(g.required_weekly_minor)}/wk</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--foreground-secondary)]">Required Monthly</p>
                    <p className="font-semibold tabular-nums">{formatINR(g.required_monthly_minor)}/mo</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Add contribution (INR)"
                    value={contribAmounts[g.id] || ""}
                    onChange={(e) => setContribAmounts({ ...contribAmounts, [g.id]: e.target.value })}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)]"
                  />
                  <button
                    onClick={() => {
                      const amt = contribAmounts[g.id];
                      if (amt) contribute.mutate({ goalId: g.id, rupees: amt });
                    }}
                    disabled={contribute.isPending}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  >
                    Record
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
