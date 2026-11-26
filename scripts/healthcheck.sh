#!/bin/sh
set -e

# Verify internal FastAPI backend is healthy
curl -fsS http://127.0.0.1:8000/health > /dev/null || exit 1

# Verify Next.js frontend is responding
curl -fsS http://127.0.0.1:3000/ > /dev/null || exit 1
