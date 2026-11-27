# PULSE — Refinement Implementation Plan

## Phase 1: Security Hardening (Priority 1)
1. **Remove Demo Access**:
   - Remove `demo_router` registration from `backend/app/main.py` and delete `backend/app/api/demo.py` & `backend/app/demo/data.py`.
   - Remove `isDemo`, `setDemoMode`, `getDemoSessionId`, `X-Demo-Session`, and `apiPrefix` from `frontend/lib/api.ts`, `frontend/components/providers.tsx`, `frontend/components/app-shell.tsx`, and all frontend pages.
   - Remove "Explore Demo" / sample financial numbers from `frontend/app/page.tsx` and `frontend/app/login/page.tsx`.
2. **Google-Only Firebase Authentication**:
   - Remove `signInWithEmail`, `registerWithEmail`, and the email/password form from `frontend/lib/firebase.ts` and `frontend/app/login/page.tsx`.
   - Keep `signInWithPopup(auth, googleProvider)` as the sole sign-in and registration method.
3. **Backend Authorization & Hardening**:
   - Require `Depends(get_current_user)` on `GET /api/v1/ai/status` and remove `missing_config` from its response.
   - Simplify `GET /health` to `{"status": "ok"}` (no DB/AI internal diagnostics exposed publicly).
   - Handle `firebase_auth.RevokedIdTokenError` in `backend/app/core/security.py`.
   - Add automated pytest suite covering 401/403 auth rejection, demo route 404s, and cross-user isolation (User A vs. User B) across transactions, goals, recurring, AI conversations, notifications, and storage.
4. **Frontend Route Protection**:
   - Prevent any protected route from rendering children until Firebase auth state resolves (`authLoading === false` and `user !== null`), showing the branded loading screen instead.

## Phase 2: Dark Theme & Design System
1. Update `frontend/app/globals.css` with the warm futuristic fintech dark palette (`#17120F`, `#211812`, `#2A211B`, `#342820`, `#49392E`, `#B8754C`, `#D59A58`, `#E9C89A`, `#F4EBDD`, `#C8BBAA`, `#A99B8A`, `#91A88B`, `#D5A15E`, `#C97B70`).
2. Remove light/dark toggle from `providers.tsx` and `app-shell.tsx`; enforce `dark` theme globally.

## Phase 3: Landing Page & Signature 3D Composition
1. Build a reusable `PulseOrb3D` & `FloatingFinancialPanels` component using CSS 3D (`perspective`, `preserve-3d`, `translateZ`, `rotateX/Y`) and Framer Motion with `useReducedMotion` support and mobile simplification.
2. Redesign `frontend/app/page.tsx` with Navigation, Hero ("Your money, with a clearer pulse."), Signature 3D object + Floating UI, Capabilities, Simulator showcase, Forecasting/Savings showcase, Copilot showcase, Final CTA, and Footer — with zero demo access.

## Phase 4: Authenticated Application & Missing Pages
1. Add `frontend/app/profile/page.tsx` and `frontend/app/settings/page.tsx`.
2. Update `AppShell` sidebar to include all required links (Dashboard/Home, Transactions, Analytics, Forecast, Recurring, Savings Goals, Simulator, Copilot, Notifications, Profile, Settings, Sign out) with Google avatar and display name.
3. Upgrade Transactions mobile view to responsive cards, refine Recharts dark-mode contrast/tooltips, and polish Forecast, Simulator, Goals, Copilot, and Notifications.

## Phase 5: UX Polish, Error Handling & Accessibility
1. Add branded initial loading screen (`frontend/components/branded-loader.tsx`).
2. Add page-level skeletons (`frontend/components/skeletons.tsx`), `frontend/app/error.tsx`, and dark-themed `frontend/app/not-found.tsx`.
3. Centralize friendly error mapping in `frontend/lib/api.ts` so internal terms (SMTP, FastAPI, Neon, gateway, HTTP 500) never appear in user-facing UI.

## Phase 6: Verification
1. Run backend `pytest -v` (financial, auth, ownership, demo removal).
2. Run `npm run build` (Next.js production build).
3. Verify responsive layouts across `1920x1080`, `1440x900`, `1024x768`, `768x1024`, `390x844`, and `360x800`.
