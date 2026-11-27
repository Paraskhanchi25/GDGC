"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, LogOut } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { usePulseAuth } from "@/components/providers";
import { ListSkeleton } from "@/components/skeletons";
import { apiFetch } from "@/lib/api";
import type { NotificationPreferences } from "@/types/pulse";

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = usePulseAuth();
  const queryClient = useQueryClient();
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ preferences: NotificationPreferences }>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch("/api/v1/notifications"),
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
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--amber)]">Preferences</p>
          <h1 className="font-serif-display text-3xl text-[var(--foreground)]">Settings</h1>
        </div>

        <div className="grid max-w-2xl gap-6">
          <div className="surface-metallic rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Notification Preferences</h2>
            <p className="mt-1 text-xs text-[var(--foreground-secondary)]">
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
                    <span className="text-[var(--foreground-muted)]">{label}</span>
                    <input
                      type="checkbox"
                      checked={data.preferences[key]}
                      onChange={(e) => updatePref.mutate({ [key]: e.target.checked })}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </label>
                ))}
              </div>
            )}

            <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
              <button
                onClick={() => testEmail.mutate()}
                disabled={testEmail.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
              >
                <Mail className="h-3.5 w-3.5" />
                {testEmail.isPending ? "Sending..." : "Send Test Email"}
              </button>
              {emailStatus && <p className="mt-2 text-xs text-[var(--foreground-muted)]">{emailStatus}</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Session & Security</h2>
            <p className="mt-1 text-xs text-[var(--foreground-secondary)]">
              Signed in via Google as <span className="text-[var(--foreground)]">{user?.email}</span>.
            </p>
            <button
              onClick={handleSignOut}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--danger)]/40 bg-[var(--background)] px-4 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--surface-raised)]"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out of PULSE
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
