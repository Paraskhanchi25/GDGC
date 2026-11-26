CATEGORY_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("Food", ("swiggy", "zomato", "canteen", "mess", "cafe", "coffee", "chai", "restaurant", "burger", "pizza", "biryani", "eatclub", "starbucks", "third wave", "darshini")),
    ("Groceries", ("blinkit", "zepto", "instamart", "bigbasket", "dmart", "reliance fresh", "supermarket", "kirana", "milk", "vegetables")),
    ("Transport", ("uber", "ola", "rapido", "namma yatri", "metro", "bmrtc", "bmtc", "irctc", "petrol", "fuel", "auto", "cab", "bus", "train")),
    ("Subscriptions", ("spotify", "netflix", "youtube", "prime", "hotstar", "jio", "airtel", "icloud", "apple", "notion", "chatgpt", "github", "adobe", "canva")),
    ("Education", ("coursera", "udemy", "books", "stationery", "tuition", "exam", "college", "library", "print", "xerox", "notebook", "aws")),
    ("Shopping", ("amazon", "flipkart", "myntra", "ajio", "meesho", "decathlon", "croma", "zudio", "uniqlo", "mall")),
    ("Entertainment", ("bookmyshow", "pvr", "inox", "cinema", "movie", "bowling", "gaming", "steam", "concert")),
    ("Health", ("pharmacy", "apollo", "1mg", "pharmeasy", "clinic", "doctor", "gym", "cult.fit", "medical")),
    ("Utilities", ("electricity", "bescom", "water", "wifi", "broadband", "act fibernet", "recharge", "gas", "rent", "pg", "hostel")),
]

INCOME_KEYWORDS = ("allowance", "stipend", "scholarship", "salary", "part-time", "freelance", "refund", "cashback", "transfer from", "parents", "dad", "mom")


def infer_category(merchant: str, description: str = "", transaction_type: str = "expense") -> str:
    """Infer a student-friendly category from merchant and description."""
    text = f"{merchant} {description}".lower()
    if transaction_type == "income":
        if any(k in text for k in ("allowance", "parents", "dad", "mom", "family")):
            return "Allowance"
        if any(k in text for k in ("stipend", "freelance", "part-time", "salary", "internship")):
            return "Part-time Income"
        if "scholarship" in text:
            return "Scholarship"
        return "Other Income"

    for category, keywords in CATEGORY_RULES:
        if any(kw in text for kw in keywords):
            return category
    return "Other"
