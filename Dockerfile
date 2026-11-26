# Stage 1: Build Next.js frontend (standalone)
FROM node:22-slim AS frontend-builder
WORKDIR /build/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./

# Build-time public Firebase configuration (passed via Coolify build args if used)
ARG NEXT_PUBLIC_FIREBASE_API_KEY=""
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
ARG NEXT_PUBLIC_FIREBASE_APP_ID=""
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV API_BASE_URL=http://127.0.0.1:8000

RUN npm run build

# Stage 2: Final production runtime (Next.js + FastAPI + supervisord)
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production \
    PORT=3000 \
    BACKEND_PORT=8000 \
    API_BASE_URL=http://127.0.0.1:8000 \
    STORAGE_ROOT=/app/storage

# Install Node.js 22 runtime, supervisor, and curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    supervisor \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create non-root runtime user
RUN groupadd --system pulse && useradd --system --gid pulse --create-home pulse

WORKDIR /app

# Install Python backend dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend source
COPY backend/ /app/backend/

# Copy Next.js standalone build artifacts
COPY --from=frontend-builder /build/frontend/.next/standalone /app/frontend/
COPY --from=frontend-builder /build/frontend/.next/static /app/frontend/.next/static

# Copy supervisor and startup scripts
COPY scripts/supervisord.conf /app/scripts/supervisord.conf
COPY scripts/start.sh /app/scripts/start.sh
COPY scripts/healthcheck.sh /app/scripts/healthcheck.sh
RUN chmod +x /app/scripts/start.sh /app/scripts/healthcheck.sh

# Create persistent storage directory and set ownership
RUN mkdir -p /app/storage/uploads/transactions /app/storage/exports /app/storage/logs /app/storage/temp \
    && chown -R pulse:pulse /app

USER pulse

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD /app/scripts/healthcheck.sh

CMD ["/app/scripts/start.sh"]
