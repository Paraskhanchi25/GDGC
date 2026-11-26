import uuid
from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, File, Header, HTTPException, Query, UploadFile, status

from app.ai.context_builder import build_copilot_context
from app.ai.copilot_service import CopilotService
from app.api.deps import build_overview_payload
from app.demo.data import demo_store
from app.financial.affordability import evaluate_purchase_affordability
from app.financial.categorization import infer_category
from app.financial.csv_import import parse_csv_transactions
from app.financial.recurring import detect_recurring_payments
from app.financial.savings import enrich_savings_goal
from app.financial.transactions import TxRecord, filter_transactions, is_duplicate_transaction
from app.schemas.api import (
    CopilotChatRequest,
    GoalContributionCreate,
    GoalCreate,
    GoalUpdate,
    ImportConfirmRequest,
    NotificationPreferenceUpdate,
    RecurringStatusUpdate,
    SimulatorRequest,
    TransactionCreate,
    TransactionUpdate,
)

router = APIRouter(prefix="/api/v1/demo", tags=["Demo"])


def _tx_to_dict(t: TxRecord) -> dict:
    return {
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


def _get_session_id(x_demo_session: str | None) -> str:
    return x_demo_session or "default"


@router.post("/reset")
def reset_demo(x_demo_session: Annotated[str | None, Header()] = None) -> dict:
    state = demo_store.reset(_get_session_id(x_demo_session))
    return {"status": "reset", "profile": state["profile"]}


@router.get("/overview")
def get_demo_overview(x_demo_session: Annotated[str | None, Header()] = None) -> dict:
    state = demo_store.get(_get_session_id(x_demo_session))
    prof = state["profile"]
    next_dt = date.fromisoformat(prof["expected_next_allowance_date"]) if prof.get("expected_next_allowance_date") else None
    overview = build_overview_payload(
        records=state["transactions"],
        monthly_allowance_minor=prof["monthly_allowance_minor"],
        available_balance_minor=prof["available_balance_minor"],
        expected_next_allowance_date=next_dt,
        raw_goals=state["goals"],
        recurring_overrides=state["recurring_overrides"],
    )
    overview["profile"] = prof
    overview["unread_notifications"] = sum(1 for n in state["notifications"] if n["read_at"] is None)
    return overview


@router.get("/transactions")
def list_demo_transactions(
    x_demo_session: Annotated[str | None, Header()] = None,
    search: str | None = None,
    category: str | None = None,
    payment_method: str | None = None,
    source_name: str | None = None,
    transaction_type: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = Query(default=100, ge=1, le=500),
) -> dict:
    state = demo_store.get(_get_session_id(x_demo_session))
    filtered = filter_transactions(
        state["transactions"],
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
        "items": [_tx_to_dict(t) for t in filtered[:limit]],
    }


@router.post("/transactions", status_code=status.HTTP_201_CREATED)
def create_demo_transaction(
    payload: TransactionCreate,
    x_demo_session: Annotated[str | None, Header()] = None,
) -> dict:
    state = demo_store.get(_get_session_id(x_demo_session))
    category = payload.category_name or infer_category(payload.merchant, payload.description, payload.transaction_type)
    tx = TxRecord(
        id=str(uuid.uuid4()),
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
    state["transactions"].append(tx)
    if payload.transaction_type == "expense":
        state["profile"]["available_balance_minor"] -= payload.amount_minor
    else:
        state["profile"]["available_balance_minor"] += payload.amount_minor
    return _tx_to_dict(tx)


@router.patch("/transactions/{tx_id}")
def update_demo_transaction(
    tx_id: str,
    payload: TransactionUpdate,
    x_demo_session: Annotated[str | None, Header()] = None,
) -> dict:
    state = demo_store.get(_get_session_id(x_demo_session))
    txs: list[TxRecord] = state["transactions"]
    idx = next((i for i, t in enumerate(txs) if t.id == tx_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    old = txs[idx]
    updated = TxRecord(
        id=old.id,
        merchant=payload.merchant if payload.merchant is not None else old.merchant,
        description=payload.description if payload.description is not None else old.description,
        amount_minor=payload.amount_minor if payload.amount_minor is not None else old.amount_minor,
        currency=old.currency,
        transaction_type=payload.transaction_type if payload.transaction_type is not None else old.transaction_type,
        category_name=payload.category_name if payload.category_name is not None else old.category_name,
        payment_method=payload.payment_method if payload.payment_method is not None else old.payment_method,
        source_name=payload.source_name if payload.source_name is not None else old.source_name,
        transaction_date=payload.transaction_date if payload.transaction_date is not None else old.transaction_date,
        notes=payload.notes if payload.notes is not None else old.notes,
    )
    txs[idx] = updated
    return _tx_to_dict(updated)


@router.delete("/transactions/{tx_id}")
def delete_demo_transaction(
    tx_id: str,
    x_demo_session: Annotated[str | None, Header()] = None,
) -> dict:
    state = demo_store.get(_get_session_id(x_demo_session))
    txs: list[TxRecord] = state["transactions"]
    idx = next((i for i, t in enumerate(txs) if t.id == tx_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    removed = txs.pop(idx)
    if removed.transaction_type == "expense":
        state["profile"]["available_balance_minor"] += removed.amount_minor
    else:
        state["profile"]["available_balance_minor"] -= removed.amount_minor
    return {"deleted": True, "id": tx_id}


@router.post("/transactions/import/preview")
async def preview_demo_csv(
    file: UploadFile = File(...),
    x_demo_session: Annotated[str | None, Header()] = None,
) -> dict:
    state = demo_store.get(_get_session_id(x_demo_session))
    content = await file.read()
    try:
        return parse_csv_transactions(content, state["transactions"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/transactions/import/confirm")
def confirm_demo_csv(
    payload: ImportConfirmRequest,
    x_demo_session: Annotated[str | None, Header()] = None,
) -> dict:
    state = demo_store.get(_get_session_id(x_demo_session))
    imported = 0
    skipped_dups = 0
    for r in payload.rows:
        if payload.skip_duplicates and is_duplicate_transaction(
            r.transaction_date, r.amount_minor, r.merchant, state["transactions"]
        ):
            skipped_dups += 1
            continue
        state["transactions"].append(
            TxRecord(
                id=str(uuid.uuid4()),
                merchant=r.merchant,
                description=r.description,
                amount_minor=r.amount_minor,
                currency=r.currency,
                transaction_type=r.transaction_type,
                category_name=r.category_name,
                payment_method=r.payment_method,
                source_name=r.source_name,
                transaction_date=r.transaction_date,
            )
        )
        imported += 1
    return {"imported_count": imported, "skipped_duplicates": skipped_dups}


@router.patch("/recurring/{merchant_name}")
def update_demo_recurring(
    merchant_name: str,
    payload: RecurringStatusUpdate,
    x_demo_session: Annotated[str | None, Header()] = None,
) -> dict:
    state = demo_store.get(_get_session_id(x_demo_session))
    state["recurring_overrides"][merchant_name.lower()] = payload.status
    return {"merchant": merchant_name, "status": payload.status}


@router.post("/simulator/evaluate")
def evaluate_demo_purchase(
    payload: SimulatorRequest,
    x_demo_session: Annotated[str | None, Header()] = None,
) -> dict:
    state = demo_store.get(_get_session_id(x_demo_session))
    prof = state["profile"]
    recurring = detect_recurring_payments(state["transactions"])
    upcoming_commitments = sum(
        r["expected_amount_minor"]
        for r in recurring
        if state["recurring_overrides"].get(r["merchant"].lower(), r["status"]) != "dismissed"
    )
    active_goals = [g for g in state["goals"] if g["status"] == "active"]
    savings_commitments = sum(
        enrich_savings_goal(
            goal_id=g["id"],
            name=g["name"],
            target_amount_minor=g["target_amount_minor"],
            current_amount_minor=g["current_amount_minor"],
            target_date=g["target_date"],
            status=g["status"],
        )["required_monthly_minor"]
        for g in active_goals
    )
    return evaluate_purchase_affordability(
        purchase_name=payload.purchase_name,
        purchase_amount_minor=payload.purchase_amount_minor,
        available_funds_minor=prof["available_balance_minor"],
        expected_incoming_income_minor=prof["monthly_allowance_minor"],
        upcoming_commitments_minor=upcoming_commitments,
        savings_commitments_minor=savings_commitments,
        active_goals=active_goals,
        payment_months=payload.payment_months,
        purchase_date=payload.purchase_date,
    )


@router.get("/goals")
def list_demo_goals(x_demo_session: Annotated[str | None, Header()] = None) -> list[dict]:
    state = demo_store.get(_get_session_id(x_demo_session))
    return [
        enrich_savings_goal(
            goal_id=g["id"],
            name=g["name"],
            target_amount_minor=g["target_amount_minor"],
            current_amount_minor=g["current_amount_minor"],
            target_date=g["target_date"],
            status=g["status"],
        )
        for g in state["goals"]
    ]


@router.post("/goals", status_code=status.HTTP_201_CREATED)
def create_demo_goal(
    payload: GoalCreate,
    x_demo_session: Annotated[str | None, Header()] = None,
) -> dict:
    state = demo_store.get(_get_session_id(x_demo_session))
    goal = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "target_amount_minor": payload.target_amount_minor,
        "current_amount_minor": payload.current_amount_minor,
        "target_date": payload.target_date,
        "status": "active",
    }
    state["goals"].append(goal)
    return enrich_savings_goal(
        goal_id=goal["id"],
        name=goal["name"],
        target_amount_minor=goal["target_amount_minor"],
        current_amount_minor=goal["current_amount_minor"],
        target_date=goal["target_date"],
        status=goal["status"],
    )


@router.post("/goals/{goal_id}/contributions")
def add_demo_goal_contribution(
    goal_id: str,
    payload: GoalContributionCreate,
    x_demo_session: Annotated[str | None, Header()] = None,
) -> dict:
    state = demo_store.get(_get_session_id(x_demo_session))
    goal = next((g for g in state["goals"] if g["id"] == goal_id), None)
    if goal is None:
        raise HTTPException(status_code=404, detail="Savings goal not found.")
    goal["current_amount_minor"] += payload.amount_minor
    return enrich_savings_goal(
        goal_id=goal["id"],
        name=goal["name"],
        target_amount_minor=goal["target_amount_minor"],
        current_amount_minor=goal["current_amount_minor"],
        target_date=goal["target_date"],
        status=goal["status"],
    )


@router.get("/notifications")
def list_demo_notifications(x_demo_session: Annotated[str | None, Header()] = None) -> dict:
    state = demo_store.get(_get_session_id(x_demo_session))
    return {
        "unread_count": sum(1 for n in state["notifications"] if n["read_at"] is None),
        "items": state["notifications"],
        "preferences": state["notification_preferences"],
    }


@router.patch("/notifications/{notif_id}/read")
def mark_demo_notification_read(
    notif_id: str,
    x_demo_session: Annotated[str | None, Header()] = None,
) -> dict:
    state = demo_store.get(_get_session_id(x_demo_session))
    notif = next((n for n in state["notifications"] if n["id"] == notif_id), None)
    if notif is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notif["read_at"] = datetime.now(timezone.utc).isoformat()
    return notif


@router.patch("/notification-preferences")
def update_demo_notification_prefs(
    payload: NotificationPreferenceUpdate,
    x_demo_session: Annotated[str | None, Header()] = None,
) -> dict:
    state = demo_store.get(_get_session_id(x_demo_session))
    prefs = state["notification_preferences"]
    for field, val in payload.model_dump(exclude_none=True).items():
        prefs[field] = val
    return prefs


@router.post("/ai/chat")
async def demo_copilot_chat(
    payload: CopilotChatRequest,
    x_demo_session: Annotated[str | None, Header()] = None,
) -> dict:
    state = demo_store.get(_get_session_id(x_demo_session))
    prof = state["profile"]
    next_dt = date.fromisoformat(prof["expected_next_allowance_date"]) if prof.get("expected_next_allowance_date") else None
    overview = build_overview_payload(
        records=state["transactions"],
        monthly_allowance_minor=prof["monthly_allowance_minor"],
        available_balance_minor=prof["available_balance_minor"],
        expected_next_allowance_date=next_dt,
        raw_goals=state["goals"],
        recurring_overrides=state["recurring_overrides"],
    )
    context = build_copilot_context(
        user_label=f"{prof['display_name']} (Demo)",
        records=state["transactions"],
        monthly_allowance_minor=prof["monthly_allowance_minor"],
        available_balance_minor=prof["available_balance_minor"],
        category_breakdown=overview["categories"],
        recurring_payments=overview["recurring_payments"],
        forecast=overview["forecast"],
        savings_goals=overview["goals"],
    )
    service = CopilotService()
    result = await service.ask(question=payload.question, context=context)
    return result.model_dump()
