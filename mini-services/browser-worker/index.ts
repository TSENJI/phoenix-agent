import { chromium, type Browser, type Page } from 'playwright'

const PORT = 3001
let browser: Browser | null = null
let page: Page | null = null

async function ensureBrowser(): Promise<Page> {
  if (!browser || !browser.isConnected()) {
    console.log('[Browser Worker] Launching Chromium...')
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    })
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    })
    page = await context.newPage()
    console.log('[Browser Worker] Browser ready')
  }
  return page!
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const path = url.pathname
  const body = await req.json().catch(() => ({}))

  try {
    const p = await ensureBrowser()

    switch (path) {
      case '/navigate': {
        await p.goto(body.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await p.waitForTimeout(1000)
        return json({ result: `Navigated to ${body.url}` })
      }

      case '/snapshot': {
        // Get all interactive elements with ref IDs
        const elements = await p.evaluate(() => {
          const els = document.querySelectorAll('a, button, input, textarea, select, [role="button"], [onclick], [contenteditable="true"]')
          const results: { ref: string; tag: string; text: string; href?: string; type?: string; placeholder?: string; name?: string }[] = []
          els.forEach((el, i) => {
            const rect = el.getBoundingClientRect()
            if (rect.width === 0 && rect.height === 0) return
            const e = el as HTMLElement
            results.push({
              ref: `@e${i + 1}`,
              tag: el.tagName.toLowerCase(),
              text: (e.textContent || '').trim().substring(0, 100),
              href: (el as HTMLAnchorElement).href || undefined,
              type: (el as HTMLInputElement).type || undefined,
              placeholder: (el as HTMLInputElement).placeholder || undefined,
              name: (el as HTMLInputElement).name || undefined,
            })
          })
          return { title: document.title, url: window.location.href, elements: results.slice(0, 80) }
        })
        const summary = elements.elements.map(e => `  ${e.ref} [${e.tag}] ${e.text || e.placeholder || e.href || e.name || ''}`).join('\n')
        return json({ result: `Page: ${elements.title}\nURL: ${elements.url}\nElements (${elements.elements.length}):\n${summary}` })
      }

      case '/click': {
        const idx = parseInt(body.ref?.replace('@e', '') || '0', 10)
        const els = await p.$$('a, button, input, textarea, select, [role="button"], [onclick], [contenteditable="true"]')
        if (idx > 0 && idx <= els.length) {
          await els[idx - 1].click()
          await p.waitForTimeout(500)
          return json({ result: `Clicked ${body.ref}` })
        }
        return json({ error: `Element ${body.ref} not found` }, 404)
      }

      case '/fill': {
        const idx = parseInt(body.ref?.replace('@e', '') || '0', 10)
        const els = await p.$$('input, textarea, [contenteditable="true"]')
        if (idx > 0 && idx <= els.length) {
          await els[idx - 1].fill(body.text || '')
          // Dispatch input event for React
          await els[idx - 1].dispatchEvent('input')
          await p.waitForTimeout(200)
          return json({ result: `Filled ${body.ref} with text` })
        }
        return json({ error: `Element ${body.ref} not found` }, 404)
      }

      case '/type': {
        const idx = parseInt(body.ref?.replace('@e', '') || '0', 10)
        const els = await p.$$('input, textarea, [contenteditable="true"]')
        if (idx > 0 && idx <= els.length) {
          await els[idx - 1].type(body.text || '', { delay: 10 })
          return json({ result: `Typed into ${body.ref}` })
        }
        return json({ error: `Element ${body.ref} not found` }, 404)
      }

      case '/press': {
        await p.keyboard.press(body.key || 'Enter')
        await p.waitForTimeout(300)
        return json({ result: `Pressed ${body.key || 'Enter'}` })
      }

      case '/screenshot': {
        const buf = await p.screenshot({ type: 'png', fullPage: false })
        const b64 = buf.toString('base64')
        return json({ result: `data:image/png;base64,${b64}` })
      }

      case '/evaluate': {
        const result = await p.evaluate(body.script || 'document.title')
        return json({ result: String(result) })
      }

      case '/wait': {
        const ms = parseInt(body.ms || '3000', 10)
        if (body.ref) {
          const idx = parseInt(body.ref.replace('@e', ''), 10)
          const selector = 'a, button, input, textarea, select, [role="button"]'
          try {
            await p.waitForSelector(`${selector}:nth-child(${idx})`, { timeout: ms })
          } catch {
            await p.waitForTimeout(ms)
          }
        } else {
          await p.waitForTimeout(ms)
        }
        return json({ result: `Waited ${ms}ms` })
      }

      case '/health': {
        return json({ status: 'ok', browserConnected: browser?.isConnected() || false })
      }

      default:
        return json({ error: `Unknown endpoint: ${path}` }, 404)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Browser Worker] Error on ${path}:`, msg)
    return json({ error: msg }, 500)
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' } })
    }
    return handleRequest(req)
  },
})

console.log(`[Browser Worker] Running on http://localhost:${PORT}`)

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Browser Worker] Shutting down...')
  await browser?.close()
  process.exit(0)
})
process.on('SIGINT', async () => {
  await browser?.close()
  process.exit(0)
})
