"""Deterministic entry suggestions. Never writes transactions or requires an AI provider."""
import re
from datetime import date, timedelta
from decimal import Decimal

from app.financial.categorization import infer_category


def parse_entry(text: str, today: date | None = None) -> dict:
    today = today or date.today()
    text = text.strip()
    warnings = []
    # Remove explicit dates before looking for money: years/days are not amounts.
    dates = re.findall(r"\b\d{4}-\d{2}-\d{2}\b", text)
    amount_text = re.sub(r"\b\d{4}-\d{2}-\d{2}\b", "", text)
    amounts = re.findall(r"(?<![\w.-])(?:₹|rs\.?\s*|inr\s*)?(\d[\d,]*(?:\.\d{1,2})?)(?![\d.,])\s*(k|lakh)?\b", amount_text, re.I)
    amount = None
    if len(amounts) == 1:
        raw, unit = amounts[0]
        value = Decimal(raw.replace(",", "")) * (1000 if unit.lower() == "k" else 100000 if unit.lower() == "lakh" else 1)
        if 0 < value <= 10000000:
            amount = int(value * 100)
    if amount is None:
        warnings.append("Enter one positive amount in rupees, or edit the amount below.")
    if re.search(r"\$|€|\b(?:usd|eur|dollars?)\b", text, re.I):
        amount = None
        warnings.append("This entry supports Indian rupees. Please enter the INR amount yourself.")
    tx_type = "income" if re.search(r"\b(got|received|earned|credited|salary|stipend|allowance|refund)\b", text, re.I) else "expense"
    tx_date = today - timedelta(days=1) if re.search(r"\byesterday\b", text, re.I) else today
    if dates:
        try:
            tx_date = date.fromisoformat(dates[0])
        except ValueError:
            warnings.append("That date is invalid. Choose the date below.")
    elif re.search(r"\b(last|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", text, re.I):
        warnings.append("Please choose the date for this entry.")
    merchant_match = re.search(r"\b(?:at|from|for)\s+(.+?)(?:\s+(?:today|yesterday)|$)", text, re.I)
    merchant = merchant_match[1].strip()[:160] if merchant_match else "Personal entry"
    category = infer_category(merchant, text, tx_type)
    if tx_type == "income" and re.search(r"\b(parents|family|dad|mom)\b", text, re.I):
        category = "Family transfer"
    if tx_type == "expense" and re.search(r"\b(lunch|dinner|breakfast)\b", text, re.I):
        category = "Food"
    return {"amount_minor": amount, "currency": "INR", "transaction_type": tx_type,
            "merchant": merchant, "description": text[:255], "category_name": category,
            "transaction_date": tx_date.isoformat(), "warnings": warnings, "parser": "local"}
