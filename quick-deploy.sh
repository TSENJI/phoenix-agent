#!/bin/bash
# ============================================
# Phoenix Agent V2 - 懶人部署包
# ============================================
# 使用方式：
#   1. 確保你有 GitHub 帳號
#   2. 確保本地有 git
#   3. 複製這個專案到本地
#   4. 跑這個腳本：bash quick-deploy.sh
# ============================================

set -e

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

REPO_NAME="phoenix-agent"

echo -e "${CYAN}"
echo "  🔥 Phoenix Agent V2 - 一鍵部署"
echo -e "${NC}"

# ---- Step 1: Check prerequisites ----
echo -e "${YELLOW}[1/4] 檢查環境...${NC}"

if ! command -v git &> /dev/null; then
  echo -e "${RED}❌ 需要安裝 git: https://git-scm.com${NC}"
  exit 1
fi

if ! command -v gh &> /dev/null; then
  echo -e "${YELLOW}⚠️  沒有 gh CLI，改用網頁方式建立 repo${NC}"
  HAS_GH=false
else
  if gh auth status &> /dev/null 2>&1; then
    HAS_GH=true
    echo -e "${GREEN}✅ GitHub CLI 已登入${NC}"
  else
    HAS_GH=false
    echo -e "${YELLOW}⚠️  gh CLI 未登入，改用網頁方式${NC}"
  fi
fi

# ---- Step 2: Commit all changes ----
echo -e "${YELLOW}[2/4] 整理程式碼...${NC}"
git add -A
git commit -m "Phoenix Agent V2 - ready to deploy" --allow-empty 2>/dev/null || true
echo -e "${GREEN}✅ 程式碼已準備好${NC}"

# ---- Step 3: Create GitHub repo & push ----
echo -e "${YELLOW}[3/4] 推送到 GitHub...${NC}"

if [ "$HAS_GH" = true ]; then
  # Auto create repo and push
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push 2>/dev/null \
    || gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
  REPO_URL=$(gh repo view --json url -q .url)
else
  # Manual: open browser to create repo
  echo -e "${CYAN}"
  echo "  請在瀏覽器建立 GitHub repo："
  echo -e "${NC}"
  echo "  1. 打開這個連結 👇"
  echo -e "${GREEN}     https://github.com/new${NC}"
  echo ""
  echo "  2. Repository name 填: ${REPO_NAME}"
  echo "  3. 選 Public"
  echo "  4. 點 Create repository"
  echo ""
  read -p "  建好後按 Enter 繼續..." < /dev/tty
  echo ""
  echo "  貼上這行指令到終端："
  echo -e "${GREEN}"
  echo "  git remote add origin https://github.com/你的帳號/${REPO_NAME}.git"
  echo "  git push -u origin main"
  echo -e "${NC}"
  read -p "  推送完成後按 Enter 繼續..." < /dev/tty
  REPO_URL="https://github.com/你/${REPO_NAME}"
fi

GITHUB_USER=$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]\([^/]*\).*/\1/')

# ---- Step 4: Open Koyeb deploy ----
echo -e "${YELLOW}[4/4] 部署到 Koyeb...${NC}"
echo -e "${CYAN}"
echo "  =========================================="
echo "  🚀 最後一步！在 Koyeb 點 3 下："
echo "  =========================================="
echo -e "${NC}"
echo "  1️⃣  打開 👇"
echo -e "${GREEN}     https://app.koyeb.com/services/create${NC}"
echo ""
echo "  2️⃣  用 GitHub 登入（一秒）"
echo ""
echo "  3️⃣  選 ${REPO_NAME} → 點 Deploy"
echo ""
echo -e "${CYAN}  =========================================="
echo -e "  Koyeb 會自動偵測 Dockerfile.cloud 部署"
echo "  部署完成後你會拿到一個網址"
echo -e "  ========================================${NC}"
echo ""
echo -e "${GREEN}✅ 全部完成！拿到網址後：${NC}"
echo "  打開網址 → 右上角 Settings → 貼 API Key → 開始用"
echo ""
echo -e "  免費 API Key 申請："
echo -e "  ${CYAN}Gemini:${NC}    https://aistudio.google.com/app/apikey"
echo -e "  ${CYAN}Groq:${NC}      https://console.groq.com/keys"
echo -e "  ${CYAN}OpenRouter:${NC} https://openrouter.ai/keys"
echo -e "  ${CYAN}Nvidia:${NC}    https://build.nvidia.com/meta/llama-3.1-405b-instruct"
echo ""

# Auto open browser
if command -v xdg-open &> /dev/null; then
  xdg-open "https://app.koyeb.com/services/create" 2>/dev/null || true
elif command -v open &> /dev/null; then
  open "https://app.koyeb.com/services/create" 2>/dev/null || true
fi
