"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";
import type { LinkedAccount, Transaction } from "@/types/pulse";

type Suggestion = {
  amount_minor: number | null;
  merchant: string;
  description: string;
  category_name: string;
  transaction_type: "expense" | "income";
  transaction_date: string;
  warnings: string[];
};
type Speech = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
const categories = [
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
  "Family transfer",
  "Part-time Income",
  "Scholarship",
  "Other Income",
  "Other",
];

export function SmartTransaction({
  onClose,
  initialAccount = "",
}: {
  onClose: () => void;
  initialAccount?: string;
}) {
  const client = useQueryClient();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Suggestion | null>(null);
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState(initialAccount);
  const [method, setMethod] = useState("UPI");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");
  const [listening, setListening] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [saved, setSaved] = useState<Transaction | null>(null);
  const [undoReady, setUndoReady] = useState(false);
  const speech = useRef<Speech | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const { data } = useQuery<{ accounts: LinkedAccount[] }>({
    queryKey: ["accounts"],
    queryFn: () => apiFetch("/api/v1/accounts"),
  });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    input.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input, textarea, select, a[href]",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      speech.current?.stop();
      if (undoTimer.current) clearTimeout(undoTimer.current);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, []);
  const voice = () => {
    if (listening) {
      speech.current?.stop();
      return;
    }
    const browser = window as unknown as {
      SpeechRecognition?: new () => Speech;
      webkitSpeechRecognition?: new () => Speech;
    };
    const Recognition =
      browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceMessage(
        "Voice entry is not supported in this browser. You can type your transaction below.",
      );
      return;
    }
    const recognition = new Recognition();
    speech.current = recognition;
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      setText(e.results[0][0].transcript);
      setPreview(null);
      setDuplicate(false);
    };
    recognition.onerror = (e) => {
      setVoiceMessage(
        e.error === "not-allowed"
          ? "Microphone access was declined. You can type instead."
          : "We couldn't hear that clearly. Try again or type your entry.",
      );
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    setVoiceMessage(
      "Your browser handles speech recognition and may use an online speech service.",
    );
    try {
      recognition.start();
      setListening(true);
    } catch {
      setVoiceMessage("Voice entry couldn't start. Please type your entry.");
    }
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const edit = (change: Partial<Suggestion>) => {
    setPreview((p) => (p ? { ...p, ...change } : p));
    setDuplicate(false);
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#29231f66] p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-title"
        className="pulse-card max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl p-6 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Every rupee, remembered</p>
            <h2 id="entry-title" className="mt-2 font-serif-display text-3xl">
              Add a transaction
            </h2>
          </div>
          <button
            aria-label="Close transaction entry"
            className="rounded-lg p-2"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {saved ? (
          <div className="mt-7 space-y-5">
            <p role="status" className="feedback">
              Saved {formatINR(saved.amount_minor)} for {saved.merchant}.
            </p>
            <div className="flex flex-wrap gap-3">
              {undoReady && (
                <button
                  className="pulse-button secondary"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await apiFetch(`/api/v1/transactions/${saved.id}`, {
                        method: "DELETE",
                      });
                      await client.invalidateQueries();
                      setSaved(null);
                      setPreview(null);
                      setText("");
                      setUndoReady(false);
                    })
                  }
                >
                  Undo
                </button>
              )}
              <button className="pulse-button" onClick={onClose}>
                Done
              </button>
            </div>
            <p className="text-sm text-[var(--brown-grey)]">
              You can edit or delete the entry in Transactions at any time.
            </p>
          </div>
        ) : (
          <>
            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  const suggestion = await apiFetch<Suggestion>(
                    "/api/v1/transactions/parse",
                    { method: "POST", body: JSON.stringify({ text }) },
                  );
                  setPreview(suggestion);
                  setAmount(
                    suggestion.amount_minor
                      ? String(suggestion.amount_minor / 100)
                      : "",
                  );
                  setDuplicate(false);
                });
              }}
            >
              <label className="field-label">
                What happened?
                <textarea
                  ref={input}
                  required
                  maxLength={1000}
                  rows={2}
                  className="field-input resize-y"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setPreview(null);
                    setDuplicate(false);
                  }}
                  placeholder="Spent 250 on lunch at the college canteen"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  className="pulse-button"
                  disabled={busy || !text.trim()}
                >
                  {busy ? "Reading your entry…" : "Review entry"}
                </button>
                <button
                  type="button"
                  className="pulse-button secondary"
                  onClick={voice}
                >
                  {listening ? <MicOff size={18} /> : <Mic size={18} />}
                  {listening ? "Stop listening" : "Use voice"}
                </button>
              </div>
              {voiceMessage && (
                <p
                  role="status"
                  className="mt-3 text-sm text-[var(--brown-grey)]"
                >
                  {voiceMessage}
                </p>
              )}
            </form>
            {preview && (
              <form
                className="mt-7 space-y-4 border-t border-[var(--border)] pt-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    const amountMinor = Math.round(Number(amount) * 100);
                    if (
                      !Number.isSafeInteger(amountMinor) ||
                      amountMinor <= 0 ||
                      amountMinor > 1000000000
                    )
                      throw new Error(
                        "Enter a positive amount of up to ₹1,00,00,000.",
                      );
                    const payload = {
                      ...preview,
                      amount_minor: amountMinor,
                      currency: "INR",
                      account_id: account || null,
                      payment_method: method,
                      source_name: "Personal entry",
                    };
                    if (!duplicate) {
                      const warning = await apiFetch<{
                        likely_duplicate: boolean;
                      }>("/api/v1/transactions/duplicates", {
                        method: "POST",
                        body: JSON.stringify(payload),
                      });
                      if (warning.likely_duplicate) {
                        setDuplicate(true);
                        return;
                      }
                    }
                    const transaction = await apiFetch<Transaction>(
                      "/api/v1/transactions",
                      { method: "POST", body: JSON.stringify(payload) },
                    );
                    setSaved(transaction);
                    setUndoReady(true);
                    undoTimer.current = setTimeout(
                      () => setUndoReady(false),
                      12000,
                    );
                    await client.invalidateQueries();
                  });
                }}
              >
                <p className="eyebrow">Check before saving</p>
                {preview.warnings.map((w) => (
                  <p key={w} className="text-sm text-[var(--warning-text)]">
                    {w}
                  </p>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <label className="field-label">
                    Amount (₹)
                    <input
                      className="field-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setDuplicate(false);
                      }}
                    />
                  </label>
                  <label className="field-label">
                    Type
                    <select
                      className="field-input"
                      value={preview.transaction_type}
                      onChange={(e) =>
                        edit({
                          transaction_type: e.target.value as
                            "income" | "expense",
                        })
                      }
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </label>
                </div>
                <label className="field-label">
                  Merchant or person
                  <input
                    required
                    maxLength={160}
                    className="field-input"
                    value={preview.merchant}
                    onChange={(e) => edit({ merchant: e.target.value })}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="field-label">
                    Category
                    <select
                      className="field-input"
                      value={preview.category_name}
                      onChange={(e) => edit({ category_name: e.target.value })}
                    >
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field-label">
                    Date
                    <input
                      type="date"
                      required
                      className="field-input"
                      value={preview.transaction_date}
                      onChange={(e) =>
                        edit({ transaction_date: e.target.value })
                      }
                    />
                  </label>
                </div>
                <details>
                  <summary className="cursor-pointer py-2 text-sm text-[var(--deep-copper)]">
                    Account and more details
                  </summary>
                  <div className="mt-3 space-y-4">
                    <label className="field-label">
                      Account
                      <select
                        className="field-input"
                        value={account}
                        onChange={(e) => {
                          setAccount(e.target.value);
                          setDuplicate(false);
                        }}
                      >
                        <option value="">Unassigned personal entry</option>
                        {data?.accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.account_name} {a.masked_number}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-label">
                      Description
                      <input
                        maxLength={255}
                        className="field-input"
                        value={preview.description}
                        onChange={(e) => edit({ description: e.target.value })}
                      />
                    </label>
                    <label className="field-label">
                      Payment method
                      <select
                        className="field-input"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                      >
                        {[
                          "UPI",
                          "Cash",
                          "Debit Card",
                          "Bank Transfer",
                          "Wallet",
                        ].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </details>
                {duplicate && (
                  <p className="feedback error" role="alert">
                    An entry with the same amount, merchant, date, type and
                    account already exists. Save again if this was a separate
                    payment.
                  </p>
                )}
                <button className="pulse-button w-full" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : duplicate
                      ? "Save separate payment"
                      : "Confirm and save"}
                </button>
              </form>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="feedback error mt-4">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
