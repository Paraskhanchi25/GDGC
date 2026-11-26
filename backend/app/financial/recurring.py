from collections import defaultdict
from datetime import date, timedelta

from app.financial.transactions import TxRecord, normalize_merchant_key


def detect_recurring_payments(records: list[TxRecord], ref_date: date | None = None) -> list[dict]:
    """
    Detect repeated expense transactions using merchant similarity, interval regularity,
    and amount similarity. Requires at least 2 occurrences.
    """
    today = ref_date or date.today()
    expenses = [t for t in records if t.transaction_type == "expense"]
    grouped: dict[str, list[TxRecord]] = defaultdict(list)

    for tx in expenses:
        key = normalize_merchant_key(tx.merchant)
        if key:
            grouped[key].append(tx)

    candidates: list[dict] = []
    for key, txs in grouped.items():
        if len(txs) < 2:
            continue

        txs_sorted = sorted(txs, key=lambda x: x.transaction_date)
        intervals = [
            (txs_sorted[i].transaction_date - txs_sorted[i - 1].transaction_date).days
            for i in range(1, len(txs_sorted))
        ]
        if not intervals:
            continue

        avg_interval = sum(intervals) / len(intervals)
        amounts = [t.amount_minor for t in txs_sorted]
        avg_amount = sum(amounts) / len(amounts)
        if avg_amount <= 0:
            continue

        max_amt_dev = max(abs(a - avg_amount) / avg_amount for a in amounts)

        # Classify frequency
        frequency = None
        expected_days = 30
        if 25 <= avg_interval <= 35:
            frequency = "monthly"
            expected_days = 30
        elif 6 <= avg_interval <= 8:
            frequency = "weekly"
            expected_days = 7
        elif 13 <= avg_interval <= 16:
            frequency = "biweekly"
            expected_days = 14
        elif 85 <= avg_interval <= 95:
            frequency = "quarterly"
            expected_days = 90

        if frequency is None or max_amt_dev > 0.25:
            continue

        # Evidence-based confidence score (capped below 1.0 unless >= 4 consistent cycles)
        interval_spread = max(abs(iv - expected_days) for iv in intervals)
        confidence = 0.55
        if len(txs_sorted) >= 3:
            confidence += 0.20
        if len(txs_sorted) >= 4:
            confidence += 0.10
        if max_amt_dev <= 0.05:
            confidence += 0.10
        if interval_spread <= 2:
            confidence += 0.05
        confidence = round(min(confidence, 0.98), 2)

        last_date = txs_sorted[-1].transaction_date
        next_date = last_date + timedelta(days=expected_days)
        while next_date < today:
            next_date += timedelta(days=expected_days)

        expected_amount_minor = int(round(avg_amount))
        if frequency == "weekly":
            monthly_equiv = expected_amount_minor * 4
        elif frequency == "biweekly":
            monthly_equiv = expected_amount_minor * 2
        elif frequency == "quarterly":
            monthly_equiv = expected_amount_minor // 3
        else:
            monthly_equiv = expected_amount_minor

        candidates.append(
            {
                "merchant": txs_sorted[-1].merchant,
                "expected_amount_minor": expected_amount_minor,
                "monthly_equivalent_minor": monthly_equiv,
                "frequency": frequency,
                "next_payment_date": next_date,
                "occurrences": len(txs_sorted),
                "confidence": confidence,
                "status": "detected",
            }
        )

    return sorted(candidates, key=lambda c: c["next_payment_date"])
