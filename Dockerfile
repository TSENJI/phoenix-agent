# ---- Phoenix Agent V2: Full (Browser Worker + Playwright) ----
# For: Northflank / VPS / Docker Compose
# Requires: 2GB+ RAM, ~800MB image

FROM node:20-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl unzip p7zip-full \
    && rm -rf /var/lib/apt/lists/*

# Install bun globally
RUN npm install -g bun
ENV PATH="/usr/local/bin:/root/.bun/bin:$PATH"

WORKDIR /app

# ============================================================
# Stage 1: Build Next.js standalone
# ============================================================
FROM base AS builder

COPY package.json bun.lock* .
RUN bun install --frozen-lockfile 2>/dev/null || bun install

COPY prisma ./prisma/
COPY src ./src/
COPY public ./public/
COPY next.config.ts .
COPY tsconfig.json .
COPY postcss.config.mjs .
COPY tailwind.config.ts .
COPY components.json .

# Generate Prisma client then build
RUN bun run db:generate
RUN bun run build

# ============================================================
# Stage 2: Production image
# ============================================================
FROM base AS production

WORKDIR /app

# Copy Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema + generated client
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma/
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma/

# Install Playwright browsers + system deps for Chromium
RUN npx playwright install --with-deps chromium 2>&1 | tail -3

# Install browser worker dependencies
COPY mini-services/browser-worker/package.json ./browser-worker/
WORKDIR /app/browser-worker
RUN bun install --production 2>/dev/null || npm install --production
COPY mini-services/browser-worker/index.ts .

WORKDIR /app

# Create data directories (use /tmp for read-only filesystem platforms)
RUN mkdir -p /app/uploads /app/db /tmp/phoenix-data

# Environment defaults (can be overridden)
ENV NODE_ENV=production
ENV DATABASE_URL=file:/tmp/phoenix-data/phoenix.db
ENV BROWSER_WORKER_URL=http://localhost:3001
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
