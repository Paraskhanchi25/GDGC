from abc import ABC, abstractmethod

from app.ai.schemas import CopilotContext, CopilotResult


class AIProvider(ABC):
    """Abstract interface for financial copilot AI providers."""

    @abstractmethod
    def is_configured(self) -> bool:
        """Return True when required gateway configuration is present."""

    @abstractmethod
    async def generate_answer(
        self,
        question: str,
        context: CopilotContext,
        history: list[dict[str, str]] | None = None,
        *, user_id: str,
    ) -> CopilotResult:
        """Generate a grounded response from the AI provider."""
