"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Mail } from "lucide-react";
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
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--copper)]">Preferences</p>
          <h1 className="font-serif-display text-3xl text-[var(--espresso)]">Settings</h1>
        </div>

        <div className="grid max-w-2xl gap-6">
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
    </AppShell>
  );
}
