#!/bin/bash
set -e

echo "========================================"
echo "  Phoenix Agent V2 - Starting..."
echo "========================================"

# Init database if needed
if [ ! -f "/app/db/phoenix.db" ]; then
  echo "[DB] Initializing database..."
  cd /app && npx prisma db push --accept-data-loss 2>/dev/null || true
fi

# Push any schema changes
cd /app && npx prisma db push --accept-data-loss 2>/dev/null || true

# Start Browser Worker in background
echo "[Browser Worker] Starting on port 3001..."
cd /app/browser-worker && bun run start &
BROWSER_PID=$!
echo "[Browser Worker] PID: $BROWSER_PID"

# Wait for browser worker to be ready
for i in $(seq 1 15); do
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "[Browser Worker] Ready!"
    break
  fi
  echo "[Browser Worker] Waiting... ($i/15)"
  sleep 1
done

# Start Next.js app
echo "[App] Starting Phoenix Agent on port 3000..."
cd /app
exec node /app/server.js

# Cleanup on exit
trap "kill $BROWSER_PID 2>/dev/null" EXIT