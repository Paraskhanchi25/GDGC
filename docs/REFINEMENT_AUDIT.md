# PULSE — Refinement Audit (Phase Zero)

## 1. Existing Architecture
- **Frontend**: Next.js `15.5.29` (App Router, `output: "standalone"`), React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/postcss`), TanStack Query v5, Recharts, Framer Motion (`^11.11.17` installed, currently unused in UI), Lucide icons.
- **Backend**: FastAPI (`0.165.0`), Python 3.14 (local) / 3.12 (Docker), SQLAlchemy 2.0 + `psycopg` 3, Alembic, Firebase Admin SDK (`6.9.0`), Pydantic v2.
- **Database**: Neon PostgreSQL (`postgresql+psycopg://...`), 14 tables in `backend/app/models/models.py` with integer paise (`BigInteger`) and `INR` currency.
- **Deployment**: Single root `Dockerfile` (multi-stage Node 22 + Python 3.12 + `supervisord`), Coolify-compatible, port `3000` public, FastAPI internal on `127.0.0.1:8000` via `next.config.ts` `/api/:path*` rewrite, persistent storage at `/app/storage`.

## 2. Current Route Inventory (Frontend)
| Route | File | Current Access | Issues Found |
|---|---|---|---|
| `/` | `frontend/app/page.tsx` | Public | Exposes "Explore Demo" CTA and sample student financial figures |
| `/login` | `frontend/app/login/page.tsx` | Public | Includes email/password login/registration & "Explore Demo instead" link |
| `/home` | `frontend/app/home/page.tsx` | Protected (when `!isDemo`) | `isDemo` defaults to `true`, allowing unauthenticated demo access |
| `/dashboard` | `frontend/app/dashboard/page.tsx` | Protected (when `!isDemo`) | Same `isDemo` bypass; renders `AppShell` while `authLoading` |
| `/transactions` | `frontend/app/transactions/page.tsx` | Protected (when `!isDemo`) | Uses `isDemo`; wide table on mobile |
| `/analytics` | `frontend/app/analytics/page.tsx` | Protected (when `!isDemo`) | Uses `isDemo` |
| `/forecast` | `frontend/app/forecast/page.tsx` | Protected (when `!isDemo`) | Uses `isDemo` |
| `/recurring` | `frontend/app/recurring/page.tsx` | Protected (when `!isDemo`) | Uses `isDemo` |
| `/simulator` | `frontend/app/simulator/page.tsx` | Protected (when `!isDemo`) | Uses `isDemo` |
| `/goals` | `frontend/app/goals/page.tsx` | Protected (when `!isDemo`) | Uses `isDemo` |
| `/copilot` | `frontend/app/copilot/page.tsx` | Protected (when `!isDemo`) | Uses `isDemo`; error state exposes "Gemini Enterprise gateway" phrasing |
| `/notifications` | `frontend/app/notifications/page.tsx` | Protected (when `!isDemo`) | Uses `isDemo`; mentions "SMTP" in UI label |
| `/profile` | Missing | — | Required in Sidebar & protected area |
| `/settings` | Missing | — | Required in Sidebar & protected area |
| `*` (404) | `frontend/app/not-found.tsx` | Public | Uses light palette; needs dark brand identity |

## 3. Existing Authentication Flow & Gaps
- **Firebase Client (`frontend/lib/firebase.ts`)**: Single-init Firebase app with `GoogleAuthProvider` (`signInWithPopup`), plus `signInWithEmail` and `registerWithEmail` (must be removed).
- **Auth Provider (`frontend/components/providers.tsx`)**:
  - `isDemo` state defaults to `true` (`useState(true)`), bypassing authentication across all pages when signed out.
  - `darkMode` defaults to `false` with a light/dark toggle.
- **Route Protection (`frontend/components/app-shell.tsx`)**:
  - Redirects to `/login` only when `!authLoading && !isDemo && !user`.
  - Renders `{children}` during `authLoading`, risking a brief flash before redirect.
