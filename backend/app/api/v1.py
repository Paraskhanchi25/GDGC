import uuid
from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.context_builder import build_copilot_context
from app.ai.copilot_service import CopilotService
from app.api.deps import build_overview_payload, get_current_user
from app.db.session import get_db
from app.financial.affordability import evaluate_purchase_affordability
from app.financial.analytics import (
    compute_category_breakdown,
    compute_daily_spending,
    compute_monthly_trends,
    compute_period_comparison,
    compute_totals,
)
from app.financial.categorization import infer_category
from app.financial.csv_import import parse_csv_transactions
from app.financial.forecasting import compute_allowance_forecast
from app.financial.insights import generate_financial_insights
from app.financial.recurring import detect_recurring_payments
from app.financial.savings import enrich_savings_goal
from app.financial.transactions import TxRecord, filter_transactions, is_duplicate_transaction
from app.models.models import (
    AIConversation,
    AIMessage,
    ImportJob,
    Notification,
    NotificationPreference,
    RecurringPayment,
    SavingsContribution,
    SavingsGoal,
    Transaction,
    User,
    UserProfile,
)
from app.notifications.service import send_smtp_notification
from app.schemas.api import (
    CopilotChatRequest,
    GoalContributionCreate,
    GoalCreate,
    GoalUpdate,
    ImportConfirmRequest,
    NotificationPreferenceUpdate,
    ProfileUpdate,
    RecurringStatusUpdate,
    SimulatorRequest,
    TransactionCreate,
    TransactionUpdate,
)
from app.storage.service import StorageService

router = APIRouter(prefix="/api/v1", tags=["Authenticated API"])


def _to_tx_record(row: Transaction) -> TxRecord:
    return TxRecord(
        id=row.id,
        merchant=row.merchant,
        description=row.description,
        amount_minor=row.amount_minor,
        currency=row.currency,
        transaction_type=row.transaction_type,
        category_name=row.category_name,
        payment_method=row.payment_method,
        source_name=row.source_name,
        transaction_date=row.transaction_date,
        notes=row.notes,
    )


def _tx_row_to_dict(row: Transaction) -> dict:
    return {
        "id": row.id,
        "merchant": row.merchant,
        "description": row.description,
        "amount_minor": row.amount_minor,
        "currency": row.currency,
        "transaction_type": row.transaction_type,
        "category_name": row.category_name,
        "payment_method": row.payment_method,
        "source_name": row.source_name,
        "transaction_date": row.transaction_date.isoformat(),
        "notes": row.notes,
    }


def _load_user_tx_records(db: Session, user_id: str) -> list[TxRecord]:
    rows = db.scalars(select(Transaction).where(Transaction.user_id == user_id)).all()
    return [_to_tx_record(r) for r in rows]


def _get_user_profile(db: Session, user_id: str) -> UserProfile:
    prof = db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
    if prof is None:
        prof = UserProfile(id=str(uuid.uuid4()), user_id=user_id)
        db.add(prof)
        db.commit()
        db.refresh(prof)
    return prof


def _compute_available_balance(profile: UserProfile, records: list[TxRecord]) -> int:
    income = sum(t.amount_minor for t in records if t.transaction_type == "income")
    expense = sum(t.amount_minor for t in records if t.transaction_type == "expense")
    if income == 0 and expense == 0:
        return profile.monthly_allowance_minor
    return profile.current_savings_minor + income - expense


# --- Profile & Onboarding ---

