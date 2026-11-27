"""English curriculum, versioned and kept outside UI; add locales alongside en.
References reviewed 2026-11-27. Issuer examples are not recommendations.
"""
VERSION = "2026-11-27"
SOURCES = [
    {"title": "TransUnion CIBIL: understanding credit information", "url": "https://www.cibil.com/faq-brochure"},
    {"title": "RBI: Credit Card and Debit Card Directions", "url": "https://www.rbi.org.in/scripts/FS_Notification.aspx?Id=12300&Mode=0&fn=14"},
    {"title": "ICICI Bank: secured card terms (issuer example)", "url": "https://www.icici.bank.in/personal-banking/cards/credit-card/credit-card-against-fixed-deposit"},
]
CHAPTERS = [
    {"id": "credit", "title": "Credit, decoded", "subtitle": "Borrowed money. Real responsibility.", "visual": "card", "lessons": [
        {"title": "A card changes when you pay", "body": "A debit card generally spends money already in your account. A credit card lets you borrow from an issuer and repay later. If you buy a ₹1,200 textbook on credit, you still owe ₹1,200 even though your bank balance has not moved yet. Borrowing is a commitment against future money, never extra income."},
        {"title": "Your limit is a ceiling, not a budget", "body": "A ₹20,000 credit limit is the maximum the issuer permits under the card agreement. It does not mean you can afford ₹20,000 of purchases. Decide what you can repay from money you already expect to have, after rent, food and savings. Lenders look at repayment behaviour to understand risk. A card can be useful, but using one is optional."}],
     "questions": [{"id": "c1", "prompt": "A credit limit is…", "options": ["Extra monthly income", "A borrowing ceiling", "A savings balance"], "answer": 1, "explanation": "The limit caps borrowing. Every purchase still needs repayment."}]},
    {"id": "score", "title": "Know your CIBIL score", "subtitle": "Understand the record behind the number.", "visual": "utilization", "lessons": [
        {"title": "A record, not a verdict", "body": "TransUnion CIBIL is a credit information company, not a bank or a card issuer. It maintains credit information reported by lenders. Its score ranges from 300 to 900. A score summarises credit history; lenders also consider their own policies and other information. A student with little credit history may not yet have a score."},
        {"title": "Habits matter more than shortcuts", "body": "Payment history, utilisation, age of credit and enquiries influence scoring. Credit mix may also be considered; taking unnecessary loans to change it is unwise. Utilisation is outstanding card credit divided by the available limit. Keep borrowing manageable and repay on time. There is no public formula that lets this lesson predict score changes. Carrying interest-bearing debt is not required to build history. Completing PULSE lessons does not change your CIBIL score."}],
     "questions": [{"id": "c2", "prompt": "Who decides whether to approve a card?", "options": ["PULSE", "CIBIL", "The card issuer"], "answer": 2, "explanation": "The issuer makes its own approval decision; CIBIL provides credit information."}]},
    {"id": "first-card", "title": "Your first credit card", "subtitle": "Read the terms before the rewards.", "visual": "deposit", "lessons": [
        {"title": "Secured and unsecured", "body": "An unsecured card does not require a deposit as collateral. Eligibility may depend on age, income, credit history and issuer policy. An FD-backed card is secured against a fixed deposit. The issuer normally places a lien on that deposit, restricting access while it backs the card. A credit limit is set under the issuer’s terms; there is no universal deposit-to-limit percentage."},
        {"title": "Your deposit is still your money at risk", "body": "You must repay the bill even with an FD-backed card. The deposit does not automatically settle each monthly bill. Check annual and joining fees, interest rate, late fees, cash withdrawal charges, deposit tenure, early-closure conditions and how default may affect the deposit. Ask what happens when the card is closed: outstanding amounts must be settled and lien release follows issuer procedures. Approval, fees and limits vary. The linked issuer page is an example, not a product recommendation."}],
     "questions": [{"id": "c3", "prompt": "With an FD-backed card, you should…", "options": ["Repay each bill under the card terms", "Assume the FD pays every bill", "Ignore late fees"], "answer": 0, "explanation": "Collateral does not remove your repayment obligation."}]},
    {"id": "billing", "title": "Follow the billing cycle", "subtitle": "Two dates worth remembering.", "visual": "billing", "lessons": [
        {"title": "Statement date and due date", "body": "The statement closes a billing period and lists transactions, charges, total amount due and minimum amount due. The payment due date is when payment must reach the issuer under its terms. Purchases after a statement date normally appear in the following statement. Actual cycles, posting times and due dates vary. Always use your statement, not an assumed number of interest-free days."},
        {"title": "Minimum is not paid in full", "body": "Paying the minimum is different from paying the total amount due. Carrying a balance can attract finance charges and remove the interest-free period according to the agreement. Cash advances often have separate charges. Set reminders early enough for processing. Check refunds and disputes on your statement rather than assuming they cancel your payment obligation."}],
     "questions": [{"id": "c4", "prompt": "Paying only the minimum generally…", "options": ["Makes all purchases interest-free", "Leaves an outstanding balance", "Closes your card"], "answer": 1, "explanation": "The remaining balance can attract charges; read your issuer’s terms."}]},
    {"id": "habits", "title": "Build a repayment habit", "subtitle": "A useful card starts with a plan.", "visual": "repayment", "lessons": [
        {"title": "Keep the bill inside your budget", "body": "Before a purchase, set aside money to repay it. Review transactions and enable payment alerts. If you use automatic payments, keep enough funds in the paying account and confirm that payment succeeds. A failed debit is not a completed payment. Keep a separate buffer for essential expenses."},
        {"title": "When money gets tight", "body": "Stop adding purchases you cannot repay. Contact the issuer early to understand options and charges. Avoid borrowing from one expensive source just to repay another without a sustainable plan. Check your official credit report for errors and use the bureau or lender dispute process. Never share a card OTP, PIN or security code. Simulations here illustrate balances only and do not predict a credit score."}],
     "questions": [{"id": "c5", "prompt": "An automatic debit fails. What next?", "options": ["Assume the bill is paid", "Wait until next month", "Arrange payment and check with the issuer"], "answer": 2, "explanation": "Check payment status and act before the due date."}]},
    {"id": "ready", "title": "Choose your next step", "subtitle": "You can be informed without applying.", "visual": "readiness", "lessons": [
        {"title": "A personal readiness check", "body": "Can you track your spending, explain the bill and due date, and repay in full without using money for essentials? Do you have a reliable repayment source and a buffer? If not, continue building those habits first. Choosing to wait is a valid decision. PULSE does not decide lending eligibility."},
        {"title": "Questions to take to an issuer", "body": "Ask for the Most Important Terms and Conditions and the fee schedule. Check eligibility, annual percentage rate, minimum payment rules, dispute procedures and closure process. For an FD-backed option, ask about the lien, deposit maturity and release after closure. Compare costs to your needs rather than reward headlines. This Academy provides general education, not personalised financial advice, credit approval or official accreditation."}],
     "questions": [{"id": "c6", "prompt": "Completing this Academy means…", "options": ["You completed PULSE’s learning programme", "A lender must approve your card", "Your CIBIL score increased"], "answer": 0, "explanation": "The certificate recognises learning only."}]},
]

