# PULSE product evolution — implementation handoff

Prepared 27 November 2026. Local code changes only; production was not deployed. See [audit and inventory](PRODUCT_EVOLUTION_AUDIT.md).

## Implemented product changes

- New geometric PULSE symbol, wordmark, monochrome/dark variants, app icons, favicon metadata, manifest and Open Graph image. An image-generation exploration is retained in `docs/brand-exploration.png`; production assets are deterministic vectors and derived raster exports.
- Public editorial landing page, reusable public navigation, student-focused copy, light ivory/copper/lavender surfaces and CSS 3D learning-card sculpture. Google CTA uses the existing sign-in function and preserves first-use onboarding.
- All existing financial screens retain their feature implementations and receive the shared shell, more readable financial text, page introductions, consistent surfaces and feedback. No finance page was removed. This is a shared-system refinement, not a complete rewrite of each individual screen.
- Smart transaction dialog on Transactions and Dashboard: typed entry, optional browser voice, local backend parser, editable preview, income/expense and category suggestions, merchant/date extraction, optional account/details, duplicate confirmation and a 12-second undo. Existing manual edit, delete and CSV flows remain.
- Transaction edits now reconcile linked account balances. Financial mutations lock relevant rows on PostgreSQL. Delete, including undo, reverses the recorded balance effect.
- Six-chapter Credit Academy, read tracking, server-scored checks, unlimited assessment attempts, 80% threshold, persistent completion records, an authorized certificate and contextual assistant entry point.
- Six-stage isolated showcase, controls for next/previous/skip/restart, honest deterministic fallback, and an authenticated optional live explanation using fictional context only.
- More defensive gateway adapter, data minimization, safe messages, failure handling, no redirects/retries or endpoint guessing, and a backend-only harmless diagnostic.
- Email template escaping, fewer personal details in logs, private/no-store API responses, labels/focus styles, reduced-motion support and a text/table alternative for the analytics chart.
- Session cache resets now preserve active loading observers and clear prior-user data on identity switches. A reduced-motion hydration mismatch in the existing loader was also fixed.
- Compatible transitive dependency patches and removal of unused Zod. Firebase Authentication and the existing framework versions remain in place.

## Route inventory

| Route | Access | Purpose |
|---|---|---|
| `/` | Public, including signed-in visitors | Landing page; no forced dashboard redirect |
| `/login` | Public | Existing Google authentication |
| `/home`, `/dashboard` | Authenticated | Dashboard aliases with quick entry |
| `/onboarding` | Authenticated | Existing account preparation workflow |
| `/transactions` | Authenticated | Smart entry, ledger, edit/delete, CSV |
| `/analytics` | Authenticated | Spending and cash-flow charts |
| `/forecast` | Authenticated | Allowance forecast |
| `/recurring` | Authenticated | Detected commitments and overrides |
| `/subscriptions` | Authenticated | Existing Gmail consent and subscription management |
| `/goals` | Authenticated | Savings goals and contributions |
| `/simulator` | Authenticated | Purchase scenarios |
| `/copilot` | Authenticated | Financial explanations when the provider is available |
| `/notifications` | Authenticated | Updates and preferences |
| `/profile`, `/settings` | Authenticated | Profile, allowance, accounts and preferences |
| `/learn/credit-cards` | Public lessons; authenticated progress/checks/certificate | Credit Academy |
| `/showcase` | Public; sign-in needed only for optional live AI request | Judge walkthrough |

The authenticated logo links to `/`. There is no authentication middleware redirecting `/` to `/home`. Session verification remains in the existing provider and protected shell.

## Design system and assets

Tokens and responsive/motion rules: `frontend/app/globals.css`. DM Sans pairs with DM Serif Display; values use Indian currency grouping and tabular numerals. Primary surfaces remain ivory/white, with espresso text, deep copper actions, plum learning accents and sage positive feedback. Contrast-sensitive copper/plum/muted tokens were darkened. Focus outlines and reduced-motion behaviour are shared.

Canonical vector: `frontend/public/brand/symbol.svg`. Derivations: `wordmark.svg`, `monochrome.svg`, `dark.svg`, icons at 16/32/48/180/192/512 pixels, and `open-graph.png` in the same directory. Regenerate with `cd frontend && npm run brand`; this uses the existing Next.js Sharp installation. `PulseSymbol` / `PulseLogo` reuse the canonical asset, including the certificate. Browser/app metadata lives in `app/layout.tsx` and `public/manifest.webmanifest`.

Docker change: one `COPY` instruction adds `frontend/public` to the existing runtime image. Next.js standalone output does not copy that directory automatically. No topology, hosting or process-manager changes were made.

## Frontend changes

New components: `pulse-logo`, `public-header`, `credit-sculpture`, `page-heading`, `action-error`, `chart-summary`, `smart-transaction`, `academy-tools`; `lib/use-client-motion` keeps server/client rendering consistent. New pages: `learn/credit-cards`, `showcase`. Existing app pages, shell, provider, loader, metadata and global styles were refined. Existing linking/Gmail components and financial charts remain operational code paths.

Natural-language parsing is a suggestion step only. It does not save, perform bank transfers or need Gemini. Ambiguous/missing amounts require manual correction. Supported common dates are today, yesterday and ISO dates; other expressions get a review warning. Voice depends on browser support and microphone permission. The browser may use a remote speech service; typed input always remains available. Complex linguistic interpretation is not routed to Gemini in this build.

## Backend and database

New routers:

