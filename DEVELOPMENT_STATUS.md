# PULSE — Development Status

## Completed
- **Monorepo & Architecture**: Single root `Dockerfile` (multi-stage Node 22 + Python 3.12 + `supervisord`), `docker-compose.yml`, `scripts/start.sh`, `scripts/healthcheck.sh`, Next.js `/api/*` proxy rewrite to `127.0.0.1:8000`.
- **Backend Core**: FastAPI app, structured logging (stdout/stderr + rotating `/app/storage/logs/pulse.log` with secret scrubbing), Neon PostgreSQL SQLAlchemy 2.0 + psycopg 3 session management, Alembic initial migration (`0001_initial_schema`), Firebase Admin SDK token verification, VPS `StorageService` under `/app/storage`.
- **Financial Intelligence Engine**: Exact integer paise arithmetic, rule-based categorization, duplicate detection, category/daily/monthly analytics, unusual spending observations, recurring payment detection with confidence scores, transparent allowance forecasting, authoritative purchase affordability simulator, savings goal pacing, and CSV import parser.
- **Demo Experience**: Isolated session-based demo store for **Aarav Sharma** (Bengaluru, ₹12,000/month allowance) with 3 months of consistent transactions, recurring subscriptions, savings goals, notifications, and one-click reset.
- **Frontend UI**: Warm editorial design system (`#F5F2EC` canvas, `#FCFBF8` paper, `#443A33` espresso, DM Sans + DM Serif Display, tabular numerals), responsive sidebar, Landing page, Overview Dashboard, Transactions + CSV Import, Analytics, Recurring, Forecast, Purchase Simulator, Savings Goals, Copilot, and Notifications.
- **Notifications**: In-app notification centre with unread counts and preferences + SMTP HTML/plain-text email sender.
- **Gemini Enterprise Adapter**: Modular `AIProvider` + `GeminiGatewayAdapter` with strict grounding and honest unavailable state when gateway credentials/protocol are not supplied.

## External Integrations Requiring Credentials at Deployment
- **Neon PostgreSQL**: Schema and Alembic migrations are ready; requires live `DATABASE_URL` / `DIRECT_DATABASE_URL` to run `alembic upgrade head`.
- **Firebase Auth**: Client and Admin SDK integration is implemented; requires `NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_SERVICE_ACCOUNT_JSON`.
- **Gemini Enterprise Gateway**: Adapter supports `openai_compatible` and `gemini_rest` protocols once `GEMINI_GATEWAY_URL`, `GEMINI_GATEWAY_KEY`, `GEMINI_GATEWAY_PATH`, and `GEMINI_GATEWAY_PROTOCOL` are provided.
- **SMTP**: Email templates and sender are implemented; requires `SMTP_*` credentials to send live emails.
- **Docker**: `Dockerfile` and `docker-compose.yml` are complete; local `docker build` was not run because Docker CLI is not installed on the development machine.
