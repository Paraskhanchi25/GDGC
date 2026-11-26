"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { usePulseAuth } from "@/components/providers";
import { apiFetch, apiPrefix } from "@/lib/api";
import { formatINR, rupeesToPaise, paiseToRupees } from "@/lib/format";
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
  const { isDemo } = usePulseAuth();
  const base = apiPrefix(isDemo);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formState, setFormState] = useState({
    merchant: "",
    description: "",
    amountRupees: "",
    transaction_type: "expense" as "expense" | "income",
    category_name: "Food",
    payment_method: "UPI",
    source_name: "GPay",
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

  const { data, isLoading } = useQuery<{ total: number; items: Transaction[] }>({
    queryKey: ["transactions", isDemo, search, categoryFilter, methodFilter, typeFilter, startDate, endDate],
    queryFn: () => apiFetch(`${base}/transactions?${queryParams.toString()}`, { isDemo }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
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
        return apiFetch(`${base}/transactions/${editingTx.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          isDemo,
        });
      }
      return apiFetch(`${base}/transactions`, {
        method: "POST",
        body: JSON.stringify(payload),
        isDemo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      setModalOpen(false);
      setEditingTx(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`${base}/transactions/${id}`, { method: "DELETE", isDemo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  const openAddModal = () => {
    setEditingTx(null);
    setFormState({
      merchant: "",
      description: "",
      amountRupees: "",
      transaction_type: "expense",
      category_name: "Food",
      payment_method: "UPI",
      source_name: "GPay",
      transaction_date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
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
      const previewUrl = isDemo ? `${base}/transactions/import/preview` : `${base}/transactions/import`;
      const res = await apiFetch<any>(previewUrl, { method: "POST", body: fd, isDemo });
      setImportPreview(res);
    } catch (err) {
      setImportError((err as Error).message);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    try {
      const res = await apiFetch<{ imported_count: number; skipped_duplicates: number }>(
        `${base}/transactions/import/confirm`,
        {
          method: "POST",
          body: JSON.stringify({
            filename: importPreview.stored_filename || "transactions.csv",
            rows: importPreview.rows,
            skip_duplicates: true,
          }),
          isDemo,
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
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Ledger</p>
            <h1 className="font-serif-display text-3xl text-[var(--text-primary)]">Transactions</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setImportOpen(!importOpen);
                setImportSummary(null);
                setImportError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-stone)] bg-[var(--bg-paper)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-espresso)] px-3.5 py-2 text-xs font-medium text-[var(--bg-paper)] hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Transaction
            </button>
          </div>
        </div>

        {/* CSV Import Panel */}
        {importOpen && (
          <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">CSV Transaction Import</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Upload a generic CSV with columns such as date, merchant, amount, and type (expense/income).
                </p>
              </div>
              <button onClick={() => setImportOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} className="block text-xs text-[var(--text-secondary)]" />
            {importError && <p className="text-xs text-[var(--status-danger)]">{importError}</p>}
            {importSummary && <p className="text-xs font-medium text-[var(--status-positive)]">{importSummary}</p>}
            {importPreview && (
              <div className="space-y-3 rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>
                    Valid rows: <strong>{importPreview.valid_count}</strong> · Duplicates detected:{" "}
                    <strong>{importPreview.duplicate_count}</strong> · Rejected: <strong>{importPreview.rejected_count}</strong>
                  </span>
                  <button
                    onClick={handleConfirmImport}
                    className="rounded-lg bg-[var(--accent-espresso)] px-3 py-1.5 text-xs font-medium text-[var(--bg-paper)]"
                  >
                    Confirm Import
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--border-stone)] text-[var(--text-muted)]">
                        <th className="py-1">Date</th>
                        <th className="py-1">Merchant</th>
                        <th className="py-1">Category</th>
                        <th className="py-1">Amount</th>
                        <th className="py-1">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.slice(0, 20).map((r: any) => (
                        <tr key={r.row_number} className="border-b border-[var(--border-stone)]">
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
        <div className="grid gap-3 rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchant, notes, category..."
              className="w-full rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] py-1.5 pl-9 pr-3 text-xs outline-none focus:border-[var(--accent-espresso)]"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs"
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
            className="rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs"
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
            className="rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs"
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
              className="w-full rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-2 py-1.5 text-xs"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="End date"
              className="w-full rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-2 py-1.5 text-xs"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Loading transactions...</p>
          ) : !data || data.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              No transactions match your current filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-stone)] text-[var(--text-muted)]">
                    <th className="pb-2.5 font-medium">Date</th>
                    <th className="pb-2.5 font-medium">Merchant</th>
                    <th className="pb-2.5 font-medium">Category</th>
                    <th className="pb-2.5 font-medium">Method / Source</th>
                    <th className="pb-2.5 text-right font-medium">Amount</th>
                    <th className="pb-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-stone)]">
                  {data.items.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-3 tabular-nums text-[var(--text-muted)]">{tx.transaction_date}</td>
                      <td className="py-3">
                        <p className="font-medium text-[var(--text-primary)]">{tx.merchant}</p>
                        {tx.description && <p className="text-[11px] text-[var(--text-muted)]">{tx.description}</p>}
                      </td>
                      <td className="py-3">
                        <span className="rounded bg-[var(--bg-muted)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                          {tx.category_name}
                        </span>
                      </td>
                      <td className="py-3 text-[var(--text-muted)]">
                        {tx.payment_method} · {tx.source_name}
                      </td>
                      <td
                        className={`py-3 text-right font-semibold tabular-nums ${
                          tx.transaction_type === "income" ? "text-[var(--status-positive)]" : "text-[var(--text-primary)]"
                        }`}
                      >
                        {tx.transaction_type === "income" ? "+" : "-"}
                        {formatINR(tx.amount_minor)}
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(tx)}
                            aria-label="Edit transaction"
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(tx.id)}
                            aria-label="Delete transaction"
                            className="text-[var(--text-muted)] hover:text-[var(--status-danger)]"
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
          )}
        </div>

        {/* Add / Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif-display text-xl text-[var(--text-primary)]">
                  {editingTx ? "Edit Transaction" : "Add Transaction"}
                </h2>
                <button onClick={() => setModalOpen(false)} className="text-[var(--text-muted)]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMutation.mutate();
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="mb-1 block font-medium text-[var(--text-secondary)]">Merchant</label>
                  <input
                    required
                    value={formState.merchant}
                    onChange={(e) => setFormState({ ...formState, merchant: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium text-[var(--text-secondary)]">Amount (INR)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="1"
                      value={formState.amountRupees}
                      onChange={(e) => setFormState({ ...formState, amountRupees: e.target.value })}
                      className="w-full rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-[var(--text-secondary)]">Type</label>
                    <select
                      value={formState.transaction_type}
                      onChange={(e) =>
                        setFormState({ ...formState, transaction_type: e.target.value as "expense" | "income" })
                      }
                      className="w-full rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-3 py-2"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium text-[var(--text-secondary)]">Category</label>
                    <select
                      value={formState.category_name}
                      onChange={(e) => setFormState({ ...formState, category_name: e.target.value })}
                      className="w-full rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-3 py-2"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-[var(--text-secondary)]">Date</label>
                    <input
                      required
                      type="date"
                      value={formState.transaction_date}
                      onChange={(e) => setFormState({ ...formState, transaction_date: e.target.value })}
                      className="w-full rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium text-[var(--text-secondary)]">Payment Method</label>
                    <select
                      value={formState.payment_method}
                      onChange={(e) => setFormState({ ...formState, payment_method: e.target.value })}
                      className="w-full rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-3 py-2"
                    >
                      {METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-[var(--text-secondary)]">Account / Source</label>
                    <input
                      value={formState.source_name}
                      onChange={(e) => setFormState({ ...formState, source_name: e.target.value })}
                      className="w-full rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--text-secondary)]">Description</label>
                  <input
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-3 py-2"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-[var(--border-stone)] px-4 py-2 text-xs text-[var(--text-secondary)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="rounded-lg bg-[var(--accent-espresso)] px-4 py-2 text-xs font-medium text-[var(--bg-paper)]"
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
