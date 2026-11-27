import calendar
import hashlib
import random
from dataclasses import dataclass
from datetime import date, timedelta

HISTORY_START = date(2026, 1, 1)
HISTORY_END = date(2026, 11, 27)

SUPPORTED_BANKS: dict[str, str] = {
    "hdfc": "HDFC Bank",
    "icici": "ICICI Bank",
    "axis": "Axis Bank",
    "sbi": "State Bank of India",
    "kotak": "Kotak Mahindra Bank",
    "indusind": "IndusInd Bank",
    "yesbank": "YES BANK",
    "idfcfirst": "IDFC FIRST Bank",
}

BEHAVIOR_PROFILES = (
    "food_transport",
    "saver",
    "social_shopping",
    "hostel_independent",
    "internship_income",
)


@dataclass(frozen=True)
class MerchantTemplate:
    merchant: str
    category: str
    min_rupees: int
    max_rupees: int
    payment_method: str
    descriptions: tuple[str, ...]


FOOD_MERCHANTS = (
    MerchantTemplate("Swiggy", "Food & Dining", 145, 480, "UPI", ("Dinner bowl order", "Lunch delivery", "Late night snacks")),
    MerchantTemplate("Zomato", "Food & Dining", 160, 540, "UPI", ("Weekend biryani", "Evening meal order", "Cafe delivery")),
    MerchantTemplate("Café Coffee Day", "Food & Dining", 180, 390, "UPI", ("Study session coffee", "Cold brew & sandwich")),
    MerchantTemplate("Domino's", "Food & Dining", 299, 680, "UPI", ("Shared pizza night", "Hostel pizza order")),
    MerchantTemplate("McDonald's", "Food & Dining", 175, 420, "Debit Card", ("Quick lunch meal", "Burger & fries")),
    MerchantTemplate("College Canteen", "Food & Dining", 45, 165, "UPI", ("Campus lunch", "Evening chai & samosa")),
)

TRANSPORT_MERCHANTS = (
    MerchantTemplate("Uber", "Transport", 110, 340, "UPI", ("Cab to campus", "Evening ride back")),
    MerchantTemplate("Ola", "Transport", 95, 290, "UPI", ("Auto ride", "Cab to station")),
    MerchantTemplate("Rapido", "Transport", 45, 140, "UPI", ("Quick bike taxi", "Morning commute")),
    MerchantTemplate("Metro Rail", "Transport", 30, 90, "UPI", ("Metro smart card top-up", "Single journey ticket")),
)

SHOPPING_MERCHANTS = (
    MerchantTemplate("Amazon", "Shopping", 450, 2400, "Debit Card", ("Desk accessories", "USB-C cable & supplies", "Backpack & gear")),
    MerchantTemplate("Flipkart", "Shopping", 380, 1950, "UPI", ("Phone case & charger", "Hostel room essentials")),
    MerchantTemplate("Myntra", "Shopping", 699, 2800, "Debit Card", ("Casual wear", "Sneakers & hoodie")),
    MerchantTemplate("Ajio", "Shopping", 599, 2100, "UPI", ("Apparel order", "Weekend outfit")),
)

GROCERY_MERCHANTS = (
    MerchantTemplate("Blinkit", "Groceries", 180, 620, "UPI", ("Instant groceries", "Milk, oats & snacks")),
    MerchantTemplate("Zepto", "Groceries", 160, 580, "UPI", ("Fruits & coffee", "Weekly pantry refill")),
    MerchantTemplate("DMart", "Groceries", 450, 1400, "Debit Card", ("Monthly hostel supplies", "Snacks & toiletries")),
)

ENTERTAINMENT_MERCHANTS = (
    MerchantTemplate("BookMyShow", "Entertainment", 240, 620, "UPI", ("Weekend movie ticket", "IMAX student show")),
    MerchantTemplate("ZEE5", "Entertainment", 149, 299, "UPI", ("Monthly pass", "Weekend stream")),
)

