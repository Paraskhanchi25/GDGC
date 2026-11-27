# Direct Google Gemini migration

27 November 2026. This report supersedes the earlier administrator-gateway investigation. The user's actual `.env` was neither displayed nor edited. No production records, credentials, database schema or infrastructure were changed.

## Architecture and changed files

The existing Copilot API, conversation tables and financial services remain in place. All three assistant entry points use `backend/app/ai/google_provider.py`, implementing the existing `AIProvider` interface with the official `google-genai==2.34.0` SDK. Requests use `client.aio.models.generate_content`; the existing application did not implement streaming, so its JSON response contract is retained.

Modified: `backend/requirements.txt`, `app/core/config.py`, `app/ai/provider.py`, `copilot_service.py`, `schemas.py`, `context_builder.py`, `diagnostic.py`, `app/api/v1.py`, `academy.py`, `showcase.py`; frontend Copilot and showcase pages; `.env.example`, README and status/handoff documents. New: `app/ai/google_provider.py`, `app/ai/limits.py`, `tests/conftest.py`, `tests/test_google_provider.py`. Existing evolution tests and browser tests were adapted to the new provider. The obsolete `app/ai/gateway_adapter.py` was removed after all imports were migrated.

There are no active `GEMINI_GATEWAY_*` settings, HTTP gateway requests, administrator credentials or fallback providers. Historical audit documents retain their historical findings with a superseding notice. The SDK explicitly selects the Google Developer API, disables Vertex/Enterprise selection and pins Google's official host, so alternate base-URL environment variables cannot redirect a personal key to an old gateway. No SDK or key is imported by Next.js.

## Model selection and verified pricing

Google's [official model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite) lists `gemini-3.1-flash-lite` as stable, with text generation and a 1,048,576-token input / 65,536-token output capacity. PULSE deliberately uses much smaller limits. It is suitable for concise explanations of backend-calculated financial facts; no search, image generation, tools or autonomous calculations are enabled.

