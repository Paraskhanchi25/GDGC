"""Fixed illustrative context only. Never reads or writes financial or learning records."""
from typing import Annotated
from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.models.models import User
from app.ai.google_provider import GoogleGeminiProvider

router = APIRouter(prefix="/api/v1/showcase", tags=["Showcase"])

@router.post("/ask")
async def showcase_answer(user: Annotated[User, Depends(get_current_user)]):
    result = await GoogleGeminiProvider().generate_text(
        "Explain my biggest spending category and suggest one practical way to save.",
        {"profile": "Fictional student Aarav", "currency": "INR", "income": 12000, "expenses": 7550,
         "remaining_from_income": 4450, "categories": {"Food": 3200, "Transport": 1400, "Shopping": 1800, "Subscriptions": 1150}},
        system_prompt="Explain this explicitly fictional PULSE showcase scenario. Use only provided numbers. Do not invent history or financial outcomes. Label savings suggestions as general guidance, never guarantees. No lending advice or score predictions.", user_id=user.id)
    return {"status": result.status, "answer": result.answer, "source": "live" if result.status == "ok" else "unavailable"}