EDUCATION_MERCHANTS = (
    MerchantTemplate("Coursera", "Education", 799, 1999, "Debit Card", ("Skill certification", "Monthly course plan")),
    MerchantTemplate("Sapna Book House", "Education", 280, 950, "Debit Card", ("Reference textbook", "Semester notebooks")),
    MerchantTemplate("Campus Print & Xerox", "Education", 60, 240, "UPI", ("Lab manual binding", "Assignment printouts")),
)

UTILITY_MERCHANTS = (
    MerchantTemplate("Jio", "Bills & Utilities", 299, 499, "UPI", ("Prepaid mobile recharge", "5G data pack")),
    MerchantTemplate("Airtel", "Bills & Utilities", 399, 699, "UPI", ("Broadband split", "Mobile postpaid")),
    MerchantTemplate("Electricity Board", "Bills & Utilities", 450, 1150, "UPI", ("Hostel room electricity share", "Monthly meter split")),
)

SUBSCRIPTION_MERCHANTS = (
    MerchantTemplate("Spotify", "Subscriptions", 119, 119, "UPI", ("Student Duo monthly plan",)),
    MerchantTemplate("Netflix", "Subscriptions", 199, 499, "Debit Card", ("Monthly streaming plan",)),
    MerchantTemplate("YouTube Premium", "Subscriptions", 89, 89, "UPI", ("Student membership",)),
    MerchantTemplate("Amazon Prime", "Subscriptions", 299, 299, "Debit Card", ("Quarterly Prime student",)),
)


def resolve_bank_name(bank_code: str) -> str:
    code = bank_code.strip().lower()
    if code not in SUPPORTED_BANKS:
        raise ValueError("Unsupported bank selection.")
    return SUPPORTED_BANKS[code]


def assign_unique_last_four(user_id: str, bank_code: str, existing_suffixes: set[str]) -> str:
    """Deterministically assign a 4-digit suffix without collisions."""
    for salt in range(0, 500):
        digest = hashlib.sha256(f"{user_id}:{bank_code}:suffix:{salt}".encode("utf-8")).hexdigest()
        num = int(digest[:8], 16) % 9000 + 1000
        candidate = str(num)
        if candidate not in existing_suffixes:
            return candidate
    return "4821"


def choose_behavior_profile(user_id: str, bank_code: str, existing_account_count: int) -> str:
    digest = hashlib.sha256(f"{user_id}:{bank_code}:profile:{existing_account_count}".encode("utf-8")).hexdigest()
    idx = (int(digest[:8], 16) + existing_account_count) % len(BEHAVIOR_PROFILES)
    return BEHAVIOR_PROFILES[idx]


def _clamp_month_day(year: int, month: int, day: int) -> date:
    max_d = calendar.monthrange(year, month)[1]
    return date(year, month, min(day, max_d))


