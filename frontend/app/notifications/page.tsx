"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ListSkeleton } from "@/components/skeletons";
import { apiFetch } from "@/lib/api";
import type { NotificationItem, NotificationPreferences } from "@/types/pulse";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{
    unread_count: number;
    items: NotificationItem[];
    preferences: NotificationPreferences;
  }>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch("/api/v1/notifications"),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
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

  return (
    <AppShell unreadCount={data?.unread_count ?? 0}>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--copper)]">Alerts & Digest</p>
          <h1 className="font-serif-display text-3xl text-[var(--espresso)]">Notifications</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="pulse-card space-y-3 rounded-2xl p-5 lg:col-span-8">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--espresso)]">Notification History</h2>
              <span className="text-xs text-[var(--brown-grey)]">{data?.unread_count ?? 0} unread</span>
            </div>

            {isLoading ? (
              <ListSkeleton rows={4} />
            ) : error ? (
              <p className="py-4 text-xs text-[var(--error-text)]">{(error as Error).message}</p>
            ) : !data || data.items.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--brown-grey)]">No notifications yet.</p>
            ) : (
              <div className="space-y-2.5">
                {data.items.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-xl border p-3.5 ${
                      n.read_at
                        ? "border-[var(--border)] bg-[var(--elevated-ivory)] opacity-75"
                        : "border-[var(--copper)]/45 bg-[var(--elevated-ivory)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[var(--espresso)]">{n.title}</p>
                        <p className="mt-1 text-xs text-[var(--brown-grey)]">{n.message}</p>
                      </div>
                      {!n.read_at && (
                        <button
                          onClick={() => markRead.mutate(n.id)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--white)] px-2 py-1 text-[11px] text-[var(--espresso)] hover:bg-[var(--cream)]"
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

          <div className="pulse-card rounded-2xl p-5 lg:col-span-4">
            <h2 className="text-sm font-semibold text-[var(--espresso)]">Notification Preferences</h2>
            <p className="mt-1 text-xs text-[var(--brown-grey)]">Control in-app and email alerts.</p>
            {data?.preferences && (
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
          </div>
        </div>
      </div>
    </AppShell>
  );
}
