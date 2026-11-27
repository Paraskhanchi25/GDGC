"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { ActionError } from "@/components/action-error";
import { PageHeading } from "@/components/page-heading";
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
        <PageHeading eyebrow="Make room for more" title="Savings with a purpose" description="Set a target, add contributions and see a pace that fits your plans." />
        <ActionError errors={[createGoal.error, contribute.error]} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createGoal.mutate();
          }}
          className="pulse-card grid gap-3 rounded-2xl p-5 sm:grid-cols-4"
        >
          <input
            required
            aria-label="Goal name"
            placeholder="Goal name (e.g., Tuition, Laptop)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-xs text-[var(--espresso)]"
          />
          <input
            required
            type="number"
            min="100"
            aria-label="Target amount in rupees"
            placeholder="Target amount (INR)"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-xs text-[var(--espresso)]"
          />
          <input
            required
            aria-label="Goal target date"
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-xs text-[var(--espresso)]"
          />
          <button
            type="submit"
            disabled={createGoal.isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--copper)] px-4 py-2 text-xs font-medium text-[var(--white)] disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> {createGoal.isPending ? "Creating..." : "Add Goal"}
          </button>
        </form>

        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : error ? (
          <p className="text-sm text-[var(--error-text)]">{(error as Error).message}</p>
        ) : !goals || goals.length === 0 ? (
          <div className="pulse-card rounded-2xl p-8 text-center text-sm text-[var(--brown-grey)]">
            No savings goals yet. Create your first goal above.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {goals.map((g) => (
              <div key={g.id} className="pulse-card space-y-4 rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--espresso)]">{g.name}</h2>
                    <p className="text-xs text-[var(--brown-grey)]">
                      Target date: {g.target_date} · {g.days_remaining} days left
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--sage)] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--positive)]">
                    {g.progress_percentage}%
                  </span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--sage)]">
                  <div
                    className="h-full rounded-full bg-[var(--positive)]"
                    style={{ width: `${Math.min(100, g.progress_percentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="font-medium text-[var(--espresso)]">Saved: {formatINR(g.current_amount_minor)}</span>
                  <span className="text-[var(--brown-grey)]">Target: {formatINR(g.target_amount_minor)}</span>
                </div>

                <div className="pulse-card-ivory grid grid-cols-2 gap-2 rounded-xl p-3 text-xs">
                  <div>
                    <p className="text-[11px] text-[var(--brown-grey)]">Required Weekly</p>
                    <p className="font-semibold tabular-nums text-[var(--espresso)]">{formatINR(g.required_weekly_minor)}/wk</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--brown-grey)]">Required Monthly</p>
                    <p className="font-semibold tabular-nums text-[var(--espresso)]">{formatINR(g.required_monthly_minor)}/mo</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    aria-label={`Contribution to ${g.name} in rupees`}
                    placeholder="Add contribution (INR)"
                    value={contribAmounts[g.id] || ""}
                    onChange={(e) => setContribAmounts({ ...contribAmounts, [g.id]: e.target.value })}
                    className="flex-1 rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-1.5 text-xs text-[var(--espresso)]"
                  />
                  <button
                    onClick={() => {
                      const amt = contribAmounts[g.id];
                      if (amt) contribute.mutate({ goalId: g.id, rupees: amt });
                    }}
                    disabled={contribute.isPending}
                    className="rounded-xl border border-[var(--border-strong)] bg-[var(--white)] px-3 py-1.5 text-xs font-medium text-[var(--espresso)] hover:bg-[var(--cream)]"
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
