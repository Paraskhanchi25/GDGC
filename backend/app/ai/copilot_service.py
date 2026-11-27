from app.ai.google_provider import GoogleGeminiProvider
from app.ai.schemas import CopilotContext, CopilotResult


class CopilotService:
    """Orchestrates grounded financial copilot queries."""

    def __init__(self) -> None:
        self.provider = GoogleGeminiProvider()

    def status(self) -> dict:
        missing = self.provider.missing_config()
        return {
            "configured": self.provider.is_configured(),
            "missing_config": missing,
        }

    async def ask(
        self,
        question: str,
        context: CopilotContext,
        history: list[dict[str, str]] | None = None,
        *, user_id: str,
    ) -> CopilotResult:
        return await self.provider.generate_answer(question=question, context=context, history=history, user_id=user_id)
