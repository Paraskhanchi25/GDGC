"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { usePulseAuth } from "@/components/providers";
import { apiFetch, apiPrefix } from "@/lib/api";
import type { NotificationItem, NotificationPreferences } from "@/types/pulse";

export default function NotificationsPage() {
  const { isDemo } = usePulseAuth();
  const base = apiPrefix(isDemo);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{
    unread_count: number;
    items: NotificationItem[];
    preferences: NotificationPreferences;
  }>({
    queryKey: ["notifications", isDemo],
    queryFn: () => apiFetch(`${base}/notifications`, { isDemo }),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch(`${base}/notifications/${id}/read`, { method: "PATCH", isDemo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  const updatePref = useMutation({
    mutationFn: (patch: Partial<NotificationPreferences>) =>
      apiFetch(`${base}/notification-preferences`, {
        method: "PATCH",
        body: JSON.stringify(patch),
        isDemo,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <AppShell unreadCount={data?.unread_count ?? 0}>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Alerts & Digest</p>
          <h1 className="font-serif-display text-3xl text-[var(--text-primary)]">Notifications</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-3 rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5 lg:col-span-8">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Notification History</h2>
              <span className="text-xs text-[var(--text-muted)]">{data?.unread_count ?? 0} unread</span>
            </div>

            {isLoading ? (
              <p className="py-6 text-xs text-[var(--text-muted)]">Loading notifications...</p>
            ) : !data || data.items.length === 0 ? (
              <p className="py-6 text-xs text-[var(--text-muted)]">No notifications yet.</p>
            ) : (
              <div className="space-y-2.5">
                {data.items.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-lg border p-3.5 ${
                      n.read_at
                        ? "border-[var(--border-stone)] bg-[var(--bg-canvas)] opacity-75"
                        : "border-[var(--accent-taupe)] bg-[var(--bg-canvas)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-primary)]">{n.title}</p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">{n.message}</p>
                      </div>
                      {!n.read_at && (
                        <button
                          onClick={() => markRead.mutate(n.id)}
                          className="inline-flex shrink-0 items-center gap-1 rounded border border-[var(--border-stone)] bg-[var(--bg-paper)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                        >
                          <CheckCheck className="h-3 w-3" /> Read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5 lg:col-span-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Notification Preferences</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Control in-app and SMTP email alerts.</p>
            {data?.preferences && (
              <div className="mt-4 space-y-3 text-xs">
                {(
                  [
                    ["in_app_enabled", "In-app notifications"],
                    ["email_enabled", "Email notifications (SMTP)"],
                    ["payment_reminders_enabled", "Upcoming payment reminders"],
                    ["spending_alerts_enabled", "Low allowance & spending alerts"],
                    ["weekly_summary_enabled", "Weekly summary digest"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-2">
                    <span className="text-[var(--text-secondary)]">{label}</span>
                    <input
                      type="checkbox"
                      checked={data.preferences[key]}
                      onChange={(e) => updatePref.mutate({ [key]: e.target.checked })}
                      className="h-4 w-4 accent-[var(--accent-espresso)]"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
