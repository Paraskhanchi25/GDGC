from collections import defaultdict
from datetime import date, timedelta

from app.financial.money import format_inr
from app.financial.transactions import TxRecord


def compute_totals(records: list[TxRecord]) -> dict:
    total_income = sum(t.amount_minor for t in records if t.transaction_type == "income")
    total_expense = sum(t.amount_minor for t in records if t.transaction_type == "expense")
    net_cash_flow = total_income - total_expense
    return {
        "total_income_minor": total_income,
        "total_expense_minor": total_expense,
        "net_cash_flow_minor": net_cash_flow,
        "transaction_count": len(records),
    }


def compute_category_breakdown(records: list[TxRecord], transaction_type: str = "expense") -> list[dict]:
    totals: dict[str, int] = defaultdict(int)
    counts: dict[str, int] = defaultdict(int)
    for t in records:
        if t.transaction_type == transaction_type:
            totals[t.category_name] += t.amount_minor
            counts[t.category_name] += 1

    grand_total = sum(totals.values())
    items = []
    for category, amount in sorted(totals.items(), key=lambda x: x[1], reverse=True):
        pct = round((amount / grand_total) * 100, 1) if grand_total > 0 else 0.0
        items.append(
            {
                "category": category,
                "amount_minor": amount,
                "amount_formatted": format_inr(amount),
                "percentage": pct,
                "count": counts[category],
            }
        )
    return items


def compute_daily_spending(records: list[TxRecord], days: int = 30, ref_date: date | None = None) -> list[dict]:
    today = ref_date or date.today()
    start = today - timedelta(days=days - 1)
    daily_exp: dict[date, int] = defaultdict(int)
    daily_inc: dict[date, int] = defaultdict(int)

    for t in records:
        if start <= t.transaction_date <= today:
            if t.transaction_type == "expense":
                daily_exp[t.transaction_date] += t.amount_minor
            elif t.transaction_type == "income":
                daily_inc[t.transaction_date] += t.amount_minor

    series = []
    for i in range(days):
        d = start + timedelta(days=i)
        series.append(
            {
                "date": d.isoformat(),
                "label": d.strftime("%d %b"),
                "expense_minor": daily_exp[d],
                "income_minor": daily_inc[d],
            }
        )
    return series


def compute_monthly_trends(records: list[TxRecord], months: int = 6) -> list[dict]:
    buckets: dict[str, dict[str, int]] = defaultdict(lambda: {"income_minor": 0, "expense_minor": 0})
    for t in records:
        ym = t.transaction_date.strftime("%Y-%m")
        if t.transaction_type == "income":
            buckets[ym]["income_minor"] += t.amount_minor
        elif t.transaction_type == "expense":
            buckets[ym]["expense_minor"] += t.amount_minor

    sorted_keys = sorted(buckets.keys())[-months:]
    result = []
    for ym in sorted_keys:
        inc = buckets[ym]["income_minor"]
        exp = buckets[ym]["expense_minor"]
        year, month = map(int, ym.split("-"))
        label = date(year, month, 1).strftime("%b %Y")
        result.append(
            {
                "month": ym,
                "label": label,
                "income_minor": inc,
                "expense_minor": exp,
                "net_minor": inc - exp,
            }
        )
    return result


def compute_period_comparison(records: list[TxRecord], ref_date: date | None = None) -> dict:
    today = ref_date or date.today()
    cur_start = today.replace(day=1)
    prev_end = cur_start - timedelta(days=1)
    prev_start = prev_end.replace(day=1)

    cur_exp = sum(
        t.amount_minor
        for t in records
        if t.transaction_type == "expense" and cur_start <= t.transaction_date <= today
    )
    prev_exp = sum(
        t.amount_minor
        for t in records
        if t.transaction_type == "expense" and prev_start <= t.transaction_date <= prev_end
    )

    change_pct = None
    if prev_exp > 0:
        change_pct = round(((cur_exp - prev_exp) / prev_exp) * 100, 1)

    return {
        "current_month_expense_minor": cur_exp,
        "previous_month_expense_minor": prev_exp,
        "change_percentage": change_pct,
        "current_month_label": cur_start.strftime("%b %Y"),
        "previous_month_label": prev_start.strftime("%b %Y"),
    }


def detect_unusual_spending(records: list[TxRecord], ref_date: date | None = None) -> list[dict]:
    """Identify categories or single transactions significantly above their baseline."""
    expenses = [t for t in records if t.transaction_type == "expense"]
    if len(expenses) < 5:
        return []

    by_cat: dict[str, list[int]] = defaultdict(list)
    for t in expenses:
        by_cat[t.category_name].append(t.amount_minor)

    observations = []
    for t in sorted(expenses, key=lambda x: x.transaction_date, reverse=True)[:30]:
        vals = by_cat[t.category_name]
        if len(vals) >= 3:
            avg = sum(vals) / len(vals)
            if avg > 0 and t.amount_minor >= avg * 2.2 and t.amount_minor >= 50000:  # >= ₹500
                observations.append(
                    {
                        "transaction_id": t.id,
                        "merchant": t.merchant,
                        "category": t.category_name,
                        "amount_minor": t.amount_minor,
                        "amount_formatted": format_inr(t.amount_minor),
                        "date": t.transaction_date.isoformat(),
                        "reason": f"More than 2.2x your typical {t.category_name} spend ({format_inr(int(avg))}).",
                    }
                )
    return observations[:5]