| API | Behaviour |
|---|---|
| `POST /api/v1/transactions/parse` | Authenticated, deterministic suggestions; no writes |
| `POST /api/v1/transactions/duplicates` | Owner-scoped same amount/date/type/merchant/account warning |
| `GET /api/v1/academy/content` | Public English curriculum; answer keys omitted |
| `GET /api/v1/academy/progress` | Authenticated user's lessons, checks, attempts and certificate |
| `PUT /api/v1/academy/chapters/{id}/lessons` | Monotonic read progress |
| `POST /api/v1/academy/chapters/{id}/check` | Server-scored knowledge check; persists each valid attempt |
| `POST /api/v1/academy/assessment` | Requires all six completed chapters; persists attempts and issues certificate at 80% |
| `GET /api/v1/academy/certificates/{id}` | Owner-only SVG download payload |
| `POST /api/v1/academy/ask` | Authenticated contextual educational explanation |
| `POST /api/v1/showcase/ask` | Authenticated explanation of fixed fictional data; no finance/Academy writes |

Migration `backend/alembic/versions/0004_credit_academy.py` adds `academy_progress`, `academy_attempts`, `academy_certificates`. All are associated with the server-resolved user. It does not alter existing financial tables. User/chapter uniqueness and one certificate per user are enforced. A user-row lock serializes concurrent progress/certificate issuance on PostgreSQL. The migration has been exercised against an isolated SQLite schema with an existing user; production Neon migration has not been run.

Use the existing `alembic upgrade head` deployment step after a database backup. Existing startup runs migrations but only logs a warning on failure; verify successful migration in Coolify logs before presenting Academy persistence. Do not run a downgrade against real student progress casually.

## Academy content and certificates

Versioned English curriculum is in `backend/app/academy/content.py`, separate from UI. It defines six chapters, two lessons per chapter, chapter checks, ten final-assessment questions and official source references. Additional locales can be added beside English. Source URLs refer to CIBIL, RBI and an issuer example; the UI gives the review date and distinguishes issuer-specific terms from general information and simulations.

Certificate issuance is server-controlled. It snapshots the student's authenticated display name, passing score, completion date, curriculum version and a random UUID. Repeated passing attempts retain the first issued certificate. The certificate is returned only after authenticated ownership lookup, as an escaped SVG payload. The frontend downloads an SVG or opens a print layout for browser **Save as PDF**. There is no public certificate URL, accreditation claim, CIBIL score change or bank endorsement. Certificates are generated on demand from the database and canonical logo; no new cloud storage is required.

## Direct Gemini migration (supersedes the gateway investigation)

The administrator gateway and all gateway configuration have been removed from the active application. The existing shared assistant now uses Google's official `google-genai` Python SDK and only `GEMINI_PROVIDER=google`, `GEMINI_API_KEY` and an explicitly configured `GEMINI_MODEL`.

A real direct generation using `gemini-3.1-flash-lite` succeeded on 27 November 2026. The cheaper `gemini-2.5-flash-lite` appeared in model metadata but its generation request returned 404, so it was not selected. See [the direct Gemini migration report](DIRECT_GEMINI_MIGRATION.md) for exact verification results, pricing, cost controls and configuration. The actual `.env` remains untouched. Existing historical test results below refer to the earlier product-evolution phase; current migration results are in that report.

## Showcase instructions

Open `/showcase` and choose **Start guided demo**. Meet fictional Aarav, review income and categories, explore commitments/goals, inspect the assistant example, try the billing-cycle tool, and finish with architecture. Next/Previous, section selection, Restart and Exit are available on mobile and keyboard. Stage four starts with a clearly marked deterministic example. Live requests now use the direct Google Gemini API. **Try a live answer** is available after sign-in and uses only fixed fictional context. Failure keeps an honest deterministic example. Academy tools inside the showcase never call progress or certificate endpoints.

## Verification and remaining manual checks

See the final execution report below for exact command results. Browser auth is an isolated Firebase SDK persistence fixture with identity/financial requests intercepted. It verifies UI session behaviour, not real Google OAuth or a production backend session. Backend authorization and scoring tests use independent SQLite data and request-level missing-token tests. Gateway tests use controlled HTTP transports, not a real provider.

Manual checks still required in the configured Coolify environment: Google popup/domain authorization and real token/session flow; Neon connectivity and migration; SMTP and Gmail consent/sync; the direct Gemini diagnostic using the production environment; speech permission denial on representative devices; physical-device touch/screen-reader checks and printer/PDF rendering. The browser suite covers reduced-motion behaviour and simulated microphone denial; actual speech recognition depends on browser/device support. Local browser simulation does not certify those external systems.

No new Google Cloud service or API entitlement was assumed. Financial data was not reset, `.env` was not edited, and no production deployment was performed.

### Execution results

- Frontend TypeScript (`npm.cmd run typecheck`): passed.
- Initial backend suite: 10 passed after preparing local Python dependencies.
- Expanded backend suite: 45 passed; one upstream Starlette/httpx TestClient deprecation warning.
- Final production build (`npm.cmd run build`): passed, including type validation and static generation of all 21 pages. The Docker image was not built or deployed locally.
- Final browser suite (`npm.cmd run test:e2e`): 12 passed in 3.4 minutes. It covers 18 public route/viewport combinations and 72 authenticated finance screen/viewport combinations at 1920, 1440, 1024, 768, 390 and 360 pixels. It waits for loaded data, checks document/body overflow and page errors, and exercises session/navigation, showcase isolation, Academy tools, microphone fallback/denial and transaction confirmation/duplicate/undo. Screenshots were reviewed at desktop and mobile sizes.
- Final `npm.cmd audit`: 0 reported vulnerabilities.
- Backend gateway diagnostic: unconfigured, no network request made.
