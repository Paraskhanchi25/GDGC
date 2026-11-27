"use client";
import { useState } from "react";
import { CreditSculpture } from "@/components/credit-sculpture";

const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export function AcademyTools({ kind }: { kind: string }) {
  const [limit, setLimit] = useState(20000);
  const [spend, setSpend] = useState(6000);
  const [payment, setPayment] = useState(6000);
  const [timing, setTiming] = useState("before");
  const [deposit, setDeposit] = useState(20000);
  const [ratio, setRatio] = useState(80);
  const [purchaseDay, setPurchaseDay] = useState(10);
  const [ready, setReady] = useState<string[]>([]);
  if (kind === "card") return <CreditSculpture />;
  if (kind === "readiness")
    return (
      <div className="learning-tool">
        <h3 className="text-xl font-medium">Your first-card checklist</h3>
        <p className="mt-2 text-sm text-[var(--brown-grey)]">
          A reflection tool, not a lending eligibility assessment.
        </p>
        <div className="my-5 grid gap-4">
          {[
            "I know where my money goes",
            "I can repay the full bill from reliable funds",
            "I have money set aside for essentials",
            "I understand the fees and due date",
            "I know I can choose to wait",
          ].map((t) => (
            <label className="flex items-start gap-3" key={t}>
              <input
                type="checkbox"
                checked={ready.includes(t)}
                onChange={(e) =>
                  setReady(
                    e.target.checked
                      ? [...ready, t]
                      : ready.filter((x) => x !== t),
                  )
                }
                className="mt-1 h-5 w-5 accent-[var(--deep-copper)]"
              />
              {t}
            </label>
          ))}
        </div>
        <p role="status">
          {ready.length}/5 reflected on.{" "}
          {ready.length === 5
            ? "Take these questions to an issuer if you choose to apply."
            : "Keep building the habits that need attention."}
        </p>
      </div>
    );
  if (kind === "deposit")
    return (
      <div className="learning-tool">
        <h3 className="text-xl font-medium">A deposit behind the card</h3>
        <p className="mt-2 text-sm text-[var(--brown-grey)]">
          Illustrative values. Actual percentages and lien terms vary by issuer.
        </p>
        <div className="my-5 grid gap-5 sm:grid-cols-2">
          <label className="field-label">
            Fixed deposit: {money(deposit)}
            <input
              type="range"
              min="5000"
              max="100000"
              step="1000"
              value={deposit}
              onChange={(e) => setDeposit(+e.target.value)}
            />
          </label>
          <label className="field-label">
            Illustrative limit ratio: {ratio}%
            <input
              type="range"
              min="50"
              max="90"
              value={ratio}
              onChange={(e) => setRatio(+e.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-5">
            <p className="text-sm">Deposit with a lien</p>
            <p className="mt-2 text-2xl tabular-nums">{money(deposit)}</p>
          </div>
          <div className="rounded-xl bg-white p-5">
            <p className="text-sm">Illustrative borrowing limit</p>
            <p className="mt-2 text-2xl tabular-nums">
              {money((deposit * ratio) / 100)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm">
          The deposit stays restricted while it secures the card. Monthly bills
          still need repayment.
        </p>
      </div>
    );
  if (kind === "billing")
    return (
      <div className="learning-tool">
        <h3 className="text-xl font-medium">Place a purchase in the cycle</h3>
        <p className="mt-2 text-sm">
          Illustrative 30-day months: statement closes on day 20; payment is due
          on day 10 of the next month. Actual dates come from your issuer.
        </p>
        <label className="field-label my-6">
          Purchase on day {purchaseDay}
          <input
            type="range"
            min="1"
            max="30"
            value={purchaseDay}
            onChange={(e) => setPurchaseDay(+e.target.value)}
          />
        </label>
        <div className="relative h-3 rounded-full bg-white">
          <div
            className="absolute h-3 w-1 rounded bg-[var(--deep-copper)]"
            style={{ left: `${(purchaseDay / 30) * 97}%` }}
          />
        </div>
        <div className="mt-4 flex justify-between gap-3 text-sm">
          <span>Day 1: cycle starts</span>
          <span>Day 20: statement</span>
          <span>Day 30</span>
        </div>
        <p className="mt-6 rounded-xl bg-white p-4" role="status">
          This purchase would normally appear in the{" "}
          {purchaseDay <= 20 ? "current" : "next"} statement, subject to posting
          time. The illustrative due date is day 10 of{" "}
          {purchaseDay <= 20 ? "the following month" : "the month after next"}.
        </p>
      </div>
    );
  const utilization = Math.round((spend / limit) * 100);
  return (
    <div className="learning-tool">
      <h3 className="text-xl font-medium">What if your spending changes?</h3>
      <p className="mt-2 text-sm text-[var(--brown-grey)]">
        Explore borrowing and repayment. This does not calculate or predict a
        CIBIL score.
      </p>
      <div className="my-6 grid gap-5 sm:grid-cols-2">
        <label className="field-label">
          Credit limit: {money(limit)}
          <input
            type="range"
            min="5000"
            max="100000"
            step="1000"
            value={limit}
            onChange={(e) => {
              const n = +e.target.value;
              setLimit(n);
              setSpend((s) => Math.min(s, n));
              setPayment((p) => Math.min(p, n));
            }}
          />
        </label>
        <label className="field-label">
          Monthly spend: {money(spend)}
          <input
            type="range"
            min="0"
            max={limit}
            step="100"
            value={Math.min(spend, limit)}
            onChange={(e) => {
              setSpend(+e.target.value);
              setPayment((p) => Math.min(p, +e.target.value));
            }}
          />
        </label>
        <label className="field-label">
          Payment: {money(payment)}
          <input
            type="range"
            min="0"
            max={spend}
            step="100"
            value={Math.min(payment, spend)}
            onChange={(e) => setPayment(+e.target.value)}
          />
        </label>
        <label className="field-label">
          Payment timing
          <select
            className="field-input"
            value={timing}
            onChange={(e) => setTiming(e.target.value)}
          >
            <option value="before">By the due date</option>
            <option value="after">After the due date</option>
          </select>
        </label>
      </div>
      <div className="rounded-xl bg-white p-5">
        <p className="text-sm">Utilisation before payment</p>
        <p className="my-2 text-4xl tabular-nums">{utilization}%</p>
        <div className="h-2 overflow-hidden rounded bg-[var(--cream)]">
          <div
            className="h-full bg-[var(--plum)] transition-[width]"
            style={{ width: `${Math.min(100, utilization)}%` }}
          />
        </div>
        <p className="mt-4" role="status">
          {money(Math.max(0, spend - payment))} remains before interest and
          fees.{" "}
          {timing === "after"
            ? "Late payment may incur charges and affect reported payment history."
            : payment >= spend
              ? "Full payment by the due date helps avoid revolving a purchase balance, subject to issuer terms."
              : "Partial payment can attract interest and affect the interest-free period."}
        </p>
      </div>
      <p className="mt-4 text-sm">
        This simple model excludes fees, interest, previous balances and
        reporting dates. It is not an actual card statement.
      </p>
    </div>
  );
}
