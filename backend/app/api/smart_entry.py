from typing import Annotated
from datetime import date
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.financial.natural_entry import parse_entry
from app.models.models import Transaction, User

router = APIRouter(prefix="/api/v1/transactions", tags=["Smart entry"])

class EntryRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)

@router.post("/parse")
def suggest_entry(payload: EntryRequest, user: Annotated[User, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]) -> dict:
    return parse_entry(payload.text)

class DuplicateRequest(BaseModel):
    amount_minor: int = Field(gt=0)
    transaction_date: date
    transaction_type: str = Field(pattern="^(income|expense)$")
    merchant: str = Field(max_length=160)
    account_id: str | None = None

@router.post("/duplicates")
def duplicate_warning(payload: DuplicateRequest, user: Annotated[User, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]) -> dict:
    rows = db.scalars(select(Transaction).where(Transaction.user_id == user.id,
        Transaction.amount_minor == payload.amount_minor,
        Transaction.transaction_date == payload.transaction_date,
        Transaction.transaction_type == payload.transaction_type,
        Transaction.account_id == payload.account_id)).all()
    matches = [r for r in rows if r.merchant.strip().casefold() == payload.merchant.strip().casefold()]
    return {"likely_duplicate": bool(matches), "count": len(matches)}
