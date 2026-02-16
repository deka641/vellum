#!/bin/bash
set -e

echo "=== Starting Vellum ==="

# PostgreSQL
echo "Starting PostgreSQL..."
pg_ctlcluster 16 main start 2>/dev/null || echo "PostgreSQL already running"

# Build Next.js for production
echo "Building Next.js..."
cd /opt/vellum
pnpm build

# Start Next.js in production mode
echo "Starting Next.js (production)..."
pnpm start &
NEXT_PID=$!
echo "$NEXT_PID" > /tmp/vellum-next.pid

PORT="${PORT:-3000}"
HOSTNAME="${HOSTNAME:-localhost}"
echo ""
echo "=== Vellum is running at http://${HOSTNAME}:${PORT} ==="
echo "Next.js PID: $NEXT_PID"

disown "$NEXT_PID"