- **Backend Auth (`backend/app/core/security.py` & `backend/app/api/deps.py`)**:
  - `verify_firebase_token` verifies Bearer ID tokens via `firebase_admin.auth.verify_id_token(token, check_revoked=False)`.
  - `get_current_user` resolves or provisions `User` by `firebase_uid`, with verified-email linking.

## 4. Demo-Related Functionality Found
- `backend/app/demo/data.py`: `build_initial_demo_state`, `DemoStore` (Aarav Sharma persona).
- `backend/app/api/demo.py`: 17 public `/api/v1/demo/*` endpoints (`reset`, `overview`, `transactions`, `import`, `recurring`, `simulator`, `goals`, `notifications`, `ai/chat`).
- `backend/app/main.py`: Registers `demo_router`.
- `frontend/lib/api.ts`: `getDemoSessionId()`, `X-Demo-Session`, `apiPrefix(isDemo)`.
- `frontend/components/providers.tsx` & `app-shell.tsx`: `isDemo`, `setDemoMode`, "Demo Profile / Reset Demo Data" sidebar card.
- All 9 feature pages + `login/page.tsx` + `page.tsx`: `isDemo` branching and Demo CTAs.
- `backend/tests/test_financial_and_api.py`: `test_demo_api_journey` tests `/api/v1/demo/*` (must be replaced with authenticated security/ownership tests).

## 5. Authorization Gaps & Data Isolation Risks
1. **`GET /api/v1/ai/status` (`backend/app/api/v1.py:622`)**: Missing `Depends(get_current_user)` and returns `missing_config` (internal env var names).
2. **`GET /health` (`backend/app/main.py:88`)**: Exposes `database` health details and `ai_gateway_configured` publicly; should return minimal `{"status": "ok"}`.
3. **Demo Endpoints (`/api/v1/demo/*`)**: Publicly expose financial endpoints without authentication.
4. **User-scoped queries in `v1.py`**: All transaction, goal, recurring, conversation, and notification queries filter by `user.id`, and `StorageService` scopes files by `user.id`. However, automated cross-user ownership tests are currently missing.
5. **`verify_firebase_token`**: `check_revoked=False` — should check revocation or handle `RevokedIdTokenError` explicitly.

## 6. Design System, UX & Responsive Gaps
- **Theme**: Currently warm light (`#F5F2EC`) with a toggle; must become dark-only (`#17120F` deep espresso, `#211812` roasted brown, `#2A211B` surface, `#342820` raised, `#B8754C` copper, `#D59A58` amber, `#E9C89A` champagne, `#F4EBDD` ivory).
- **Landing Page**: Lacks signature 3D orbital/metallic composition, floating financial UI panels, and Framer Motion scroll choreography.
- **Loading & Error States**: No initial branded loading screen, no Next.js `error.tsx` boundary, inconsistent page skeletons, and mobile transaction table relies on horizontal scrolling rather than responsive cards.
- **User-Facing Language**: `copilot/page.tsx` mentions "Gemini Enterprise gateway", `notifications/page.tsx` mentions "SMTP", and `apiFetch` surfaces raw backend `detail` strings on 500s.

## 7. Files That Should Remain Untouched
- `Dockerfile`, `docker-compose.yml`, `scripts/start.sh`, `scripts/healthcheck.sh`, `scripts/supervisord.conf` (single-container Coolify architecture is already compliant).
- `backend/alembic/*` and `backend/app/models/models.py` (database schema and Neon migrations are intact).
- `backend/app/financial/*` (exact paise calculations, analytics, recurring, forecasting, affordability, savings, insights, CSV parser).
- `backend/app/ai/gateway_adapter.py`, `context_builder.py`, `copilot_service.py`, `prompts.py`, `provider.py`, `schemas.py`.
- `backend/app/notifications/service.py` & `backend/app/storage/service.py`.