@router.get("/profile")
def get_profile(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    prof = _get_user_profile(db, user.id)
    return {
        "is_demo": False,
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "country": prof.country,
        "currency": prof.currency,
        "monthly_allowance_minor": prof.monthly_allowance_minor,
        "allowance_frequency": prof.allowance_frequency,
        "expected_next_allowance_date": prof.expected_next_allowance_date.isoformat()
        if prof.expected_next_allowance_date
        else None,
        "current_savings_minor": prof.current_savings_minor,
        "onboarding_completed": prof.onboarding_completed,
    }


@router.patch("/profile")
def update_profile(
    payload: ProfileUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    prof = _get_user_profile(db, user.id)
    if payload.display_name is not None:
        user.display_name = payload.display_name
    for field in (
        "country",
        "currency",
        "monthly_allowance_minor",
        "allowance_frequency",
        "expected_next_allowance_date",
        "current_savings_minor",
        "onboarding_completed",
    ):
        val = getattr(payload, field)
        if val is not None:
            setattr(prof, field, val)
    db.commit()
    return get_profile(user, db)


@router.post("/onboarding")
def complete_onboarding(
    payload: ProfileUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    payload.onboarding_completed = True
    return update_profile(payload, user, db)


# --- Transactions ---

@router.get("/transactions")
def list_transactions(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    search: str | None = None,
    category: str | None = None,
    payment_method: str | None = None,
    source_name: str | None = None,
    transaction_type: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = Query(default=100, ge=1, le=500),
) -> dict:
    records = _load_user_tx_records(db, user.id)
    filtered = filter_transactions(
        records,
        search=search,
        category=category,
        payment_method=payment_method,
        source_name=source_name,
        transaction_type=transaction_type,
        start_date=start_date,
        end_date=end_date,
    )
    return {
        "total": len(filtered),
        "items": [
            {
                "id": t.id,
                "merchant": t.merchant,
                "description": t.description,
                "amount_minor": t.amount_minor,
                "currency": t.currency,
                "transaction_type": t.transaction_type,
                "category_name": t.category_name,
                "payment_method": t.payment_method,
                "source_name": t.source_name,
                "transaction_date": t.transaction_date.isoformat(),
                "notes": t.notes,
            }
            for t in filtered[:limit]
        ],
    }


@router.post("/transactions", status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    category = payload.category_name or infer_category(payload.merchant, payload.description, payload.transaction_type)
    tx = Transaction(
        id=str(uuid.uuid4()),
        user_id=user.id,
        merchant=payload.merchant,
        description=payload.description,
        amount_minor=payload.amount_minor,
        currency=payload.currency,
        transaction_type=payload.transaction_type,
        category_name=category,
        payment_method=payload.payment_method,
        source_name=payload.source_name,
        transaction_date=payload.transaction_date,
        notes=payload.notes,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return _tx_row_to_dict(tx)


@router.patch("/transactions/{tx_id}")
def update_transaction(
    tx_id: str,
    payload: TransactionUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    tx = db.scalar(select(Transaction).where(Transaction.id == tx_id, Transaction.user_id == user.id))
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(tx, field, val)
    db.commit()
    db.refresh(tx)
    return _tx_row_to_dict(tx)


@router.delete("/transactions/{tx_id}")
def delete_transaction(
    tx_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    tx = db.scalar(select(Transaction).where(Transaction.id == tx_id, Transaction.user_id == user.id))
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    db.delete(tx)
    db.commit()
    return {"deleted": True, "id": tx_id}


@router.post("/transactions/import")
async def import_transactions_preview(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile = File(...),
) -> dict:
    storage = StorageService()
    stored_name, _, content = await storage.save_upload(user.id, file)
    existing = _load_user_tx_records(db, user.id)
    try:
        preview = parse_csv_transactions(content, existing)
        preview["stored_filename"] = stored_name
        return preview
    except ValueError as exc:
        storage.delete_file(user.id, "uploads/transactions", stored_name)
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/transactions/import/confirm")
def confirm_transactions_import(
    payload: ImportConfirmRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    existing = _load_user_tx_records(db, user.id)
    imported = 0
    rejected = 0
    batch_id = str(uuid.uuid4())
    for r in payload.rows:
        if payload.skip_duplicates and is_duplicate_transaction(
            r.transaction_date, r.amount_minor, r.merchant, existing
        ):
            rejected += 1
            continue
        tx = Transaction(
            id=str(uuid.uuid4()),
            user_id=user.id,
            merchant=r.merchant,
            description=r.description,
            amount_minor=r.amount_minor,
            currency=r.currency,
            transaction_type=r.transaction_type,
            category_name=r.category_name,
            payment_method=r.payment_method,
            source_name=r.source_name,
            transaction_date=r.transaction_date,
            import_reference=batch_id,
        )
        db.add(tx)
        imported += 1

    job = ImportJob(
        id=batch_id,
        user_id=user.id,
        filename=payload.filename,
        status="completed",
        imported_count=imported,
        rejected_count=rejected,
    )
    db.add(job)
    db.commit()
    return {"job_id": batch_id, "imported_count": imported, "skipped_duplicates": rejected}


# --- Analytics, Forecast, Recurring ---

@router.get("/analytics/overview")
def get_analytics_overview(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    prof = _get_user_profile(db, user.id)
    records = _load_user_tx_records(db, user.id)
    goals_rows = db.scalars(select(SavingsGoal).where(SavingsGoal.user_id == user.id)).all()
    raw_goals = [
        {
            "id": g.id,
            "name": g.name,
            "target_amount_minor": g.target_amount_minor,
            "current_amount_minor": g.current_amount_minor,
            "target_date": g.target_date,
            "status": g.status,
        }
        for g in goals_rows
    ]
    rec_rows = db.scalars(select(RecurringPayment).where(RecurringPayment.user_id == user.id)).all()
    overrides = {r.merchant.lower(): r.status for r in rec_rows}
    avail = _compute_available_balance(prof, records)
    overview = build_overview_payload(
        records=records,
        monthly_allowance_minor=prof.monthly_allowance_minor,
        available_balance_minor=avail,
        expected_next_allowance_date=prof.expected_next_allowance_date,
        raw_goals=raw_goals,
        recurring_overrides=overrides,
    )
    overview["profile"] = get_profile(user, db)
    unread = db.scalars(
        select(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None))
    ).all()
    overview["unread_notifications"] = len(unread)
    return overview


@router.get("/analytics/categories")
def get_analytics_categories(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict]:
    records = _load_user_tx_records(db, user.id)
    return compute_category_breakdown(records, "expense")


@router.get("/analytics/trends")
def get_analytics_trends(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    records = _load_user_tx_records(db, user.id)
    return {
        "daily": compute_daily_spending(records, days=30),
        "monthly": compute_monthly_trends(records, months=6),
        "comparison": compute_period_comparison(records),
    }


@router.get("/analytics/insights")
def get_analytics_insights(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict]:
    overview = get_analytics_overview(user, db)
    return overview["insights"]


@router.get("/forecast")
def get_forecast(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    prof = _get_user_profile(db, user.id)
    records = _load_user_tx_records(db, user.id)
    recurring = detect_recurring_payments(records)
    avail = _compute_available_balance(prof, records)
    return compute_allowance_forecast(
        records=records,
        monthly_allowance_minor=prof.monthly_allowance_minor,
        available_balance_minor=avail,
        upcoming_recurring=recurring,
        expected_next_allowance_date=prof.expected_next_allowance_date,
    )


@router.get("/recurring")
def get_recurring(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict]:
    records = _load_user_tx_records(db, user.id)
    detected = detect_recurring_payments(records)
    overrides = {
        r.merchant.lower(): r.status
        for r in db.scalars(select(RecurringPayment).where(RecurringPayment.user_id == user.id)).all()
    }
    for idx, item in enumerate(detected):
        item["id"] = f"rec-{idx}"
        if item["merchant"].lower() in overrides:
            item["status"] = overrides[item["merchant"].lower()]
        item["next_payment_date"] = item["next_payment_date"].isoformat()
    return detected


@router.patch("/recurring/{merchant_name}")
def update_recurring_status(
    merchant_name: str,
    payload: RecurringStatusUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    rec = db.scalar(
        select(RecurringPayment).where(
            RecurringPayment.user_id == user.id,
            RecurringPayment.merchant == merchant_name,
        )
    )
    if rec is None:
        rec = RecurringPayment(
            id=str(uuid.uuid4()),
            user_id=user.id,
            merchant=merchant_name,
            expected_amount_minor=0,
            frequency="monthly",
            next_payment_date=date.today(),
            status=payload.status,
            confidence=0.8,
        )
        db.add(rec)
    else:
        rec.status = payload.status
    db.commit()
    return {"merchant": merchant_name, "status": payload.status}


# --- Savings Goals ---

@router.get("/goals")
def list_goals(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict]:
    rows = db.scalars(select(SavingsGoal).where(SavingsGoal.user_id == user.id)).all()
    return [
        enrich_savings_goal(
            goal_id=g.id,
            name=g.name,
            target_amount_minor=g.target_amount_minor,
            current_amount_minor=g.current_amount_minor,
            target_date=g.target_date,
            status=g.status,
        )
        for g in rows
    ]


@router.post("/goals", status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    g = SavingsGoal(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name=payload.name,
        target_amount_minor=payload.target_amount_minor,
        current_amount_minor=payload.current_amount_minor,
        target_date=payload.target_date,
        status="active",
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return enrich_savings_goal(g.id, g.name, g.target_amount_minor, g.current_amount_minor, g.target_date, g.status)


@router.patch("/goals/{goal_id}")
def update_goal(
    goal_id: str,
    payload: GoalUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    g = db.scalar(select(SavingsGoal).where(SavingsGoal.id == goal_id, SavingsGoal.user_id == user.id))
    if g is None:
        raise HTTPException(status_code=404, detail="Goal not found.")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(g, field, val)
    db.commit()
    db.refresh(g)
    return enrich_savings_goal(g.id, g.name, g.target_amount_minor, g.current_amount_minor, g.target_date, g.status)


@router.post("/goals/{goal_id}/contributions")
def add_goal_contribution(
    goal_id: str,
    payload: GoalContributionCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    g = db.scalar(select(SavingsGoal).where(SavingsGoal.id == goal_id, SavingsGoal.user_id == user.id))
    if g is None:
        raise HTTPException(status_code=404, detail="Goal not found.")
    contrib = SavingsContribution(
        id=str(uuid.uuid4()),
        goal_id=g.id,
        user_id=user.id,
        amount_minor=payload.amount_minor,
        contribution_date=payload.contribution_date or date.today(),
    )
    g.current_amount_minor += payload.amount_minor
    db.add(contrib)
    db.commit()
    db.refresh(g)
    return enrich_savings_goal(g.id, g.name, g.target_amount_minor, g.current_amount_minor, g.target_date, g.status)


# --- Purchase Simulator ---

@router.post("/simulator/evaluate")
def evaluate_simulator(
    payload: SimulatorRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    prof = _get_user_profile(db, user.id)
    records = _load_user_tx_records(db, user.id)
    recurring = detect_recurring_payments(records)
    upcoming_commitments = sum(r["expected_amount_minor"] for r in recurring)
    goals = list_goals(user, db)
    active_goals = [g for g in goals if g["status"] == "active"]
    savings_commitments = sum(g["required_monthly_minor"] for g in active_goals)
    avail = _compute_available_balance(prof, records)

    return evaluate_purchase_affordability(
        purchase_name=payload.purchase_name,
        purchase_amount_minor=payload.purchase_amount_minor,
        available_funds_minor=avail,
        expected_incoming_income_minor=prof.monthly_allowance_minor,
        upcoming_commitments_minor=upcoming_commitments,
        savings_commitments_minor=savings_commitments,
        active_goals=active_goals,
        payment_months=payload.payment_months,
        purchase_date=payload.purchase_date,
    )


# --- AI Copilot ---

@router.get("/ai/status")
def get_copilot_status() -> dict:
    return CopilotService().status()


@router.post("/ai/chat")
async def copilot_chat(
    payload: CopilotChatRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    overview = get_analytics_overview(user, db)
    records = _load_user_tx_records(db, user.id)
    prof = _get_user_profile(db, user.id)
    context = build_copilot_context(
        user_label=user.display_name or user.email,
        records=records,
        monthly_allowance_minor=prof.monthly_allowance_minor,
        available_balance_minor=overview["available_balance_minor"],
        category_breakdown=overview["categories"],
        recurring_payments=overview["recurring_payments"],
        forecast=overview["forecast"],
        savings_goals=overview["goals"],
    )

    conv_id = payload.conversation_id
    if conv_id:
        conv = db.scalar(select(AIConversation).where(AIConversation.id == conv_id, AIConversation.user_id == user.id))
        if conv is None:
            raise HTTPException(status_code=404, detail="Conversation not found.")
    else:
        conv = AIConversation(id=str(uuid.uuid4()), user_id=user.id, title=payload.question[:80])
        db.add(conv)
        db.flush()

    history_rows = db.scalars(
        select(AIMessage).where(AIMessage.conversation_id == conv.id).order_by(AIMessage.created_at)
    ).all()
    history = [{"role": m.role, "content": m.content} for m in history_rows]

    result = await CopilotService().ask(question=payload.question, context=context, history=history)
    if result.status == "ok" and result.answer:
        db.add(AIMessage(id=str(uuid.uuid4()), conversation_id=conv.id, user_id=user.id, role="user", content=payload.question))
        db.add(AIMessage(id=str(uuid.uuid4()), conversation_id=conv.id, user_id=user.id, role="assistant", content=result.answer))
        db.commit()

    resp = result.model_dump()
    resp["conversation_id"] = conv.id
    return resp


@router.get("/ai/conversations")
def list_conversations(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict]:
    rows = db.scalars(
        select(AIConversation).where(AIConversation.user_id == user.id).order_by(AIConversation.updated_at.desc())
    ).all()
    return [{"id": c.id, "title": c.title, "created_at": c.created_at.isoformat()} for c in rows]


@router.get("/ai/conversations/{conv_id}")
def get_conversation(
    conv_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    conv = db.scalar(select(AIConversation).where(AIConversation.id == conv_id, AIConversation.user_id == user.id))
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    msgs = db.scalars(select(AIMessage).where(AIMessage.conversation_id == conv.id).order_by(AIMessage.created_at)).all()
    return {
        "id": conv.id,
        "title": conv.title,
        "messages": [{"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in msgs],
    }


# --- Notifications ---

@router.get("/notifications")
def list_notifications(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    rows = db.scalars(
        select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc())
    ).all()
    prefs = db.scalar(select(NotificationPreference).where(NotificationPreference.user_id == user.id))
    if prefs is None:
        prefs = NotificationPreference(id=str(uuid.uuid4()), user_id=user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

    return {
        "unread_count": sum(1 for n in rows if n.read_at is None),
        "items": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "notification_type": n.notification_type,
                "read_at": n.read_at.isoformat() if n.read_at else None,
                "created_at": n.created_at.isoformat(),
            }
            for n in rows
        ],
        "preferences": {
            "email_enabled": prefs.email_enabled,
            "in_app_enabled": prefs.in_app_enabled,
            "weekly_summary_enabled": prefs.weekly_summary_enabled,
            "payment_reminders_enabled": prefs.payment_reminders_enabled,
            "spending_alerts_enabled": prefs.spending_alerts_enabled,
        },
    }


@router.patch("/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    notif = db.scalar(select(Notification).where(Notification.id == notif_id, Notification.user_id == user.id))
    if notif is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notif.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": notif.id, "read_at": notif.read_at.isoformat()}


@router.patch("/notification-preferences")
def update_notification_preferences(
    payload: NotificationPreferenceUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    prefs = db.scalar(select(NotificationPreference).where(NotificationPreference.user_id == user.id))
    if prefs is None:
        prefs = NotificationPreference(id=str(uuid.uuid4()), user_id=user.id)
        db.add(prefs)
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(prefs, field, val)
    db.commit()
    db.refresh(prefs)
    return {
        "email_enabled": prefs.email_enabled,
        "in_app_enabled": prefs.in_app_enabled,
        "weekly_summary_enabled": prefs.weekly_summary_enabled,
        "payment_reminders_enabled": prefs.payment_reminders_enabled,
        "spending_alerts_enabled": prefs.spending_alerts_enabled,
    }


@router.post("/notifications/test-email")
def trigger_test_email(
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    return send_smtp_notification(
        to_email=user.email,
        title="PULSE Notification Test",
        message="Your SMTP email notifications are configured and working.",
        recipient_name=user.display_name or "Student",
    )