def generate_account_financial_history(
    user_id: str,
    bank_code: str,
    bank_name: str,
    account_type: str,
    last_four: str,
    behavior_profile: str,
) -> dict:
    """
    Deterministically generate realistic Indian student transactions from
    2026-01-01 through 2026-11-27 with coherent opening & current balances.
    """
    seed_hex = hashlib.sha256(
        f"{user_id}:{bank_code}:{account_type}:{last_four}:{behavior_profile}".encode("utf-8")
    ).hexdigest()
    rng = random.Random(int(seed_hex[:16], 16))

    source_label = f"{bank_name} •••• {last_four}"
    txs: list[dict] = []

    def add_tx(
        tx_date: date,
        merchant: str,
        desc: str,
        rupees: int,
        tx_type: str,
        category: str,
        method: str,
    ) -> None:
        if tx_date < HISTORY_START or tx_date > HISTORY_END or rupees <= 0:
            return
        txs.append(
            {
                "merchant": merchant,
                "description": desc,
                "amount_minor": int(rupees) * 100,
                "currency": "INR",
                "transaction_type": tx_type,
                "category_name": category,
                "payment_method": method,
                "source_name": source_label,
                "transaction_date": tx_date,
            }
        )

    # Opening balance (in rupees) tailored to profile
    opening_rupees_map = {
        "food_transport": rng.randint(6500, 11000),
        "saver": rng.randint(14000, 24000),
        "social_shopping": rng.randint(8000, 14500),
        "hostel_independent": rng.randint(9000, 15000),
        "internship_income": rng.randint(18000, 32000),
    }
    opening_rupees = opening_rupees_map.get(behavior_profile, 10000)

    # Monthly recurring income + subscriptions across Jan..Nov 2026
    for month in range(1, 12):
        # Income rhythm
        if behavior_profile == "internship_income":
            stipend_day = rng.choice((1, 2, 3))
            add_tx(
                _clamp_month_day(2026, month, stipend_day),
                "Tech Internship Stipend",
                "Monthly internship credit",
                rng.randint(18000, 24000),
                "income",
                "Income",
                "Bank Transfer",
            )
            if month % 2 == 0:
                add_tx(
                    _clamp_month_day(2026, month, 14),
                    "Family Transfer",
                    "Home support transfer",
                    rng.randint(4000, 6000),
                    "income",
                    "Income",
                    "Bank Transfer",
                )
        else:
            allowance_day = rng.randint(1, 4)
            base_allowance = 16500 if behavior_profile == "hostel_independent" else rng.randint(11500, 15500)
            add_tx(
                _clamp_month_day(2026, month, allowance_day),
                "Family Transfer",
                "Monthly student allowance",
                base_allowance,
                "income",
                "Income",
                "Bank Transfer",
            )
            if month in (3, 6, 9, 11):
                add_tx(
                    _clamp_month_day(2026, month, rng.randint(10, 18)),
                    "Freelance Design / Mentoring",
                    "Campus project payout",
                    rng.randint(2500, 4500),
                    "income",
                    "Income",
                    "Bank Transfer",
                )

        # Monthly subscriptions (realistic jitter +/- 1 day)
        sub_choices = [SUBSCRIPTION_MERCHANTS[0], SUBSCRIPTION_MERCHANTS[2]]
        if behavior_profile in ("social_shopping", "internship_income"):
            sub_choices.append(SUBSCRIPTION_MERCHANTS[1])
        for sub in sub_choices:
            sub_day = 5 + (hash(sub.merchant) % 15) + rng.choice((-1, 0, 1))
            sub_dt = _clamp_month_day(2026, month, max(1, min(27, sub_day)))
            add_tx(sub_dt, sub.merchant, sub.descriptions[0], sub.min_rupees, "expense", sub.category, sub.payment_method)

        # Monthly utility bills
        jio_dt = _clamp_month_day(2026, month, 14 + rng.choice((-1, 0, 1)))
        add_tx(jio_dt, "Jio", "Monthly mobile recharge", 349, "expense", "Bills & Utilities", "UPI")

        if behavior_profile == "hostel_independent":
            airtel_dt = _clamp_month_day(2026, month, 18)
            add_tx(airtel_dt, "Airtel", "Hostel Wi-Fi broadband split", 599, "expense", "Bills & Utilities", "UPI")
            elec_dt = _clamp_month_day(2026, month, 21)
            add_tx(elec_dt, "Electricity Board", "Hostel electricity share", rng.randint(550, 950), "expense", "Bills & Utilities", "UPI")

    # Daily & weekly variable spending across Jan 1 -> Nov 27, 2026
    cur = HISTORY_START
    while cur <= HISTORY_END:
        is_weekend = cur.weekday() >= 5
        # Diwali / festive window (Oct 24 - Nov 12, 2026)
        is_festive = date(2026, 10, 24) <= cur <= date(2026, 11, 12)

        # Daily activity probability depends on profile & weekday/weekend
        if behavior_profile == "saver":
            daily_prob = 0.48 if not is_weekend else 0.58
        elif behavior_profile == "food_transport":
            daily_prob = 0.78 if not is_weekend else 0.72
        elif behavior_profile == "social_shopping":
            daily_prob = 0.62 if not is_weekend else 0.85
        else:
            daily_prob = 0.68

        if cur == HISTORY_END:
            daily_prob = 1.0  # Guarantee activity on Nov 27, 2026

        if rng.random() < daily_prob:
            # Weekday commute
            if not is_weekend and behavior_profile in ("food_transport", "internship_income", "hostel_independent"):
                if rng.random() < 0.62:
                    t_tmpl = rng.choice(TRANSPORT_MERCHANTS)
                    amt = rng.randint(t_tmpl.min_rupees, t_tmpl.max_rupees)
                    add_tx(cur, t_tmpl.merchant, rng.choice(t_tmpl.descriptions), amt, "expense", t_tmpl.category, t_tmpl.payment_method)

            # Food / Coffee
            food_prob = 0.72 if behavior_profile != "saver" else 0.42
            if is_weekend:
                food_prob += 0.15
            if cur == HISTORY_END or rng.random() < food_prob:
                f_tmpl = rng.choice(FOOD_MERCHANTS[:3] if behavior_profile == "saver" else FOOD_MERCHANTS)
                amt = rng.randint(f_tmpl.min_rupees, f_tmpl.max_rupees)
                if behavior_profile == "saver":
                    amt = min(amt, 260)
                add_tx(cur, f_tmpl.merchant, rng.choice(f_tmpl.descriptions), amt, "expense", f_tmpl.category, f_tmpl.payment_method)

            # Groceries every ~4-6 days
            if cur.day in (4, 10, 16, 22, 27) and rng.random() < 0.65:
                g_tmpl = rng.choice(GROCERY_MERCHANTS)
                amt = rng.randint(g_tmpl.min_rupees, g_tmpl.max_rupees)
                add_tx(cur, g_tmpl.merchant, rng.choice(g_tmpl.descriptions), amt, "expense", g_tmpl.category, g_tmpl.payment_method)

            # Weekend entertainment or shopping
            if is_weekend and rng.random() < (0.45 if behavior_profile == "social_shopping" else 0.22):
                pool = SHOPPING_MERCHANTS + ENTERTAINMENT_MERCHANTS
                s_tmpl = rng.choice(pool)
                amt = rng.randint(s_tmpl.min_rupees, s_tmpl.max_rupees)
                if is_festive:
                    amt = int(amt * 1.25)
                add_tx(cur, s_tmpl.merchant, rng.choice(s_tmpl.descriptions), amt, "expense", s_tmpl.category, s_tmpl.payment_method)

            # Education / semester expenses
            if cur.day in (8, 19) and cur.month in (1, 2, 7, 8, 9, 11) and rng.random() < 0.55:
                e_tmpl = rng.choice(EDUCATION_MERCHANTS)
                amt = rng.randint(e_tmpl.min_rupees, e_tmpl.max_rupees)
                add_tx(cur, e_tmpl.merchant, rng.choice(e_tmpl.descriptions), amt, "expense", e_tmpl.category, e_tmpl.payment_method)

        cur += timedelta(days=1)

    # Ensure coherent balance: opening + credits - debits >= ₹2,000
    total_income_minor = sum(t["amount_minor"] for t in txs if t["transaction_type"] == "income")
    total_expense_minor = sum(t["amount_minor"] for t in txs if t["transaction_type"] == "expense")
    opening_balance_minor = opening_rupees * 100
    current_balance_minor = opening_balance_minor + total_income_minor - total_expense_minor

    if current_balance_minor < 200_000:
        # Adjust opening balance upwards so the account never starts/ends negative incoherently
        deficit = 250_000 - current_balance_minor
        opening_balance_minor += deficit
        current_balance_minor += deficit

    return {
        "bank_code": bank_code,
        "bank_name": bank_name,
        "account_type": account_type,
        "last_four": last_four,
        "masked_number": f"•••• {last_four}",
        "account_name": f"{bank_name} •••• {last_four}",
        "behavior_profile": behavior_profile,
        "opening_balance_minor": opening_balance_minor,
        "current_balance_minor": current_balance_minor,
        "transactions": txs,
    }
