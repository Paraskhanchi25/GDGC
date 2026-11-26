import csv
import io
from datetime import date, datetime

from app.financial.categorization import infer_category
from app.financial.money import rupees_to_paise
from app.financial.transactions import TxRecord, is_duplicate_transaction

DATE_FORMATS = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d %b %Y", "%m/%d/%Y")


def parse_date_flexible(raw: str) -> date:
    val = raw.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(val, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unrecognized date format: '{raw}'")


def parse_csv_transactions(
    csv_bytes: bytes,
    existing_records: list[TxRecord],
    column_map: dict[str, str] | None = None,
) -> dict:
    """
    Parse a generic transaction CSV into preview rows with duplicate detection
    and automatic category inference.
    """
    text = csv_bytes.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError("CSV file has no header row.")

    headers = [h.strip() for h in reader.fieldnames if h]
    lower_map = {h.lower().strip(): h for h in headers}

    def resolve_col(target: str, candidates: tuple[str, ...]) -> str | None:
        if column_map and column_map.get(target) in headers:
            return column_map[target]
        for c in candidates:
            if c in lower_map:
                return lower_map[c]
        return None

    date_col = resolve_col("date", ("date", "transaction_date", "txn_date", "posted_date"))
    merchant_col = resolve_col("merchant", ("merchant", "payee", "narration", "description", "title"))
    desc_col = resolve_col("description", ("description", "details", "remarks", "narration"))
    amount_col = resolve_col("amount", ("amount", "value", "inr", "debit/credit"))
    type_col = resolve_col("type", ("type", "transaction_type", "dr/cr"))
    category_col = resolve_col("category", ("category", "category_name"))
    method_col = resolve_col("payment_method", ("payment_method", "method", "mode"))
    source_col = resolve_col("source", ("source", "account", "account_name"))

    if not date_col or not amount_col or not merchant_col:
        raise ValueError(
            "CSV must include columns for date, merchant/description, and amount."
        )

    valid_rows = []
    rejected_rows = []
    duplicate_count = 0

    for idx, row in enumerate(reader, start=2):
        try:
            raw_date = (row.get(date_col) or "").strip()
            raw_amount = (row.get(amount_col) or "").strip()
            raw_merchant = (row.get(merchant_col) or "").strip()
            if not raw_date or not raw_amount or not raw_merchant:
                raise ValueError("Missing required date, merchant, or amount.")

            tx_date = parse_date_flexible(raw_date)
            signed_paise = rupees_to_paise(raw_amount)
            tx_type = "expense"
            if type_col and row.get(type_col):
                t_val = row[type_col].strip().lower()
                if t_val in ("income", "credit", "cr", "+"):
                    tx_type = "income"
            elif signed_paise < 0:
                tx_type = "expense"

            amount_minor = abs(signed_paise)
            if amount_minor == 0:
                raise ValueError("Zero-amount transaction skipped.")

            desc = (row.get(desc_col) or "").strip() if desc_col else ""
            cat = (row.get(category_col) or "").strip() if category_col else ""
            if not cat:
                cat = infer_category(raw_merchant, desc, tx_type)

            method = (row.get(method_col) or "UPI").strip() if method_col else "UPI"
            source = (row.get(source_col) or "Imported CSV").strip() if source_col else "Imported CSV"

            is_dup = is_duplicate_transaction(tx_date, amount_minor, raw_merchant, existing_records)
            if is_dup:
                duplicate_count += 1

            valid_rows.append(
                {
                    "row_number": idx,
                    "merchant": raw_merchant[:160],
                    "description": desc[:255],
                    "amount_minor": amount_minor,
                    "currency": "INR",
                    "transaction_type": tx_type,
                    "category_name": cat,
                    "payment_method": method[:48],
                    "source_name": source[:80],
                    "transaction_date": tx_date.isoformat(),
                    "is_duplicate": is_dup,
                }
            )
        except Exception as exc:
            rejected_rows.append({"row_number": idx, "reason": str(exc)})

    return {
        "headers": headers,
        "total_rows": len(valid_rows) + len(rejected_rows),
        "valid_count": len(valid_rows),
        "duplicate_count": duplicate_count,
        "rejected_count": len(rejected_rows),
        "rows": valid_rows,
        "rejected": rejected_rows[:20],
    }
