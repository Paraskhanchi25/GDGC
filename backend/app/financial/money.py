from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


def rupees_to_paise(value: str | int | float | Decimal) -> int:
    """Convert a rupee amount to integer paise using exact Decimal arithmetic."""
    try:
        dec = Decimal(str(value).replace(",", "").replace("₹", "").strip())
    except (InvalidOperation, ValueError) as exc:
        raise ValueError(f"Invalid monetary amount: {value}") from exc
    paise = (dec * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(paise)


def paise_to_rupees(amount_minor: int) -> float:
    """Convert integer paise to float rupees for display/chart serialization only."""
    return float((Decimal(amount_minor) / Decimal("100")).quantize(Decimal("0.01")))


def format_inr(amount_minor: int) -> str:
    """Format integer paise as Indian Rupee string (e.g. ₹12,450.00)."""
    sign = "-" if amount_minor < 0 else ""
    abs_val = abs(amount_minor)
    rupees = abs_val // 100
    paise = abs_val % 100

    s = str(rupees)
    if len(s) > 3:
        last3 = s[-3:]
        rest = s[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        formatted_int = ",".join(groups) + "," + last3
    else:
        formatted_int = s

    if paise == 0:
        return f"{sign}₹{formatted_int}"
    return f"{sign}₹{formatted_int}.{paise:02d}"
