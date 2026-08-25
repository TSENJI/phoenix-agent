#!/bin/bash
set -e

echo "========================================"
echo "  Phoenix Agent V2 - Full (Browser + AI)"
echo "========================================"

# Ensure data directory exists
DATA_DIR="${DATABASE_URL#file:}"
DATA_DIR="$(dirname "$DATA_DIR")"
mkdir -p "$DATA_DIR"
mkdir -p /app/uploads

echo "[DB] Data dir: $DATA_DIR"
echo "[DB] Running prisma db push..."
cd /app && npx prisma db push --accept-data-loss 2>&1 | tail -3 || true
echo "[DB] Ready."

# Start Browser Worker in background
echo "[Browser Worker] Starting Playwright service on port 3001..."
cd /app/browser-worker
if command -v bun &>/dev/null; then
  bun run start &
else
  npx tsx index.ts &
fi
BROWSER_PID=$!
echo "[Browser Worker] PID: $BROWSER_PID"

# Wait for browser worker to be ready
for i in $(seq 1 20); do
  if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
    echo "[Browser Worker] Ready!"
    break
  fi
  if [ $i -eq 20 ]; then
    echo "[Browser Worker] WARNING: Health check failed after 20s. Continuing anyway."
  else
    echo "[Browser Worker] Waiting... ($i/20)"
    sleep 1
  fi
done

# Start Next.js on the PORT the platform expects
echo "[App] Starting Phoenix Agent on port ${PORT:-3000}..."
cd /app
exec node server.js

# Cleanup
trap "kill $BROWSER_PID 2>/dev/null" EXIT SIGTERM SIGINT
