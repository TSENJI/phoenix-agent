# Phoenix Agent - Northflank Deployment Guide

## Overview

Deploy the Phoenix Agent on [Northflank](https://northflank.com) using Docker builds and two services: the main Next.js app and the Playwright browser worker.

## Prerequisites

- A [Northflank](https://northflank.com) account
- Docker knowledge (builds are handled by Northflank)
- API keys for AI providers (Gemini, Groq, DeepSeek, Qwen, OpenRouter)

## Step 1: Create a Project

1. Log in to the [Northflank dashboard](https://app.northflank.com)
2. Click **Create Project** → name it `phoenix-agent`
3. Click **Create**

## Step 2: Push Your Code

Option A: **GitHub/GitLab Integration** (recommended)

1. Push your code to a GitHub/GitLab repository
2. In Northflank, go to your project → **Create Service** → **Combined Service**
3. Connect your repository

Option B: **Manual Build**

1. Go to **Builds** → **Create Build**
2. Select **Dockerfile** as the build type
3. Upload your code or connect a repository

## Step 3: Deploy phoenix-app (Main Application)

1. In your project, click **Create Service** → **Combined Service**
2. Configure the build:
   - **Build source**: Your Git repository
   - **Dockerfile path**: `Dockerfile`
   - **Build context**: Repository root
3. Configure deployment:
   - **Resources**: At least 1 vCPU / 2 GB RAM (Chromium needs memory)
   - **Port**: 3000
   - **Health check path**: `/api/health`
4. Add environment variables:
   ```
   NODE_ENV=production
   DATABASE_URL=file:./db/custom.db
   BROWSER_WORKER_URL=http://phoenix-browser:3001
   E2B_API_KEY=<your-key>
   GEMINI_KEY=<your-key>
   GROQ_KEY=<your-key>
   DEEPSEEK_KEY=<your-key>
   QWEN_KEY=<your-key>
   OPENROUTER_KEY=<your-key>
   ```
5. Enable **Public API / Domains** if you need external access
6. Click **Create & Deploy**

## Step 4: Deploy phoenix-browser (Worker Service)

1. In your project, click **Create Service** → **Combined Service**
2. Configure the build:
   - **Build source**: Same Git repository
   - **Dockerfile path**: `browser-worker/Dockerfile`
   - **Build context**: `browser-worker/` subdirectory
3. Configure deployment:
   - **Resources**: At least 1 vCPU / 2 GB RAM
   - **Port**: 3001
   - **Health check path**: `/health`
4. Add environment variables:
   ```
   NODE_ENV=production
   PORT=3001
   ```
5. **Do NOT** enable public access (keep internal only)
6. Click **Create & Deploy**

## Step 5: Connect the Services

Northflank services in the same project can communicate via their internal service names:

- The `BROWSER_WORKER_URL` in `phoenix-app` should be set to:
  ```
  http://phoenix-browser:3001
  ```
  (Replace `phoenix-browser` with the exact service name you chose in Step 4)

## Step 6: Persistent Storage (Optional)

If you want the SQLite database to persist across deployments:

1. Go to your `phoenix-app` service → **Volumes**
2. Add a volume mounted at `/app/db`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Browser worker crashes | Increase RAM to 2GB+ and add shared memory (`/dev/shm` size 2GB) |
| Build fails on Prisma | Ensure `prisma generate` runs in the Dockerfile |
| Can't reach browser worker | Verify both services are in the same Northflank project |
| Health check failing | Wait 60s for cold starts; check logs for startup errors |

## Cost Estimate

| Service | Instance | Approx. Cost/mo |
|---------|----------|-----------------|
| phoenix-app | 1 vCPU / 2GB RAM | ~$10-15 |
| phoenix-browser | 1 vCPU / 2GB RAM | ~$10-15 |
| **Total** | | **~$20-30** |