"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Send, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { apiFetch } from "@/lib/api";
import { usePulseAuth } from "@/components/providers";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Where did most of my money go this month?",
  "Which recurring payments are approaching?",
  "How much should I save weekly for my goals?",
  "Can I afford a ₹5,000 purchase right now?",
];

export default function CopilotPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { user } = usePulseAuth();
  const queryClient = useQueryClient();
  const sending = useRef(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const { data: conversations } = useQuery<{ id: string; title: string }[]>({
    queryKey: ["conversations", user?.uid], enabled: !!user,
    queryFn: () => apiFetch("/api/v1/ai/conversations"),
  });

  const chatMutation = useMutation({
    mutationFn: async (q: string) => {
      return apiFetch<{
        status: "ok" | "unavailable" | "error";
        answer?: string;
        conversation_id?: string;
        retryable?: boolean;
      }>("/api/v1/ai/chat", {
        method: "POST",
        body: JSON.stringify({ question: q, conversation_id: conversationId }),
      });
    },
    onSuccess: (res) => {
      if (res.conversation_id) setConversationId(res.conversation_id);
      if (res.status === "ok" && res.answer) {
        setCanRetry(false);
        queryClient.invalidateQueries({ queryKey: ["conversations", user?.uid] });
        setMessages((prev) => [...prev, { role: "assistant", content: res.answer! }]);
      } else {
        setCanRetry(!!res.retryable);
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content:
              "Your financial assistant is temporarily unavailable. All your financial tools and calculations remain active.",
          },
        ]);
      }
    },
    onError: () => {
      setCanRetry(true);
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: "Your financial assistant could not respond right now. Please try again.",
        },
      ]);
    },
    onSettled: () => { sending.current = false; },
  });

  const submitQuestion = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || chatMutation.isPending || sending.current || historyLoading) return;
    sending.current = true;
    setLastQuestion(trimmed);
    setCanRetry(false);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");
    chatMutation.mutate(trimmed);
  };

  return (
    <AppShell>
      <div className="flex min-h-[calc(100dvh-8rem)] flex-col space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--plum)]">Assistant</p>
          <h1 className="font-serif-display text-3xl text-[var(--espresso)]">Financial Copilot</h1>
          <p className="mt-1 text-xs text-[var(--brown-grey)]">
            Ask about your recorded spending and plans. Answers can make mistakes; check important details.
          </p>
        </div>
        <details className="pulse-card rounded-xl p-3 text-sm">
          <summary className="cursor-pointer">Your conversations</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={chatMutation.isPending || historyLoading} className="pulse-button secondary" onClick={() => { setMessages([]); setConversationId(null); setCanRetry(false); }}>New conversation</button>
            {conversations?.map(c => <button key={c.id} disabled={chatMutation.isPending || historyLoading} className="max-w-xs truncate rounded-xl border border-[var(--border)] px-3 py-2" onClick={async () => {
              setHistoryLoading(true); setHistoryError("");
              try { const saved = await apiFetch<{ id: string; messages: ChatMessage[] }>(`/api/v1/ai/conversations/${c.id}`); setConversationId(saved.id); setMessages(saved.messages); setCanRetry(false); }
              catch { setHistoryError("We couldn't open that conversation. Please try again."); }
              finally { setHistoryLoading(false); }
            }}>{c.title}</button>)}
          </div>
          {historyLoading && <p role="status" className="mt-3">Opening your conversation…</p>}
          {historyError && <p role="alert" className="mt-3 text-[var(--error-text)]">{historyError}</p>}
        </details>

        <div className="pulse-card-lavender min-h-80 flex-1 space-y-4 rounded-2xl p-5" aria-live="polite" aria-busy={chatMutation.isPending}>
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="pulse-card flex h-12 w-12 items-center justify-center rounded-2xl">
                <Sparkles className="h-5 w-5 text-[var(--plum)]" />
              </div>
              <p className="mt-4 text-sm font-medium text-[var(--espresso)]">Ask a question about your finances</p>
              <div className="mt-4 flex max-w-lg flex-wrap justify-center gap-2">
                {SUGGESTED_QUESTIONS.map((sq) => (
                  <button
                    key={sq}
                    onClick={() => submitQuestion(sq)}
                    className="rounded-xl border border-[var(--lavender)] bg-[var(--white)] px-3 py-1.5 text-xs text-[var(--espresso)] transition hover:bg-[var(--lavender-tint)]"
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-[var(--espresso)] text-[var(--white)]"
                      : m.role === "system"
                      ? "border border-[var(--warning-text)]/20 bg-[var(--warning-bg)] text-[var(--warning-text)]"
                      : "border border-[var(--lavender)] bg-[var(--white)] text-[var(--espresso)]"
                  }`}
                >
                  {m.role === "system" && (
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
                      <AlertCircle className="h-3.5 w-3.5" /> Assistant Unavailable
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))
          )}
          {chatMutation.isPending && (
            <p className="text-xs text-[var(--brown-grey)]">Reviewing your financial records...</p>
          )}
          {messages.some(m => m.role === "system") && <div className="flex flex-wrap items-center gap-4 text-sm">
            {canRetry && <button className="pulse-button secondary" disabled={chatMutation.isPending} onClick={() => submitQuestion(lastQuestion)}>Retry question</button>}
            <Link href="/analytics" className="underline underline-offset-4">View spending insights</Link>
            <Link href="/forecast" className="underline underline-offset-4">Check your forecast</Link>
          </div>}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQuestion(question);
          }}
          className="flex gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            aria-label="Question for your financial assistant"
            maxLength={1000}
            placeholder="Ask about spending, recurring bills, or savings..."
            className="flex-1 rounded-xl border border-[var(--border-strong)] bg-[var(--white)] px-4 py-3 text-sm text-[var(--espresso)] outline-none focus:border-[var(--plum)]"
          />
          <button
            type="submit"
            disabled={chatMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--espresso)] px-5 py-3 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--deep-copper)] disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Ask
          </button>
        </form>
      </div>
    </AppShell>
  );
}