Standard paid text pricing, USD per million tokens, checked against [Google's pricing](https://ai.google.dev/gemini-api/docs/pricing):

| Candidate | Input | Output, including thinking | Project verification |
|---|---:|---:|---|
| `gemini-3.1-flash-lite` | $0.25 | $1.50 | Metadata lookup and real generation succeeded |
| `gemini-2.5-flash-lite` | $0.10 | $0.40 | Metadata advertised generation; actual generation returned 404 |

Google's [deprecation documentation](https://ai.google.dev/gemini-api/docs/deprecations#gemini-2.5-flash-models) says 2.5 Flash-Lite has no announced shutdown date, but model metadata alone did not establish working generation for this project. Therefore the verified recommendation and `.env.example` use **`gemini-3.1-flash-lite`**. It is the lowest-cost candidate verified to generate successfully here, not a claim that it is the cheapest listed model globally. No preview model or automatic model fallback is used. If another model is explicitly configured, it must be verified separately.

These are published standard paid-tier estimates, not a billing receipt. Applicable free quotas, taxes, caching discounts and future pricing changes are not represented. Usage estimates are logged only for the two reviewed models; unknown model prices are recorded as unknown, not zero.

## Actual live verification

Run from `backend` using the existing local environment:

```powershell
.venv\Scripts\python.exe -m app.ai.diagnostic --model gemini-3.1-flash-lite
```

The command checks model metadata through the SDK and sends one harmless “READY” test without financial data. The real 3.1 request succeeded with the expected reply: 37 input tokens, 1 output token including thinking, estimated standard cost **$0.00001075**. A separate explicit 2.5 test returned `unsupported_model` (404); it was not silently retried on another model.

An initial sandboxed attempt could not reach the network; the permitted network run succeeded. The diagnostic never prints credentials, provider response bodies, remote answer text or financial context. `--model` affects that invocation only; it does not rewrite `.env` or change production configuration. No real Firebase user session or production financial data was used for the live check.

## Configuration and deployment

Set these **backend** environment variables locally and in Coolify:

```dotenv
GEMINI_PROVIDER=google
GEMINI_API_KEY=replace_with_your_key
GEMINI_MODEL=gemini-3.1-flash-lite
```

The placeholder is intentionally treated as unconfigured. Environment loading now resolves the repository `.env` by an absolute source-relative path, then `backend/.env`, independently of the launch directory. Process environment values take precedence over both. Existing unrelated settings are preserved; old gateway settings are ignored. The user must configure the selected model manually in their actual environment; no actual environment file was edited.

Optional controls and defaults:

| Variable | Default | Meaning |
|---|---:|---|
| `GEMINI_MAX_INPUT_CHARS` | 12000 | Entire system prompt, selected history and current context/question |
| `GEMINI_MAX_OUTPUT_TOKENS` | 512 | Maximum generated output tokens |
| `GEMINI_TIMEOUT_SECONDS` | 25 | SDK HTTP timeout and outer request deadline |
| `GEMINI_REQUESTS_PER_MINUTE` | 6 | Per authenticated user across all three assistants |
| `GEMINI_DUPLICATE_WINDOW_SECONDS` | 15 | Suppress recently completed identical requests |

The existing Dockerfile installs the added SDK through `backend/requirements.txt`. No Dockerfile/topology changes were needed for this migration. Rebuild/redeploy the existing Coolify application after adding the backend variables. Never add the personal key to `NEXT_PUBLIC_*`, Docker frontend build arguments, Git or PostgreSQL. No database migration is required for this AI migration. Docker CLI is present locally, but its engine is unavailable, so an image build could not be performed.

## Cost and reliability controls

- A bounded process-local request guard allows one in-flight assistant request per user, suppresses identical completed requests briefly, and limits attempted calls per minute. It keeps hashes/timestamps only. Limits are shared across Copilot, Academy and showcase, and are enforced before SDK calls.
- The guard matches the existing single backend process. It resets on restart and is not a distributed/global billing budget; multiple backend workers would each have their own limit. No paid service was introduced.
- Context uses bounded category totals/changes, forecast facts, goals and recurring summaries. Email, user identifiers and the entire transaction history are omitted. Only a request about recent/last transactions adds up to three small transaction summaries. Descriptions, notes and account identifiers are not sent.
- The database retrieves at most six recent conversation messages for model context. New successful user/assistant messages have ordered timestamps; existing history is retained. If bounded history cannot fit, older whole messages are dropped. Oversized current context is rejected without a model call.
- One candidate, concise system instructions, minimal/disabled thinking for reviewed models, no tools, no automatic function calls and SDK retry `attempts=1`. There is no automatic provider/model retry loop.
- Safe usage logs contain model, outcome category, latency, token counts and estimated cost only. They omit user IDs, financial values, questions, responses, URLs and keys. Missing usage remains unknown. Generated output must have expected text structure and size; a response containing the configured secret is rejected.
- Financial calculations still come from backend services. Prompt boundaries identify reference values as untrusted data and prohibit invented balances, guarantees, lending decisions and score predictions. Model answers can still be wrong; the existing UI reminder remains.

The frontend preserves the Copilot design, adds access to saved conversations, prevents duplicate submission, shows loading and retry states, and links to deterministic spending/forecast tools when AI cannot answer. Missing key, authentication failure, unsupported model, quota/rate limits, timeout, network failures, malformed responses and provider interruption produce fixed friendly messages. Failed new requests return no nonexistent conversation ID, so retry can succeed.

## Tests and limits of verification

Baseline before migration: 45 backend tests passed. Current backend suite: **55 passed**, with one upstream Starlette/httpx TestClient deprecation warning. Obsolete gateway transport tests were replaced by direct SDK tests rather than counted as retained gateway functionality.

Tests cover SDK request shape/roles, token/context limits, usage/cost logs, secret redaction, missing/invalid keys, unsupported models, 429 quota/rate limits, timeouts, network failures, malformed output, per-user budgets, concurrent duplicate suppression, the actual SDK HTTP transport pointed at a controlled fake response, financial context isolation, conversation round trips and failed-request rollback. Existing finance, Academy, account and authorization tests remain. External settings are isolated in tests so unit tests cannot spend real API quota or contact the production database.

Browser/build results are recorded below after execution. Browser tests use Firebase identity fixtures and intercepted financial/AI responses. They verify UI behaviour, not live Google sign-in. Real production Firebase authentication, Coolify environment wiring and the Docker image remain deployment checks. Live Gemini generation is separately verified above.

### Final execution results

- Backend pytest: 55 passed.
- Live 3.1 generation: succeeded.
- Live 2.5 generation: unsupported-model failure, no automatic fallback.
- Browser suite (`npm.cmd run test:e2e`): 13 passed in 3.3 minutes, including the new Copilot loading, retry, duplicate-submission and saved-history flow, plus existing public, finance, Academy and showcase checks at the six requested widths.
- Frontend production build (`npm.cmd run build`): passed, including TypeScript validation and static generation of all 21 pages.
- Docker engine: unavailable; no image build or production deployment performed.
