"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Send, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { usePulseAuth } from "@/components/providers";
import { apiFetch, apiPrefix } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Where did most of my money go this month?",
  "Which recurring payments are approaching?",
  "How much should I save weekly for my laptop goal?",
  "Can I afford a ₹5,000 purchase right now?",
];

export default function CopilotPage() {
  const { isDemo } = usePulseAuth();
  const base = apiPrefix(isDemo);

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const chatMutation = useMutation({
    mutationFn: async (q: string) => {
      return apiFetch<{
        status: "ok" | "unavailable" | "error";
        answer?: string;
        error_detail?: string;
        conversation_id?: string;
      }>(`${base}/ai/chat`, {
        method: "POST",
        body: JSON.stringify({ question: q, conversation_id: conversationId }),
        isDemo,
      });
    },
    onSuccess: (res) => {
      if (res.conversation_id) setConversationId(res.conversation_id);
      if (res.status === "ok" && res.answer) {
        setMessages((prev) => [...prev, { role: "assistant", content: res.answer! }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content:
              res.error_detail ||
              "Gemini Enterprise gateway is currently unavailable. Financial calculations and all other PULSE tools remain active.",
          },
        ]);
      }
    },
  });

  const submitQuestion = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");
    chatMutation.mutate(trimmed);
  };

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Gemini Enterprise</p>
          <h1 className="font-serif-display text-3xl text-[var(--text-primary)]">Financial Copilot</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Grounded strictly in your verified transactions, forecast, and savings goals.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Sparkles className="h-6 w-6 text-[var(--accent-taupe)]" />
              <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">Ask a question about your finances</p>
              <div className="mt-4 flex max-w-lg flex-wrap justify-center gap-2">
                {SUGGESTED_QUESTIONS.map((sq) => (
                  <button
                    key={sq}
                    onClick={() => submitQuestion(sq)}
                    className="rounded-lg border border-[var(--border-stone)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xl rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-[var(--accent-espresso)] text-[var(--bg-paper)]"
                      : m.role === "system"
                      ? "border border-[var(--status-warning)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
                      : "border border-[var(--border-stone)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                  }`}
                >
                  {m.role === "system" && (
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--status-warning)]">
                      <AlertCircle className="h-3.5 w-3.5" /> Gateway Status
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))
          )}
          {chatMutation.isPending && (
            <p className="text-xs text-[var(--text-muted)]">Reviewing your financial records...</p>
          )}
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
            placeholder="Ask about spending, recurring bills, or savings..."
            className="flex-1 rounded-xl border border-[var(--border-stone)] bg-[var(--bg-paper)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-espresso)]"
          />
          <button
            type="submit"
            disabled={chatMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-espresso)] px-5 py-3 text-sm font-medium text-[var(--bg-paper)] disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Ask
          </button>
        </form>
      </div>
    </AppShell>
  );
}
