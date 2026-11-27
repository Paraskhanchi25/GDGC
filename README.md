# PULSE — Student Financial Intelligence Platform

PULSE brings fragmented student finances (UPI, bank transfers, debit cards, cash, and subscriptions) into one calm, INR-first workspace with transaction intelligence, recurring detection, allowance forecasting, purchase affordability simulation, savings goals, and an optional financial copilot. AI uses the official Google Gen AI SDK with a backend-only personal Gemini API key.

## Architecture

PULSE is a single-container modular monolith:
- **Next.js (App Router, TypeScript, Tailwind CSS, Recharts)** on `127.0.0.1:3000` (publicly exposed).
- **FastAPI (Python 3.12, SQLAlchemy 2.0, psycopg 3, Pydantic)** on `127.0.0.1:8000` (internal only).
- Next.js proxies `/api/*` requests to `http://127.0.0.1:8000/api/*` via `next.config.ts` rewrites.
- **supervisord** manages both processes inside one container.

## Local Development

### 1. Environment Variables
Copy `.env.example` to `.env` and fill in your credentials as needed.
The public landing page, Credit Academy lessons and `/showcase` are accessible without sign-in. Persistent financial tools require the existing Firebase/Neon configuration. The showcase uses isolated fictional data and a labelled deterministic explanation when AI is unavailable.

### 2. Backend (FastAPI)
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate  |  Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Run backend tests:
```bash
cd backend
pytest -v
```

### 3. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000`.

## Database Setup (Neon PostgreSQL)
1. Create a Neon project and database.
2. Set `DATABASE_URL` (pooled) and `DIRECT_DATABASE_URL` (direct) using the `postgresql+psycopg://...` scheme.
3. Run migrations:
   ```bash
   cd backend
   alembic upgrade head
   ```

## Firebase Authentication Setup
1. Open **Firebase Console → Authentication → Sign-in method** and enable **Google**.
2. Open **Firebase Console → Authentication → Settings → Authorized domains** and add:
   - `gdgc.swappy.lol` (production custom domain)
   - `localhost` (local development)
3. Set `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID`.
   - **Important:** `NEXT_PUBLIC_*` variables are baked into the Next.js client bundle at Docker build time. Pass them as build arguments in Coolify.
4. Set `FIREBASE_PROJECT_ID=gdgc-10270` and/or `FIREBASE_SERVICE_ACCOUNT_JSON` (raw JSON string) on the backend only.

If the login page shows **Sign-in is temporarily unavailable** with no failed requests, the browser build is missing Firebase configuration and deliberately skips SDK initialization. In Coolify, enable **Available at Buildtime** for `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID`, save, then rebuild/redeploy the Docker image. A runtime-only change or container restart cannot replace values already inlined into the browser bundle. The browser console reports missing variable names only. Docker Compose forwards these four build arguments from its environment/`.env`; `env_file` alone supplies runtime values only. Backend service-account credentials and `GEMINI_API_KEY` must remain backend-only.

## Direct Google Gemini API
Set backend variables `GEMINI_PROVIDER=google`, `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-3.1-flash-lite` in your local `.env` and Coolify. The personal key is never a frontend build argument. The old administrator gateway is removed; no gateway or alternate-key fallback exists.

The shared SDK provider serves the existing Copilot, Academy and showcase routes. It bounds context/history/output, disables automatic retries and tools, and applies process-local per-user request/duplicate limits. The existing database conversations remain intact.

From `backend`, run `python -m app.ai.diagnostic --model gemini-3.1-flash-lite` to verify model metadata and one harmless real generation. No credentials or financial information are printed. See [migration and verification report](docs/DIRECT_GEMINI_MIGRATION.md) for pricing, controls and actual results. The root `.env` is read consistently from any working directory, with backend `.env` and process environment taking precedence.

## SMTP Email Notifications
Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, and `SMTP_USE_TLS`.

## Coolify Deployment (Single Dockerfile · `https://gdgc.swappy.lol`)
1. Point Coolify to the repository root `Dockerfile` and assign the custom domain `https://gdgc.swappy.lol`.
2. Set `FRONTEND_URL=https://gdgc.swappy.lol` in Coolify environment variables.
3. Expose port `3000`.
4. Add a **Persistent Storage** volume mount:
   - Host/Volume path -> Container path: `/app/storage`
5. Configure environment variables and `NEXT_PUBLIC_*` build arguments.
6. Health check endpoint: `/health` (internal FastAPI) and `/` (Next.js). Next.js App Router handles direct navigation and refresh on `/`, `/home`, `/login`, `/dashboard`, and all sub-routes natively.

## Product walkthrough and implementation handoff
Open `/showcase` and select **Start guided demo** for the six-stage fictional student journey. Ordinary financial pages require sign-in; the showcase does not create transactions or learning records.

Read [the implementation handoff](docs/PRODUCT_EVOLUTION_HANDOFF.md) for the complete route inventory, asset locations, migration, Academy/certificate design, direct Gemini configuration, verification results and manual deployment checks.

### Validation
```powershell
cd backend
.venv\Scripts\python.exe -m pytest -q
cd ../frontend
npm.cmd run typecheck
npm.cmd run test:e2e
npm.cmd run build
```
Browser tests currently use Microsoft Edge and a Windows local Python environment; install Edge or adapt `playwright.config.ts` for the browser/Python executable on another OS. Firebase sessions and financial responses are isolated browser fixtures, not real Google authorization or production financial data.

Credit Academy needs the additive `0004_credit_academy` migration through the existing `alembic upgrade head` flow. Back up the database and verify migration logs in Coolify. Production deployment remains the owner's responsibility.