FINAL = [
    *[q for chapter in CHAPTERS for q in chapter["questions"]],
    {"id": "f7", "prompt": "₹6,000 outstanding on a ₹20,000 limit is…", "options": ["3% utilisation", "30% utilisation", "60% utilisation"], "answer": 1, "explanation": "6,000 ÷ 20,000 × 100 = 30%. This is not a score prediction."},
    {"id": "f8", "prompt": "A longer credit history means you should…", "options": ["Borrow unnecessarily", "Ignore payments", "Maintain responsible habits"], "answer": 2, "explanation": "Taking debt just to change your history is not necessary."},
    {"id": "f9", "prompt": "Before closing an FD-backed card, check…", "options": ["Outstanding dues and lien release terms", "Only the reward points", "Nothing; closure is always instant"], "answer": 0, "explanation": "The issuer’s closure and release process applies."},
    {"id": "f10", "prompt": "Your real payment due date comes from…", "options": ["This simulator", "A friend's billing cycle", "Your issuer's statement"], "answer": 2, "explanation": "Dates and processing requirements vary by issuer."},
]

def public_content() -> dict:
    def clean(q):
        return {k: v for k, v in q.items() if k not in ("answer", "explanation")}
    return {"locale": "en", "version": VERSION, "sources": SOURCES,
            "chapters": [{**c, "questions": [clean(q) for q in c["questions"]]} for c in CHAPTERS],
            "assessment": [clean(q) for q in FINAL]}
