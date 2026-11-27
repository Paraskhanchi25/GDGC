import asyncio
import logging
from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock
import httpx
import pytest
from google import genai
from google.genai import errors, types
from sqlalchemy import select
from app.ai.google_provider import GoogleGeminiProvider
from app.ai.limits import RequestGuard
from app.ai.schemas import CopilotResult
from app.core.config import Settings

@pytest.fixture
def provider(monkeypatch):
    import app.ai.google_provider as module
    monkeypatch.setattr(module, "request_guard", RequestGuard())
    obj = GoogleGeminiProvider()
    obj.settings = Settings(_env_file=None, GEMINI_PROVIDER="google", GEMINI_API_KEY="test-secret-not-real", GEMINI_MODEL="gemini-3.1-flash-lite")
    return obj

def response(text="A concise explanation."):
    return types.GenerateContentResponse(candidates=[types.Candidate(content=types.Content(role="model", parts=[types.Part.from_text(text=text)]), finish_reason="STOP")], usage_metadata=types.GenerateContentResponseUsageMetadata(prompt_token_count=100, candidates_token_count=20, thoughts_token_count=5))

def mock_client(monkeypatch, provider, generate):
    @asynccontextmanager
    async def client():
        yield SimpleNamespace(models=SimpleNamespace(generate_content=generate))
    monkeypatch.setattr(provider, "client", client)

def test_sdk_request_limits_roles_usage_and_no_credentials_in_logs(provider, monkeypatch, caplog):
    generate = AsyncMock(return_value=response())
    mock_client(monkeypatch, provider, generate)
    with caplog.at_level(logging.INFO):
        result = asyncio.run(provider.generate_text("Explain", {"balance": 100}, history=[{"role": "assistant", "content": "Old answer"}], user_id="u1"))
    assert result.status == "ok" and result.usage["output_tokens_including_thinking"] == 25
    assert result.usage["estimated_cost_usd"] == .0000625
    kwargs = generate.call_args.kwargs
    assert kwargs["model"] == "gemini-3.1-flash-lite"
    assert kwargs["config"].max_output_tokens == 512
    assert kwargs["contents"][0].role == "model"
    assert "test-secret-not-real" not in caplog.text and "balance" not in caplog.text and "u1" not in caplog.text

@pytest.mark.parametrize("code,details,category", [(401,[],"authentication"),(403,[],"authentication"),(400,[{"reason":"API_KEY_INVALID"}],"authentication"),(404,[],"unsupported_model"),(429,[],"rate_limit"),(503,[],"provider_unavailable")])
def test_provider_errors_are_sanitized(provider, monkeypatch, code, details, category):
    generate = AsyncMock(side_effect=errors.ClientError(code, {"error":{"message":"private test-secret-not-real payload", "status":"RESOURCE_EXHAUSTED", "details":details}}))
    mock_client(monkeypatch, provider, generate)
    result = asyncio.run(provider.generate_text("Explain", {}, user_id="u1"))
    assert result.error_category == category and result.status == "error"
    assert "private" not in result.model_dump_json() and "test-secret" not in result.model_dump_json()
    assert generate.await_count == 1

@pytest.mark.parametrize("exception,category", [(TimeoutError(),"timeout"),(httpx.ReadTimeout("secret"),"timeout"),(httpx.ConnectError("secret"),"network"),(ValueError("secret"),"malformed_response")])
def test_network_and_malformed_failures(provider, monkeypatch, exception, category):
    generate = AsyncMock(side_effect=exception); mock_client(monkeypatch, provider, generate)
    result = asyncio.run(provider.generate_text("Explain", {}, user_id="u1"))
    assert result.error_category == category and "secret" not in result.error_detail

@pytest.mark.parametrize("text", ["", "test-secret-not-real", "x"*12001])
def test_invalid_response_not_reported_as_success(provider, monkeypatch, text):
    mock_client(monkeypatch, provider, AsyncMock(return_value=response(text)))
    assert asyncio.run(provider.generate_text("Explain", {}, user_id="u1")).error_category == "malformed_response"

def test_missing_key_and_unknown_provider_never_initialize_sdk(provider, monkeypatch):
    def forbidden(): raise AssertionError("Must not initialize")
    monkeypatch.setattr(provider, "client", forbidden)
    provider.settings.GEMINI_API_KEY = ""
    assert asyncio.run(provider.generate_text("Explain", {}, user_id="u1")).status == "unavailable"
    provider.settings.GEMINI_API_KEY = "test-secret-not-real"; provider.settings.GEMINI_PROVIDER = "gateway"
    assert asyncio.run(provider.generate_text("Explain", {}, user_id="u1")).status == "unavailable"

def test_bounded_context_and_history(provider, monkeypatch):
    generate = AsyncMock(return_value=response()); mock_client(monkeypatch, provider, generate)
    result = asyncio.run(provider.generate_text("Explain", {"large":"x"*13000}, user_id="u1"))
    assert result.error_category == "context_limit" and not generate.called
    contents = provider.prepare_contents("Explain", {}, [{"role":"user","content":"x"*3000}]*1000, "system")
    assert len(contents) <= 7
    assert sum(len(p.text) for c in contents for p in c.parts) + len("system") <= provider.settings.GEMINI_MAX_INPUT_CHARS

