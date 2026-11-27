"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  CreditCard,
  History,
  Loader2,
  Mail,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Unplug,
  X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeading } from "@/components/page-heading";
import { AppShell } from "@/components/app-shell";
import { DashboardSkeleton } from "@/components/skeletons";
import { apiFetch } from "@/lib/api";
import { formatINR, paiseToRupees, rupeesToPaise } from "@/lib/format";

interface GmailStatus {
  oauth_available: boolean;
  connected: boolean;
  gmail_email: string | null;
  connection_status: string;
  last_sync_at: string | null;
  differs_from_login_email: boolean;
  latest_sync: {
    status: string;
    messages_scanned: number;
    subscriptions_detected: number;
  } | null;
}

interface SubscriptionItem {
  id: string;
  merchant_name: string;
  merchant_category: string;
  amount_minor: number | null;
  currency: string;
  billing_frequency: string;
  last_payment_date: string | null;
  next_billing_date: string | null;
  subscription_status: "active" | "trial" | "payment_failed" | "cancelled" | "inactive";
  trial_end_date: string | null;
  detection_confidence: number;
  verification_status: "confirmed" | "needs_confirmation";
  monthly_equivalent_minor: number;
}

interface SubscriptionsDashboardData {
  summary: {
    total_detected: number;
    active_count: number;
    estimated_monthly_minor: number;
    estimated_annual_minor: number;
    upcoming_renewals_count: number;
    upcoming_renewals_total_minor: number;
    trials_ending_count: number;
    failed_payments_count: number;
    has_uncertain_estimates: boolean;
  };
  subscriptions: SubscriptionItem[];
  upcoming_renewals: SubscriptionItem[];
  trials_ending_soon: SubscriptionItem[];
  failed_payments: SubscriptionItem[];
  category_breakdown: Array<{ category: string; monthly_minor: number }>;
  merchant_breakdown: Array<{ merchant: string; monthly_minor: number }>;
}

