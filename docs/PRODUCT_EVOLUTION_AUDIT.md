# PULSE implementation inventory — 27 November 2026

This is the historical product-evolution audit. The gateway findings below are superseded by [the direct Gemini migration](DIRECT_GEMINI_MIGRATION.md); no gateway remains in the active request path.

## Baseline and constraints
Existing Next.js App Router / FastAPI modular monolith, SQLAlchemy/Neon, Firebase Google authentication, SMTP, local storage, and supervisor in one Docker container are retained. No production database or user records were modified during development. Existing migrations 0001–0003 cover finance, multiple accounts, OTP and Gmail subscription detection.

Baseline: frontend `npm.cmd exec -- tsc --noEmit` passed. Initial backend pytest could not collect because system Python lacks FastAPI; install dependencies in ignored `backend/.venv` before testing. No browser automation is installed in the repository.

## Feature inventory
| Feature | Existing frontend | Backend / records | Improvement / regression risk |
|---|---|---|---|
| Public website | `/`, CSS 3D hero | none | Already independent of auth; preserve public access and add Academy/showcase navigation |
| Google sign-in | `/login`, providers, firebase.ts | security, auth/sync, User/Profile | Preserve token verification and verified-email linking; live OAuth needs configured browser |
| Dashboard | `/home` aliases `/dashboard` | analytics/overview, accounts, transactions | Shared visual system; protect balances and account selection |
| Transactions | `/transactions`, CSV, edit/delete | v1 CRUD, import, Transaction/Account | Add confirmed natural-language entry; fix balance reconciliation on edits/deletes |
| Analytics | `/analytics` | deterministic financial analytics | Preserve calculations, INR formatting and charts |
| Forecast | `/forecast` | allowance forecasting | Preserve estimates and empty states |
| Recurring | `/recurring` | detection + RecurringPayment overrides | Preserve confirm/dismiss |
| Subscriptions | `/subscriptions` | Gmail OAuth/read-only sync, Subscription/Event/SyncLog | Preserve consent, encryption, manual management |
| Goals | `/goals` | SavingsGoal/Contribution | Preserve contributions and pacing |
| Purchase decisions | `/simulator` | affordability evaluator | Keep calculations independent of AI |
| Copilot | `/copilot` | AIConversation/Message, gateway adapter | Missing verified protocol, path, model and authentication contract; do not probe invented paths |
| Notifications | `/notifications`, `/settings` | Notification/Preference, SMTP service | Preserve preferences and delivery, sanitize templates |
| Profile/onboarding | `/profile`, `/onboarding` | UserProfile | Preserve allowance and onboarding state |
| Account setup | link-bank-flow, account-prep-3d | accounts API, Account/OTP, activity engine | Existing generated account activity is illustrative, not real banking access; retain clear disclosure |
| Academy | absent | absent | Add user-owned progress, server-scored attempts and authorized certificate |
| Showcase | absent | absent | Isolated fixed sample data; no financial writes or learning progress mutations |

Existing functionality above is implemented in code; live external integrations are not certified by this audit. Existing tests exercise finance calculations and authorization using SQLite. Credential-dependent auth, Neon, Gmail and SMTP require deployment verification.

## Gateway investigation
Only setting names and presence were inspected, without printing credentials or URLs. An initial raw-file check appeared to find gateway URL/key settings. A later dotenv-based check of the current workspace found only `GEMINI_PROVIDER`, `GEMINI_API_KEY` and `GEMINI_MODEL`; none of the adapter's `GEMINI_GATEWAY_*` values resolved. The current diagnostic therefore reports the gateway unconfigured. The environment file was not edited. These alternative names are not silently mapped to an enterprise gateway or a consumer API.

Original code supported configured OpenAI-compatible and Gemini REST payloads but supplied an unverified Bearer header to both. This is not evidence of the administrator's protocol. No network probes were made. Require administrator documentation or a sanitized working curl example containing method, exact path, auth header name/scheme, model, request/response schema, quotas and data processing terms. Diagnostics use a harmless prompt and no financial data.