def test_duplicate_and_rate_guard_is_scoped_to_user(provider, monkeypatch):
    generate = AsyncMock(return_value=response()); mock_client(monkeypatch, provider, generate)
    provider.settings.GEMINI_REQUESTS_PER_MINUTE = 1
    async def run():
        assert (await provider.generate_text("A", {}, user_id="u1")).status == "ok"
        assert (await provider.generate_text("A", {}, user_id="u1")).error_category == "duplicate"
        assert (await provider.generate_text("B", {}, user_id="u1")).error_category == "rate_limit"
        assert (await provider.generate_text("A", {}, user_id="u2")).status == "ok"
    asyncio.run(run()); assert generate.await_count == 2

def test_concurrent_calls_do_not_double_bill(provider, monkeypatch):
    async def run():
        started, release = asyncio.Event(), asyncio.Event()
        async def generate(**kwargs):
            started.set(); await release.wait(); return response()
        mock_client(monkeypatch, provider, AsyncMock(side_effect=generate))
        task = asyncio.create_task(provider.generate_text("A", {}, user_id="u1"))
        await started.wait()
        assert (await provider.generate_text("A", {}, user_id="u1")).error_category == "duplicate"
        release.set(); assert (await task).status == "ok"
    asyncio.run(run())

def test_official_sdk_transport_uses_direct_google_host_and_one_attempt(provider, monkeypatch):
    import app.ai.google_provider as module
    real_client = genai.Client
    captured = []
    def handler(request):
        captured.append(request)
        assert request.url.host == "generativelanguage.googleapis.com"
        assert request.headers["x-goog-api-key"] == "test-secret-not-real"
        return httpx.Response(429, json={"error":{"code":429,"message":"quota","status":"RESOURCE_EXHAUSTED"}})
    def factory(**kwargs):
        assert kwargs["vertexai"] is False and kwargs["enterprise"] is False
        assert kwargs["http_options"].retry_options.attempts == 1
        kwargs["http_options"].httpx_async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        return real_client(**kwargs)
    monkeypatch.setattr(module.genai, "Client", factory)
    result = asyncio.run(provider.generate_text("Explain", {}, user_id="u1"))
    assert result.error_category == "rate_limit" and len(captured) == 1

def test_repository_dotenv_is_independent_of_working_directory(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    files = Settings.model_config["env_file"]
    assert all(path.is_absolute() for path in files)
    assert files[0].name == ".env" and files[0].parent.name == "GDGC"

@pytest.fixture
def finance_db():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.db.base import Base
    from app.models.models import User
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine, expire_on_commit=False)() as db:
        yield db
    engine.dispose()

def test_copilot_conversation_round_trip_and_user_scope(finance_db, monkeypatch):
    from datetime import date
    from fastapi import HTTPException
    from app.api.deps import get_current_user
    from app.api.v1 import copilot_chat, create_transaction, get_conversation, list_conversations
    from app.ai.copilot_service import CopilotService
    from app.schemas.api import CopilotChatRequest, TransactionCreate
    db = finance_db
    alice = get_current_user({"uid":"alice", "email":"alice@example.test", "email_verified":True}, db)
    bob = get_current_user({"uid":"bob", "email":"bob@example.test", "email_verified":True}, db)
    for user, merchant, amount in [(alice,"Alice canteen",25000),(bob,"Bob private",99900)]:
        create_transaction(TransactionCreate(merchant=merchant, amount_minor=amount, transaction_type="expense", transaction_date=date.today()), user, db)
    calls = []
    async def fake(self, **kwargs):
        calls.append(kwargs)
        return CopilotResult(status="ok", answer="Based on your recorded spending, food is worth reviewing.")
    monkeypatch.setattr(CopilotService, "ask", fake)
    first = asyncio.run(copilot_chat(CopilotChatRequest(question="Explain my spending"), alice, db))
    cid = first["conversation_id"]
    assert len(get_conversation(cid, alice, db)["messages"]) == 2
    second = asyncio.run(copilot_chat(CopilotChatRequest(question="What next?", conversation_id=cid), alice, db))
    assert second["conversation_id"] == cid and len(calls[1]["history"]) == 2
    assert calls[0]["user_id"] == alice.id
    assert "Bob private" not in calls[0]["context"].model_dump_json() and "999" not in calls[0]["context"].model_dump_json()
    assert list_conversations(bob, db) == []
    with pytest.raises(HTTPException) as exc:
        asyncio.run(copilot_chat(CopilotChatRequest(question="Read Alice", conversation_id=cid), bob, db))
    assert exc.value.status_code == 404 and len(calls) == 2

def test_unavailable_copilot_does_not_return_phantom_conversation(finance_db, monkeypatch):
    from app.api.deps import get_current_user
    from app.api.v1 import copilot_chat, list_conversations
    from app.ai.copilot_service import CopilotService
    from app.schemas.api import CopilotChatRequest
    user = get_current_user({"uid":"alice", "email":"a@example.test", "email_verified":True}, finance_db)
    async def unavailable(self, **kwargs): return CopilotResult(status="error", error_category="timeout", retryable=True)
    monkeypatch.setattr(CopilotService, "ask", unavailable)
    result = asyncio.run(copilot_chat(CopilotChatRequest(question="Explain spending"), user, finance_db))
    assert result["conversation_id"] is None
    assert list_conversations(user, finance_db) == []
