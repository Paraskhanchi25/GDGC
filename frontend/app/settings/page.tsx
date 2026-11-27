"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, LogOut, Mail, Plus, Trash2, X } from "lucide-react";
import { ActionError } from "@/components/action-error";
import { PageHeading } from "@/components/page-heading";
import { AppShell } from "@/components/app-shell";
import { LinkBankFlow } from "@/components/link-bank-flow";
import { usePulseAuth } from "@/components/providers";
import { ListSkeleton } from "@/components/skeletons";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";
import type { LinkedAccount, NotificationPreferences } from "@/types/pulse";

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = usePulseAuth();
  const queryClient = useQueryClient();
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<LinkedAccount | null>(null);

  const { data: accountsData } = useQuery<{ accounts: LinkedAccount[] }>({
    queryKey: ["accounts"],
    queryFn: () => apiFetch("/api/v1/accounts"),
  });

  const { data, isLoading } = useQuery<{ preferences: NotificationPreferences }>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch("/api/v1/notifications"),
  });

  const removeAccountMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setConfirmRemove(null);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const updatePref = useMutation({
    mutationFn: (patch: Partial<NotificationPreferences>) =>
      apiFetch("/api/v1/notification-preferences", {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const testEmail = useMutation({
    mutationFn: () => apiFetch<{ sent: boolean }>("/api/v1/notifications/test-email", { method: "POST" }),
    onSuccess: (res) => {
      setEmailStatus(
        res.sent
          ? `A test email was sent to ${user?.email || "your inbox"}.`
          : "Email notifications are temporarily unavailable."
      );
    },
    onError: () => {
      setEmailStatus("Email notifications are temporarily unavailable.");
    },
  });

  const handleSignOut = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading eyebrow="Make it yours" title="Settings" description="Manage your accounts, notifications and session in one place." />
        <ActionError errors={[removeAccountMutation.error, updatePref.error]} />

        <div className="grid max-w-2xl gap-6">
          {/* Connected Accounts Management */}
          <div className="pulse-card rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[var(--espresso)]">Connected Accounts</h2>
                <p className="mt-1 text-xs text-[var(--brown-grey)]">
                  Accounts prepared in your PULSE financial picture.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLinkModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--copper)] px-3.5 py-2 text-xs font-medium text-[var(--white)] hover:bg-[var(--deep-copper)]"
              >
                <Plus className="h-3.5 w-3.5" /> Link another account
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {!accountsData?.accounts || accountsData.accounts.length === 0 ? (
                <p className="py-3 text-xs text-[var(--brown-grey)]">No accounts linked yet.</p>
              ) : (
                accountsData.accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="pulse-card-ivory flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Landmark className="h-4 w-4 text-[var(--copper)]" />
                      <div>
                        <p className="text-xs font-semibold text-[var(--espresso)]">
                          {acc.bank_name} · {acc.masked_number}
                        </p>
                        <p className="text-[11px] text-[var(--brown-grey)]">
                          {acc.account_type} · {formatINR(acc.current_balance_minor)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(acc)}
                      aria-label={`Remove ${acc.bank_name} ${acc.masked_number}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--white)] px-2.5 py-1.5 text-[11px] text-[var(--error-text)] hover:bg-[var(--error-bg)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pulse-card rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[var(--espresso)]">Notification Preferences</h2>
            <p className="mt-1 text-xs text-[var(--brown-grey)]">
              Choose which alerts and summaries PULSE sends you.
            </p>

            {isLoading || !data?.preferences ? (
              <div className="mt-4">
                <ListSkeleton rows={3} />
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-xs">
                {(
                  [
                    ["in_app_enabled", "In-app notifications"],
                    ["email_enabled", "Email notifications"],
                    ["payment_reminders_enabled", "Upcoming payment reminders"],
                    ["spending_alerts_enabled", "Low allowance & spending alerts"],
                    ["weekly_summary_enabled", "Weekly summary digest"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-2">
                    <span className="text-[var(--espresso)]">{label}</span>
                    <input
                      type="checkbox"
                      checked={data.preferences[key]}
                      onChange={(e) => updatePref.mutate({ [key]: e.target.checked })}
                      className="h-4 w-4 accent-[var(--copper)]"
                    />
                  </label>
                ))}
              </div>
            )}

            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <button
                onClick={() => testEmail.mutate()}
                disabled={testEmail.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3.5 py-2 text-xs font-medium text-[var(--espresso)] hover:bg-[var(--cream)] disabled:opacity-50"
              >
                <Mail className="h-3.5 w-3.5" />
                {testEmail.isPending ? "Sending..." : "Send Test Email"}
              </button>
              {emailStatus && <p className="mt-2 text-xs text-[var(--brown-grey)]">{emailStatus}</p>}
            </div>
          </div>

          <div className="pulse-card rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[var(--espresso)]">Session & Security</h2>
            <p className="mt-1 text-xs text-[var(--brown-grey)]">
              Signed in as <span className="font-medium text-[var(--espresso)]">{user?.email}</span>.
            </p>
            <button
              onClick={handleSignOut}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--error-text)]/25 bg-[var(--error-bg)] px-4 py-2 text-xs font-medium text-[var(--error-text)] hover:opacity-90"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out of PULSE
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Account Removal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#29231F]/40 p-4 backdrop-blur-sm">
          <div className="pulse-card w-full max-w-sm rounded-2xl p-6">
            <h3 className="font-serif-display text-xl text-[var(--espresso)]">Remove this account?</h3>
            <p className="mt-2 text-xs leading-relaxed text-[var(--brown-grey)]">
              Removing <strong>{confirmRemove.bank_name} ({confirmRemove.masked_number})</strong> will remove its
              associated activity and balance from your PULSE overview.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                className="rounded-xl border border-[var(--border-strong)] px-4 py-2 text-xs text-[var(--brown-grey)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removeAccountMutation.isPending}
                onClick={() => removeAccountMutation.mutate(confirmRemove.id)}
                className="rounded-xl bg-[var(--error-text)] px-4 py-2 text-xs font-medium text-[var(--white)] disabled:opacity-50"
              >
                {removeAccountMutation.isPending ? "Removing..." : "Remove Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Another Account Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#29231F]/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl">
            <button
              type="button"
              onClick={() => setLinkModalOpen(false)}
              aria-label="Close link account"
              className="absolute right-4 top-4 z-10 rounded-full bg-[var(--elevated-ivory)] p-1.5 text-[var(--brown-grey)] hover:text-[var(--espresso)]"
            >
              <X className="h-4 w-4" />
            </button>
            <LinkBankFlow
              skipIntro={true}
              onComplete={() => {
                setLinkModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}
