import base64
import html
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from email.utils import parsedate_to_datetime

KNOWN_MERCHANTS: dict[str, tuple[str, str]] = {
    "netflix": ("Netflix", "OTT"),
    "spotify": ("Spotify", "Music"),
    "youtube": ("YouTube Premium", "OTT"),
    "amazon prime": ("Amazon Prime", "Subscriptions"),
    "prime video": ("Amazon Prime", "OTT"),
    "google one": ("Google One", "Cloud Storage"),
    "apple": ("Apple Services", "Subscriptions"),
    "icloud": ("Apple Services", "Cloud Storage"),
    "microsoft 365": ("Microsoft 365", "Software"),
    "office 365": ("Microsoft 365", "Software"),
    "adobe": ("Adobe", "Software"),
    "hotstar": ("Disney+ Hotstar", "OTT"),
    "disney+": ("Disney+ Hotstar", "OTT"),
    "zee5": ("ZEE5", "OTT"),
    "sonyliv": ("SonyLIV", "OTT"),
    "notion": ("Notion", "Software"),
    "chatgpt": ("ChatGPT Plus", "Software"),
    "openai": ("OpenAI", "Software"),
    "github": ("GitHub", "Software"),
    "canva": ("Canva", "Software"),
    "cult.fit": ("Cult.fit", "Fitness"),
    "coursera": ("Coursera", "Education"),
    "xbox": ("Xbox Game Pass", "Gaming"),
    "playstation": ("PlayStation Plus", "Gaming"),
    "dropbox": ("Dropbox", "Cloud Storage"),
    "nytimes": ("The New York Times", "News"),
}

PROMO_NOISE_PATTERNS = (
    "unsubscribe from this newsletter",
    "special offer",
    "limited time deal",
    "win a",
    "flash sale",
    "join today and get",
    "recommended for you",
)

SUBSCRIPTION_KEYWORDS = (
    "subscription",
    "renewal",
    "renewed",
    "renews",
    "recurring",
    "billing cycle",
    "monthly plan",
    "annual plan",
    "yearly plan",
    "membership",
    "free trial",
    "trial ends",
    "trial ending",
    "auto-pay",
    "autopay",
    "payment failed",
    "payment unsuccessful",
    "unable to process your payment",
    "subscription cancelled",
    "subscription canceled",
    "membership cancelled",
    "membership canceled",
    "next billing date",
    "upcoming charge",
)

ONE_TIME_INDICATORS = (
    "order shipped",
    "out for delivery",
    "delivered on",
    "tracking number",
    "one-time purchase",
    "single purchase",
)

AMOUNT_PATTERNS = (
    (re.compile(r"(?:₹|Rs\.?|INR)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)", re.IGNORECASE), "INR"),
    (re.compile(r"\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)"), "USD"),
    (re.compile(r"€\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)"), "EUR"),
    (re.compile(r"£\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)"), "GBP"),
)

DATE_REGEX = re.compile(
    r"\b(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{4})\b",
    re.IGNORECASE,
)


@dataclass
class DetectedSubscriptionEvent:
    gmail_message_id: str
    is_subscription: bool
    event_type: str  # subscription_created, payment_successful, upcoming_renewal, plan_changed, payment_failed, free_trial_started, trial_ending, subscription_cancelled, refund_issued, ignored
    merchant_name: str
    merchant_category: str
    amount_minor: int | None
    currency: str
    billing_frequency: str  # weekly, monthly, quarterly, yearly, unknown
    event_date: date | None
    next_billing_date: date | None
    trial_end_date: date | None
    confidence: float


def decode_base64url(data: str) -> str:
    padded = data + "=" * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8", errors="replace")


def strip_html_tags(raw_html: str) -> str:
    no_style = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", raw_html, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", no_style)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def extract_email_parts(message_payload: dict) -> tuple[str, str, date | None, str]:
    """Extract (sender, subject, email_date, plain_text_body) from a Gmail API message payload."""
    headers = {
        h.get("name", "").lower(): h.get("value", "")
        for h in (message_payload.get("payload", {}).get("headers") or [])
    }
    sender = headers.get("from", "")
    subject = headers.get("subject", "")
    raw_date = headers.get("date", "")
    email_date: date | None = None
    if raw_date:
        try:
            email_date = parsedate_to_datetime(raw_date).date()
        except Exception:
            email_date = None

    plain_chunks: list[str] = []
    html_chunks: list[str] = []

    def walk(part: dict) -> None:
        mime = (part.get("mimeType") or "").lower()
        body_data = (part.get("body") or {}).get("data")
        if body_data:
            decoded = decode_base64url(body_data)
            if mime == "text/plain":
                plain_chunks.append(decoded)
            elif mime == "text/html":
                html_chunks.append(strip_html_tags(decoded))
        for sub in part.get("parts") or []:
            walk(sub)

    walk(message_payload.get("payload") or {})
    body_text = "\n".join(plain_chunks) if plain_chunks else "\n".join(html_chunks)
    if not body_text:
        body_text = message_payload.get("snippet", "")
    return sender, subject, email_date, body_text[:8000]


def _parse_date_candidate(raw: str) -> date | None:
    s = raw.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d %B %Y", "%d %b %Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _extract_merchant(sender: str, subject: str, body: str) -> tuple[str, str]:
    combined = f"{sender} {subject} {body[:600]}".lower()
    for key, (name, cat) in KNOWN_MERCHANTS.items():
        if key in combined:
            return name, cat

    # Fallback: extract display name from From header ("Acme Cloud <billing@acme.com>")
    m = re.match(r'^"?([^"<]+)"?\s*<([^>]+)>', sender.strip())
    if m:
        display = m.group(1).strip()
        domain = m.group(2).split("@")[-1].split(".")[0].capitalize()
        candidate = display if display and len(display) <= 40 and "no-reply" not in display.lower() and "noreply" not in display.lower() else domain
        return candidate[:80] or "Unknown Service", "Subscriptions"

    if "@" in sender:
        domain = sender.split("@")[-1].split(".")[0].capitalize()
        return domain[:80] or "Unknown Service", "Subscriptions"

    return "Unknown Service", "Subscriptions"


