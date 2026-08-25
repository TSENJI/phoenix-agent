#!/bin/bash
# ============================================
# Phoenix Agent V2 - One-Click Deploy
# ============================================
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh          # Build + Start
#   ./deploy.sh stop     # Stop
#   ./deploy.sh logs     # View logs
#   ./deploy.sh rebuild  # Rebuild + Restart
# ============================================

set -e

COMPOSE="docker compose"
IMAGE_NAME="phoenix-agent"

case "${1:-start}" in
  start|'')
    echo "========================================"
    echo "  Phoenix Agent V2 - Building & Starting"
    echo "========================================"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
      echo "ERROR: Docker is not installed."
      echo "Install: https://docs.docker.com/get-docker/"
      exit 1
    fi
    
    # Build
    echo ""
    echo "[1/3] Building Docker image..."
    $COMPOSE build --no-cache 2>&1 | tail -20
    
    echo ""
    echo "[2/3] Starting container..."
    $COMPOSE up -d
    
    echo ""
    echo "[3/3] Waiting for Phoenix Agent..."
    for i in $(seq 1 30); do
      if curl -s http://localhost:3000 > /dev/null 2>&1; then
        break
      fi
      sleep 1
      echo -n "."
    done
    echo ""
    
    echo "========================================"
    echo "  Phoenix Agent is running!"
    echo "  URL: http://localhost:3000"
    echo "  ========================================"
    echo "  Next: Open URL -> Settings -> Paste API Keys"
    echo "  Free keys:"
    echo "    - Gemini:  https://aistudio.google.com/app/apikey"
    echo "    - Groq:    https://console.groq.com/keys"
    echo "    - OpenRouter: https://openrouter.ai/keys"
    echo "    - Nvidia:  https://build.nvidia.com"
    echo "  ========================================"
    echo "  Commands:"
    echo "    ./deploy.sh logs    - View logs"
    echo "    ./deploy.sh stop    - Stop"
    echo "    ./deploy.sh rebuild - Rebuild"
    echo "========================================"
    ;;

  stop)
    echo "Stopping Phoenix Agent..."
    $COMPOSE down
    echo "Stopped."
    ;;

  logs)
    $COMPOSE logs -f --tail=100
    ;;

  rebuild)
    echo "Rebuilding Phoenix Agent..."
    $COMPOSE down
    $COMPOSE build --no-cache 2>&1 | tail -10
    $COMPOSE up -d
    echo "Rebuilt and started."
    ;;

  *)
    echo "Usage: ./deploy.sh [start|stop|logs|rebuild]"
    ;;
esac