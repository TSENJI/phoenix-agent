# ---- Phoenix Agent: Full (with Browser Worker) ----
# For self-hosted: Docker Compose / VPS / Northflank
# ~800MB image, 2GB RAM recommended

FROM node:20-slim AS base

RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    p7zip-full \
    && rm -rf /var/lib/apt/lists/*

# Install bun
RUN npm install -g bun
ENV PATH="/usr/local/bin:/root/.bun/bin:$PATH"

WORKDIR /app

# ---- Stage 1: Build Next.js ----
FROM base AS builder

COPY package.json bun.lock* .
RUN bun install --frozen-lockfile || bun install

COPY prisma ./prisma/
COPY src ./src/
COPY public ./public/
COPY next.config.ts .
COPY tsconfig.json .
COPY postcss.config.mjs .

RUN bun run db:generate
RUN bun run build

# ---- Stage 2: Production ----
FROM base AS production

WORKDIR /app

# Copy Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma/

# Install Playwright + Chromium
RUN npx playwright install --with-deps chromium 2>&1 | tail -5

# Copy and install browser worker
COPY mini-services/browser-worker/package.json ./browser-worker/
WORKDIR /app/browser-worker
RUN bun install --production
COPY mini-services/browser-worker/index.ts .

WORKDIR /app

RUN mkdir -p /app/uploads /app/db

ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/db/phoenix.db
ENV BROWSER_WORKER_URL=http://localhost:3001
ENV PORT=3000

EXPOSE 3000

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
