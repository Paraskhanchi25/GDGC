"""Explicit harmless live check: python -m app.ai.diagnostic [--model MODEL].
Never prints credentials, financial context, raw provider errors or remote text.
"""
import argparse
import asyncio
import json
from app.ai.google_provider import GoogleGeminiProvider, PRICES, api_error_category
from google.genai import errors
import httpx

async def check(model: str | None = None) -> dict:
    provider = GoogleGeminiProvider()
    if model:
        provider.settings = provider.settings.model_copy(update={"GEMINI_MODEL": model})
    if not provider.is_configured():
        return {"status": "unconfigured", "missing": provider.missing_config(), "provider_supported": provider.settings.GEMINI_PROVIDER == "google", "request_succeeded": False}
    selected = provider.settings.GEMINI_MODEL
    if selected not in PRICES:
        return {"status": "model_not_cost_reviewed", "request_succeeded": False}
    availability = {}
    try:
        async with asyncio.timeout(provider.settings.GEMINI_TIMEOUT_SECONDS):
            async with provider.client() as client:
                for candidate in ("gemini-3.1-flash-lite", "gemini-2.5-flash-lite"):
                    try:
                        metadata = await client.models.get(model=candidate)
                        availability[candidate] = {"metadata_accessible": True, "generation_advertised": "generateContent" in (metadata.supported_actions or [])}
                    except errors.APIError as exc:
                        availability[candidate] = {"metadata_accessible": False, "error_category": api_error_category(exc)}
                    except httpx.HTTPError:
                        availability[candidate] = {"metadata_accessible": False, "error_category": "network"}
    except Exception:
        return {"status": "model_verification_failed", "models": availability, "request_succeeded": False}
    result = await provider.generate_text("Reply with READY only.", {}, system_prompt="Harmless connectivity test. Reply with READY only.", user_id="local-diagnostic")
    return {"status": result.status, "error_category": result.error_category, "selected_model": selected,
        "models": availability, "request_succeeded": result.status == "ok", "expected_reply": result.answer == "READY", "usage": result.usage}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=tuple(PRICES), help="Check an explicitly selected low-cost model without editing .env")
    print(json.dumps(asyncio.run(check(parser.parse_args().model))))
