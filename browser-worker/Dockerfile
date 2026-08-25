# ============================================
# Phoenix Browser Worker - Playwright as a Service
# ============================================

FROM node:20-slim

LABEL maintainer="Phoenix Agent"
LABEL description="Lightweight Playwright browser worker service"

# Install Chromium system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Playwright and Express
RUN npm init -y \
    && npm install playwright express \
    && npx playwright install chromium \
    && npx playwright install-deps chromium

# Copy application code
COPY index.js .

# Create non-root user
RUN groupadd --gid 1001 nodejs \
    && useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home appuser \
    && mkdir -p /home/appuser/.cache/ms-playwright \
    && chown -R appuser:nodejs /app /home/appuser/.cache

USER appuser

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "index.js"]
