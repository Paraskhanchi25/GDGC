"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Download, Printer } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { CreditSculpture } from "@/components/credit-sculpture";
import { AcademyTools } from "@/components/academy-tools";
import { usePulseAuth } from "@/components/providers";
import { apiFetch } from "@/lib/api";

type Question = { id: string; prompt: string; options: string[] };
type Chapter = {
  id: string;
  title: string;
  subtitle: string;
  visual: string;
  lessons: { title: string; body: string }[];
  questions: Question[];
};
type Content = {
  version: string;
  sources: { title: string; url: string }[];
  chapters: Chapter[];
  assessment: Question[];
};
type Progress = {
  chapters: { id: string; lesson_count: number; completed: boolean }[];
  attempts: { id: string; chapter_id: string; score: number }[];
  certificate: {
    id: string;
    display_name: string;
    score: number;
    completed_at: string;
  } | null;
};
type Result = {
  score: number;
  passed: boolean;
  feedback: { id: string; correct: boolean; explanation: string }[];
};

export default function CreditAcademy() {
  const { user } = usePulseAuth();
  const reduced = useReducedMotion();
  const client = useQueryClient();
  const [active, setActive] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const {
    data: content,
    isLoading,
    refetch,
    error: contentError,
  } = useQuery<Content>({
    queryKey: ["academy-content"],
    queryFn: async () => {
      const r = await fetch("/api/v1/academy/content");
      if (!r.ok)
        throw new Error("We couldn't load the lessons. Please try again.");
      return r.json();
    },
  });
  const { data: progress, error: progressError } = useQuery<Progress>({
    queryKey: ["academy-progress", user?.uid],
    enabled: !!user,
    queryFn: () => apiFetch("/api/v1/academy/progress"),
  });
  const completed = progress?.chapters.filter((c) => c.completed).length || 0;
  const chapter = content?.chapters[active];
  const final = active === 6;
  const questions = final ? content?.assessment : chapter?.questions;
  const saved = progress?.chapters.find((c) => c.id === chapter?.id);
  const navigate = (n: number) => {
    setActive(n);
    setAnswers({});
    setResult(null);
    setError("");
    setAssistantAnswer("");
  };
  const perform = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await client.invalidateQueries({
        queryKey: ["academy-progress", user?.uid],
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const certificate = async (print: boolean) => {
    if (!progress?.certificate) return;
    // Open synchronously so browsers permit a print window after the authenticated fetch.
    const popup = print ? window.open("", "_blank") : null;
    if (popup) {
      popup.opener = null;
      popup.document.title = "PULSE Credit Academy certificate";
    }
    try {
      const data = await apiFetch<{ svg: string; filename: string }>(
        `/api/v1/academy/certificates/${progress.certificate.id}`,
      );
      if (print && popup) {
        popup.document.body.innerHTML = data.svg;
        popup.document.body.style.margin = "0";
        const svg = popup.document.querySelector("svg");
        if (svg) {
          svg.style.width = "100%";
          svg.style.height = "auto";
        }
        popup.focus();
        popup.print();
      } else {
        const url = URL.createObjectURL(
          new Blob([data.svg], { type: "image/svg+xml" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = data.filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) {
      popup?.close();
      throw e;
    }
  };
  return (
    <>
      <PublicHeader />
      <main id="main-content">
        <section className="academy-preview border-b border-[var(--border)]">
          <div className="page-width grid items-center gap-4 py-12 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="eyebrow">PULSE Credit Academy</p>
              <h1 className="editorial-title mt-5">
                Before the card.
                <br />
                <em>The confidence.</em>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--brown-grey)]">
                Understand credit on your own terms. Six chapters, hands-on
                examples and practical habits for your first financial
                decisions.
              </p>
              <a href="#chapters" className="pulse-button mt-7">
                Start learning
              </a>
              <p className="mt-4 text-sm">
                Free to read. Sign in to save progress and earn a PULSE
                certificate.
              </p>
            </div>
            <CreditSculpture />
          </div>
        </section>
        <div className="page-width py-12" id="chapters">
          <div className="mb-9 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Your learning journey</p>
              <p className="mt-2 text-lg">{completed} of 6 chapters complete</p>
            </div>
            <progress
              aria-label="Academy chapter completion"
              value={completed}
              max={6}
              className="h-2 w-56 max-w-full accent-[var(--deep-copper)]"
            />
            {!user && (
              <Link className="pulse-button secondary" href="/login">
                Sign in to save progress
              </Link>
            )}
          </div>
          {isLoading && (
            <p role="status" className="pulse-card rounded-2xl p-8">
              Opening your learning journey…
            </p>
          )}
          {contentError && (
            <div className="feedback error" role="alert">
              {contentError.message}{" "}
              <button className="underline" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          )}
          {progressError && (
            <p className="feedback error" role="alert">
              Your saved progress could not be loaded. Please refresh before
              continuing.
            </p>
          )}
          {content && (
            <div className="academy-layout">
              <nav className="academy-nav" aria-label="Academy chapters">
                {content.chapters.map((c, i) => (
                  <button
                    key={c.id}
                    aria-current={active === i ? "step" : undefined}
                    onClick={() => navigate(i)}
                  >
                    <span className="mb-1 block text-xs opacity-70">
                      Chapter {i + 1}{" "}
                      {progress?.chapters.find((p) => p.id === c.id)?.completed
                        ? "· Complete"
                        : ""}
                    </span>
                    {c.title}
                  </button>
                ))}
                <button
                  onClick={() => navigate(6)}
                  aria-current={final ? "step" : undefined}
                >
                  Final assessment · 80% to pass
                </button>
              </nav>
              <div className="min-w-0">
                <AnimatePresence mode="wait">
                  <motion.article
                    key={active}
                    initial={reduced ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? {} : { opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="eyebrow">
                      {final
                        ? "Bring it all together"
                        : `Chapter ${active + 1}`}
                    </p>
                    <h2 className="section-title mt-3">
                      {final ? "Your knowledge, in practice." : chapter?.title}
                    </h2>
                    <p className="mt-4 text-lg text-[var(--brown-grey)]">
                      {final
                        ? "Ten questions. Unlimited retries. Complete all chapters and score at least 80% to earn your certificate."
                        : chapter?.subtitle}
                    </p>
                    {!final && chapter && (
                      <>
                        <div className="mt-8 space-y-9">
                          {chapter.lessons.map((lesson, i) => (
                            <section
                              key={lesson.title}
                              className="pulse-card rounded-2xl p-6 sm:p-8"
                            >
                              <h3 className="font-serif-display text-2xl">
                                {lesson.title}
                              </h3>
                              <p className="lesson-text mt-4">{lesson.body}</p>
                              {user && (
                                <button
                                  className="pulse-button secondary mt-5"
                                  disabled={
                                    busy ||
                                    (saved?.lesson_count || 0) >= i + 1 ||
                                    i > (saved?.lesson_count || 0)
                                  }
                                  onClick={() =>
                                    perform(async () => {
                                      await apiFetch(
                                        `/api/v1/academy/chapters/${chapter.id}/lessons`,
                                        {
                                          method: "PUT",
                                          body: JSON.stringify({
                                            lesson_count: i + 1,
                                          }),
                                        },
                                      );
                                    })
                                  }
                                >
                                  {(saved?.lesson_count || 0) >= i + 1 ? (
                                    <>
                                      <CheckCircle2 size={17} /> Read
                                    </>
                                  ) : (
                                    "Mark as read"
                                  )}
                                </button>
                              )}
                            </section>
                          ))}
                        </div>
                        <div className="my-8">
                          <AcademyTools
                            key={chapter.id}
                            kind={chapter.visual}
                          />
                        </div>
                      </>
                    )}
                    <form
                      className="pulse-card mt-8 space-y-6 rounded-2xl p-6 sm:p-8"
                      onSubmit={(e) => {
                        e.preventDefault();
                        perform(async () => {
                          const r = await apiFetch<Result>(
                            final
                              ? "/api/v1/academy/assessment"
                              : `/api/v1/academy/chapters/${chapter?.id}/check`,
                            {
                              method: "POST",
                              body: JSON.stringify({ answers }),
                            },
                          );
                          setResult(r);
                        });
                      }}
                    >
                      <h3 className="font-serif-display text-2xl">
                        {final
                          ? "Final assessment"
                          : "Check your understanding"}
                      </h3>
                      {questions?.map((q) => (
                        <fieldset key={q.id} className="space-y-3">
                          <legend className="mb-3 font-medium">
                            {q.prompt}
                          </legend>
                          {q.options.map((option, i) => (
                            <label
                              key={option}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${answers[q.id] === i ? "border-[var(--deep-copper)] bg-[var(--cream)]" : "border-[var(--border)]"}`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                required
                                checked={answers[q.id] === i}
                                onChange={() => {
                                  setAnswers({ ...answers, [q.id]: i });
                                  setResult(null);
                                }}
                                className="accent-[var(--deep-copper)]"
                              />
                              {option}
                            </label>
                          ))}
                        </fieldset>
                      ))}
                      {user ? (
                        <button
                          className="pulse-button"
                          disabled={
                            busy ||
                            (final
                              ? completed < 6
                              : (saved?.lesson_count || 0) <
                                (chapter?.lessons.length || 0))
                          }
                        >
                          {busy ? "Saving…" : "Check answers"}
                        </button>
                      ) : (
                        <Link href="/login" className="pulse-button">
                          Sign in for knowledge checks
                        </Link>
                      )}
                      {user && final && completed < 6 && (
                        <p className="text-sm">
                          Complete the lessons and knowledge checks in all six
                          chapters first.
                        </p>
                      )}
                      {result && (
                        <div
                          className={
                            result.passed ? "feedback" : "feedback error"
                          }
                          role="status"
                        >
                          <p className="font-semibold">
                            {result.score}% ·{" "}
                            {result.passed
                              ? "Complete"
                              : "Keep learning — you can retry"}
                          </p>
                          {result.feedback.map((f) => (
                            <p className="mt-2 text-sm" key={f.id}>
                              {f.correct ? "✓" : "Review:"} {f.explanation}
                            </p>
                          ))}
                        </div>
                      )}
                    </form>
                    {!final && user && (
                      <section className="learning-tool mt-8">
                        <h3 className="text-lg font-medium">
                          Ask about this chapter
                        </h3>
                        <form
                          className="mt-4 flex flex-wrap gap-3"
                          onSubmit={(e) => {
                            e.preventDefault();
                            perform(async () => {
                              const r = await apiFetch<{
                                answer?: string;
                                status: string;
                              }>("/api/v1/academy/ask", {
                                method: "POST",
                                body: JSON.stringify({
                                  chapter_id: chapter?.id,
                                  question: assistantQuestion,
                                }),
                              });
                              setAssistantAnswer(
                                r.answer ||
                                  "The learning assistant is unavailable right now. You can continue with the lessons and references below.",
                              );
                            });
                          }}
                        >
                          <label className="field-label min-w-0 flex-1">
                            Your question
                            <input
                              required
                              maxLength={1000}
                              value={assistantQuestion}
                              onChange={(e) =>
                                setAssistantQuestion(e.target.value)
                              }
                              className="field-input"
                              placeholder="What does a credit limit mean?"
                            />
                          </label>
                          <button
                            className="pulse-button self-end"
                            disabled={busy}
                          >
                            Ask
                          </button>
                        </form>
                        {assistantAnswer && (
                          <p
                            className="mt-4 whitespace-pre-wrap leading-relaxed"
                            role="status"
                          >
                            {assistantAnswer}
                          </p>
                        )}
                      </section>
                    )}
                    <div className="mt-8 flex justify-between gap-4">
                      <button
                        className="pulse-button secondary"
                        disabled={active === 0}
                        onClick={() => navigate(active - 1)}
                      >
                        Previous chapter
                      </button>
                      <button
                        className="pulse-button secondary"
                        disabled={final}
                        onClick={() => navigate(active + 1)}
                      >
                        {active === 5 ? "Final assessment" : "Next chapter"}
                      </button>
                    </div>
                  </motion.article>
                </AnimatePresence>
                {progress?.certificate && (
                  <section className="academy-preview mt-10 rounded-2xl p-8">
                    <p className="eyebrow">A milestone worth keeping</p>
                    <h3 className="mt-3 font-serif-display text-3xl">
                      Well done, {progress.certificate.display_name}.
                    </h3>
                    <p className="mt-3">
                      You completed PULSE Credit Academy with{" "}
                      {progress.certificate.score}% in the final assessment.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        className="pulse-button"
                        disabled={busy}
                        onClick={() => perform(() => certificate(false))}
                      >
                        <Download size={18} /> Download certificate
                      </button>
                      <button
                        className="pulse-button secondary"
                        disabled={busy}
                        onClick={() => perform(() => certificate(true))}
                      >
                        <Printer size={18} /> Print / Save PDF
                      </button>
                    </div>
                    <p className="mt-4 text-xs break-all">
                      {progress.certificate.id} ·{" "}
                      {new Date(
                        progress.certificate.completed_at,
                      ).toLocaleDateString("en-IN")}
                    </p>
                  </section>
                )}
                {error && (
                  <p role="alert" className="feedback error mt-6">
                    {error}
                  </p>
                )}
                {progress?.attempts.some((a) => a.chapter_id === "final") && (
                  <p className="mt-6 text-sm text-[var(--brown-grey)]">
                    Final assessment attempts:{" "}
                    {progress.attempts
                      .filter((a) => a.chapter_id === "final")
                      .map((a) => `${a.score}%`)
                      .join(", ")}
                    . You can retry at any time.
                  </p>
                )}
                <aside className="mt-12 border-t border-[var(--border)] pt-6 text-sm text-[var(--brown-grey)]">
                  <p>
                    Educational information, not personalised financial advice
                    or a guarantee of credit approval. A PULSE certificate
                    carries no endorsement or accreditation from CIBIL, RBI, a
                    bank or institution.
                  </p>
                  <p className="mt-4">Sources reviewed {content.version}:</p>
                  <ul className="mt-3 space-y-3">
                    {content.sources.map((s) => (
                      <li key={s.url}>
                        <a
                          className="underline underline-offset-4"
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </aside>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
