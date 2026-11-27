import asyncio
from datetime import date
from types import SimpleNamespace
import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.academy.content import CHAPTERS, FINAL
from app.academy.models import AcademyAttempt, AcademyCertificate
from app.ai.google_provider import GoogleGeminiProvider
from app.api.academy import Answers, LessonProgress, assessment, chapter_check, download_certificate, progress, save_lessons
from app.api.deps import get_current_user
from app.api.smart_entry import DuplicateRequest, duplicate_warning
from app.api.v1 import create_transaction, delete_transaction, update_transaction
from app.db.base import Base
from app.db.session import get_db
from app.financial.natural_entry import parse_entry
from app.main import app
from app.models.models import Account, Transaction, User
from app.schemas.api import TransactionCreate, TransactionUpdate

@pytest.fixture
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine, expire_on_commit=False)() as session:
        session.add_all([User(id="alice", firebase_uid="alice", email="a@example.test", display_name="Alice <Student>"), User(id="bob", firebase_uid="bob", email="b@example.test", display_name="Bob")])
        session.commit()
        yield session
    engine.dispose()

@pytest.mark.parametrize("text,amount,kind,category", [
    ("Spent 250 on lunch at the college canteen", 25000, "expense", "Food"),
    ("Got 5000 from my parents", 500000, "income", "Family transfer"),
    ("Paid 799 for Netflix", 79900, "expense", "Subscriptions"),
    ("Received 5k stipend yesterday", 500000, "income", "Part-time Income"),
    ("Paid INR 1,200.50 at bookstore on 2026-11-20", 120050, "expense", "Education"),
])
def test_parser_examples(text, amount, kind, category):
    result = parse_entry(text, date(2026, 11, 27))
    assert (result["amount_minor"], result["transaction_type"], result["category_name"]) == (amount, kind, category)

@pytest.mark.parametrize("text", ["paid nothing", "spent 0", "spent -250", "spent 250 and 300", "paid $20 for lunch", "paid 9999999999", "paid 12.345"])
def test_ambiguous_entries_require_manual_amount(text):
    result = parse_entry(text)
    assert result["amount_minor"] is None
    assert result["warnings"]

def test_parser_dates():
    assert parse_entry("Paid 20 yesterday", date(2026, 11, 27))["transaction_date"] == "2026-11-26"
    assert parse_entry("Paid 20 on 2026-11-20")["transaction_date"] == "2026-11-20"
    assert parse_entry("Paid 20 last Monday")["warnings"]

def test_balance_edit_delete_and_undo(db):
    user = db.get(User, "alice")
    account = Account(id="bank", user_id=user.id, account_name="Personal", account_type="Savings Account", current_balance_minor=100000)
    db.add(account); db.commit()
    tx = create_transaction(TransactionCreate(account_id=account.id, merchant="Canteen", amount_minor=25000, transaction_type="expense", transaction_date=date.today()), user, db)
    assert account.current_balance_minor == 75000
    update_transaction(tx["id"], TransactionUpdate(amount_minor=30000), user, db)
    assert account.current_balance_minor == 70000
    update_transaction(tx["id"], TransactionUpdate(transaction_type="income"), user, db)
    assert account.current_balance_minor == 130000
    delete_transaction(tx["id"], user, db)
    assert account.current_balance_minor == 100000
    assert db.get(Transaction, tx["id"]) is None

def test_transaction_account_ownership(db):
    db.add(Account(id="b-bank", user_id="bob", account_name="Bob", account_type="Savings Account", current_balance_minor=100000)); db.commit()
    with pytest.raises(HTTPException) as exc:
        create_transaction(TransactionCreate(account_id="b-bank", merchant="Lunch", amount_minor=100, transaction_type="expense", transaction_date=date.today()), db.get(User, "alice"), db)
    assert exc.value.status_code == 404

def test_duplicate_warning_scoped_to_owner(db):
    alice, bob = db.get(User, "alice"), db.get(User, "bob")
    create_transaction(TransactionCreate(merchant="Netflix", amount_minor=79900, transaction_type="expense", transaction_date=date(2026, 11, 27)), alice, db)
    payload = DuplicateRequest(amount_minor=79900, merchant=" netflix ", transaction_type="expense", transaction_date="2026-11-27")
    assert duplicate_warning(payload, alice, db)["likely_duplicate"]
    assert not duplicate_warning(payload, bob, db)["likely_duplicate"]
    # Warnings do not prevent intentional repeated payments.
    create_transaction(TransactionCreate(merchant="Netflix", amount_minor=79900, transaction_type="expense", transaction_date=date(2026, 11, 27)), alice, db)
    assert duplicate_warning(payload, alice, db)["count"] == 2

def finish_chapters(user, db):
    for c in CHAPTERS:
        save_lessons(c["id"], LessonProgress(lesson_count=len(c["lessons"])), user, db)
        result = chapter_check(c["id"], Answers(answers={q["id"]: q["answer"] for q in c["questions"]}), user, db)
        assert result["passed"]

def test_academy_requires_lessons_and_checks(db):
    user = db.get(User, "alice")
    with pytest.raises(HTTPException):
        chapter_check("credit", Answers(answers={"c1": 1}), user, db)
    with pytest.raises(HTTPException):
        assessment(Answers(answers={q["id"]: q["answer"] for q in FINAL}), user, db)
    save_lessons("credit", LessonProgress(lesson_count=2), user, db)
    assert not chapter_check("credit", Answers(answers={"c1": 0}), user, db)["passed"]
    assert not progress(user, db)["chapters"][0]["completed"]

