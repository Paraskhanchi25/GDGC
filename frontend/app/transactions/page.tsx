"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RotateCcw, Search, Trash2, Upload, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ListSkeleton } from "@/components/skeletons";
import { apiFetch } from "@/lib/api";
import { formatINR, paiseToRupees, rupeesToPaise } from "@/lib/format";
import type { Transaction } from "@/types/pulse";

const CATEGORIES = [
  "Food",
  "Groceries",
  "Transport",
  "Subscriptions",
  "Education",
  "Shopping",
  "Entertainment",
  "Health",
  "Utilities",
  "Allowance",
  "Part-time Income",
  "Other",
];

const METHODS = ["UPI", "Debit Card", "Bank Transfer", "Cash", "Wallet"];

export default function TransactionsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    merchant: "",
    description: "",
    amountRupees: "",
    transaction_type: "expense" as "expense" | "income",
    category_name: "Food",
    payment_method: "UPI",
    source_name: "Primary Bank",
    transaction_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  // CSV Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (categoryFilter !== "all") queryParams.set("category", categoryFilter);
  if (methodFilter !== "all") queryParams.set("payment_method", methodFilter);
  if (typeFilter !== "all") queryParams.set("transaction_type", typeFilter);
  if (startDate) queryParams.set("start_date", startDate);
  if (endDate) queryParams.set("end_date", endDate);

  const { data, isLoading, error, refetch } = useQuery<{ total: number; items: Transaction[] }>({
    queryKey: ["transactions", search, categoryFilter, methodFilter, typeFilter, startDate, endDate],
    queryFn: () => apiFetch(`/api/v1/transactions?${queryParams.toString()}`),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      const payload = {
        merchant: formState.merchant,
        description: formState.description,
        amount_minor: rupeesToPaise(formState.amountRupees),
        currency: "INR",
        transaction_type: formState.transaction_type,
        category_name: formState.category_name,
        payment_method: formState.payment_method,
        source_name: formState.source_name,
        transaction_date: formState.transaction_date,
        notes: formState.notes || null,
      };
      if (editingTx) {
        return apiFetch(`/api/v1/transactions/${editingTx.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      return apiFetch("/api/v1/transactions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      setModalOpen(false);
      setEditingTx(null);
    },
    onError: (err) => {
      setFormError((err as Error).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  const openAddModal = () => {
    setEditingTx(null);
    setFormError(null);
    setFormState({
      merchant: "",
      description: "",
      amountRupees: "",
      transaction_type: "expense",
      category_name: "Food",
      payment_method: "UPI",
      source_name: "Primary Bank",
      transaction_date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setFormError(null);
    setFormState({
      merchant: tx.merchant,
      description: tx.description,
      amountRupees: String(paiseToRupees(tx.amount_minor)),
      transaction_type: tx.transaction_type,
      category_name: tx.category_name,
      payment_method: tx.payment_method,
      source_name: tx.source_name,
      transaction_date: tx.transaction_date,
      notes: tx.notes || "",
    });
    setModalOpen(true);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportSummary(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await apiFetch<any>("/api/v1/transactions/import", { method: "POST", body: fd });
      setImportPreview(res);
    } catch (err) {
      setImportError((err as Error).message);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    try {
      const res = await apiFetch<{ imported_count: number; skipped_duplicates: number }>(
        "/api/v1/transactions/import/confirm",
        {
          method: "POST",
          body: JSON.stringify({
            filename: importPreview.stored_filename || "transactions.csv",
            rows: importPreview.rows,
            skip_duplicates: true,
          }),
        }
      );
      setImportSummary(`Imported ${res.imported_count} transactions (${res.skipped_duplicates} duplicates skipped).`);
      setImportPreview(null);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    } catch (err) {
      setImportError((err as Error).message);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--amber)]">Ledger</p>
            <h1 className="font-serif-display text-3xl text-[var(--foreground)]">Transactions</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setImportOpen(!importOpen);
                setImportSummary(null);
                setImportError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-medium text-[var(--foreground-muted)] hover:bg-[var(--surface-raised)]"
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-medium text-[var(--background)] hover:bg-[var(--accent-hover)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Transaction
            </button>
          </div>
        </div>

        {/* CSV Import Panel */}
        {importOpen && (
          <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">CSV Transaction Import</h2>
                <p className="text-xs text-[var(--foreground-secondary)]">
                  Upload a CSV with columns for date, merchant, amount, and type (expense or income).
                </p>
              </div>
              <button onClick={() => setImportOpen(false)} aria-label="Close import" className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} className="block text-xs text-[var(--foreground-muted)]" />
            {importError && <p className="text-xs text-[var(--danger)]">{importError}</p>}
            {importSummary && <p className="text-xs font-medium text-[var(--positive)]">{importSummary}</p>}
            {importPreview && (
              <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>
                    Valid: <strong>{importPreview.valid_count}</strong> · Duplicates:{" "}
                    <strong>{importPreview.duplicate_count}</strong> · Rejected: <strong>{importPreview.rejected_count}</strong>
                  </span>
                  <button
                    onClick={handleConfirmImport}
                    className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--background)]"
                  >
                    Confirm Import
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[var(--foreground-secondary)]">
                        <th className="py-1">Date</th>
                        <th className="py-1">Merchant</th>
                        <th className="py-1">Category</th>
                        <th className="py-1">Amount</th>
                        <th className="py-1">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.slice(0, 20).map((r: any) => (
                        <tr key={r.row_number} className="border-b border-[var(--border-subtle)]">
                          <td className="py-1 tabular-nums">{r.transaction_date}</td>
                          <td className="py-1">{r.merchant}</td>
                          <td className="py-1">{r.category_name}</td>
                          <td className="py-1 tabular-nums">{formatINR(r.amount_minor)}</td>
                          <td className="py-1">{r.is_duplicate ? "Duplicate (skip)" : "Ready"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--foreground-secondary)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchant, notes, category..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] py-2 pl-9 pr-3 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-2.5 py-2 text-xs text-[var(--foreground)]"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            aria-label="Filter by payment method"
            className="rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-2.5 py-2 text-xs text-[var(--foreground)]"
          >
            <option value="all">All Methods</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by type"
            className="rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-2.5 py-2 text-xs text-[var(--foreground)]"
          >
            <option value="all">All Types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Start date"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-2 py-2 text-xs text-[var(--foreground)]"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="End date"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-2 py-2 text-xs text-[var(--foreground)]"
            />
          </div>
        </div>

        {/* List / Table */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          {isLoading ? (
            <ListSkeleton rows={6} />
          ) : error ? (
            <div className="flex items-center justify-between text-xs text-[var(--danger)]">
              <span>{(error as Error).message}</span>
              <button onClick={() => refetch()} className="inline-flex items-center gap-1 rounded border border-[var(--border)] px-3 py-1.5 text-[var(--foreground)]">
                <RotateCcw className="h-3 w-3" /> Retry
              </button>
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-[var(--foreground-muted)]">No transactions match your current view.</p>
              <button
                onClick={openAddModal}
                className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-[var(--background)]"
              >
                Add your first transaction
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Responsive Cards */}
              <div className="space-y-3 md:hidden">
                {data.items.map((tx) => (
                  <div
                    key={tx.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--background-elevated)] p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{tx.merchant}</p>
                        <p className="text-[11px] text-[var(--foreground-secondary)]">
                          {tx.transaction_date} · {tx.category_name} · {tx.payment_method}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          tx.transaction_type === "income" ? "text-[var(--positive)]" : "text-[var(--foreground)]"
                        }`}
                      >
                        {tx.transaction_type === "income" ? "+" : "-"}
                        {formatINR(tx.amount_minor)}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-2">
                      <button
                        onClick={() => openEditModal(tx)}
                        className="inline-flex items-center gap-1 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(tx.id)}
                        className="inline-flex items-center gap-1 text-xs text-[var(--danger)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--foreground-secondary)]">
                      <th className="pb-2.5 font-medium">Date</th>
                      <th className="pb-2.5 font-medium">Merchant</th>
                      <th className="pb-2.5 font-medium">Category</th>
                      <th className="pb-2.5 font-medium">Method / Source</th>
                      <th className="pb-2.5 text-right font-medium">Amount</th>
                      <th className="pb-2.5 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {data.items.map((tx) => (
                      <tr key={tx.id}>
                        <td className="py-3 tabular-nums text-[var(--foreground-secondary)]">{tx.transaction_date}</td>
                        <td className="py-3">
                          <p className="font-medium text-[var(--foreground)]">{tx.merchant}</p>
                          {tx.description && <p className="text-[11px] text-[var(--foreground-secondary)]">{tx.description}</p>}
                        </td>
                        <td className="py-3">
                          <span className="rounded bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] text-[var(--foreground-muted)]">
                            {tx.category_name}
                          </span>
                        </td>
                        <td className="py-3 text-[var(--foreground-secondary)]">
                          {tx.payment_method} · {tx.source_name}
                        </td>
                        <td
                          className={`py-3 text-right font-semibold tabular-nums ${
                            tx.transaction_type === "income" ? "text-[var(--positive)]" : "text-[var(--foreground)]"
                          }`}
                        >
                          {tx.transaction_type === "income" ? "+" : "-"}
                          {formatINR(tx.amount_minor)}
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-2.5">
                            <button
                              onClick={() => openEditModal(tx)}
                              aria-label="Edit transaction"
                              className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(tx.id)}
                              aria-label="Delete transaction"
                              className="text-[var(--foreground-secondary)] hover:text-[var(--danger)]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Add / Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="surface-metallic w-full max-w-md rounded-2xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif-display text-xl text-[var(--foreground)]">
                  {editingTx ? "Edit Transaction" : "Add Transaction"}
                </h2>
                <button onClick={() => setModalOpen(false)} aria-label="Close modal" className="text-[var(--foreground-secondary)]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {formError && <p className="mb-3 text-xs text-[var(--danger)]">{formError}</p>}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMutation.mutate();
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="mb-1 block font-medium text-[var(--foreground-muted)]">Merchant</label>
                  <input
                    required
                    value={formState.merchant}
                    onChange={(e) => setFormState({ ...formState, merchant: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-[var(--foreground)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium text-[var(--foreground-muted)]">Amount (INR)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="1"
                      value={formState.amountRupees}
                      onChange={(e) => setFormState({ ...formState, amountRupees: e.target.value })}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-[var(--foreground)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-[var(--foreground-muted)]">Type</label>
                    <select
                      value={formState.transaction_type}
                      onChange={(e) =>
                        setFormState({ ...formState, transaction_type: e.target.value as "expense" | "income" })
                      }
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-[var(--foreground)]"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium text-[var(--foreground-muted)]">Category</label>
                    <select
                      value={formState.category_name}
                      onChange={(e) => setFormState({ ...formState, category_name: e.target.value })}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-[var(--foreground)]"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-[var(--foreground-muted)]">Date</label>
                    <input
                      required
                      type="date"
                      value={formState.transaction_date}
                      onChange={(e) => setFormState({ ...formState, transaction_date: e.target.value })}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-[var(--foreground)]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium text-[var(--foreground-muted)]">Payment Method</label>
                    <select
                      value={formState.payment_method}
                      onChange={(e) => setFormState({ ...formState, payment_method: e.target.value })}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-[var(--foreground)]"
                    >
                      {METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-[var(--foreground-muted)]">Account / Source</label>
                    <input
                      value={formState.source_name}
                      onChange={(e) => setFormState({ ...formState, source_name: e.target.value })}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-[var(--foreground)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--foreground-muted)]">Description</label>
                  <input
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-[var(--foreground)]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--foreground-muted)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-[var(--background)] disabled:opacity-50"
                  >
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