def _extract_amount(text: str) -> tuple[int | None, str]:
    for regex, currency in AMOUNT_PATTERNS:
        m = regex.search(text)
        if m:
            num_str = m.group(1).replace(",", "")
            try:
                val = float(num_str)
                if val > 0:
                    return int(round(val * 100)), currency
            except ValueError:
                continue
    return None, "INR"


def _extract_frequency(text: str) -> str:
    low = text.lower()
    if any(k in low for k in ("per week", "weekly", "/week", "every week")):
        return "weekly"
    if any(k in low for k in ("per month", "monthly", "/month", "/mo", "every month")):
        return "monthly"
    if any(k in low for k in ("quarterly", "every 3 months", "3-month")):
        return "quarterly"
    if any(k in low for k in ("annual", "yearly", "per year", "/year", "every year", "12 months")):
        return "yearly"
    return "unknown"


def add_billing_cycle(base_date: date, frequency: str) -> date | None:
    if frequency == "weekly":
        return base_date + timedelta(days=7)
    if frequency == "monthly":
        return base_date + timedelta(days=30)
    if frequency == "quarterly":
        return base_date + timedelta(days=90)
    if frequency == "yearly":
        return base_date + timedelta(days=365)
    return None


def analyze_subscription_email(
    gmail_message_id: str,
    sender: str,
    subject: str,
    email_date: date | None,
    body_text: str,
) -> DetectedSubscriptionEvent:
    """
    Classify an email and extract structured subscription metadata.
    Never treats a clear one-time purchase or promotional newsletter as a subscription.
    """
    combined = f"{subject}\n{body_text}".lower()

    # Filter out promotional newsletters or pure one-time shipping orders
    is_promo = any(p in combined for p in PROMO_NOISE_PATTERNS) and "receipt" not in combined and "invoice" not in combined
    is_one_time = any(p in combined for p in ONE_TIME_INDICATORS) and not any(k in combined for k in ("subscription", "recurring", "renewal", "membership"))
    has_sub_signal = any(kw in combined for kw in SUBSCRIPTION_KEYWORDS)

    if is_promo or is_one_time or not has_sub_signal:
        return DetectedSubscriptionEvent(
            gmail_message_id=gmail_message_id,
            is_subscription=False,
            event_type="ignored",
            merchant_name="",
            merchant_category="Subscriptions",
            amount_minor=None,
            currency="INR",
            billing_frequency="unknown",
            event_date=email_date,
            next_billing_date=None,
            trial_end_date=None,
            confidence=0.0,
        )

    merchant_name, category = _extract_merchant(sender, subject, body_text)
    amount_minor, currency = _extract_amount(f"{subject} {body_text}")
    frequency = _extract_frequency(combined)

    # Classify event type
    event_type = "payment_successful"
    if any(k in combined for k in ("cancelled", "canceled", "cancellation confirmed", "membership ended")):
        event_type = "subscription_cancelled"
    elif any(k in combined for k in ("payment failed", "payment unsuccessful", "unable to process", "card declined", "action required")):
        event_type = "payment_failed"
    elif any(k in combined for k in ("trial ending", "trial ends", "free trial is ending", "trial expires")):
        event_type = "trial_ending"
    elif any(k in combined for k in ("free trial started", "welcome to your free trial", "trial has begun")):
        event_type = "free_trial_started"
    elif any(k in combined for k in ("upcoming renewal", "will renew", "upcoming charge", "auto-renew")):
        event_type = "upcoming_renewal"
    elif any(k in combined for k in ("plan changed", "upgraded", "downgraded", "price change")):
        event_type = "plan_changed"
    elif "refund" in combined:
        event_type = "refund_issued"
    elif any(k in combined for k in ("subscription confirmed", "welcome to", "started your subscription")):
        event_type = "subscription_created"

    # Extract explicit future/trial dates if present
    next_billing_date: date | None = None
    trial_end_date: date | None = None
    for match in DATE_REGEX.finditer(body_text):
        parsed = _parse_date_candidate(match.group(1))
        if parsed and email_date and parsed > email_date:
            if event_type in ("free_trial_started", "trial_ending") and trial_end_date is None:
                trial_end_date = parsed
            elif next_billing_date is None:
                next_billing_date = parsed

    if next_billing_date is None and email_date and frequency != "unknown" and event_type in ("payment_successful", "subscription_created", "plan_changed"):
        next_billing_date = add_billing_cycle(email_date, frequency)

    # Confidence scoring
    confidence = 0.55
    if merchant_name != "Unknown Service":
        confidence += 0.15
    if amount_minor is not None:
        confidence += 0.15
    if frequency != "unknown":
        confidence += 0.10
    if event_type in ("payment_successful", "subscription_cancelled", "payment_failed", "trial_ending"):
        confidence += 0.05
    confidence = round(min(confidence, 0.98), 2)

    return DetectedSubscriptionEvent(
        gmail_message_id=gmail_message_id,
        is_subscription=True,
        event_type=event_type,
        merchant_name=merchant_name,
        merchant_category=category,
        amount_minor=amount_minor,
        currency=currency,
        billing_frequency=frequency,
        event_date=email_date,
        next_billing_date=next_billing_date,
        trial_end_date=trial_end_date,
        confidence=confidence,
    )