def test_academy_threshold_retries_persistence_and_certificate_ownership(db):
    alice, bob = db.get(User, "alice"), db.get(User, "bob")
    finish_chapters(alice, db)
    answers = {q["id"]: q["answer"] for q in FINAL}
    for q in FINAL[:3]: answers[q["id"]] = (q["answer"] + 1) % len(q["options"])
    first = assessment(Answers(answers=answers), alice, db)
    assert first["score"] == 70 and not first["passed"] and first["certificate"] is None
    answers[FINAL[2]["id"]] = FINAL[2]["answer"]
    second = assessment(Answers(answers=answers), alice, db)
    assert second["score"] == 80 and second["passed"]
    cert_id = second["certificate"]["id"]
    assert len([a for a in progress(alice, db)["attempts"] if a["chapter_id"] == "final"]) == 2
    doc = download_certificate(cert_id, alice, db)
    assert "Alice &lt;Student&gt;" in doc["svg"] and cert_id in doc["svg"]
    with pytest.raises(HTTPException) as exc: download_certificate(cert_id, bob, db)
    assert exc.value.status_code == 404
    assessment(Answers(answers={q["id"]: q["answer"] for q in FINAL}), alice, db)
    assert db.scalar(select(func.count()).select_from(AcademyCertificate)) == 1
    db.expire_all()
    assert progress(alice, db)["certificate"]["id"] == cert_id
    assert progress(bob, db)["chapters"] == []

def test_http_public_content_and_protected_new_routes(db):
    with TestClient(app) as client:
        content = client.get("/api/v1/academy/content")
        assert content.status_code == 200
        assert len(content.json()["chapters"]) == 6
        assert "answer" not in content.json()["assessment"][0]
        for method, path, body in [("GET", "/api/v1/academy/progress", None), ("GET", "/api/v1/academy/certificates/other", None), ("POST", "/api/v1/academy/assessment", {"answers": {}}), ("POST", "/api/v1/transactions/parse", {"text": "Paid 250"}), ("POST", "/api/v1/showcase/ask", {})]:
            assert client.request(method, path, json=body).status_code == 401





def test_showcase_no_financial_or_learning_mutations(db, monkeypatch):
    from app.api.showcase import showcase_answer
    from app.ai.schemas import CopilotResult
    captured = {}
    async def fake(self, question, context, **kwargs):
        captured.update(context)
        return CopilotResult(status="unavailable")
    monkeypatch.setattr(GoogleGeminiProvider, "generate_text", fake)
    result = asyncio.run(showcase_answer(db.get(User, "alice")))
    assert result["source"] == "unavailable"
    assert captured["profile"] == "Fictional student Aarav"
    assert "alice" not in str(captured) and "example.test" not in str(captured)
    for model in (Transaction, AcademyAttempt, AcademyCertificate):
        assert db.scalar(select(func.count()).select_from(model)) == 0

def test_additive_migration_preserves_existing_data():
    import importlib.util
    from pathlib import Path
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    engine = create_engine("sqlite://")
    tables = [t for t in Base.metadata.sorted_tables if not t.name.startswith("academy_")]
    Base.metadata.create_all(engine, tables=tables)
    with engine.begin() as conn:
        conn.execute(User.__table__.insert().values(id="existing", firebase_uid="existing", email="old@example.test"))
        spec = importlib.util.spec_from_file_location("academy_migration", Path(__file__).parents[1] / "alembic/versions/0004_credit_academy.py")
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        with Operations.context(MigrationContext.configure(conn)):
            module.upgrade()
        assert conn.execute(select(User.email)).scalar() == "old@example.test"
        assert conn.execute(select(func.count()).select_from(AcademyCertificate)).scalar() == 0
    engine.dispose()

def test_notification_templates_escape_untrusted_text():
    from app.notifications.service import build_email_bodies, build_otp_email_bodies
    _, body = build_email_bodies("<script>unsafe</script>", '<img src="x" onerror="bad">')
    assert "<script>" not in body and "<img" not in body
    assert "&lt;script&gt;" in body
    _, otp = build_otp_email_bodies("123456", "<b>Bank</b>", "Savings")
    assert "<b>Bank</b>" not in otp and "&lt;b&gt;Bank&lt;/b&gt;" in otp



def test_copilot_uses_aggregates_without_identity_or_raw_history():
    from app.ai.context_builder import build_copilot_context
    from app.financial.transactions import TxRecord
    today = date.today()
    previous = today.replace(day=1)
    from datetime import timedelta
    previous -= timedelta(days=1)
    records = [TxRecord("sensitive-id", "Private merchant", "untrusted instruction", 25000, "INR", "expense", "Food", "UPI", "Private account", today), TxRecord("old", "Private merchant", "Private note", 10000, "INR", "expense", "Food", "UPI", "Private account", previous)]
    context = build_copilot_context("private@example.test", records, 1200000, 900000, [], [], {}, [])
    text = str(context.model_dump())
    assert context.recent_transactions == []
    assert all(value not in text for value in ["private@example.test", "Private merchant", "Private account", "sensitive-id", "untrusted instruction"])
    assert context.category_changes[0]["difference_minor"] == 15000