function SubscriptionsContent() {
  const searchParams = useSearchParams();
  const gmailCallbackState = searchParams.get("gmail");
  const queryClient = useQueryClient();

  const [actionError, setActionError] = useState<string | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [deleteDerivedOnDisconnect, setDeleteDerivedOnDisconnect] = useState(false);

  const [editingSub, setEditingSub] = useState<SubscriptionItem | null>(null);
  const [editForm, setEditForm] = useState({
    merchant_name: "",
    merchant_category: "Subscriptions",
    amountRupees: "",
    billing_frequency: "monthly",
    next_billing_date: "",
    subscription_status: "active",
  });

  const [eventsSub, setEventsSub] = useState<SubscriptionItem | null>(null);

  const { data: gmailStatus, isLoading: statusLoading } = useQuery<GmailStatus>({
    queryKey: ["gmail-status"],
    queryFn: () => apiFetch<GmailStatus>("/api/v1/gmail/status"),
  });

  const { data: subsData, isLoading: subsLoading } = useQuery<SubscriptionsDashboardData>({
    queryKey: ["subscriptions"],
    queryFn: () => apiFetch<SubscriptionsDashboardData>("/api/v1/subscriptions"),
  });

  const { data: subEvents, isLoading: eventsLoading } = useQuery<Array<{
    id: string;
    event_type: string;
    extracted_amount_minor: number | null;
    extracted_currency: string;
    extracted_date: string | null;
    extraction_confidence: number;
  }>>({
    queryKey: ["subscription-events", eventsSub?.id],
    enabled: Boolean(eventsSub),
    queryFn: () => apiFetch(`/api/v1/subscriptions/${eventsSub!.id}/events`),
  });

  const handleConnectGmail = async () => {
    setActionError(null);
    try {
      const res = await apiFetch<{ auth_url: string }>("/api/v1/gmail/connect");
      window.location.href = res.auth_url;
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const syncMutation = useMutation({
    mutationFn: () => apiFetch("/api/v1/gmail/sync", { method: "POST" }),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
    onError: (err) => setActionError((err as Error).message),
  });

  const disconnectMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/gmail/disconnect?delete_data=${deleteDerivedOnDisconnect ? "true" : "false"}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      setDisconnectOpen(false);
      queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
    onError: (err) => setActionError((err as Error).message),
  });

  const updateSubMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/api/v1/subscriptions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setEditingSub(null);
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
    onError: (err) => setActionError((err as Error).message),
  });

  const deleteSubMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/subscriptions/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscriptions"] }),
  });

  const openEditModal = (sub: SubscriptionItem) => {
    setEditingSub(sub);
    setEditForm({
      merchant_name: sub.merchant_name,
      merchant_category: sub.merchant_category,
      amountRupees: sub.amount_minor ? String(paiseToRupees(sub.amount_minor)) : "",
      billing_frequency: sub.billing_frequency,
      next_billing_date: sub.next_billing_date || "",
      subscription_status: sub.subscription_status,
    });
  };

  const statusPill = (status: SubscriptionItem["subscription_status"]) => {
    if (status === "active") return "bg-[var(--sage)] text-[var(--positive)]";
    if (status === "trial") return "bg-[var(--soft-blue)] text-[var(--blue-accent)]";
    if (status === "payment_failed") return "bg-[var(--error-bg)] text-[var(--error-text)]";
    if (status === "cancelled" || status === "inactive") return "bg-[var(--cream)] text-[var(--brown-grey)]";
    return "bg-[var(--cream)] text-[var(--brown-grey)]";
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading eyebrow="The regular payments" title="Your subscriptions" description="Review subscriptions detected from billing emails after you choose to connect Gmail." />

        {/* OAuth Callback Banners */}
        {gmailCallbackState === "connected" && (
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--positive)]/30 bg-[var(--sage)]/60 px-4 py-3 text-xs text-[var(--positive)]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Gmail connected and initial subscription scan completed.</span>
          </div>
        )}
        {gmailCallbackState === "cancelled" && (
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--warning-bg)] px-4 py-3 text-xs text-[var(--warning-text)]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Gmail permission was not granted. You can still manage PULSE normally or connect anytime.</span>
          </div>
        )}
        {gmailCallbackState === "error" && (
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--error-text)]/20 bg-[var(--error-bg)] px-4 py-3 text-xs text-[var(--error-text)]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>We couldn&apos;t complete Gmail connection right now. Please try again.</span>
          </div>
        )}
        {actionError && (
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--error-text)]/20 bg-[var(--error-bg)] px-4 py-3 text-xs text-[var(--error-text)]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* A. Gmail Connection Card */}
        <div className="pulse-card rounded-2xl p-6">
          {statusLoading ? (
            <div className="h-20 animate-pulse rounded-xl bg-[var(--cream)]" />
          ) : !gmailStatus?.connected ? (
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div className="max-w-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[var(--copper)]" />
                  <h2 className="text-base font-semibold text-[var(--espresso)]">Connect Gmail for Automatic Detection</h2>
                </div>
                <p className="text-xs leading-relaxed text-[var(--brown-grey)]">
                  PULSE requests <strong>read-only</strong> permission to scan only relevant subscription, renewal, and
                  billing receipt emails. PULSE cannot send, modify, or delete emails, and never stores full personal
                  inbox contents.
                </p>
                <p className="inline-flex items-center gap-1.5 text-[11px] text-[var(--positive)]">
                  <ShieldCheck className="h-3.5 w-3.5" /> Optional · Disconnect and remove derived data anytime
                </p>
              </div>
              <button
                type="button"
                onClick={handleConnectGmail}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--espresso)] px-5 py-3 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)]"
              >
                <Mail className="h-4 w-4" /> Connect Gmail
              </button>
            </div>
          ) : (
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--sage)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--positive)]">
                    <CheckCircle2 className="h-3 w-3" /> Connected
                  </span>
                  <span className="text-sm font-semibold text-[var(--espresso)]">{gmailStatus.gmail_email}</span>
                  {gmailStatus.differs_from_login_email && (
                    <span className="rounded-md bg-[var(--warning-bg)] px-2 py-0.5 text-[10px] text-[var(--warning-text)]">
                      Separate from login email
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--brown-grey)]">
                  Last synced:{" "}
                  {gmailStatus.last_sync_at ? new Date(gmailStatus.last_sync_at).toLocaleString("en-IN") : "Pending"}
                  {gmailStatus.latest_sync
                    ? ` · Scanned ${gmailStatus.latest_sync.messages_scanned} billing emails`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={syncMutation.isPending}
                  onClick={() => syncMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--copper)] px-4 py-2 text-xs font-medium text-[var(--white)] hover:bg-[var(--deep-copper)] disabled:opacity-50"
                >
                  {syncMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {syncMutation.isPending ? "Syncing..." : "Sync Now"}
                </button>
                <button
                  type="button"
                  onClick={() => setDisconnectOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--white)] px-3.5 py-2 text-xs font-medium text-[var(--error-text)] hover:bg-[var(--error-bg)]"
                >
                  <Unplug className="h-3.5 w-3.5" /> Disconnect Gmail
                </button>
              </div>
            </div>
          )}
        </div>

        {/* B. Subscription Overview */}
        {subsLoading ? (
          <DashboardSkeleton />
        ) : subsData ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="pulse-card rounded-2xl p-4">
                <p className="text-xs text-[var(--brown-grey)]">Detected Subscriptions</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[var(--espresso)]">
                  {subsData.summary.total_detected}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--brown-grey)]">{subsData.summary.active_count} active</p>
              </div>
              <div className="pulse-card rounded-2xl p-4">
                <p className="text-xs text-[var(--brown-grey)]">Est. Monthly Spend</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[var(--espresso)]">
                  {formatINR(subsData.summary.estimated_monthly_minor)}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--brown-grey)]">
                  {subsData.summary.has_uncertain_estimates ? "Includes estimated plans" : "Confirmed INR plans"}
                </p>
              </div>
              <div className="pulse-card rounded-2xl p-4">
                <p className="text-xs text-[var(--brown-grey)]">Est. Annual Spend</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[var(--espresso)]">
                  {formatINR(subsData.summary.estimated_annual_minor)}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--brown-grey)]">Annualized recurring cost</p>
              </div>
              <div className="pulse-card-lavender rounded-2xl p-4">
                <p className="text-xs text-[var(--plum)]">Upcoming (30 days)</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[var(--espresso)]">
                  {subsData.summary.upcoming_renewals_count}
                </p>
                <p className="mt-0.5 text-[11px] tabular-nums text-[var(--brown-grey)]">
                  {formatINR(subsData.summary.upcoming_renewals_total_minor)} expected
                </p>
              </div>
              <div className="pulse-card rounded-2xl p-4">
                <p className="text-xs text-[var(--brown-grey)]">Trials & Alerts</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[var(--espresso)]">
                  {subsData.summary.trials_ending_count + subsData.summary.failed_payments_count}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--brown-grey)]">
                  {subsData.summary.trials_ending_count} trials · {subsData.summary.failed_payments_count} failed
                </p>
              </div>
            </div>

            {/* C. Subscription Cards */}
            <div className="pulse-card rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-[var(--espresso)]">Tracked Subscriptions</h2>
              {subsData.subscriptions.length === 0 ? (
                <div className="py-10 text-center">
                  <CreditCard className="mx-auto h-7 w-7 text-[var(--muted-text)]" />
                  <p className="mt-3 text-sm text-[var(--brown-grey)]">
                    No subscriptions detected yet. Connect Gmail and sync to scan your billing emails.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {subsData.subscriptions.map((sub) => (
                    <div key={sub.id} className="pulse-card-ivory flex flex-col justify-between rounded-2xl p-4">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold text-[var(--espresso)]">{sub.merchant_name}</h3>
                            <p className="text-[11px] text-[var(--brown-grey)]">{sub.merchant_category}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize ${statusPill(sub.subscription_status)}`}>
                              {sub.subscription_status.replace("_", " ")}
                            </span>
                            {sub.verification_status === "needs_confirmation" && (
                              <span className="rounded-full bg-[var(--warning-bg)] px-2 py-0.5 text-[10px] text-[var(--warning-text)]">
                                Confirm
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex items-baseline justify-between">
                          <span className="text-lg font-semibold tabular-nums text-[var(--espresso)]">
                            {sub.amount_minor !== null ? formatINR(sub.amount_minor) : "Amount unclear"}
                          </span>
                          <span className="text-xs capitalize text-[var(--brown-grey)]">
                            {sub.billing_frequency} · {Math.round(sub.detection_confidence * 100)}% confidence
                          </span>
                        </div>

                        <p className="mt-1.5 text-[11px] text-[var(--brown-grey)]">
                          Next expected: {sub.next_billing_date || "Not specified"}
                          {sub.trial_end_date ? ` · Trial ends: ${sub.trial_end_date}` : ""}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] pt-3 text-[11px]">
                        {sub.verification_status === "needs_confirmation" && (
                          <button
                            type="button"
                            onClick={() =>
                              updateSubMutation.mutate({ id: sub.id, body: { verification_status: "confirmed" } })
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-[var(--sage)] px-2.5 py-1 font-medium text-[var(--positive)]"
                          >
                            <Check className="h-3 w-3" /> Confirm
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEventsSub(sub)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--white)] px-2.5 py-1 text-[var(--espresso)] hover:bg-[var(--cream)]"
                        >
                          <History className="h-3 w-3" /> Events
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(sub)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--white)] px-2.5 py-1 text-[var(--espresso)] hover:bg-[var(--cream)]"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSubMutation.mutate(sub.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--white)] px-2.5 py-1 text-[var(--error-text)] hover:bg-[var(--error-bg)]"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* D. Upcoming Renewals Timeline & E. Spending Analytics */}
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="pulse-card rounded-2xl p-5 lg:col-span-5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--copper)]" />
                  <h2 className="text-sm font-semibold text-[var(--espresso)]">Upcoming Renewals (Next 30 Days)</h2>
                </div>
                {subsData.upcoming_renewals.length === 0 ? (
                  <p className="mt-6 text-xs text-[var(--brown-grey)]">No upcoming renewals scheduled in the next 30 days.</p>
                ) : (
                  <div className="mt-4 space-y-2.5">
                    {subsData.upcoming_renewals.map((r) => (
                      <div key={r.id} className="pulse-card-ivory flex items-center justify-between rounded-xl px-3.5 py-2.5">
                        <div>
                          <p className="text-xs font-medium text-[var(--espresso)]">{r.merchant_name}</p>
                          <p className="text-[11px] text-[var(--brown-grey)]">{r.next_billing_date}</p>
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-[var(--deep-copper)]">
                          {r.amount_minor !== null ? formatINR(r.amount_minor) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pulse-card rounded-2xl p-5 lg:col-span-7">
                <h2 className="text-sm font-semibold text-[var(--espresso)]">Monthly Spend by Category</h2>
                <p className="mb-4 text-xs text-[var(--brown-grey)]">Active recurring INR subscriptions</p>
                {subsData.category_breakdown.length === 0 ? (
                  <p className="py-10 text-center text-xs text-[var(--brown-grey)]">No active INR subscription analytics yet.</p>
                ) : (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart accessibilityLayer
                        data={subsData.category_breakdown.map((c) => ({
                          category: c.category,
                          amount: paiseToRupees(c.monthly_minor),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E9E4DC" vertical={false} />
                        <XAxis dataKey="category" tick={{ fontSize: 14, fill: "#766E66" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 14, fill: "#766E66" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip
                          formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}/mo`, "Monthly"]}
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            borderColor: "#E9E4DC",
                            borderRadius: "12px",
                            color: "#29231F",
                            fontSize: "12px",
                          }}
                        />
                        <Bar isAnimationActive={false} dataKey="amount" fill="#B87950" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Disconnect Gmail Confirmation */}
      {disconnectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#29231F]/40 p-4 backdrop-blur-sm">
          <div className="pulse-card w-full max-w-md rounded-2xl p-6">
            <h3 className="font-serif-display text-xl text-[var(--espresso)]">Disconnect Gmail?</h3>
            <p className="mt-2 text-xs leading-relaxed text-[var(--brown-grey)]">
              PULSE will revoke access and stop scanning future emails from{" "}
              <strong className="text-[var(--espresso)]">{gmailStatus?.gmail_email}</strong>.
            </p>
            <label className="mt-4 flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--elevated-ivory)] p-3 text-xs text-[var(--espresso)]">
              <input
                type="checkbox"
                checked={deleteDerivedOnDisconnect}
                onChange={(e) => setDeleteDerivedOnDisconnect(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--copper)]"
              />
              <span>Also remove all subscription records detected from Gmail</span>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDisconnectOpen(false)}
                className="rounded-xl border border-[var(--border-strong)] px-4 py-2 text-xs text-[var(--brown-grey)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={disconnectMutation.isPending}
                onClick={() => disconnectMutation.mutate()}
                className="rounded-xl bg-[var(--error-text)] px-4 py-2 text-xs font-medium text-[var(--white)] disabled:opacity-50"
              >
                {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#29231F]/40 p-4 backdrop-blur-sm">
          <div className="pulse-card w-full max-w-md rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif-display text-xl text-[var(--espresso)]">Edit Subscription</h3>
              <button onClick={() => setEditingSub(null)} aria-label="Close edit" className="text-[var(--brown-grey)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateSubMutation.mutate({
                  id: editingSub.id,
                  body: {
                    merchant_name: editForm.merchant_name,
                    merchant_category: editForm.merchant_category,
                    amount_minor: editForm.amountRupees ? rupeesToPaise(editForm.amountRupees) : null,
                    billing_frequency: editForm.billing_frequency,
                    next_billing_date: editForm.next_billing_date || null,
                    subscription_status: editForm.subscription_status,
                    verification_status: "confirmed",
                  },
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="mb-1 block font-medium text-[var(--espresso)]" htmlFor="subscriptions-field-1">Merchant</label>
                <input id="subscriptions-field-1"
                  required
                  value={editForm.merchant_name}
                  onChange={(e) => setEditForm({ ...editForm, merchant_name: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-[var(--espresso)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-[var(--espresso)]" htmlFor="subscriptions-field-2">Amount (INR)</label>
                  <input id="subscriptions-field-2"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.amountRupees}
                    onChange={(e) => setEditForm({ ...editForm, amountRupees: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-[var(--espresso)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--espresso)]" htmlFor="subscriptions-field-3">Frequency</label>
                  <select id="subscriptions-field-3"
                    value={editForm.billing_frequency}
                    onChange={(e) => setEditForm({ ...editForm, billing_frequency: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-[var(--espresso)]"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-[var(--espresso)]" htmlFor="subscriptions-field-4">Next Billing Date</label>
                  <input id="subscriptions-field-4"
                    type="date"
                    value={editForm.next_billing_date}
                    onChange={(e) => setEditForm({ ...editForm, next_billing_date: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-[var(--espresso)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--espresso)]" htmlFor="subscriptions-field-5">Status</label>
                  <select id="subscriptions-field-5"
                    value={editForm.subscription_status}
                    onChange={(e) => setEditForm({ ...editForm, subscription_status: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--elevated-ivory)] px-3 py-2 text-[var(--espresso)]"
                  >
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="payment_failed">Payment Failed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="rounded-xl border border-[var(--border-strong)] px-4 py-2 text-[var(--brown-grey)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSubMutation.isPending}
                  className="rounded-xl bg-[var(--copper)] px-4 py-2 font-medium text-[var(--white)]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Billing Events Modal */}
      {eventsSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#29231F]/40 p-4 backdrop-blur-sm">
          <div className="pulse-card w-full max-w-md rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif-display text-xl text-[var(--espresso)]">{eventsSub.merchant_name} Events</h3>
              <button onClick={() => setEventsSub(null)} aria-label="Close events" className="text-[var(--brown-grey)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            {eventsLoading ? (
              <p className="py-6 text-center text-xs text-[var(--brown-grey)]">Loading billing history...</p>
            ) : !subEvents || subEvents.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--brown-grey)]">No email events recorded for this subscription.</p>
            ) : (
              <div className="max-h-72 space-y-2.5 overflow-y-auto">
                {subEvents.map((ev) => (
                  <div key={ev.id} className="pulse-card-ivory flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs">
                    <div>
                      <p className="font-medium capitalize text-[var(--espresso)]">{ev.event_type.replace(/_/g, " ")}</p>
                      <p className="text-[11px] text-[var(--brown-grey)]">{ev.extracted_date || "Date unavailable"}</p>
                    </div>
                    <span className="font-semibold tabular-nums text-[var(--espresso)]">
                      {ev.extracted_amount_minor ? formatINR(ev.extracted_amount_minor) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={null}>
      <SubscriptionsContent />
    </Suspense>
  );
}
