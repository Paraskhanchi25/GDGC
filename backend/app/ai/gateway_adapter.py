import json
import logging

import httpx

from app.ai.prompts import SYSTEM_PROMPT
from app.ai.provider import AIProvider
from app.ai.schemas import CopilotContext, CopilotResult
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class GeminiGatewayAdapter(AIProvider):
    """
    Modular adapter for the organizer-provided Gemini Enterprise gateway.
    Requires explicit configuration via environment variables:
      GEMINI_GATEWAY_URL, GEMINI_GATEWAY_KEY, GEMINI_GATEWAY_PATH,
      GEMINI_GATEWAY_PROTOCOL, GEMINI_GATEWAY_MODEL.
    Never invents endpoints or fabricates responses when unconfigured.
    """

    def __init__(self) -> None:
        self.settings = get_settings()

    def missing_config(self) -> list[str]:
        missing = []
        if not self.settings.GEMINI_GATEWAY_URL.strip():
            missing.append("GEMINI_GATEWAY_URL")
        if not self.settings.GEMINI_GATEWAY_KEY.strip():
            missing.append("GEMINI_GATEWAY_KEY")
        if not self.settings.GEMINI_GATEWAY_PATH.strip():
            missing.append("GEMINI_GATEWAY_PATH")
        if not self.settings.GEMINI_GATEWAY_PROTOCOL.strip():
            missing.append("GEMINI_GATEWAY_PROTOCOL")
        return missing

    def is_configured(self) -> bool:
        return len(self.missing_config()) == 0

    async def generate_answer(
        self,
        question: str,
        context: CopilotContext,
        history: list[dict[str, str]] | None = None,
    ) -> CopilotResult:
        missing = self.missing_config()
        if missing:
            return CopilotResult(
                status="unavailable",
                error_detail=(
                    "Gemini Enterprise gateway is not configured. Missing environment variables: "
                    + ", ".join(missing)
                    + ". Set GEMINI_GATEWAY_URL, GEMINI_GATEWAY_KEY, GEMINI_GATEWAY_PATH, and GEMINI_GATEWAY_PROTOCOL "
                    "once the organizer gateway protocol is provided."
                ),
            )

        base_url = self.settings.GEMINI_GATEWAY_URL.rstrip("/")
        path = "/" + self.settings.GEMINI_GATEWAY_PATH.lstrip("/")
        endpoint = f"{base_url}{path}"
        protocol = self.settings.GEMINI_GATEWAY_PROTOCOL.strip().lower()
        model = self.settings.GEMINI_GATEWAY_MODEL.strip() or "gemini"

        context_block = json.dumps(context.model_dump(), indent=2)
        user_prompt = f"Grounded Financial Context:\n{context_block}\n\nStudent Question: {question}"

        headers = {
            "Authorization": f"Bearer {self.settings.GEMINI_GATEWAY_KEY}",
            "Content-Type": "application/json",
        }

        if protocol == "openai_compatible":
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            if history:
                messages.extend(history[-6:])
            messages.append({"role": "user", "content": user_prompt})
            payload = {"model": model, "messages": messages, "temperature": 0.2}
        elif protocol == "gemini_rest":
            payload = {
                "contents": [{"role": "user", "parts": [{"text": f"{SYSTEM_PROMPT}\n\n{user_prompt}"}]}],
                "generationConfig": {"temperature": 0.2},
            }
        else:
            return CopilotResult(
                status="unavailable",
                error_detail=(
                    f"Unsupported GEMINI_GATEWAY_PROTOCOL '{protocol}'. "
                    "Provide a verified gateway protocol ('openai_compatible' or 'gemini_rest')."
                ),
            )

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(endpoint, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()

            answer_text = self._extract_text(data, protocol)
            if not answer_text:
                return CopilotResult(
                    status="error",
                    error_detail="Gateway returned an empty or unrecognized response format.",
                )

            return CopilotResult(
                status="ok",
                answer=answer_text,
                model=model,
                grounded_metrics={
                    "available_balance": context.available_balance_formatted,
                    "current_month_spending": context.current_month_spending_formatted,
                    "remaining_allowance": context.remaining_allowance_formatted,
                },
            )
        except httpx.HTTPError as exc:
            logger.warning("Gemini gateway HTTP error: %s", type(exc).__name__)
            return CopilotResult(
                status="error",
                error_detail=f"Gemini gateway request failed ({type(exc).__name__}).",
            )
        except Exception as exc:
            logger.error("Unexpected Gemini gateway error: %s", type(exc).__name__)
            return CopilotResult(
                status="error",
                error_detail="Unable to reach Gemini Enterprise gateway.",
            )

    @staticmethod
    def _extract_text(data: dict, protocol: str) -> str | None:
        if protocol == "openai_compatible":
            choices = data.get("choices") or []
            if choices and isinstance(choices, list):
                msg = choices[0].get("message") or {}
                return msg.get("content")
        elif protocol == "gemini_rest":
            candidates = data.get("candidates") or []
            if candidates and isinstance(candidates, list):
                parts = (candidates[0].get("content") or {}).get("parts") or []
                if parts:
                    return parts[0].get("text")
        return None
