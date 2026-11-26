from app.ai.gateway_adapter import GeminiGatewayAdapter
from app.ai.schemas import CopilotContext, CopilotResult


class CopilotService:
    """Orchestrates grounded financial copilot queries."""

    def __init__(self) -> None:
        self.provider = GeminiGatewayAdapter()

    def status(self) -> dict:
        missing = self.provider.missing_config()
        return {
            "configured": len(missing) == 0,
            "missing_config": missing,
        }

    async def ask(
        self,
        question: str,
        context: CopilotContext,
        history: list[dict[str, str]] | None = None,
    ) -> CopilotResult:
        return await self.provider.generate_answer(question=question, context=context, history=history)
