from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class TxRecord:
    """Canonical in-memory representation of a transaction for financial calculations."""

    id: str
    merchant: str
    description: str
    amount_minor: int
    currency: str
    transaction_type: str  # "expense" | "income"
    category_name: str
    payment_method: str
    source_name: str
    transaction_date: date
    notes: str | None = None


def normalize_merchant_key(merchant: str) -> str:
    return "".join(c for c in merchant.lower().strip() if c.isalnum() or c == " ").strip()


def is_duplicate_transaction(
    candidate_date: date,
    candidate_amount_minor: int,
    candidate_merchant: str,
    existing: list[TxRecord],
) -> bool:
    """Detect likely duplicate by exact date, amount_minor, and normalized merchant."""
    cand_key = normalize_merchant_key(candidate_merchant)
    for tx in existing:
        if (
            tx.transaction_date == candidate_date
            and tx.amount_minor == candidate_amount_minor
            and normalize_merchant_key(tx.merchant) == cand_key
        ):
            return True
    return False


def filter_transactions(
    records: list[TxRecord],
    search: str | None = None,
    category: str | None = None,
    payment_method: str | None = None,
    source_name: str | None = None,
    transaction_type: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[TxRecord]:
    result = records
    if search:
        q = search.lower().strip()
        result = [
            t
            for t in result
            if q in t.merchant.lower()
            or q in t.description.lower()
            or q in t.category_name.lower()
            or (t.notes and q in t.notes.lower())
        ]
    if category and category != "all":
        result = [t for t in result if t.category_name.lower() == category.lower()]
    if payment_method and payment_method != "all":
        result = [t for t in result if t.payment_method.lower() == payment_method.lower()]
    if source_name and source_name != "all":
        result = [t for t in result if t.source_name.lower() == source_name.lower()]
    if transaction_type and transaction_type != "all":
        result = [t for t in result if t.transaction_type.lower() == transaction_type.lower()]
    if start_date:
        result = [t for t in result if t.transaction_date >= start_date]
    if end_date:
        result = [t for t in result if t.transaction_date <= end_date]

    return sorted(result, key=lambda t: t.transaction_date, reverse=True)
