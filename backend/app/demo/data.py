import calendar
import copy
import uuid
from datetime import date, datetime, timedelta, timezone

from app.financial.transactions import TxRecord


def _month_offset(ref: date, months_back: int, day: int) -> date:
    y = ref.year
    m = ref.month - months_back
    while m <= 0:
        m += 12
        y -= 1
    max_day = calendar.monthrange(y, m)[1]
    return date(y, m, min(day, max_day))


def build_initial_demo_state(ref_date: date | None = None) -> dict:
    """
    Create an internally consistent sample financial dataset for Aarav Sharma
    (Bengaluru college student, ₹12,000 monthly allowance).
    """
    today = ref_date or date.today()
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    next_allowance = (
        date(today.year + (1 if today.month == 12 else 0), 1 if today.month == 12 else today.month + 1, 1)
    )

    txs: list[TxRecord] = []

    def add_tx(
        tx_date: date,
        merchant: str,
        desc: str,
        rupees: float,
        tx_type: str,
        category: str,
        method: str,
        source: str,
    ) -> None:
        if tx_date > today:
            return
        txs.append(
            TxRecord(
                id=str(uuid.uuid4()),
                merchant=merchant,
                description=desc,
                amount_minor=int(round(rupees * 100)),
                currency="INR",
                transaction_type=tx_type,
                category_name=category,
                payment_method=method,
                source_name=source,
                transaction_date=tx_date,
            )
        )

    # 3 months of consistent history (2 months ago, last month, current month)
    for m_back in (2, 1, 0):
        add_tx(_month_offset(today, m_back, 1), "Family Transfer", "Monthly student allowance", 12000, "income", "Allowance", "Bank Transfer", "HDFC Student")
        add_tx(_month_offset(today, m_back, 10), "Campus Teaching Assistant", "Part-time lab mentoring", 3500, "income", "Part-time Income", "Bank Transfer", "HDFC Student")

        # Recurring subscriptions
        add_tx(_month_offset(today, m_back, 5), "Spotify India", "Student Duo Plan", 119, "expense", "Subscriptions", "UPI", "GPay")
        add_tx(_month_offset(today, m_back, 12), "YouTube Premium", "Student membership", 89, "expense", "Subscriptions", "UPI", "PhonePe")
        add_tx(_month_offset(today, m_back, 15), "Jio Fiber", "Hostel Wi-Fi split", 499, "expense", "Utilities", "UPI", "GPay")
        add_tx(_month_offset(today, m_back, 18), "Namma Metro", "Monthly smart card top-up", 600, "expense", "Transport", "UPI", "GPay")

        # Food, Groceries, Transport, Education, Entertainment, Shopping
        add_tx(_month_offset(today, m_back, 3), "Swiggy", "Dinner bowl - Koramangala", 285, "expense", "Food", "UPI", "GPay")
        add_tx(_month_offset(today, m_back, 4), "Blinkit", "Snacks & coffee supplies", 420, "expense", "Groceries", "UPI", "PhonePe")
        add_tx(_month_offset(today, m_back, 7), "Third Wave Coffee", "Study session iced latte", 240, "expense", "Food", "Debit Card", "HDFC Student")
        add_tx(_month_offset(today, m_back, 9), "Uber India", "Late evening cab to hostel", 215, "expense", "Transport", "UPI", "GPay")
        add_tx(_month_offset(today, m_back, 11), "College Canteen", "Lunch & chai", 145, "expense", "Food", "Cash", "Wallet Cash")
        add_tx(_month_offset(today, m_back, 14), "Zepto", "Fruits, oats & milk", 560, "expense", "Groceries", "UPI", "GPay")
        add_tx(_month_offset(today, m_back, 16), "Sapna Book House", "Semester reference notes & pens", 680, "expense", "Education", "Debit Card", "HDFC Student")
        add_tx(_month_offset(today, m_back, 20), "Zomato", "Weekend biryani with friends", 410, "expense", "Food", "UPI", "PhonePe")
        add_tx(_month_offset(today, m_back, 22), "BookMyShow", "PVR IMAX student ticket", 350, "expense", "Entertainment", "UPI", "GPay")
        add_tx(_month_offset(today, m_back, 24), "Amazon India", "USB-C hub & notebook", 890 if m_back != 1 else 1450, "expense", "Shopping", "Debit Card", "HDFC Student")
        add_tx(_month_offset(today, m_back, 26), "Rapido", "Auto ride to Indiranagar", 130, "expense", "Transport", "UPI", "PhonePe")
        add_tx(_month_offset(today, m_back, 27), "Apollo Pharmacy", "Vitamins & cold meds", 310, "expense", "Health", "UPI", "GPay")

    # Add recent daily activity if early in the month so dashboard always feels alive
    for d_ago in (1, 2, 4):
        d = today - timedelta(days=d_ago)
        if d.month == today.month:
            if d_ago == 1:
                add_tx(d, "Darshini Cafe", "Masala dosa & filter coffee", 110, "expense", "Food", "UPI", "GPay")
            elif d_ago == 2:
                add_tx(d, "Namma Metro", "Single journey Indiranagar", 45, "expense", "Transport", "UPI", "GPay")
            elif d_ago == 4:
                add_tx(d, "Blinkit", "Instant groceries", 340, "expense", "Groceries", "UPI", "PhonePe")

    goals = [
        {
            "id": "goal-laptop",
            "name": "MacBook / Coding Laptop",
            "target_amount_minor": 4500000,  # ₹45,000
            "current_amount_minor": 1850000,  # ₹18,500
            "target_date": today + timedelta(days=150),
            "status": "active",
        },
        {
            "id": "goal-emergency",
            "name": "Student Emergency Buffer",
            "target_amount_minor": 1500000,  # ₹15,000
            "current_amount_minor": 950000,  # ₹9,500
            "target_date": today + timedelta(days=90),
            "status": "active",
        },
        {
            "id": "goal-trip",
            "name": "Coorg Semester Break Trip",
            "target_amount_minor": 600000,  # ₹6,000
            "current_amount_minor": 420000,  # ₹4,200
            "target_date": today + timedelta(days=45),
            "status": "active",
        },
    ]

    now_iso = datetime.now(timezone.utc).isoformat()
    notifications = [
        {
            "id": "notif-1",
            "title": "Upcoming recurring payment: Jio Fiber",
            "message": "Your monthly Jio Fiber split of ₹499 is expected around the 15th.",
            "notification_type": "payment_reminder",
            "read_at": None,
            "created_at": now_iso,
        },
        {
            "id": "notif-2",
            "title": "Savings milestone: Coorg Trip at 70%",
            "message": "You have saved ₹4,200 toward your ₹6,000 Coorg Semester Break Trip goal.",
            "notification_type": "savings_milestone",
            "read_at": None,
            "created_at": now_iso,
        },
        {
            "id": "notif-3",
            "title": "Weekly spending summary ready",
            "message": "Food and Groceries accounted for your top two categories this week.",
            "notification_type": "weekly_summary",
            "read_at": now_iso,
            "created_at": now_iso,
        },
    ]

    return {
        "profile": {
            "is_demo": True,
            "display_name": "Aarav Sharma",
            "email": "aarav.demo@pulse.student",
            "location": "Bengaluru, India",
            "occupation": "B.Tech Student",
            "country": "India",
            "currency": "INR",
            "monthly_allowance_minor": 1200000,  # ₹12,000
            "allowance_frequency": "monthly",
            "expected_next_allowance_date": next_allowance.isoformat(),
            "current_savings_minor": 3220000,  # ₹32,200 across goals/savings
            "available_balance_minor": 845000,  # ₹8,450 liquid in bank/UPI
            "onboarding_completed": True,
        },
        "transactions": txs,
        "recurring_overrides": {},  # merchant_lower -> status
        "goals": goals,
        "notifications": notifications,
        "notification_preferences": {
            "email_enabled": True,
            "in_app_enabled": True,
            "weekly_summary_enabled": True,
            "payment_reminders_enabled": True,
            "spending_alerts_enabled": True,
        },
        "conversations": {},
    }


class DemoStore:
    """In-memory, session-isolated store for the no-login demo experience."""

    def __init__(self) -> None:
        self._sessions: dict[str, dict] = {}

    def get(self, session_id: str = "default") -> dict:
        key = session_id or "default"
        if key not in self._sessions:
            self._sessions[key] = build_initial_demo_state()
        return self._sessions[key]

    def reset(self, session_id: str = "default") -> dict:
        key = session_id or "default"
        self._sessions[key] = build_initial_demo_state()
        return self._sessions[key]


demo_store = DemoStore()
