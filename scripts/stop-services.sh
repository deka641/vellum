#!/bin/bash

echo "=== Stopping Vellum ==="

# Stop Next.js via PID file
if [ -f /tmp/vellum-next.pid ]; then
  PID=$(cat /tmp/vellum-next.pid)
  if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping Next.js (PID $PID)..."
    kill "$PID" 2>/dev/null
  fi
  rm -f /tmp/vellum-next.pid
fi

# Kill all node/next processes related to vellum
echo "Cleaning up Node processes..."
pkill -f "next start" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true

# Wait briefly, then force-kill anything still on port 3000
sleep 1
PIDS=$(fuser 3000/tcp 2>/dev/null || true)
if [ -n "$PIDS" ]; then
  echo "Force-stopping remaining processes on port 3000..."
  fuser -k 3000/tcp 2>/dev/null || true
fi

# Stop PostgreSQL
echo "Stopping PostgreSQL..."
pg_ctlcluster 16 main stop 2>/dev/null || echo "PostgreSQL already stopped"

echo "=== Vellum stopped ==="
