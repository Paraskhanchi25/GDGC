"use client";

import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { ActionError } from "@/components/action-error";
import { PageHeading } from "@/components/page-heading";
import { AppShell } from "@/components/app-shell";
import { usePulseAuth } from "@/components/providers";
import { ListSkeleton } from "@/components/skeletons";
import { apiFetch } from "@/lib/api";
import { paiseToRupees, rupeesToPaise } from "@/lib/format";
import type { ProfileData } from "@/types/pulse";

export default function ProfilePage() {
  const { user } = usePulseAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: () => apiFetch<ProfileData>("/api/v1/profile"),
  });

  const [displayName, setDisplayName] = useState("");
  const [allowanceRupees, setAllowanceRupees] = useState("0");
  const [frequency, setFrequency] = useState("monthly");
  const [nextAllowanceDate, setNextAllowanceDate] = useState("");
  const [currentSavingsRupees, setCurrentSavingsRupees] = useState("0");
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    if (data) {
      setDisplayName(data.display_name || user?.displayName || "");
      setAllowanceRupees(String(paiseToRupees(data.monthly_allowance_minor)));
      setFrequency(data.allowance_frequency || "monthly");
      setNextAllowanceDate(data.expected_next_allowance_date || "");
      setCurrentSavingsRupees(String(paiseToRupees(data.current_savings_minor)));
    }
  }, [data, user]);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/profile", {
        method: "PATCH",
        body: JSON.stringify({
          display_name: displayName,
          monthly_allowance_minor: rupeesToPaise(allowanceRupees),
          allowance_frequency: frequency,
          expected_next_allowance_date: nextAllowanceDate || null,
          current_savings_minor: rupeesToPaise(currentSavingsRupees),
        }),
      }),
    onSuccess: () => {
      setSavedBanner(true);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading eyebrow="Your money rhythm" title="Profile & allowance" description="Keep your allowance and savings details current for more useful planning." />
        <ActionError errors={[updateMutation.error]} />

        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : error ? (
          <div className="pulse-card rounded-2xl p-5 text-sm text-[var(--error-text)]">
            {(error as Error).message}
          </div>
        ) : (
          <div className="pulse-card max-w-2xl rounded-2xl p-6">
            <div className="mb-6 flex items-center gap-4 border-b border-[var(--border)] pb-5">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Profile"}
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--copper)] text-lg font-semibold text-[var(--white)]">
                  {(displayName || user?.email || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-base font-semibold text-[var(--espresso)]">{displayName || "PULSE Member"}</p>
                <p className="text-xs text-[var(--brown-grey)]">{user?.email}</p>
              </div>
            </div>

            {savedBanner && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-[var(--sage)] px-3 py-2 text-xs text-[var(--positive)]">
                <CheckCircle2 className="h-4 w-4" /> Profile updated successfully.
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="mb-1 block font-medium text-[var(--espresso)]" htmlFor="profile-field-1">Display Name</label>
                <input id="profile-field-1"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-sm text-[var(--espresso)]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-[var(--espresso)]" htmlFor="profile-field-2">Monthly Allowance (INR)</label>
                  <input id="profile-field-2"
                    type="number"
                    min="0"
                    value={allowanceRupees}
                    onChange={(e) => setAllowanceRupees(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-sm tabular-nums text-[var(--espresso)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--espresso)]" htmlFor="profile-field-3">Current Savings (INR)</label>
                  <input id="profile-field-3"
                    type="number"
                    min="0"
                    value={currentSavingsRupees}
                    onChange={(e) => setCurrentSavingsRupees(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-sm tabular-nums text-[var(--espresso)]"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-[var(--espresso)]" htmlFor="profile-field-4">Allowance Frequency</label>
                  <select id="profile-field-4"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-sm text-[var(--espresso)]"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--espresso)]" htmlFor="profile-field-5">Next Allowance Date</label>
                  <input id="profile-field-5"
                    type="date"
                    value={nextAllowanceDate}
                    onChange={(e) => setNextAllowanceDate(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-sm text-[var(--espresso)]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-xl bg-[var(--copper)] px-5 py-2.5 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)] disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
