#!/bin/sh
set -e

mkdir -p /app/storage/uploads/transactions /app/storage/exports /app/storage/logs /app/storage/temp

if [ -n "$DATABASE_URL" ] || [ -n "$DIRECT_DATABASE_URL" ]; then
  echo "Running Alembic database migrations..."
  cd /app/backend
  alembic upgrade head || echo "Warning: Alembic migration failed; verify DATABASE_URL / DIRECT_DATABASE_URL."
fi

exec /usr/bin/supervisord -c /app/scripts/supervisord.conf
