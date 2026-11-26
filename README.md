# PULSE — Student Financial Intelligence Platform

PULSE brings fragmented student finances (UPI, bank transfers, debit cards, cash, and subscriptions) into one calm, INR-first workspace with transaction intelligence, recurring detection, allowance forecasting, purchase affordability simulation, savings goals, and a Gemini Enterprise copilot.

## Architecture

PULSE is a single-container modular monolith:
- **Next.js (App Router, TypeScript, Tailwind CSS, Recharts)** on `127.0.0.1:3000` (publicly exposed).
- **FastAPI (Python 3.12, SQLAlchemy 2.0, psycopg 3, Pydantic)** on `127.0.0.1:8000` (internal only).
- Next.js proxies `/api/*` requests to `http://127.0.0.1:8000/api/*` via `next.config.ts` rewrites.
- **supervisord** manages both processes inside one container.

## Local Development

### 1. Environment Variables
Copy `.env.example` to `.env` and fill in your credentials as needed.
*(Note: The no-login **Demo Mode** works immediately without Neon, Firebase, Gemini, or SMTP credentials.)*

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
1. Enable **Google Sign-In** in Firebase Authentication.
2. Set `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID`.
   - **Important:** `NEXT_PUBLIC_*` variables are baked into the Next.js client bundle at Docker build time. Pass them as build arguments in Coolify.
3. Set `FIREBASE_SERVICE_ACCOUNT_JSON` (raw JSON string) on the backend only.

## Gemini Enterprise Gateway Setup
Set:
- `GEMINI_GATEWAY_URL`
- `GEMINI_GATEWAY_KEY`
- `GEMINI_GATEWAY_PATH`
- `GEMINI_GATEWAY_PROTOCOL` (`openai_compatible` or `gemini_rest`)
- `GEMINI_GATEWAY_MODEL`

If unconfigured, the Copilot displays an honest service-unavailable state and never fabricates responses.

## SMTP Email Notifications
Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, and `SMTP_USE_TLS`.

## Coolify Deployment (Single Dockerfile)
1. Point Coolify to the repository root `Dockerfile`.
2. Expose port `3000`.
3. Add a **Persistent Storage** volume mount:
   - Host/Volume path -> Container path: `/app/storage`
4. Configure environment variables and `NEXT_PUBLIC_*` build arguments.
5. Health check endpoint: `/health` (internal FastAPI) and `/` (Next.js).

## Demo Instructions
1. Open `/` and click **Explore Demo**.
2. Explore **Overview**, **Transactions** (search, filter, add/edit/delete, CSV import), **Analytics**, **Recurring**, **Forecast**, **Purchase Simulator** (try the ₹45,000 laptop preset), **Savings Goals**, **Copilot**, and **Notifications**.
3. Use **Reset Demo Data** in the sidebar to restore Aarav Sharma's baseline dataset at any time.
